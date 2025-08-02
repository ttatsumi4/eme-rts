// Supabaseクライアントをインポート
// Netlify Functionsで外部モジュールを使うには、プロジェクトのルートで `npm init -y` と `npm install @supabase/supabase-js` が必要です。
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
    // クエリパラメータからbht_idを取得
    const bht_id = event.queryStringParameters.bht_id;

    if (!bht_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'BHT ID is required.' }) };
    }

    try {
        // bht_idを使ってパラメータテーブルを検索
        const { data: paramData, error: paramError } = await supabase
            .from('mst_rt_param')
            .select(`
                is_locked,
                lock_reason,
                assigned_employee_code,
                mst_user (
                    employee_name
                )
            `)
            .eq('bht_id', bht_id)
            .single();

        if (paramError || !paramData) {
            return { statusCode: 404, body: JSON.stringify({ status: 'not_found', message: 'BHT ID not registered.' }) };
        }

        // ロック状態をチェック (元のコードのロジックを再現)
        if (paramData.is_locked) {
            return { statusCode: 200, body: JSON.stringify({ status: 'locked', reason: paramData.lock_reason || 'BHT0078' }) };
        }

        // 作業者が設定されているかチェック
        if (!paramData.assigned_employee_code || !paramData.mst_user) {
            return { statusCode: 200, body: JSON.stringify({ status: 'no_worker' }) };
        }
        
        // 正常：作業者情報を返す
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'ok',
                worker: {
                    code: paramData.assigned_employee_code,
                    name: paramData.mst_user.employee_name
                }
            })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'An internal error occurred.' }) };
    }
};