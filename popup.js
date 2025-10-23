document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 가져오기 ---
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    
    // 포지션 테이블 셀
    const lighterSizeCell = document.getElementById('lighter-size');
    const lighterPnlCell = document.getElementById('lighter-pnl');
    const lighterFundingCell = document.getElementById('lighter-funding');
    const variationalSizeCell = document.getElementById('variational-size');
    const variationalPnlCell = document.getElementById('variational-pnl');
    const variationalFundingCell = document.getElementById('variational-funding');
    
    // Balance 테이블 셀 (수정된 부분)
    const lighterBalanceCell = document.getElementById('lighter-balance');
    const variationalBalanceCell = document.getElementById('variational-balance');
    const totalBalanceCell = document.getElementById('total-balance');

    let positionInterval;

    // --- 포매팅 함수들 (기존과 동일) ---
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
        return num.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    
    function requestPositions() {
        const coin = coinSymbolInput.value.trim().toUpperCase() || 'BTC';
        chrome.runtime.sendMessage({ action: 'getInfo', coin: coin });
    }

    positionInterval = setInterval(requestPositions, 1000);

    window.addEventListener('unload', () => {
        if (positionInterval) clearInterval(positionInterval);
    });

    // 백그라운드로부터 메시지 수신 및 UI 업데이트 (수정된 부분)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateDisplay') {
            const { lighterData, variationalData, lighterPortfolioValue, variationalPortfolioValue } = request;

            // 포지션 테이블 업데이트
            if (lighterData) {
                lighterSizeCell.textContent = formatSize(lighterData.position);
                lighterPnlCell.textContent = formatPnlAndFunding(lighterData.pnl);
                lighterFundingCell.textContent = formatPnlAndFunding(lighterData.funding);
            } else {
                lighterSizeCell.textContent = '0.0000';
                lighterPnlCell.textContent = '0.0';
                lighterFundingCell.textContent = '0.0';
            }

            if (variationalData) {
                variationalSizeCell.textContent = formatSize(variationalData.position);
                variationalPnlCell.textContent = formatPnlAndFunding(variationalData.pnl);
                variationalFundingCell.textContent = formatPnlAndFunding(variationalData.funding);
            } else {
                variationalSizeCell.textContent = '0.0000';
                variationalPnlCell.textContent = '0.0';
                variationalFundingCell.textContent = '0.0';
            }
            
            // Balance 테이블 계산 및 업데이트 (수정된 부분)
            const lValue = parseCurrency(lighterPortfolioValue);
            const vValue = parseCurrency(variationalPortfolioValue);
            const total = lValue + vValue;

            lighterBalanceCell.textContent = formatCurrency(lValue);
            variationalBalanceCell.textContent = formatCurrency(vValue);
            totalBalanceCell.textContent = formatCurrency(total);
        }
    });
    
    // --- 나머지 이벤트 리스너들은 기존과 동일 ---
    document.getElementById('quantity').addEventListener('input', (e) => {
        const quantity = e.target.value;
        if (quantity) chrome.runtime.sendMessage({ action: 'setQuantity', quantity: quantity });
    });
    
    setCoinBtn.addEventListener('click', () => {
        const coin = coinSymbolInput.value.trim().toUpperCase();
        if (coin) {
            chrome.runtime.sendMessage({ action: 'setCoin', coin: coin });
            requestPositions(); 
            setTimeout(requestPositions, 1000);
        }
    });

    document.getElementById('lBuyVSell').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'selectOrderType', lighterOrder: 'buy', variationalOrder: 'sell' });
    });
    
    document.getElementById('lSellVBuy').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'selectOrderType', lighterOrder: 'sell', variationalOrder: 'buy' });
    });
    
    document.getElementById('submitOrder').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitOrder' });
    });
    
    document.getElementById('submitLighter').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitLighter' });
    });

    document.getElementById('submitVariational').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitVariational' });
    });
});