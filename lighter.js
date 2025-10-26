// https://app.lighter.xyz/trade/BTC (BTC 예시)

function setQuantity(quantity) {
    const inputField = document.querySelector('[data-testid="quantity-input"], [data-testid="place-order-size-input"]');
    if (!inputField) {
        console.error("오류: 수량 입력 필드를 찾을 수 없음.");
        return;
    }
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    if (!nativeInputValueSetter) {
        console.error("오류: 네이티브 value setter를 찾을 수 없음.");
        return;
    }
    nativeInputValueSetter.call(inputField, quantity);
    const inputEvent = new Event('input', { bubbles: true });
    inputField.dispatchEvent(inputEvent);
    console.log(`성공: 수량 입력 필드에 '${quantity}'가 입력됨.`);
}

function selectOrderType(type) {
    if (type.toLowerCase() !== 'buy' && type.toLowerCase() !== 'sell') {
        console.error("오류: type은 'buy' 또는 'sell'이어야 함.");
        return;
    }
    const maxAttempts = 20;
    let attempt = 0;
    const intervalId = setInterval(() => {
        let targetButton = null;
        if (type.toLowerCase() === 'buy') {
            targetButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Buy / Long'));
        } else {
            targetButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sell / Short'));
        }
        if (targetButton) {
            clearInterval(intervalId);
            targetButton.click();
            console.log(`성공: '${targetButton.textContent.trim()}' 버튼 클릭.`);
        } else if (attempt >= maxAttempts) {
            clearInterval(intervalId);
            console.error(`오류: '${type}' 관련 버튼을 찾을 수 없음.`);
        }
        attempt++;
    }, 100);
}

function clickSubmitButton() {
    const submitButton = document.querySelector('[data-testid="submit-button"], [data-testid="place-order-button"]');
    if (submitButton) {
        submitButton.click();
        console.log("성공: 제출 버튼 클릭.");
    } else {
        console.error("오류: 제출 버튼을 찾을 수 없음.");
    }
}

/**
 * Lighter 오더북의 특정 가격을 클릭하는 함수.
 * @param {string} orderType 'buy' 또는 'sell'
 * @param {number} index 사용자가 팝업에서 입력한 인덱스 (0-10)
 */
function clickOrderBookPrice(orderType, index) {
    // comment: 오더북은 0~10까지만 존재하므로 최대값을 10으로 제한
    if (typeof index !== 'number' || index < 0 || index > 10) {
        console.error(`오류: 유효하지 않은 인덱스 값: ${index} (0-10만 허용)`);
        return;
    }

    let targetElement;
    if (orderType === 'buy') {
        const selector = `div[data-testid="ob-bid-${index}"] span[data-testid="price"]`;
        targetElement = document.querySelector(selector);
        if (!targetElement) console.error(`오류: Bid 요소를 찾지 못함. Selector: ${selector}`);
    } else if (orderType === 'sell') {
        // comment: ask는 0~10까지이므로 10에서 빼기로 역순 계산
        const reversedIndex = 10 - index;
        if (reversedIndex < 0 || reversedIndex > 10) {
            console.error(`오류: 계산된 Ask 인덱스 범위 초과: ${index} -> ${reversedIndex}`);
            return;
        }
        const selector = `div[data-testid="ob-ask-${reversedIndex}"] span[data-testid="price"]`;
        targetElement = document.querySelector(selector);
        if (!targetElement) console.error(`오류: Ask 요소를 찾지 못함. Selector: ${selector}`);
    } else {
        console.error(`오류: 알 수 없는 orderType: ${orderType}`);
        return;
    }

    if (targetElement) {
        targetElement.click();
        console.log(`성공: Lighter 오더북 ${orderType} 위치(${index}) 클릭.`);
    }
}

function clickMarketButton() {
    const marketButton = document.querySelector('[data-testid="select-order-type-market"]');
    if (marketButton) {
        marketButton.click();
        console.log("성공: Market 버튼 클릭.");
    } else {
        console.error("오류: Market 버튼을 찾을 수 없음.");
    }
}

function getPositions(coinFilter = null) {
    let positions = [];
    let positionRows = Array.from(document.querySelectorAll('div[data-testid="positions-table-row"]'));
    if (positionRows.length === 0) return positions;
    positionRows.forEach((row) => {
        try {
            const coinSpan = row.querySelector('span[title$="-PERP"]');
            if(!coinSpan) return;
            const coinName = coinSpan.getAttribute('title').replace('-PERP','').trim();
            if (coinFilter && coinName.toUpperCase() !== coinFilter.toUpperCase()) return;
            const cells = row.querySelectorAll(':scope > div');
            if (cells.length < 9) return;
            const pnlCell = Array.from(cells).find(cell => cell.querySelector('span.text-ellipsis'));
            const pnlSpan = pnlCell ? pnlCell.querySelector('span.text-ellipsis') : null;
            const unrealizedPnl = pnlSpan ? pnlSpan.textContent.trim().split(' (')[0] : '0';
            const funding = cells[cells.length - 1].textContent.trim();
            const positionSize = cells[1].textContent.trim();
            positions.push({ coin: coinName, position: positionSize, pnl: unrealizedPnl, funding: funding });
        } catch (e) { console.error(`포지션 파싱 오류:`, e); }
    });
    return positions;
}

function getPortfolioValue() {
    const portfolioContainer = document.querySelector('[data-testid="portfolio-summary"]');
    if (!portfolioContainer) return null;
    try {
        const valueSpan = Array.from(portfolioContainer.querySelectorAll('span')).find(s => s.textContent.includes('$'));
        return valueSpan ? valueSpan.textContent.trim() : null;
    } catch (e) {
        console.error("포트폴리오 값 파싱 오류:", e);
        return null;
    }
}

// 모든 함수를 window 객체에 등록
window.setQuantity = setQuantity;
window.selectOrderType = selectOrderType;
window.clickSubmitButton = clickSubmitButton;
window.clickOrderBookPrice = clickOrderBookPrice;
window.clickMarketButton = clickMarketButton;
window.getPositions = getPositions;
window.getPortfolioValue = getPortfolioValue;