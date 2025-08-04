// shikomi-conditions/script.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- 要素の取得 ---
    const workerNameDisplay = document.getElementById('worker-name-display');
    const processNoDisplay = document.getElementById('process-no-display');
    const productNameDisplay = document.getElementById('product-name-display');
    const tempInput = document.getElementById('temperature-input');
    const humidityInput = document.getElementById('humidity-input');
    const messageArea = document.getElementById('message-area');
    const okButton = document.getElementById('ok-button');
    const backButton = document.getElementById('back-button');

    // --- URLからパラメータを取得 ---
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');
    const employeeCode = params.get('syain_cd');
    const processNo = params.get('kotei_no');

    // --- 画面初期化処理 ---
    async function initialize() {
        // 戻るボタンのURLを設定
        backButton.href = `../shikomi-start/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}`;
        processNoDisplay.textContent = processNo;

        // 作業者名を取得して表示
        if (employeeCode) {
            try {
                const res = await fetch(`/.netlify/functions/set-worker?get_name=true&employee_code=${employeeCode}`);
                const result = await res.json();
                workerNameDisplay.textContent = result.success ? result.employee_name : '取得失敗';
            } catch {
                workerNameDisplay.textContent = 'エラー';
            }
        }

        // 工程情報（品名、既存の温度・湿度）を取得
        if (processNo) {
            try {
                const response = await fetch(`/.netlify/functions/start-process?process_no=${processNo}`);
                const data = await response.json();

                if (data.success) {
                    productNameDisplay.textContent = data.productName || '（品名なし）';
                    if (data.temperature) tempInput.value = data.temperature;
                    if (data.humidity) humidityInput.value = data.humidity;
                } else {
                    messageArea.className = 'error';
                    messageArea.textContent = data.message;
                }
            } catch (error) {
                messageArea.className = 'error';
                messageArea.textContent = '初期情報の取得に失敗しました。';
            }
        }
    }

    // --- イベントリスナーの設定 ---
    okButton.addEventListener('click', async () => {
        const temp = tempInput.value;
        const humidity = humidityInput.value;

        // 入力チェック
        if (!temp || !humidity) {
            messageArea.className = 'error';
            messageArea.textContent = '温度と湿度を両方入力してください。';
            return;
        }
        if (isNaN(temp) || isNaN(humidity) || temp <= 0 || temp >= 99 || humidity <= 0 || humidity >= 99) {
            messageArea.className = 'error';
            messageArea.textContent = '温度・湿度は0より大きく99未満の数値を入力してください。';
            return;
        }

        // サーバー関数を呼び出してデータを保存
        try {
            const response = await fetch('/.netlify/functions/start-process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    process_no: processNo,
                    temperature: temp,
                    humidity: humidity,
                    employee_code: employeeCode
                })
            });

            const result = await response.json();

            if (result.success) {
                // 成功したら次の画面（原料投入画面）へ
                window.location.href = `../shikomi-input/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}`;
            } else {
                messageArea.className = 'error';
                messageArea.textContent = result.message;
            }

        } catch (error) {
            messageArea.className = 'error';
            messageArea.textContent = 'データの保存に失敗しました。';
        }
    });

    // 初期化処理を実行
    initialize();
});
