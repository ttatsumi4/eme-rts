// js/worker.js

document.addEventListener('DOMContentLoaded', () => {
    // 画面の要素を取得
    const bhtIdDisplay = document.getElementById('bht-id-display');
    const barcodeInput = document.getElementById('employee-barcode-input');
    const messageArea = document.getElementById('message-area');
    const backButton = document.getElementById('back-button');

    // URLからBHT IDを取得
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');

    // BHT IDを画面に表示し、戻るボタンのリンクにも設定
    if (bhtId) {
        bhtIdDisplay.textContent = bhtId;
        backButton.href = `../index.html?bht_id=${bhtId}`;
    } else {
        bhtIdDisplay.textContent = '不明';
        messageArea.className = 'error';
        messageArea.textContent = 'BHT IDが指定されていません。';
    }

    // バーコード入力欄のイベント処理
    barcodeInput.addEventListener('change', async (event) => {
        const barcode = event.target.value;

        // 入力値の基本チェック
        if (!barcode.startsWith('041') || barcode.length < 8) {
            messageArea.className = 'error';
            messageArea.textContent = '社員バーコードを正しく読み取れませんでした。';
            return;
        }

        // 社員番号を抽出
        const employeeCode = barcode.substring(3);

        // ★変更点：DB更新はせず、確認画面に遷移する
        window.location.href = `./confirm-worker.html?bht_id=${bhtId}&employee_code=${employeeCode}`;
    });
});