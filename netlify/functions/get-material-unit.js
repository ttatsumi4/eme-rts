// /netlify/functions/get-material-unit.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event) {
    const { lot_full } = event.queryStringParameters;

    if (!lot_full) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'ロット番号が指定されていません。' }) };
    }

    try {
        const { data, error } = await supabase
            .from('rm_lot_kanri') // <-- 小文字に修正
            .select('suryo_tani')
            .eq('lot_full', lot_full)
            .single();
            
        if (error) {
            throw error;
        }

        if (data) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, unit: data.suryo_tani || '' }),
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ success: false, message: '該当するロット情報が見つかりません。' }),
            };
        }
    } catch (error) {
        console.error('Error fetching material unit:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'サーバーエラーが発生しました。' }),
        };
    }
};