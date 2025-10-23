// https://app.lighter.xyz/trade/BTC
// BTC 예시

/**
 * 웹페이지의 'Size' 입력 필드에 원하는 수량을 입력하는 스크립트.
 * (React 등 최신 프레임워크 호환 방식)
 * 이 코드를 Chrome 개발자 도구 (F12)의 Console 탭에서 실행할 것.
 * @param {string} quantity 입력할 수량 (예: '0.001', '50.5')
 */
function setQuantity(quantity) {
    // 여러 사이트에서 사용 가능한 셀렉터
    const inputField = document.querySelector('[data-testid="quantity-input"], [data-testid="place-order-size-input"]');

    if (!inputField) {
        console.error("오류: 수량 입력 필드('[data-testid=\"quantity-input\"]' 또는 '[data-testid=\"place-order-size-input\"]')를 찾을 수 없음.");
        return;
    }

    // --- React와 같은 최신 프레임워크를 위한 가장 확실한 방법 ---
    // 1. HTMLInputElement의 네이티브 'value' setter 함수를 가져옴.
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    
    if (!nativeInputValueSetter) {
        console.error("오류: 네이티브 value setter를 찾을 수 없음.");
        return;
    }

    // 2. 네이티브 setter를 사용하여 inputField의 값을 강제로 설정.
    nativeInputValueSetter.call(inputField, quantity);

    // 3. 'input' 이벤트를 생성하고 dispatch하여 React가 값 변경을 감지하고
    //    내부 상태(state)를 업데이트하도록 함.
    const inputEvent = new Event('input', { bubbles: true });
    inputField.dispatchEvent(inputEvent);

    console.log(`성공: 수량 입력 필드에 '${quantity}'가 입력되었고, 프레임워크 상태 업데이트를 시도했음.`);
}


/**
 * 'Buy' 또는 'Sell' 버튼을 선택하여 클릭하는 함수.
 * @param {string} type 'buy' 또는 'sell'을 입력.
 */
function selectOrderType(type) {
    if (type.toLowerCase() !== 'buy' && type.toLowerCase() !== 'sell') {
        console.error("오류: type은 'buy' 또는 'sell'이어야 함.");
        return;
    }

    // 버튼이 렌더링될 때까지 최대 2초간 대기
    const maxAttempts = 20;
    let attempt = 0;

    const intervalId = setInterval(() => {
        // 페이지의 모든 버튼을 가져옴
        const allButtons = document.querySelectorAll('button');
        let targetButton = null;
        
        // 버튼 텍스트에 "Buy / Long" 또는 "Sell / Short"가 포함된 버튼을 직접 찾음
        if (type.toLowerCase() === 'buy') {
            targetButton = Array.from(allButtons).find(
                b => b.textContent.includes('Buy / Long')
            );
        } else { // type is 'sell'
            targetButton = Array.from(allButtons).find(
                b => b.textContent.includes('Sell / Short')
            );
        }

        // 만약 위 조건으로 버튼을 찾지 못했다면, 이전 사이트를 위해 fallback 로직 실행
        if (!targetButton) {
            const switchContainer = document.querySelector('[role="switch"]');
            if (switchContainer) {
                 targetButton = Array.from(switchContainer.querySelectorAll('button')).find(
                    b => b.textContent.trim().toLowerCase().startsWith(type.toLowerCase())
                );
            }
        }
        
        if (targetButton) {
            clearInterval(intervalId); // 버튼을 찾았으므로 대기 중단
            targetButton.click();
            console.log(`성공: '${targetButton.textContent.trim()}' 버튼을 클릭했음.`);
        } else if (attempt >= maxAttempts) {
            clearInterval(intervalId); // 시간 초과로 대기 중단
            console.error(`오류: 시간 내에 '${type}' 관련 버튼을 찾을 수 없음.`);
        }
        attempt++;
    }, 100); // 100ms 간격으로 재시도
}

/**
 * 최종 제출 버튼 (예: 'Buy BTC' 또는 'Place Market Order')을 클릭하는 함수.
 */
function clickSubmitButton() {
    // 두 종류의 제출 버튼을 모두 처리하기 위한 셀렉터
    const submitButton = document.querySelector('[data-testid="submit-button"], [data-testid="place-order-button"]');
    if (submitButton) {
        submitButton.click();
        console.log("성공: 제출 버튼을 클릭했음.");
    } else {
        console.error("오류: 제출 버튼('[data-testid=\"submit-button\"]' 또는 '[data-testid=\"place-order-button\"]')을 찾을 수 없음.");
    }
}

/**
 * 현재 페이지에 표시된 포지션 목록을 파싱하여 결과를 배열로 반환하는 스크립트.
 * @param {string | null} [coinFilter=null] (선택) 필터링할 코인 이름.
 * @returns {Array<Object>} 파싱된 포지션 객체의 배열.
 */
function getPositions(coinFilter = null) {
    let positions = [];
    let positionRows = document.querySelectorAll('tbody tr[data-testid^="row-"]');
    let layoutMode = 'table';
    if (positionRows.length === 0) {
        positionRows = document.querySelectorAll('div[data-index]');
        layoutMode = 'div';
    }
    if (positionRows.length === 0) return positions;
    positionRows.forEach((row) => {
        try {
            const directionDiv = row.querySelector('[data-testid="direction-long"], [data-testid="direction-short"]');
            if (!directionDiv) return;
            const isLong = directionDiv.dataset.testid === 'direction-long';
            const coinName = directionDiv.nextElementSibling.textContent.trim();
            if (coinFilter && coinName.toUpperCase() !== coinFilter.toUpperCase()) return;
            let quantity = null;
            if (layoutMode === 'table') {
                const sizeSpan = row.querySelectorAll('td')[1]?.querySelector('div > span:first-child');
                if (sizeSpan) quantity = sizeSpan.textContent.trim();
            } else {
                const sizeButton = Array.from(row.querySelectorAll('button')).find(btn => btn.querySelector('span')?.textContent.trim() === 'Size');
                const sizeSpan = sizeButton?.querySelector('div > span:first-child');
                if (sizeSpan) quantity = sizeSpan.textContent.trim();
            }
            if (quantity) {
                positions.push({ coin: coinName, position: isLong ? quantity : `-${quantity}` });
            }
        } catch (e) { console.error(`포지션 파싱 중 오류:`, e); }
    });
    return positions;
}

window.setQuantity = setQuantity;
window.selectOrderType = selectOrderType;
window.clickSubmitButton = clickSubmitButton;
window.getPositions = getPositions; // getPositions 함수를 window에 할당 (추가된 부분)