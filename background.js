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
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (name, funcArgs) => window[name](...funcArgs),
                args: [functionName, args],
            }, (injectionResults) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(injectionResults && injectionResults[0] ? injectionResults[0].result : null);
            });
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const { lighterTab, variationalTab } = await findTradingTabs();

        if (request.action === 'getInfo') {
            let lighterData = null, variationalData = null;
            let lighterPortfolioValue = '0', variationalPortfolioValue = '0';
            try {
                if (lighterTab) {
                    const [positions, portfolioValue] = await Promise.all([
                        executeOnTab(lighterTab.id, 'lighter.js', 'getPositions', [request.coin]),
                        executeOnTab(lighterTab.id, 'lighter.js', 'getPortfolioValue')
                    ]);
                    if (positions) lighterData = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase()) || null;
                    if (portfolioValue) lighterPortfolioValue = portfolioValue;
                }
                if (variationalTab) {
                    const [positions, portfolioValue] = await Promise.all([
                        executeOnTab(variationalTab.id, 'variational.js', 'getPositions', [request.coin]),
                        executeOnTab(variationalTab.id, 'variational.js', 'getPortfolioValue')
                    ]);
                    if (positions) variationalData = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase()) || null;
                    if (portfolioValue) variationalPortfolioValue = portfolioValue;
                }
            } catch (error) { console.error("정보 수집 중 오류:", error); }
            chrome.runtime.sendMessage({ action: 'updateDisplay', lighterData, variationalData, lighterPortfolioValue, variationalPortfolioValue });

        } else if (request.action === 'executeHedgeOrder') {
            // comment: 오더북 인덱스 값에 따라 분기 처리
            if (lighterTab) {
                if (request.orderbookIndex === 'X') {
                    // 'X'일 경우, 기존의 Buy/Sell 탭 클릭 방식 사용
                    executeOnTab(lighterTab.id, 'lighter.js', 'selectOrderType', [request.lighterOrder]);
                } else {
                    // 숫자일 경우, 새로운 오더북 클릭 방식 사용
                    const index = parseInt(request.orderbookIndex, 10);
                    executeOnTab(lighterTab.id, 'lighter.js', 'clickOrderBookPrice', [request.lighterOrder, index]);
                }
            }
            if (variationalTab) {
                executeOnTab(variationalTab.id, 'variational.js', 'selectOrderType', [request.variationalOrder]);
            }
        
        } else if (request.action === 'setQuantity') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'setQuantity', [request.quantity]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'setQuantity', [request.quantity]);
        
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
    return true; // 비동기 응답을 위해 항상 true 반환
});