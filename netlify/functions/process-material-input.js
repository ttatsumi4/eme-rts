// netlify/functions/process-material-input.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getProcessState(processNo) {
    // ▼▼▼ 'select(*)'と'select(列指定)'の結果を比較する最終確認ログ ▼▼▼
    console.log("--- STARTING FINAL DIAGNOSIS ---");

    // 確認1: 問題が発生している 'select(*)' を実行
    console.log("--- Running Query 1: select('*') ---");
    const { data: preparedWithStar, error: starError } = await supabase
        .from('rts_rm_rdy')
        .select('*')
        .eq('pow_kotei_no', processNo);

    if (starError) console.error("Error with select('*'):", starError);
    console.log("Result from select('*'):", JSON.stringify(preparedWithStar, null, 2));

    // 確認2: 解決策である 'select(列指定)' を実行
    console.log("--- Running Query 2: select with explicit columns ---");
    const explicitColumns = 'id, sikomi_no, sikomi_flg, rm_id, rm_name, rm_lot_full, rm_seitai_kosu, rm_suryo';
    const { data: prepared, error: preparedError } = await supabase
        .from('rts_rm_rdy')
        .select(explicitColumns)
        .eq('pow_kotei_no', processNo);

    if (preparedError) console.error("Error with explicit select:", preparedError);
    console.log("Result from explicit select:", JSON.stringify(prepared, null, 2));

    console.log("--- FINISHED FINAL DIAGNOSIS ---");
    // ▲▲▲ 最終確認ログここまで ▲▲▲


    // --- 以降の処理は、正常に取得できるはずの 'prepared' データを使用 ---
    if (preparedError) throw preparedError;

    const { data: details, error: detailsError } = await supabase.from('siji_sikomi_detail_fin').select('rm_id, rm_name, seq_no').eq('pow_kotei_no', processNo).order('seq_no');
    if (detailsError) throw detailsError;
    const { data: header, error: headerError } = await supabase.from('siji_rm_rdy_fin').select('pow_hinmei').eq('rdy_siji_no', processNo).single();
    if (headerError) throw headerError;

    const totalSteps = details.length;
    
    const completedSteps = details.map(d => d.seq_no).filter(seq => {
        const items = prepared.filter(p => String(p.sikomi_no) === String(seq));
        return items.length > 0 && items.every(p => p.sikomi_flg === '1');
    }).length;

    const currentStepIndex = completedSteps;
    if (currentStepIndex >= totalSteps) return { isComplete: true, processNo, productName: header.pow_hinmei, progressTotal: totalSteps, progressCurrent: totalSteps };
    const nextInstruction = details[currentStepIndex];

    const preparedForNext = prepared.filter(p => String(p.sikomi_no) === String(nextInstruction.seq_no));
    
    const totalCount = preparedForNext.length;
    const inCount = preparedForNext.filter(p => p.sikomi_flg === '1').length;
    return {
        isComplete: false, processNo, productName: header.pow_hinmei, progressTotal: totalSteps, progressCurrent: currentStepIndex,
        nextMaterial: {
            seqNo: nextInstruction.seq_no, rmId: nextInstruction.rm_id, rmName: nextInstruction.rm_name,
            totalCount, inCount, preparedItems: preparedForNext,
        }
    };
}


exports.handler = async function(event) {
    // handler関数の内容は変更なし
    console.log('--- Function process-material-input started ---');
    console.log('Received event body:', event.body);
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const { process_no, barcode, employee_code, currentState } = JSON.parse(event.body);

        // ★★★ getProcessStateが呼ばれるのはここから ★★★
        const newState = await getProcessState(process_no);

        // currentStateの代わりに、毎回DBから最新のnewStateを取得してチェックするロジックに簡略化
        if (newState.isComplete) {
            return { statusCode: 200, body: JSON.stringify({ success: true, newState }) };
        }
        
        const bcdData = barcode.split(';');
        if (bcdData.length <= 1) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'バーコード形式が不正です。', errorCode: 'BHT0013' }) };
        }
        const bcdType = bcdData[0];
        const bcdRmId = bcdData[1]; 
        const bcdLotFull = bcdData[2];

        const nextMaterial = newState.nextMaterial;
        
        if (bcdType === 'RM' && bcdRmId.trim() !== nextMaterial.rmId.trim()) {
             return { statusCode: 200, body: JSON.stringify({ success: false, message: '指示と違う原料です。', errorCode: 'BHT0014' }) };
        }

        const targetItem = nextMaterial.preparedItems.find(item => {
            return item.rm_lot_full && item.rm_lot_full.trim() === bcdLotFull.trim() && item.sikomi_flg !== '1';
        });

        if (!targetItem) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: '準備されていない、または投入済みの原料です。', errorCode: 'BHT0015/16' }) };
        }
        
        const { error: updateError } = await supabase
            .from('rts_rm_rdy')
            .update({ sikomi_flg: '1', upd_user: employee_code, sikomi_date: new Date().toISOString() })
            .eq('id', targetItem.id); 
        
        if (updateError) throw updateError;
        
        const finalState = await getProcessState(process_no);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, newState: finalState }),
        };

    } catch (error) {
        console.error('Process Material Input Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'サーバーエラーが発生しました。' }),
        };
    }
};