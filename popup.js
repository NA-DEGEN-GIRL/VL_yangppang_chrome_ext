document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 가져오기 ---
    const toggleDisplayModeBtn = document.getElementById('toggleDisplayModeBtn');
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    const quantityInput = document.getElementById('quantity');
    const lBuyVSellBtn = document.getElementById('lBuyVSell');
    const lSellVBuyBtn = document.getElementById('lSellVBuy');
    const orderbookIndexInput = document.getElementById('orderbookIndex');
    const submitOrderBtn = document.getElementById('submitOrder');
    const submitLighterBtn = document.getElementById('submitLighter');
    const submitVariationalBtn = document.getElementById('submitVariational');

    const lighterSizeCell = document.getElementById('lighter-size');
    const lighterPnlCell = document.getElementById('lighter-pnl');
    const lighterFundingCell = document.getElementById('lighter-funding');
    const variationalSizeCell = document.getElementById('variational-size');
    const variationalPnlCell = document.getElementById('variational-pnl');
    const variationalFundingCell = document.getElementById('variational-funding');
    const lighterBalanceCell = document.getElementById('lighter-balance');
    const variationalBalanceCell = document.getElementById('variational-balance');
    const totalBalanceCell = document.getElementById('total-balance');

    let positionInterval;

    // comment: 측면 패널 전환 기능 상태 확인 및 UI 설정
    chrome.storage.local.get('displayMode', ({ displayMode }) => {
        if (displayMode === 'sidePanel') {
            toggleDisplayModeBtn.textContent = 'Switch to Popup';
        } else {
            toggleDisplayModeBtn.textContent = 'Switch to Side Panel';
        }
    });

    // --- 포매팅 함수들 ---
    function formatSize(value) { const num = parseFloat(value); return isNaN(num) ? '0.0000' : num.toFixed(4); }
    function formatPnlAndFunding(value) { const num = parseFloat(String(value).replace(/[^0-9.-]/g, '')); return isNaN(num) ? '0.0' : num.toFixed(1); }
    function parseCurrency(value) { if (!value || typeof value !== 'string') return 0; return parseFloat(value.replace(/[^0-9.-]/g, '')); }
    function formatCurrency(num) { if (isNaN(num)) return '$0.00'; return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' }); }
    
    // --- 데이터 요청 및 자동 갱신 ---
    function requestData() {
        const coin = coinSymbolInput.value.trim().toUpperCase() || 'BTC';
        chrome.runtime.sendMessage({ action: 'getInfo', coin: coin });
    }
    positionInterval = setInterval(requestData, 1000);
    window.addEventListener('unload', () => { if (positionInterval) clearInterval(positionInterval); });

    // --- 백그라운드 메시지 수신 ---
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'updateDisplay') {
            const { lighterData, variationalData, lighterPortfolioValue, variationalPortfolioValue } = request;
            lighterSizeCell.textContent = lighterData ? formatSize(lighterData.position) : '0.0000';
            lighterPnlCell.textContent = lighterData ? formatPnlAndFunding(lighterData.pnl) : '0.0';
            lighterFundingCell.textContent = lighterData ? formatPnlAndFunding(lighterData.funding) : '0.0';
            variationalSizeCell.textContent = variationalData ? formatSize(variationalData.position) : '0.0000';
            variationalPnlCell.textContent = variationalData ? formatPnlAndFunding(variationalData.pnl) : '0.0';
            variationalFundingCell.textContent = variationalData ? formatPnlAndFunding(variationalData.funding) : '0.0';
            const lValue = parseCurrency(lighterPortfolioValue);
            const vValue = parseCurrency(variationalPortfolioValue);
            lighterBalanceCell.textContent = formatCurrency(lValue);
            variationalBalanceCell.textContent = formatCurrency(vValue);
            totalBalanceCell.textContent = formatCurrency(lValue + vValue);
        }
    });
    
    // --- 이벤트 리스너 ---
    toggleDisplayModeBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'toggleDisplayMode' }));
    quantityInput.addEventListener('input', (e) => { if (e.target.value) chrome.runtime.sendMessage({ action: 'setQuantity', quantity: e.target.value }); });
    setCoinBtn.addEventListener('click', () => {
        const coin = coinSymbolInput.value.trim().toUpperCase();
        if (coin) {
            chrome.runtime.sendMessage({ action: 'setCoin', coin: coin });
            setTimeout(requestData, 1000);
        }
    });
    lBuyVSellBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'executeHedgeOrder', lighterOrder: 'buy', variationalOrder: 'sell', orderbookIndex: orderbookIndexInput.value });
    });
    lSellVBuyBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'executeHedgeOrder', lighterOrder: 'sell', variationalOrder: 'buy', orderbookIndex: orderbookIndexInput.value });
    });
    submitOrderBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'submitOrder' }));
    submitLighterBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'submitLighter' }));
    submitVariationalBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'submitVariational' }));
});