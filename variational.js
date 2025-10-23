ari// https://omni.variational.io/perpetual/BTC
// BTC 예시

/**
 * 웹페이지의 'Size' 입력 필드에 원하는 수량을 입력하는 스크립트.
 * (React 등 최신 프레임워크 호환 방식)
 * 이 코드를 Chrome 개발자 도구 (F12)의 Console 탭에서 실행할 것.
 * @param {string} quantity 입력할 수량 (예: '0.001', '50.5')
 */
function setQuantity(quantity) {
    // 첫 번째 사이트의 셀렉터: data-testid="quantity-input"
    const inputField = document.querySelector('[data-testid="quantity-input"]');

    if (!inputField) {
        console.error("오류: data-testid='quantity-input'을 가진 입력 필드를 찾을 수 없음.");
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

    const switchContainer = document.querySelector('[role="switch"]');
    if (!switchContainer) {
        console.error("오류: Buy/Sell 전환 컨테이너('[role=\"switch\"]')를 찾을 수 없음.");
        return;
    }

    const buttons = Array.from(switchContainer.querySelectorAll('button'));
    const targetButton = buttons.find(button => button.innerText.toLowerCase().startsWith(type.toLowerCase()));

    if (targetButton) {
        targetButton.click();
        console.log(`성공: '${type}' 버튼을 클릭했음.`);
    } else {
        console.error(`오류: '${type}' 버튼을 찾을 수 없음.`);
    }
}

/**
 * 최종 제출 버튼 (예: 'Buy BTC')을 클릭하는 함수.
 */
function clickSubmitButton() {
    const submitButton = document.querySelector('[data-testid="submit-button"]');
    if (submitButton) {
        submitButton.click();
        console.log("성공: 제출 버튼을 클릭했음.");
    } else {
        console.error("오류: 제출 버튼('[data-testid=\"submit-button\"]')을 찾을 수 없음.");
    }
}
function getPositions(coinFilter = null) {
    let positions = [];
    let positionRows = document.querySelectorAll('div[data-testid="positions-table-row"]');
    if (positionRows.length === 0) return positions;
    
    positionRows.forEach((row) => {
        try {
            const coinSpan = row.querySelector('span[title$="-PERP"]');
            if (!coinSpan) return;

            const coinName = coinSpan.getAttribute('title').replace('-PERP', '').trim();
            if (coinFilter && coinName.toUpperCase() !== coinFilter.toUpperCase()) {
                return;
            }

            const cells = row.querySelectorAll(':scope > div');
            if (cells.length < 2) return;
            const positionSize = cells[1].textContent.trim();
            
            if (coinName && positionSize) {
                positions.push({ coin: coinName, position: positionSize });
            }
        } catch (e) { console.error(`포지션 파싱 중 오류:`, e); }
    });
    return positions;
}

window.setQuantity = setQuantity;
window.selectOrderType = selectOrderType;
window.clickSubmitButton = clickSubmitButton;
window.getPositions = getPositions; // getPositions 함수를 window에 할당 (추가된 부분)