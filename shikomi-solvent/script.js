document.addEventListener('DOMContentLoaded', () => {
    // --- 要素の取得 ---
    const materialDisplay = document.getElementById('material-display');
    const messageArea = document.getElementById('message-area');
    const barcodeInput = document.getElementById('barcode-input');
    const backButton = document.getElementById('back-button');
    const nextButton = document.getElementById('next-button');
    const workerNameDisplay = document.getElementById('worker-name-display');
    const errorMessageArea = document.getElementById('error-message-area');

    // --- URLパラメータの取得 ---
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');
    const employeeCode = params.get('syain_cd');
    const processNo = params.get('kotei_no');
    // 注意：120画面から渡された「原料」のバーコード
    const materialBarcode = decodeURIComponent(params.get('barcode')); 

    // --- グローバル変数 ---
    let expectedMaterialId = '';

    // --- 初期化処理 ---
    async function initialize() {
        // 戻るボタンの行き先を設定
        backButton.onclick = () => {
            // 120画面に戻る
            window.location.href = `../shikomi-input/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}`;
        };

        // 作業者名を取得・表示
        fetchWorkerName();

        // 工程情報を取得して、投入すべき溶剤の情報を表示
        const details = await fetchProcessDetails();
        if (details && details.nextMaterial) {
            const next = details.nextMaterial;
            expectedMaterialId = next.rm_id; // 期待される原料IDを保存
            materialDisplay.textContent = `${next.rm_id}：${next.rm_name}`;
        }
    }

    // --- 溶剤缶バーコードの入力イベント ---
    barcodeInput.addEventListener('change', (event) => {
        let solventCanBarcode = event.target.value.trim();
        errorMessageArea.textContent = ''; // エラーメッセージをクリア
        
        // ASP版のロジック：先頭の「|」があれば除去
        if (solventCanBarcode.startsWith('|')) {
            solventCanBarcode = solventCanBarcode.substring(1);
        }

        // ASP版のロジック：原料IDの先頭3文字が一致するかチェック
        if (solventCanBarcode.substring(0, 3) !== expectedMaterialId.substring(0, 3)) {
            errorMessageArea.textContent = "エラー：指示と違う溶剤缶です。(BHT0083)";
            barcodeInput.value = ''; // 入力をクリア
            return;
        }

        // チェックを通過したら、元の「原料バーコード」を持って130の確認画面へ遷移
        window.location.href = `../shikomi-confirm/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}&barcode=${encodeURIComponent(materialBarcode)}`;
    });
    
    // --- 共通の関数群 (130画面のスクリプトからコピー) ---
    async function fetchWorkerName() {
        if (!employeeCode) return;
        try {
            const res = await fetch(`/.netlify/functions/set-worker?get_name=true&employee_code=${employeeCode}`);
            const result = await res.json();
            workerNameDisplay.textContent = result.success ? result.employee_name : '取得失敗';
        } catch(error) {
            console.error('Failed to fetch worker name:', error);
            workerNameDisplay.textContent = 'エラー';
        }
    }

    async function fetchProcessDetails() {
        try {
            const response = await fetch(`/.netlify/functions/get-process-details?process_no=${processNo}`);
            const data = await response.json();
            return data.success ? data.state : null;
        } catch (error) {
            console.error('Failed to fetch process details:', error);
            messageArea.textContent = '工程情報の取得に失敗しました。';
            return null;
        }
    }

    // --- 初期化実行 ---
    initialize();
});