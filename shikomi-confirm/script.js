document.addEventListener('DOMContentLoaded', () => {
    console.log('Confirmation page loaded.');

    // --- ▼▼▼ 要素の取得（追加）▼▼▼ ---
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

    // --- 初期化処理（修正）▼▼▼ ---
    // --- 初期化処理（修正）▼▼▼ ---
    async function initialize() {
        backButton.onclick = () => {
            window.location.href = `../shikomi-input/index.html?bht_id=${bhtId}&syain_cd=${employeeCode}&kotei_no=${processNo}`;
        };

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
            
            // ★★★ 条件式を修正 (> 5 から >= 4 へ) ★★★
            if (parts.length >= 4) {
                const lotFull = parts[2];
                const expiryDate = parts[3];
                // 重量(parts[5])が存在するかをチェック
                const weight = parts.length > 5 ? parts[5] : '---';

                lotDisplay.textContent = `LOT: ${lotFull}`;
                expiryDisplay.textContent = `期限: ${expiryDate}`;
                
                try {
                    const res = await fetch(`/.netlify/functions/get-material-unit?lot_full=${lotFull}`);
                    const result = await res.json();
                    const unit = result.success ? result.unit : '';
                    weightDisplay.textContent = `重量: ${weight} ${unit}`;
                } catch (err) {
                    console.error('Failed to fetch unit', err);
                    weightDisplay.textContent = `重量: ${weight}`; // 単位取得失敗時は単位なしで表示
                }
            }
        }
    }
    
    // --- 確定ボタンのクリックイベント（変更なし） ---
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
    
    // --- 共通の関数群（変更なし） ---
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