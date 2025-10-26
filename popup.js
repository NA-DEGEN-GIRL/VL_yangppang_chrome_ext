document.addEventListener('DOMContentLoaded', () => {
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    const quantityInput = document.getElementById('quantity');
    const lBuyVSellBtn = document.getElementById('lBuyVSell');
    const lSellVBuyBtn = document.getElementById('lSellVBuy');
    const orderbookIndexInput = document.getElementById('orderbookIndex');
    const submitOrderBtn = document.getElementById('submitOrder');
    const submitLighterBtn = document.getElementById('submitLighter');
    const submitVariationalBtn = document.getElementById('submitVariational');
    
    // 자동 업데이트 관련 요소 (추가됨)
    const refreshIntervalInput = document.getElementById('refreshInterval');
    const autoUpdateToggleBtn = document.getElementById('autoUpdateToggle');

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
    let autoUpdateInterval = null; // 오더북 자동 업데이트 인터벌
    let currentOrderType = null; // 현재 선택된 주문 타입 ('buy' 또는 'sell')

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
    
    // 오더북 자동 업데이트 시작 함수 (추가됨)
    function startAutoUpdate() {
        const orderbookIndex = orderbookIndexInput.value;
        const interval = parseInt(refreshIntervalInput.value) || 200;
        
        if (orderbookIndex === 'X' || !currentOrderType) {
            alert('Please select an orderbook index (not X) and click L-Buy/V-Sell or L-Sell/V-Buy first');
            return;
        }
        
        stopAutoUpdate(); // 기존 인터벌 정리
        
        // 즉시 한번 실행
        chrome.runtime.sendMessage({ 
            action: 'updateOrderbookPrice',
            lighterOrder: currentOrderType,
            orderbookIndex: orderbookIndex
        });
        
        // 주기적 실행
        autoUpdateInterval = setInterval(() => {
            chrome.runtime.sendMessage({ 
                action: 'updateOrderbookPrice',
                lighterOrder: currentOrderType,
                orderbookIndex: orderbookIndexInput.value
            });
        }, interval);
        
        autoUpdateToggleBtn.textContent = 'Stop';
        autoUpdateToggleBtn.classList.add('active');
    }
    
    // 오더북 자동 업데이트 정지 함수 (추가됨)
    function stopAutoUpdate() {
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
        }
        autoUpdateToggleBtn.textContent = 'Start';
        autoUpdateToggleBtn.classList.remove('active');
    }
    
    // 자동 업데이트 토글 버튼 이벤트 (추가됨)
    autoUpdateToggleBtn.addEventListener('click', () => {
        if (autoUpdateInterval) {
            stopAutoUpdate();
        } else {
            startAutoUpdate();
        }
    });
    
    // 오더북 인덱스 변경 시 자동 업데이트 중지 (추가됨)
    orderbookIndexInput.addEventListener('change', () => {
        if (orderbookIndexInput.value === 'X') {
            stopAutoUpdate();
        }
    });
    
    positionInterval = setInterval(requestData, 1000);
    window.addEventListener('unload', () => { 
        if (positionInterval) clearInterval(positionInterval);
        if (autoUpdateInterval) clearInterval(autoUpdateInterval);
    });

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
        currentOrderType = 'buy'; // 현재 주문 타입 저장
        chrome.runtime.sendMessage({ 
            action: 'executeHedgeOrder', 
            lighterOrder: 'buy', 
            variationalOrder: 'sell', 
            orderbookIndex: orderbookIndexInput.value 
        });
        
        // 오더북이 선택되어 있고 자동 업데이트가 실행중이면 새로운 타입으로 업데이트
        if (orderbookIndexInput.value !== 'X' && autoUpdateInterval) {
            startAutoUpdate();
        }
    });
    
    lSellVBuyBtn.addEventListener('click', () => {
        currentOrderType = 'sell'; // 현재 주문 타입 저장
        chrome.runtime.sendMessage({ 
            action: 'executeHedgeOrder', 
            lighterOrder: 'sell', 
            variationalOrder: 'buy', 
            orderbookIndex: orderbookIndexInput.value 
        });
        
        // 오더북이 선택되어 있고 자동 업데이트가 실행중이면 새로운 타입으로 업데이트
        if (orderbookIndexInput.value !== 'X' && autoUpdateInterval) {
            startAutoUpdate();
        }
    });
    
    submitOrderBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitOrder' });
    });
    
    submitLighterBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitLighter' });
    });
    
    submitVariationalBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitVariational' });
    });
});