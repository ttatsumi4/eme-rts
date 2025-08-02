document.addEventListener('DOMContentLoaded', async () => {
    // DOM要素を取得
    const menuContainer = document.getElementById('menu-container');
    const messageArea = document.getElementById('message-area');
    const workerNameSpan = document.getElementById('worker-name');

    // URLからBHT IDを取得 (例: http://localhost:8888/?bht_id=BHT-001)
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');

    if (!bhtId) {
        showMessage('BHT IDが指定されていません。');
        return;
    }

    try {
        // Netlify Functionを呼び出し
        const response = await fetch(`/.netlify/functions/get-menu-data?bht_id=${bhtId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'データの取得に失敗しました。');
        }

        // レスポンスのステータスに応じて画面を制御
        switch (data.status) {
            case 'ok':
                // 正常時: メニューを表示し、作業者名を設定
                workerNameSpan.textContent = data.worker.name;
                menuContainer.style.display = 'block';
                // メニューのリンクにパラメータを付与
                addParamsToLinks(bhtId, data.worker.code);
                break;

            case 'no_worker':
                // 作業者未設定時
                showMessage('作業者を設定して下さい。');
                workerNameSpan.textContent = '[未設定]';
                // 「作業者設定」メニューだけ表示するなどの制御も可能
                document.querySelector('a[href*="A001_300"]').style.display = 'block';
                break;

            case 'locked':
                // ロック時
                showMessage(`この端末はロックされています。(${data.reason})`);
                workerNameSpan.textContent = '[ロック中]';
                break;
            
            default:
                showMessage('未登録の端末です。');
                break;
        }

    } catch (error) {
        showMessage(`エラーが発生しました: ${error.message}`);
    }
});

// メッセージ表示用のヘルパー関数
function showMessage(text) {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = text;
    messageArea.style.display = 'block';
    document.getElementById('menu-container').style.display = 'none';
}

// 画面遷移時のためにリンクにパラメータを付与する関数
function addParamsToLinks(bhtId, workerCode) {
    const links = document.querySelectorAll('#menu-container a');
    links.forEach(link => {
        const originalUrl = link.dataset.url;
        link.href = `${originalUrl}?bht_id=${bhtId}&syain_cd=${workerCode}`;
    });
}