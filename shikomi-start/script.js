// shikomi-start/script.js

document.addEventListener('DOMContentLoaded', async () => {
    // 画面の要素を取得
    const workerNameDisplay = document.getElementById('worker-name-display');
    const barcodeInput = document.getElementById('process-barcode-input');
    const messageArea = document.getElementById('message-area');
    const backButton = document.getElementById('back-button');

    // URLからパラメータを取得
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');
    const employeeCode = params.get('syain_cd');

    // 戻るボタンのURLを設定
    backButton.href = `../index.html?bht_id=${bhtId}`;

    // 社員CDを元に作業者名を取得して表示
    if (employeeCode) {
        try {
            // 既存のset-worker関数を流用して社員名を取得
            const response = await fetch(`/.netlify/functions/set-worker?get_name=true&employee_code=${employeeCode}`);
            const result = await response.json();
            if (result.success) {
                workerNameDisplay.textContent = result.employee_name;
            } else {
                workerNameDisplay.textContent = '取得失敗';
            }
        } catch (error) {
            workerNameDisplay.textContent = 'エラー';
        }
    } else {
        workerNameDisplay.textContent = '不明';
    }

    // 工程バーコード入力時の処理
    barcodeInput.addEventListener('change', async (event) => {
        const barcode = event.target.value.trim();
        messageArea.textContent = '';
        messageArea.className = '';

        // 1. フロントエンドでの簡単な入力チェック
        if (!barcode.startsWith('005') && !barcode.startsWith('028') && !barcode.startsWith('036')) {
            messageArea.className = 'error';
            messageArea.textContent = '指示書バーコードを正しく読み取ってください。(BHT0001)';
            return;
        }
        if (barcode.length < 9) {
            messageArea.className = 'error';
            messageArea.textContent = '指示書バーコードの桁数が不足しています。(BHT0001)';
            return;
        }

        const processNo = barcode.substring(3);
        messageArea.textContent = '検証中...';

        // 2. サーバー関数を呼び出して詳細なチェックを実行
        try {
            const response = await fetch('/.netlify/functions/validate-process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ process_no: processNo })
            });

            const result = await response.json();

            if (result.success) {
                messageArea.className = 'success';
                messageArea.textContent = 'チェックOK。次の画面へ進みます。';
                // 実際のアプリケーションでは、ここで次の画面に遷移します
                // window.location.href = `../next-screen/index.html?kotei_no=${processNo}`;
            } else {
                // サーバーから返されたエラーメッセージを表示
                messageArea.className = 'error';
                messageArea.textContent = `${result.message} (${result.errorCode})`;
            }

        } catch (error) {
            messageArea.className = 'error';
            messageArea.textContent = 'サーバーとの通信に失敗しました。';
        }
    });
});
