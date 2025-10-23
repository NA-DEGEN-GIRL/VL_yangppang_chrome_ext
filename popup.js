document.addEventListener('DOMContentLoaded', () => {
    // --- 기존 변수 선언 ---
    const quantityInput = document.getElementById('quantity');
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    const lBuyVSellBtn = document.getElementById('lBuyVSell');
    const lSellVBuyBtn = document.getElementById('lSellVBuy');
    const submitBtn = document.getElementById('submitOrder');
    const submitLighterBtn = document.getElementById('submitLighter');
    const submitVariationalBtn = document.getElementById('submitVariational');

    const lighterPositionSpan = document.getElementById('lighterPosition');
    const variationalPositionSpan = document.getElementById('variationalPosition');

    // 포지션 자동 갱신을 위한 Interval ID 저장 변수 (추가된 부분)
    let positionInterval;

    function formatPositionSize(value) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            return '0.0000';
        }
        return num.toFixed(4);
    }

    function requestPositions() {
        const coin = coinSymbolInput.value.trim().toUpperCase() || 'BTC';
        chrome.runtime.sendMessage({
            action: 'getPositionSize',
            coin: coin,
        });
    }

    // 팝업이 열리면 1초마다 포지션 정보를 자동으로 갱신 시작 (수정된 부분)
    positionInterval = setInterval(requestPositions, 1000); // 1000ms = 1초
    
    // 팝업이 닫힐 때 자동 갱신을 중지하여 불필요한 리소스 사용 방지 (추가된 부분)
    window.addEventListener('unload', () => {
        if (positionInterval) {
            clearInterval(positionInterval);
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updatePositionDisplay') {
            lighterPositionSpan.textContent = formatPositionSize(request.lighterPosition);
            variationalPositionSpan.textContent = formatPositionSize(request.variationalPosition);
        }
    });

    // --- 나머지 이벤트 리스너들은 기존과 동일 ---
    quantityInput.addEventListener('input', (e) => {
        const quantity = e.target.value;
        if (quantity) {
            chrome.runtime.sendMessage({ action: 'setQuantity', quantity: quantity });
        }
    });

    setCoinBtn.addEventListener('click', () => {
        const coin = coinSymbolInput.value.trim().toUpperCase();
        if (coin) {
            chrome.runtime.sendMessage({ action: 'setCoin', coin: coin });
            // 코인 변경 후에는 즉시 한 번, 그리고 1초 후에 다시 갱신을 시도
            requestPositions(); 
            setTimeout(requestPositions, 1000);
        }
    });

    lBuyVSellBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'selectOrderType', lighterOrder: 'buy', variationalOrder: 'sell' });
    });

    lSellVBuyBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'selectOrderType', lighterOrder: 'sell', variationalOrder: 'buy' });
    });

    submitBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitOrder' });
    });

    submitLighterBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitLighter' });
    });

    submitVariationalBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'submitVariational' });
    });
});