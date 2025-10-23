async function findTradingTabs() {
    const tabs = await chrome.tabs.query({});
    const lighterTab = tabs.find(tab => tab.url && tab.url.includes('app.lighter.xyz/trade/'));
    const variationalTab = tabs.find(tab => tab.url && tab.url.includes('omni.variational.io/perpetual/'));
    return { lighterTab, variationalTab };
}

function executeOnTab(tabId, file, functionName, args = []) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [file],
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (name, funcArgs) => {
                    if (typeof window[name] === 'function') {
                        return window[name](...funcArgs);
                    }
                },
                args: [functionName, args],
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                // 스크립트 실행 결과가 없을 경우를 대비한 안정성 강화 코드 (수정된 부분)
                resolve(injectionResults && injectionResults[0] ? injectionResults[0].result : null);
            });
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const { lighterTab, variationalTab } = await findTradingTabs();

        if (request.action === 'getPositionInfo') {
            let lighterData = null;
            let variationalData = null;

            try {
                if (lighterTab) {
                    const positions = await executeOnTab(lighterTab.id, 'lighter.js', 'getPositions', [request.coin]);
                    // 반환된 positions가 null이 아닐 경우에만 find 실행 (수정된 부분)
                    if (positions) {
                        lighterData = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase()) || null;
                    }
                }
                if (variationalTab) {
                    const positions = await executeOnTab(variationalTab.id, 'variational.js', 'getPositions', [request.coin]);
                    // 반환된 positions가 null이 아닐 경우에만 find 실행 (수정된 부분)
                    if (positions) {
                        variationalData = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase()) || null;
                    }
                }
            } catch (error) {
                console.error("포지션 정보를 가져오는 중 오류 발생:", error);
            }
            
            chrome.runtime.sendMessage({
                action: 'updatePositionDisplay',
                lighterData: lighterData,
                variationalData: variationalData
            });

        // --- 나머지 액션들은 기존과 동일 ---
        } else if (request.action === 'setQuantity') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'setQuantity', [request.quantity]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'setQuantity', [request.quantity]);
        } else if (request.action === 'selectOrderType') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'selectOrderType', [request.lighterOrder]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'selectOrderType', [request.variationalOrder]);
        } else if (request.action === 'submitOrder') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'clickSubmitButton');
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton');
        } else if (request.action === 'submitLighter') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'clickSubmitButton');
        } else if (request.action === 'submitVariational') {
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton');
        } else if (request.action === 'setCoin') {
            if (lighterTab) chrome.tabs.update(lighterTab.id, { url: `https://app.lighter.xyz/trade/${request.coin}` });
            if (variationalTab) chrome.tabs.update(variationalTab.id, { url: `https://omni.variational.io/perpetual/${request.coin}` });
        }
    })();
    return true;
});