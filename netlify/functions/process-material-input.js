// netlify/functions/process-material-input.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// get-process-details.jsから同じ関数をインポート（実際は共通ファイルに置くのが望ましい）
async function getProcessState(processNo) {
    // (get-process-details.jsのgetProcessState関数と全く同じ内容をここにコピー)
    const { data: details, error: detailsError } = await supabase.from('siji_sikomi_detail_fin').select('rm_id, rm_name, seq_no').eq('pow_kotei_no', processNo).order('seq_no');
    if (detailsError) throw detailsError;
    const { data: header, error: headerError } = await supabase.from('siji_rm_rdy_fin').select('pow_hinmei').eq('rdy_siji_no', processNo).single();
    if (headerError) throw headerError;
    const { data: prepared, error: preparedError } = await supabase.from('rts_rm_rdy').select('*').eq('pow_kotei_no', processNo);
    if (preparedError) throw preparedError;
    const totalSteps = details.length;
    // 投入済みフラグが'1'のものをカウント
    const completedSteps = details.map(d => d.seq_no).filter(seq => {
        const items = prepared.filter(p => p.sikomi_no === seq);
        return items.length > 0 && items.every(p => p.sikomi_flg === '1');
    }).length;

    const currentStepIndex = completedSteps;
    if (currentStepIndex >= totalSteps) return { isComplete: true, processNo, productName: header.pow_hinmei, progressTotal: totalSteps, progressCurrent: totalSteps };
    const nextInstruction = details[currentStepIndex];
    const preparedForNext = prepared.filter(p => p.sikomi_no === nextInstruction.seq_no);
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
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const { process_no, barcode, currentState } = JSON.parse(event.body);
        
        // --- バーコード解析 ---
        const bcdData = barcode.split(';');
        if (bcdData.length <= 1) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'バーコード形式が不正です。', errorCode: 'BHT0013' }) };
        }
        const bcdType = bcdData[0]; // RM, RMH, RMM
        const bcdRmId = bcdData[1].replace(/-/g, '');
        const bcdLotFull = bcdData[2];

        // --- 検証 ---
        const nextMaterial = currentState.nextMaterial;
        
        // ★★★ 修正点 ★★★
        // 1. 原料チェック (両方のIDから空白を除去して比較)
        if (bcdType === 'RM' && bcdRmId.trim() !== nextMaterial.rmId.trim()) {
             return { statusCode: 200, body: JSON.stringify({ success: false, message: '指示と違う原料です。', errorCode: 'BHT0014' }) };
        }

        // 2. 準備済みかチェック
        const targetItem = nextMaterial.preparedItems.find(item => item.rm_lot_full.trim() === bcdLotFull.trim() && item.sikomi_flg !== '1');
        if (!targetItem) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: '準備されていない、または投入済みの原料です。', errorCode: 'BHT0015/16' }) };
        }

        // (ここに有効期限や品質チェックなど、元のC#コードの他の検証ロジックを追加)

        // --- DB更新 ---
        const { error: updateError } = await supabase
            .from('rts_rm_rdy')
            .update({ sikomi_flg: '1', sikomi_date: new Date().toISOString() })
            .eq('id', targetItem.id); // 主キーで更新
        
        if (updateError) throw updateError;

        // --- 更新後の新しい状態を返却 ---
        const newState = await getProcessState(process_no);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, newState }),
        };

    } catch (error) {
        console.error('Process Material Input Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'サーバーエラーが発生しました。' }),
        };
    }
};
