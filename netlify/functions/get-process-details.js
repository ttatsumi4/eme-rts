// netlify/functions/get-process-details.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 工程の現在の状態を取得する共通関数
async function getProcessState(processNo) {
    // 1. 品名と総ステップ数を取得
    const { data: details, error: detailsError } = await supabase
        .from('siji_sikomi_detail_fin')
        .select('rm_id, rm_name, seq_no')
        .eq('pow_kotei_no', processNo)
        .order('seq_no');
    if (detailsError) throw detailsError;
    
    const { data: header, error: headerError } = await supabase
        .from('siji_rm_rdy_fin')
        .select('pow_hinmei')
        .eq('rdy_siji_no', processNo)
        .single();
    if (headerError) throw headerError;
    
    // 2. 準備済み原料の情報を取得
    const { data: prepared, error: preparedError } = await supabase
        .from('rts_rm_rdy')
        .select('sikomi_no, sikomi_flg, rm_id, rm_name, rm_seitai_kosu, rm_suryo')
        .eq('pow_kotei_no', processNo);
    if (preparedError) throw preparedError;

    // 3. 進捗を計算
    const totalSteps = details.length;
    const completedSteps = prepared.filter(p => p.sikomi_flg === '1').length;
    const currentStepIndex = completedSteps;

    if (currentStepIndex >= totalSteps) {
        return { isComplete: true };
    }

    // 4. 次に投入すべき原料の情報を構築
    const nextInstruction = details[currentStepIndex];
    const preparedForNext = prepared.filter(p => p.sikomi_no === nextInstruction.seq_no);
    const totalCount = preparedForNext.reduce((sum, p) => sum + (p.rm_seitai_kosu || 0) + (p.rm_suryo > 0 ? 1 : 0), 0);
    const inCount = preparedForNext.filter(p => p.sikomi_flg === '1').length;

    return {
        isComplete: false,
        processNo: processNo,
        productName: header.pow_hinmei,
        progressTotal: totalSteps,
        progressCurrent: currentStepIndex,
        nextMaterial: {
            seqNo: nextInstruction.seq_no,
            rmId: nextInstruction.rm_id,
            rmName: nextInstruction.rm_name,
            totalCount: totalCount,
            inCount: inCount,
            preparedItems: preparedForNext, // 検証用に準備済みアイテムリストを添付
        }
    };
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const processNo = event.queryStringParameters.process_no;
        const state = await getProcessState(processNo);
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, state }),
        };
    } catch (error) {
        console.error('Get Process Details Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: '工程情報の取得に失敗しました。' }),
        };
    }
};
