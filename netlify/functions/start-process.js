// netlify/functions/start-process.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async function(event) {
    const { httpMethod, queryStringParameters, body } = event;

    // --- GETリクエスト：画面初期表示用の情報を取得 ---
    if (httpMethod === 'GET') {
        const processNo = queryStringParameters.process_no;
        if (!processNo) {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: '工程No.がありません。' }) };
        }

        try {
            // 1. 品名を取得
            const { data: instruction, error: instructionError } = await supabase
                .from('siji_rm_rdy_fin')
                .select('pow_hinmei') // C#コードのSelect_PowHinmeiを再現
                .eq('rdy_siji_no', processNo)
                .single();

            if (instructionError) throw instructionError;

            // 2. 既存の温度・湿度を取得
            const { data: conditions, error: conditionsError } = await supabase
                .from('rt_sikomi')
                .select('temperature, humidity')
                .eq('pow_kotei_no', processNo)
                .maybeSingle(); // データがない場合もあるためmaybeSingle

            if (conditionsError) throw conditionsError;

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    productName: instruction.pow_hinmei,
                    temperature: conditions ? conditions.temperature : null,
                    humidity: conditions ? conditions.humidity : null,
                }),
            };

        } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ success: false, message: 'データ取得エラー' }) };
        }
    }

    // --- POSTリクエスト：温度・湿度をDBに保存 ---
    if (httpMethod === 'POST') {
        try {
            const { process_no, temperature, humidity, employee_code } = JSON.parse(body);

            // 既存データがあるか確認
            const { data: existing, error: selectError } = await supabase
                .from('rt_sikomi')
                .select('pow_kotei_no')
                .eq('pow_kotei_no', process_no)
                .maybeSingle();

            if (selectError) throw selectError;

            if (existing) {
                // データがあれば更新 (UPDATE)
                const { error: updateError } = await supabase
                    .from('rt_sikomi')
                    .update({
                        temperature: temperature,
                        humidity: humidity,
                        upd_user: employee_code,
                        upd_date: new Date().toISOString(),
                    })
                    .eq('pow_kotei_no', process_no);
                if (updateError) throw updateError;
            } else {
                // データがなければ新規登録 (INSERT)
                // 元のC#の複雑なINSERT...SELECTを簡略化し、主要な情報のみ登録
                const { error: insertError } = await supabase
                    .from('rt_sikomi')
                    .insert({
                        pow_kotei_no: process_no,
                        temperature: temperature,
                        humidity: humidity,
                        begin_time: new Date().toISOString(),
                        cre_user: employee_code,
                        upd_user: employee_code,
                    });
                if (insertError) throw insertError;
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };

        } catch (error) {
            console.error('DB Save Error:', error);
            return { statusCode: 500, body: JSON.stringify({ success: false, message: 'データベースへの保存に失敗しました。' }) };
        }
    }

    // --- 対応しないHTTPメソッド ---
    return { statusCode: 405, body: 'Method Not Allowed' };
};
