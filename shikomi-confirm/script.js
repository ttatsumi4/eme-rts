document.addEventListener('DOMContentLoaded', () => {
    console.log('Confirmation page loaded.');

    // --- 要素の取得 ---
    const processNoDisplay = document.getElementById('process-no-display');
    const productNameDisplay = document.getElementById('product-name-display');
    const materialDetails = document.getElementById('material-details');
    const materialName = document.getElementById('material-name');
    const lotDisplay = document.getElementById('lot-display');
    const expiryDisplay = document.getElementById('expiry-display');
    const weightDisplay = document.getElementById('weight-display');
    const messageArea = document.getElementById('message-area');
    const confirmButton = document.getElementById('confirm-button');
    const backButton = document.getElementById('back-button');
    const workerNameDisplay = document.getElementById('worker-name-display');

    // --- URLパラメータの取得 ---
    const params = new URLSearchParams(window.location.search);
    const bhtId = params.get('bht_id');
    const employeeCode = params.get('syain_cd');
    const processNo = params.get('kotei_no');
    const barcode = decodeURIComponent(params.get('barcode'));

    // --- 初期化処理 ---
    async function initialize() {
        // 戻るボタンの行き先を設定
        backButton.onclick = () => {
            window.location.href = `../shikomi-input/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}`;
        };

        // 作業者名と工程情報を取得 (入力画面と同様)
        // (この部分は共通関数化するとより良くなります)
        fetchWorkerName();
        const details = await fetchProcessDetails();
        
        if (details) {
            processNoDisplay.textContent = details.processNo;
            productNameDisplay.textContent = details.productName;
            const next = details.nextMaterial;
            materialDetails.textContent = `${next.seqNo}:${next.rmId} (${next.inCount}/${next.totalCount})`;
            materialName.textContent = next.rmName;
        }

        // バーコード情報を解析して表示
        if (barcode) {
            const parts = barcode.split(';');
            if(parts.length > 5) {
                lotDisplay.textContent = `LOT: ${parts[2]}`;
                expiryDisplay.textContent = `期限: ${parts[3]}`;
                weightDisplay.textContent = `重量: ${parts[5]} kg`;
            }
        }
    }

    // --- 確定ボタンのクリックイベント ---
    confirmButton.addEventListener('click', async () => {
        messageArea.textContent = '処理中...';
        confirmButton.disabled = true;

        try {
            const response = await fetch('/netlify/functions/process-material-input', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    process_no: processNo,
                    barcode: barcode,
                    employee_code: employeeCode
                })
            });

            const result = await response.json();

            if (result.success) {
                messageArea.textContent = '投入処理完了。次の画面へ遷移します...';
                // 成功したら入力画面に戻る
                setTimeout(() => {
                    window.location.href = `../shikomi-input/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}`;
                }, 1500);
            } else {
                messageArea.textContent = `エラー: ${result.message}`;
                confirmButton.disabled = false;
            }
        } catch (error) {
            console.error('Failed to confirm material input:', error);
            messageArea.textContent = 'サーバーとの通信に失敗しました。';
            confirmButton.disabled = false;
        }
    });
    
    // --- 共通の関数群 (入力画面のスクリプトからコピー) ---
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