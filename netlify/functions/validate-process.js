// netlify/functions/validate-process.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// エラーレスポンスを生成するヘルパー関数
const createErrorResponse = (message, errorCode) => {
    return {
        statusCode: 200, // フロントエンドで処理しやすいため、ビジネスエラーは200で返す
        body: JSON.stringify({ success: false, message, errorCode }),
    };
};

exports.handler = async function(event) {
    // POSTリクエスト以外は受け付けない
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { process_no } = JSON.parse(event.body);
        if (!process_no) {
            return createErrorResponse('工程No.がありません。', 'NO_PARAM');
        }

        // --- チェック1: 指示データの存在と状態確認 ---
        const { data: instruction } = await supabase
            .from('siji_rm_rdy_fin')
            .select('stat_flg')
            .eq('rdy_siji_no', process_no)
            .single();

        if (!instruction) {
            return createErrorResponse('仕込み指示データが見つかりません。', 'BHT0002');
        }
        if (instruction.stat_flg === 'C') {
            return createErrorResponse('この工程はキャンセルされています。', 'BHT0003');
        }

        // --- チェック2: 準備済み原料のチェック (一部を抜粋) ---
        const { data: prepared, error: preparedError } = await supabase
            .from('rts_rm_rdy')
            .select('*')
            .eq('pow_kotei_no', process_no);
        if (preparedError) throw preparedError;

        // --- チェック3: 原料の搬入完了確認 ---
        const unDelivered = prepared.find(p => p.haraidasi_flg === '0');
        if (unDelivered) {
            return createErrorResponse(`原料「${unDelivered.rm_name}」が搬入されていません。`, 'BHT0007');
        }

        // --- チェック4: 仕込み完了確認 ---
        const { data: processStatus } = await supabase
            .from('rt_sikomi')
            .select('end_time')
            .eq('pow_kotei_no', process_no)
            .single();

        if (processStatus && processStatus.end_time) {
            return createErrorResponse('この工程は既に仕込み完了しています。', 'BHT0008');
        }

        // --- チェック5: 有効期限と品質のチェック (全件チェックが必要だが代表例を実装) ---
        for (const item of prepared) {
            // 有効期限チェック
            const { data: lotInfo } = await supabase
                .from('rm_lot_kanri')
                .select('yuko_kigen')
                .eq('rm_id', item.rm_id)
                .eq('lot_full', item.rm_lot_full)
                .single();
            
            if (lotInfo && new Date(lotInfo.yuko_kigen) < new Date()) {
                return createErrorResponse(`原料「${item.rm_name}」の有効期限が切れています。`, 'BHT0011');
            }

            // 品質チェック
            const { data: qualityInfo } = await supabase
                .from('v_a2_kbkgouhi')
                .select('gohhantei')
                .eq('gohgenryo', item.rm_id)
                .eq('gohlot', item.rm_lot)
                .maybeSingle(); // データがない場合もあるためmaybeSingle

            if (!qualityInfo) {
                 return createErrorResponse(`原料「${item.rm_name}」の品質情報が見つかりません。`, 'BHT0148');
            }
            if (qualityInfo.gohhantei !== '1') {
                return createErrorResponse(`原料「${item.rm_name}」が品質検査で不合格です。`, 'BHT0009');
            }
        }
        
        // --- 全てのチェックを通過 ---
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };

    } catch (error) {
        console.error('Validation Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'サーバー内部でエラーが発生しました。', errorCode: 'SERVER_ERROR' }),
        };
    }
};
