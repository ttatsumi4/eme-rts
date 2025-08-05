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
    barcodeInput.addEventListener('change', (event) => {
    const barcode = event.target.value.trim();
    if (!barcode) return;

    // バーコード情報をURLパラメータとして渡し、確認画面へ遷移する
    console.log('Redirecting to confirmation page with barcode:', barcode);
    window.location.href = `../shikomi-confirm/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}&barcode=${encodeURIComponent(barcode)}`;
    });

    // --- 初期化処理を実行 ---
    initialize();
});
