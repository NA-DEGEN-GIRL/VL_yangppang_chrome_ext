document.addEventListener('DOMContentLoaded', async () => {
    // --- UI 요소 가져오기 ---
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    const quantityInput = document.getElementById('quantity');
    const lBuyVSellBtn = document.getElementById('lBuyVSell');
    const lSellVBuyBtn = document.getElementById('lSellVBuy');
    const orderbookIndexInput = document.getElementById('orderbookIndex');
    const submitOrderBtn = document.getElementById('submitOrder');
    const submitLighterBtn = document.getElementById('submitLighter');
    const submitVariationalBtn = document.getElementById('submitVariational');

    const priceRefreshIntervalInput = document.getElementById('priceRefreshInterval');
    const autoPriceUpdateToggleBtn = document.getElementById('autoPriceUpdateToggle');
    
    const autoLimitHedgeBtn = document.getElementById('autoLimitHedgeBtn');
    const deltaThresholdInput = document.getElementById('deltaThreshold');
    const hedgeIntervalInput = document.getElementById('hedgeInterval');
    const lockTimeoutInput = document.getElementById('lockTimeout');
    const autoHedgeStatusP = document.getElementById('autoHedgeStatus');

    const autoSubmitToggleBtn = document.getElementById('autoSubmitToggleBtn');
    const autoSubmitTotalInput = document.getElementById('autoSubmitTotal');
    const autoSubmitIntervalMinInput = document.getElementById('autoSubmitIntervalMin');
    const autoSubmitIntervalMaxInput = document.getElementById('autoSubmitIntervalMax');
    const autoSubmitStatusP = document.getElementById('autoSubmitStatus');

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
    let autoPriceUpdateInterval = null; 
    let currentOrderType = null; 

    // --- 설정 저장/불러오기 로직 ---
    const SETTING_IDS = [
        'coinSymbol', 'quantity', 'orderbookIndex', 'priceRefreshInterval',
        'deltaThreshold', 'hedgeInterval', 'lockTimeout',
        'autoSubmitTotal', 'autoSubmitIntervalMin', 'autoSubmitIntervalMax'
    ];

    async function loadSettings() {
        const settings = await chrome.storage.local.get(SETTING_IDS);
        SETTING_IDS.forEach(id => {
            const element = document.getElementById(id);
            if (element && settings[id] !== undefined) {
                element.value = settings[id];
            }
        });
        console.log('Settings loaded:', settings);
    }

    function saveSetting(key, value) {
        chrome.storage.local.set({ [key]: value });
    }

    await loadSettings();
    SETTING_IDS.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = element.tagName === 'SELECT' ? 'change' : 'input';
            element.addEventListener(eventType, () => {
                saveSetting(id, element.value);
            });
        }
    });

    // --- 포맷팅 및 데이터 요청 함수 ---
    function formatSize(value) {
        const num = parseFloat(value);
        return isNaN(num) ? '0.0000' : num.toFixed(4);
    }

    function formatPnlAndFunding(value) {
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? '0.0' : num.toFixed(1);
    }

    function parseCurrency(value) {
        if (!value || typeof value !== 'string') return 0;
        return parseFloat(value.replace(/[^0-9.-]/g, ''));
    }

    function formatCurrency(num) {
        if (isNaN(num)) return '$0.00';
        return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }

    function requestData() {
        const coin = coinSymbolInput.value.trim().toUpperCase() || 'BTC';
        chrome.runtime.sendMessage({ action: 'getInfo', coin: coin });
    }

    // --- 자동 업데이트 및 정리 ---
    positionInterval = setInterval(requestData, 1000); // 1초마다 데이터 요청
    window.addEventListener('unload', () => { 
        if (positionInterval) clearInterval(positionInterval);
        if (autoPriceUpdateInterval) clearInterval(autoPriceUpdateInterval);
        chrome.runtime.sendMessage({ action: 'stopAutoHedge' });
        chrome.runtime.sendMessage({ action: 'stopAutoSubmit' });
    });

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
        } else if (request.action === 'updateAutoHedgeStatus') {
            autoHedgeStatusP.textContent = `Status: ${request.status}`;
            if (request.status === 'Idle' || request.status.startsWith('Error')) {
                autoLimitHedgeBtn.textContent = 'Auto limit L -> market V';
                autoLimitHedgeBtn.classList.remove('active');
            } else {
                autoLimitHedgeBtn.textContent = 'STOP Auto HEDGE';
                autoLimitHedgeBtn.classList.add('active');
            }
            if(request.originalQuantity) {
                quantityInput.value = request.originalQuantity;
            }
        } else if (request.action === 'updateAutoSubmitStatus') {
            autoSubmitStatusP.textContent = `Status: ${request.status}`;
            if (request.status === 'Idle' || request.status.startsWith('Error') || request.status.startsWith('Completed')) {
                autoSubmitToggleBtn.textContent = 'Auto Submit All';
                autoSubmitToggleBtn.classList.remove('active');
            } else {
                autoSubmitToggleBtn.textContent = 'STOP Auto Submit';
                autoSubmitToggleBtn.classList.add('active');
            }
        }
    });

    // --- 가격 자동 새로고침 ---
    function startAutoPriceUpdate() {
        stopAutoPriceUpdate();
        const interval = parseInt(priceRefreshIntervalInput.value, 10);
        if (orderbookIndexInput.value !== 'X' && interval > 0 && currentOrderType) {
            autoPriceUpdateInterval = setInterval(() => {
                chrome.runtime.sendMessage({ action: 'updateOrderbookPrice', lighterOrder: currentOrderType, orderbookIndex: orderbookIndexInput.value });
            }, interval);
            autoPriceUpdateToggleBtn.textContent = 'Stop';
            autoPriceUpdateToggleBtn.classList.add('active');
        }
    }

    function stopAutoPriceUpdate() {
        if (autoPriceUpdateInterval) {
            clearInterval(autoPriceUpdateInterval);
            autoPriceUpdateInterval = null;
        }
        autoPriceUpdateToggleBtn.textContent = 'Start';
        autoPriceUpdateToggleBtn.classList.remove('active');
    }
    
    // --- 이벤트 리스너 ---
    autoPriceUpdateToggleBtn.addEventListener('click', () => {
        if (autoPriceUpdateToggleBtn.classList.contains('active')) {
            stopAutoPriceUpdate();
        } else {
            startAutoPriceUpdate();
        }
    });

    orderbookIndexInput.addEventListener('change', () => {
        if (autoPriceUpdateToggleBtn.classList.contains('active')) {
            startAutoPriceUpdate();
        }
    });

    autoLimitHedgeBtn.addEventListener('click', () => {
        if (autoLimitHedgeBtn.classList.contains('active')) {
            chrome.runtime.sendMessage({ action: 'stopAutoHedge' });
        } else {
            if (!currentOrderType) {
                alert('Please select a hedging direction first (L-Buy/V-Sell or L-Sell/V-Buy).');
                return;
            }
            chrome.runtime.sendMessage({
                action: 'startAutoHedge',
                coin: coinSymbolInput.value.trim().toUpperCase() || 'BTC',
                originalQuantity: quantityInput.value,
                delta: parseFloat(deltaThresholdInput.value),
                interval: parseInt(hedgeIntervalInput.value, 10),
                lockTimeout: parseInt(lockTimeoutInput.value, 10) * 1000
            });
        }
    });
    
    autoSubmitToggleBtn.addEventListener('click', () => {
        if (autoSubmitToggleBtn.classList.contains('active')) {
            chrome.runtime.sendMessage({ action: 'stopAutoSubmit' });
        } else {
            const total = parseInt(autoSubmitTotalInput.value, 10);
            const min = parseFloat(autoSubmitIntervalMinInput.value);
            const max = parseFloat(autoSubmitIntervalMaxInput.value);

            if (isNaN(total) || total <= 0) { alert('Total clicks must be a number greater than 0.'); return; }
            if (isNaN(min) || isNaN(max) || min <= 0 || max <= 0) { alert('Intervals must be numbers greater than 0.'); return; }
            if (min > max) { alert('Min interval cannot be greater than Max interval.'); return; }

            chrome.runtime.sendMessage({
                action: 'startAutoSubmit',
                total: total,
                minInterval: min * 1000,
                maxInterval: max * 1000
            });
        }
    });
    
    quantityInput.addEventListener('input', (e) => {
        if (e.target.value) chrome.runtime.sendMessage({ action: 'setQuantity', quantity: e.target.value });
    });

    setCoinBtn.addEventListener('click', () => {
        const coin = coinSymbolInput.value.trim().toUpperCase();
        if (coin) {
            chrome.runtime.sendMessage({ action: 'setCoin', coin: coin });
            setTimeout(requestData, 1000); 
        }
    });

    lBuyVSellBtn.addEventListener('click', () => {
        currentOrderType = 'buy';
        chrome.runtime.sendMessage({ action: 'executeHedgeOrder', lighterOrder: 'buy', variationalOrder: 'sell', orderbookIndex: orderbookIndexInput.value });
        if (orderbookIndexInput.value !== 'X' && autoPriceUpdateToggleBtn.classList.contains('active')) startAutoPriceUpdate();
    });

    lSellVBuyBtn.addEventListener('click', () => {
        currentOrderType = 'sell';
        chrome.runtime.sendMessage({ action: 'executeHedgeOrder', lighterOrder: 'sell', variationalOrder: 'buy', orderbookIndex: orderbookIndexInput.value });
        if (orderbookIndexInput.value !== 'X' && autoPriceUpdateToggleBtn.classList.contains('active')) startAutoPriceUpdate();
    });

    submitOrderBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'submitOrder' }));
    submitLighterBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'submitLighter' }));
    submitVariationalBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'submitVariational' }));
    
    requestData();
});