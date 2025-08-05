// shikomi-input/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- ログ追加 ---
    console.log('DOM Content Loaded. Initializing script...');

    // --- 要素の取得 ---
    const workerNameDisplay = document.getElementById('worker-name-display');
    const processNoDisplay = document.getElementById('process-no-display');
    const productNameDisplay = document.getElementById('product-name-display');
    const progressText = document.getElementById('progress-text'); // progress-displayから変更
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

    console.log('URL Parameters:', { bhtId, employeeCode, processNo });

    // --- グローバル変数 ---
    let currentProcessState = {};

    // ▼▼▼ 修正点1: 初期状態でバーコード入力を無効化 ▼▼▼
    barcodeInput.disabled = true;

    // --- 画面初期化処理 ---
    async function initialize() {
        // ... (この中の処理は変更なし) ...
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
            barcodeInput.disabled = true; // 完了時も無効
        } else {
            const next = state.nextMaterial;
            // ▼▼▼ 修正点2: state.nextMaterialが存在するかチェック ▼▼▼
            if (next) {
                materialDetails.textContent = `${next.seqNo}:${next.rmId} (${next.inCount}/${next.totalCount})`;
                materialName.textContent = next.rmName;
                barcodeInput.value = ''; 
                barcodeInput.focus();
                barcodeInput.disabled = false; // ★データ読み込み後に有効化
            } else {
                // isCompleteではないが、次の原料がない場合（エラーケース）
                messageArea.textContent = '次の投入原料情報がありません。';
                barcodeInput.disabled = true;
            }
        }
    }

    // --- 工程情報取得関数 ---
    async function fetchProcessDetails() {
        // ... (この中の処理は変更なし) ...
    }
    
    // --- バーコード入力イベント ---
    barcodeInput.addEventListener('change', async (event) => {
        // ... (この中の処理は変更なし) ...
    });

    // --- 初期化処理を実行 ---
    initialize();
});