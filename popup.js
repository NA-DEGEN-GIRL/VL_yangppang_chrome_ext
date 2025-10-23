document.addEventListener('DOMContentLoaded', () => {
    // --- UI 요소 가져오기 ---
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    
    // 테이블 셀(cell) 요소 가져오기 (수정된 부분)
    // 이 부분이 기존 파일에서 잘못되어 있었습니다.
    const lighterSizeCell = document.getElementById('lighter-size');
    const lighterPnlCell = document.getElementById('lighter-pnl');
    const lighterFundingCell = document.getElementById('lighter-funding');
    const variationalSizeCell = document.getElementById('variational-size');
    const variationalPnlCell = document.getElementById('variational-pnl');
    const variationalFundingCell = document.getElementById('variational-funding');

    let positionInterval;

    // --- 포매팅 함수들 ---
    function formatSize(value) {
        const num = parseFloat(value);
        return isNaN(num) ? '0.0000' : num.toFixed(4);
    }

    function formatPnlAndFunding(value) {
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? '0.0' : num.toFixed(1);
    }
    
    function requestPositions() {
        const coin = coinSymbolInput.value.trim().toUpperCase() || 'BTC';
        // 'getPositionSize'가 아닌 'getPositionInfo'로 요청
        chrome.runtime.sendMessage({ action: 'getPositionInfo', coin: coin });
    }

    // 팝업이 열리면 1초(1000ms) 간격으로 갱신 시작
    positionInterval = setInterval(requestPositions, 1000);

    window.addEventListener('unload', () => {
        if (positionInterval) clearInterval(positionInterval);
    });

    // 백그라운드로부터 메시지 수신 및 UI 업데이트
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updatePositionDisplay') {
            const { lighterData, variationalData } = request;

            // Lighter 데이터 업데이트
            if (lighterData) {
                lighterSizeCell.textContent = formatSize(lighterData.position);
                lighterPnlCell.textContent = formatPnlAndFunding(lighterData.pnl);
                lighterFundingCell.textContent = formatPnlAndFunding(lighterData.funding);
            } else {
                lighterSizeCell.textContent = '0.0000';
                lighterPnlCell.textContent = '0.0';
                lighterFundingCell.textContent = '0.0';
            }

            // Variational 데이터 업데이트
            if (variationalData) {
                variationalSizeCell.textContent = formatSize(variationalData.position);
                variationalPnlCell.textContent = formatPnlAndFunding(variationalData.pnl);
                variationalFundingCell.textContent = formatPnlAndFunding(variationalData.funding);
            } else {
                variationalSizeCell.textContent = '0.0000';
                variationalPnlCell.textContent = '0.0';
                variationalFundingCell.textContent = '0.0';
            }
        }
    });
    
    // --- 나머지 이벤트 리스너들은 기존과 동일 (정확한 동작을 위해 전체 코드 제공) ---
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