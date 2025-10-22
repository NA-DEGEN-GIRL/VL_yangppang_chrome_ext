document.addEventListener('DOMContentLoaded', () => {
    const quantityInput = document.getElementById('quantity');
    const coinSymbolInput = document.getElementById('coinSymbol');
    const setCoinBtn = document.getElementById('setCoinBtn');
    const lBuyVSellBtn = document.getElementById('lBuyVSell');
    const lSellVBuyBtn = document.getElementById('lSellVBuy');
    const submitBtn = document.getElementById('submitOrder');

    // 수량 입력 시 background.js로 메시지 전송
    quantityInput.addEventListener('input', (e) => {
        const quantity = e.target.value;
        if (quantity) {
            chrome.runtime.sendMessage({
                action: 'setQuantity',
                quantity: quantity
            });
        }
    });

    // 코인 심볼 변경
    setCoinBtn.addEventListener('click', () => {
        const coin = coinSymbolInput.value.trim().toUpperCase();
        if (coin) {
            chrome.runtime.sendMessage({
                action: 'setCoin',
                coin: coin
            });
        }
    });

    // L-Buy, V-Sell 버튼 클릭
    lBuyVSellBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'selectOrderType',
            lighterOrder: 'buy',
            variationalOrder: 'sell'
        });
    });

    // L-Sell, V-Buy 버튼 클릭
    lSellVBuyBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'selectOrderType',
            lighterOrder: 'sell',
            variationalOrder: 'buy'
        });
    });

    // 주문 제출 버튼 클릭
    submitBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'submitOrder'
        });
    });
});