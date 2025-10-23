async function findTradingTabs() {
    const tabs = await chrome.tabs.query({});
    const lighterTab = tabs.find(tab => tab.url && tab.url.includes('app.lighter.xyz/trade/'));
    const variationalTab = tabs.find(tab => tab.url && tab.url.includes('omni.variational.io/perpetual/'));
    return { lighterTab, variationalTab };
}

// executeScript는 이제 결과를 반환할 수 있도록 Promise를 반환합니다.
function executeOnTab(tabId, file, functionName, args = []) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [file],
        }, () => {
             // 파일 주입 후 함수를 실행하고 결과를 받습니다.
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (name, funcArgs) => {
                    if (typeof window[name] === 'function') {
                        // 함수를 실행하고 그 결과를 반환합니다.
                        return window[name](...funcArgs);
                    }
                },
                args: [functionName, args],
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                // 결과를 resolve 합니다.
                resolve(injectionResults[0].result);
            });
        });
    });
}

// 팝업으로부터 메시지를 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const { lighterTab, variationalTab } = await findTradingTabs();

        if (request.action === 'getPositionSize') { // 포지션 크기 요청 처리 (추가된 부분)
            let lighterPosition = '0';
            let variationalPosition = '0';

            try {
                if (lighterTab) {
                    const positions = await executeOnTab(lighterTab.id, 'lighter.js', 'getPositions', [request.coin]);
                    const found = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase());
                    if (found) lighterPosition = found.position;
                }
                if (variationalTab) {
                    const positions = await executeOnTab(variationalTab.id, 'variational.js', 'getPositions', [request.coin]);
                    const found = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase());
                    if (found) variationalPosition = found.position;
                }
            } catch (error) {
                console.error("포지션 정보를 가져오는 중 오류 발생:", error);
            }
            
            // 결과를 팝업으로 다시 보냄
            chrome.runtime.sendMessage({
                action: 'updatePositionDisplay',
                lighterPosition: lighterPosition,
                variationalPosition: variationalPosition
            });

        } else if (request.action === 'setQuantity') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'setQuantity', [request.quantity]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'setQuantity', [request.quantity]);
        } else if (request.action === 'selectOrderType') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'selectOrderType', [request.lighterOrder]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'selectOrderType', [request.variationalOrder]);
        } else if (request.action === 'submitOrder') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'clickSubmitButton');
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton');
        } else if (request.action === 'submitLighter') { // Lighter 개별 주문 (추가된 부분)
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'clickSubmitButton');
        } else if (request.action === 'submitVariational') { // Variational 개별 주문 (추가된 부분)
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton');
        } else if (request.action === 'setCoin') {
            if (lighterTab) chrome.tabs.update(lighterTab.id, { url: `https://app.lighter.xyz/trade/${request.coin}` });
            if (variationalTab) chrome.tabs.update(variationalTab.id, { url: `https://omni.variational.io/perpetual/${request.coin}` });
        }
    })();
    return true; // 비동기 응답을 위해 true 반환
});