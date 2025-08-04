// functions/set-worker.js

import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
    // POSTリクエスト以外は弾く
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { bht_id, employee_code } = JSON.parse(event.body);

        // パラメータの存在チェック
        if (!bht_id || !employee_code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: '必要なパラメータが不足しています。' })
            };
        }

        // 1. 社員が実在するか確認
        const { data: user, error: userError } = await supabase
            .from('mst_user')
            .select('employee_code')
            .eq('employee_code', employee_code)
            .eq('is_deleted', false)
            .single();

        if (userError || !user) {
            return {
                statusCode: 200, // 404ではなく、処理結果として返す
                body: JSON.stringify({ success: false, message: '該当する社員が存在しません。' })
            };
        }

        // 2. BHTに作業者を割り当てる（UPDATE）
        const { error: updateError } = await supabase
            .from('mst_rt_param')
            .update({ assigned_employee_code: employee_code })
            .eq('bht_id', bht_id);

        if (updateError) {
            throw updateError; // DBエラーの場合は500エラーとして処理
        }
        
        // 3. 成功レスポンスを返す
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: '作業者を設定しました。メインメニューに戻ります。' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'サーバーエラーが発生しました。' })
        };
    }
};