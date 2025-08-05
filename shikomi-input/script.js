// shikomi-input/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- ログ追加 ---
    console.log('DOM Content Loaded. Initializing script...');

    // --- 要素の取得 ---
    const workerNameDisplay = document.getElementById('worker-name-display');
    const processNoDisplay = document.getElementById('process-no-display');
    const productNameDisplay = document.getElementById('product-name-display');
    const progressText = document.getElementById('progress-text');
    const messageArea = document.getElementById('message-area');
    const materialDetails = document.getElementById('material-details');
    const materialName = document.getElementById('material-name');
    const barcodeInput = document.getElementById('barcode-input');
    const backButton = document.getElementById('back-button');

    // --- URLからパラメータを取得 ---
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');
    const employeeCode = params.get('syain_cd');
    const processNo = params.get('kotei_no');

    // --- ログ追加 ---
    console.log('URL Parameters:', { bhtId, employeeCode, processNo });

    // --- グローバル変数 ---
    let currentProcessState = {};

    // --- 画面初期化処理 ---
    async function initialize() {
        console.log('Initialize function started.');
        // 戻るボタンのURLを設定
        backButton.onclick = () => {
            window.location.href = `../shikomi-conditions/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}`;
        };

        // 作業者名を取得して表示
        if (employeeCode) {
            try {
                console.log('Fetching worker name for employee code:', employeeCode);
                const res = await fetch(`/.netlify/functions/set-worker?get_name=true&employee_code=${employeeCode}`);
                const result = await res.json();
                console.log('Worker name response:', result);
                workerNameDisplay.textContent = result.success ? result.employee_name : '取得失敗';
            } catch(error) {
                console.error('Failed to fetch worker name:', error);
                workerNameDisplay.textContent = 'エラー';
            }
        }

        // 工程の詳細情報をサーバーから取得してUIを更新
        await fetchProcessDetails();
        console.log('Initialize function finished.');
    }

    // --- UI更新関数 ---
    function updateUI(state) {
        console.log('Updating UI with new state:', state);
        currentProcessState = state; // 現在の状態を保存

        processNoDisplay.textContent = state.processNo;
        productNameDisplay.textContent = state.productName;
        progressText.textContent = `${state.progressCurrent} / ${state.progressTotal}`;

        if (state.isComplete) {
            messageArea.textContent = '全ての原料の投入が完了しました。';
            materialDetails.textContent = '完了';
            materialName.textContent = '-';
            barcodeInput.disabled = true;
            // ここで完了画面へ遷移
            // window.location.href = `../shikomi-complete/index.html?kotei_no=${processNo}`;
        } else {
            const next = state.nextMaterial;
            materialDetails.textContent = `${next.seqNo}:${next.rmId} (${next.inCount}/${next.totalCount})`;
            materialName.textContent = next.rmName;
            barcodeInput.value = ''; // 入力欄をクリア
            barcodeInput.focus(); // 再フォーカス
        }
    }

    // --- 工程情報取得関数 ---
    async function fetchProcessDetails() {
        try {
            console.log('Fetching process details for process_no:', processNo);
            const response = await fetch(`/.netlify/functions/get-process-details?process_no=${processNo}`);
            console.log('Process details response status:', response.status);
            const data = await response.json();
            console.log('Process details data:', data);

            if (data.success) {
                updateUI(data.state);
            } else {
                messageArea.textContent = data.message;
            }
        } catch (error) {
            console.error('Failed to fetch process details:', error);
            messageArea.textContent = '工程情報の取得に失敗しました。';
        }
    }

    // --- バーコード入力イベント ---
        barcodeInput.addEventListener('change', async (event) => {
        const barcode = event.target.value.trim();
        if (!barcode) return;

        messageArea.textContent = '検証中...';
        barcodeInput.disabled = true;

        try {
            // 新しく作成した検証関数を呼び出す
            const response = await fetch('/.netlify/functions/validate-material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barcode: barcode,
                    next_rm_id: currentProcessState.nextMaterial.rmId // 現在の工程で指示されている原料ID
                })
            });

            const result = await response.json();

            if (result.success) {
                // サーバーからの応答に応じて遷移先を決定
                if (result.next_screen === 'solvent') {
                    // 溶剤画面へ
                    console.log('Redirecting to SOLVENT page...');
                    window.location.href = `../shikomi-solvent/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}&barcode=${encodeURIComponent(barcode)}`;
                } else {
                    // 通常の確認画面へ
                    console.log('Redirecting to CONFIRM page...');
                    window.location.href = `../shikomi-confirm/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}&barcode=${encodeURIComponent(barcode)}`;
                }
            } else {
                // 検証でエラーが返ってきた場合
                messageArea.textContent = `エラー: ${result.message}`;
                barcodeInput.disabled = false;
                barcodeInput.value = '';
                barcodeInput.focus();
            }
        } catch (error) {
            console.error('Failed to validate barcode:', error);
            messageArea.textContent = 'サーバーとの通信に失敗しました。';
            barcodeInput.disabled = false;
        }
    });

    // --- 初期化処理を実行 ---
    initialize();
});
