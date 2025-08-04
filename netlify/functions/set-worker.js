// functions/set-worker.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event, context) {
    // GETリクエストで名前取得の場合
    if (event.httpMethod === 'GET' && event.queryStringParameters.get_name) {
        const employeeCode = event.queryStringParameters.employee_code;
        const { data, error } = await supabase.from('mst_user').select('employee_name').eq('employee_code', employeeCode).single();
        if (error || !data) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: '該当する社員が存在しません。' }) };
        }
        return { statusCode: 200, body: JSON.stringify({ success: true, employee_name: data.employee_name }) };
    }

    // POSTリクエストで設定更新の場合
    if (event.httpMethod === 'POST') {
        try {
            const { bht_id, employee_code } = JSON.parse(event.body);
            if (!bht_id || !employee_code) {
                return { statusCode: 400, body: JSON.stringify({ success: false, message: '必要なパラメータが不足しています。' }) };
            }

            const { data: user, error: userError } = await supabase.from('mst_user').select('employee_code').eq('employee_code', employee_code).eq('is_deleted', false).single();
            if (userError || !user) {
                return { statusCode: 200, body: JSON.stringify({ success: false, message: '該当する社員が存在しません。' }) };
            }

            const { error: updateError } = await supabase.from('mst_rt_param').update({ assigned_employee_code: employee_code }).eq('bht_id', bht_id);
            if (updateError) throw updateError;
            
            return { statusCode: 200, body: JSON.stringify({ success: true, message: '作業者を設定しました。メインメニューに戻ります。' }) };
        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ success: false, message: 'サーバーエラーが発生しました。' }) };
        }
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
};