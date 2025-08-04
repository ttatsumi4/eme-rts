// js/confirm-worker.js

document.addEventListener('DOMContentLoaded', async () => {
    // 要素を取得
    const bhtIdDisplay = document.getElementById('bht-id-display');
    const empCodeDisplay = document.getElementById('employee-code-display');
    const empNameDisplay = document.getElementById('employee-name-display');
    const messageArea = document.getElementById('message-area');
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    const backButton = document.getElementById('back-button');
    const confirmDetails = document.getElementById('confirm-details');
    const confirmQuestion = document.getElementById('confirm-question');

    // URLからパラメータ取得
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');
    const employeeCode = params.get('employee_code');

    bhtIdDisplay.textContent = bhtId || '不明';

    // 戻るボタンの行き先を設定
    const returnUrl = `./worker.html?bht_id=${bhtId}`;
    noButton.onclick = () => window.location.href = returnUrl;
    backButton.onclick = () => window.location.href = returnUrl;

    // 社員情報を取得して表示
    if (employeeCode) {
        empCodeDisplay.textContent = employeeCode;
        try {
            // ここでは社員名を取得するために関数を呼び出しますが、
            // 簡略化のため、set-worker関数に社員名取得ロジックも組み込みます。
            // 実際はget-user-detailsのような関数を別途作るのが理想です。
            const response = await fetch(`/.netlify/functions/set-worker?get_name=true&employee_code=${employeeCode}`);
            const result = await response.json();

            if (result.success) {
                empNameDisplay.textContent = result.employee_name;
            } else {
                // 社員が見つからない場合のエラー処理
                messageArea.className = 'error';
                messageArea.textContent = result.message;
                confirmDetails.style.display = 'none';
                confirmQuestion.style.display = 'none';
                yesButton.style.display = 'none';
                noButton.style.display = 'none';
            }
        } catch (error) {
            messageArea.className = 'error';
            messageArea.textContent = '社員情報の取得に失敗しました。';
        }
    }

    // 「はい」ボタンの処理
    yesButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/.netlify/functions/set-worker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bht_id: bhtId, employee_code: employeeCode })
            });
            const result = await response.json();

            if (result.success) {
                messageArea.className = 'success';
                messageArea.textContent = result.message;
                setTimeout(() => window.location.href = `../index.html?bht_id=${bhtId}`, 2000);
            } else {
                messageArea.className = 'error';
                messageArea.textContent = result.message;
            }
        } catch (error) {
            messageArea.className = 'error';
            messageArea.textContent = 'サーバーとの通信に失敗しました。';
        }
    });
});