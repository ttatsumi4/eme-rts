// /netlify/functions/validate-material.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { barcode, next_rm_id } = JSON.parse(event.body);
        
        // バーコードから原料IDを抽出
        const bcdData = barcode.split(';');
        if (bcdData.length <= 1) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: 'バーコード形式が不正です。' }) };
        }
        const bcdRmId = bcdData[1];

        // 指示されている原料と一致するかをチェック
        if (bcdRmId.trim() !== next_rm_id.trim()) {
            return { statusCode: 200, body: JSON.stringify({ success: false, message: '指示と違う原料です。' }) };
        }
        
        // 原料マスターを検索して、原料グループ（溶剤かどうか）を判断
        const { data, error } = await supabase
                .from('mst_siji_raw_material') // <-- 小文字に修正
                .select('rm_group')
                .eq('rm_id', bcdRmId)
                .single();

        if (error || !data) {
            throw new Error('原料マスターの検索に失敗しました。');
        }

        // 遷移先を決定して返す
        if (data.rm_group === '溶剤') {
            return { statusCode: 200, body: JSON.stringify({ success: true, next_screen: 'solvent' }) };
        } else {
            return { statusCode: 200, body: JSON.stringify({ success: true, next_screen: 'confirm' }) };
        }

    } catch (error) {
        console.error('Validation Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message }),
        };
    }
};