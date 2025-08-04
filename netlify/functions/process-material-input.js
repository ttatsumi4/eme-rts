// netlify/functions/process-material-input.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 工程の最新状態を取得する関数
async function getProcessState(processNo) {
    // siji_sikomi_detail_fin から工程の指示内容を取得
    const { data: details, error: detailsError } = await supabase
        .from('siji_sikomi_detail_fin')
        .select('rm_id, rm_name, seq_no')
        .eq('pow_kotei_no', processNo)
        .order('seq_no');
    if (detailsError) throw detailsError;

    // siji_rm_rdy_fin から製品名を取得
    const { data: header, error: headerError } = await supabase
        .from('siji_rm_rdy_fin')
        .select('pow_hinmei')
        .eq('rdy_siji_no', processNo)
        .single();
    if (headerError) throw headerError;

    // rts_rm_rdy から準備済みの原料情報をすべて取得
    // ★根本原因だったこの処理が、正常に動作するようになったことを利用します★
    const { data: prepared, error: preparedError } = await supabase
        .from('rts_rm_rdy')
        .select('*')
        .eq('pow_kotei_no', processNo);
    if (preparedError) throw preparedError;

    const totalSteps = details.length;

    // 投入済みのステップを数える
    const completedSteps = details.map(d => d.seq_no).filter(seq => {
        const items = prepared.filter(p => String(p.sikomi_no) === String(seq));
        return items.length > 0 && items.every(p => p.sikomi_flg === '1');
    }).length;

    const currentStepIndex = completedSteps;
    
    // 全ての投入が完了している場合
    if (currentStepIndex >= totalSteps) {
        return { 
            isComplete: true, 
            processNo, 
            productName: header.pow_hinmei, 
            progressTotal: totalSteps, 
            progressCurrent: totalSteps 
        };
    }
    
    // 次の投入指示を特定
    const nextInstruction = details[currentStepIndex];
    const preparedForNext = prepared.filter(p => String(p.sikomi_no) === String(nextInstruction.seq_no));
    
    const totalCount = preparedForNext.length;
    const inCount = preparedForNext.filter(p => p.sikomi_flg === '1').length;
    
    return {
        isComplete: false,
        processNo,
        productName: header.pow_hinmei,
        progressTotal: totalSteps,
        progressCurrent: currentStepIndex,
        nextMaterial: {
            seqNo: nextInstruction.seq_no,
            rmId: nextInstruction.rm_id,
            rmName: nextInstruction.rm_name,
            totalCount,
            inCount,
            preparedItems: preparedForNext,
        }
    };
}


// メインの処理
exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const { process_no, barcode, employee_code } = JSON.parse(event.body);

        // 毎回データベースから最新の状態を取得
        const currentState = await getProcessState(process_no);

        if (currentState.isComplete) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'この工程は既に完了しています。', errorCode: 'ALREADY_COMPLETED' }) };
        }
        
        const bcdData = barcode.split(';');
        if (bcdData.length <= 1) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'バーコード形式が不正です。', errorCode: 'BHT0013' }) };
        }
        const bcdType = bcdData[0];
        const bcdRmId = bcdData[1]; 
        const bcdLotFull = bcdData[2];

        const nextMaterial = currentState.nextMaterial;
        
        if (bcdType === 'RM' && bcdRmId.trim() !== nextMaterial.rmId.trim()) {
             return { statusCode: 200, body: JSON.stringify({ success: false, message: '指示と違う原料です。', errorCode: 'BHT0014' }) };
        }

        const targetItem = nextMaterial.preparedItems.find(item => {
            return item.rm_lot_full && item.rm_lot_full.trim() === bcdLotFull.trim() && item.sikomi_flg !== '1';
        });

        if (!targetItem) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: '準備されていない、または投入済みの原料です。', errorCode: 'BHT0015/16' }) };
        }
        
        // データベースを更新
        const { error: updateError } = await supabase
            .from('rts_rm_rdy')
            .update({ sikomi_flg: '1', upd_user: employee_code, sikomi_date: new Date().toISOString() })
            .eq('id', targetItem.id); 
        
        if (updateError) throw updateError;
        
        // 更新後の最新状態を再度取得して返す
        const newState = await getProcessState(process_no);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, newState: newState }),
        };

    } catch (error) {
        console.error('Process Material Input Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'サーバーエラーが発生しました。' }),
        };
    }
};