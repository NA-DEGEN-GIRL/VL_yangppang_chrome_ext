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
                resolve(injectionResults && injectionResults[0] ? injectionResults[0].result : null);
            });
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const { lighterTab, variationalTab } = await findTradingTabs();

        if (request.action === 'getInfo') {
            let lighterData = null;
            let variationalData = null;
            let lighterPortfolioValue = '0';
            let variationalPortfolioValue = '0';

            try {
                if (lighterTab) {
                    const [positions, portfolioValue] = await Promise.all([
                        executeOnTab(lighterTab.id, 'lighter.js', 'getPositions', [request.coin]),
                        executeOnTab(lighterTab.id, 'lighter.js', 'getPortfolioValue')
                    ]);
                    if (positions) {
                        lighterData = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase()) || null;
                    }
                    if (portfolioValue) {
                        lighterPortfolioValue = portfolioValue;
                    }
                }
                if (variationalTab) {
                    const [positions, portfolioValue] = await Promise.all([
                        executeOnTab(variationalTab.id, 'variational.js', 'getPositions', [request.coin]),
                        executeOnTab(variationalTab.id, 'variational.js', 'getPortfolioValue')
                    ]);
                    if (positions) {
                        variationalData = positions.find(p => p.coin.toUpperCase() === request.coin.toUpperCase()) || null;
                    }
                     if (portfolioValue) {
                        variationalPortfolioValue = portfolioValue;
                    }
                }
            } catch (error) {
                console.error("포지션/포트폴리오 정보를 가져오는 중 오류 발생:", error);
            }
            
            chrome.runtime.sendMessage({
                action: 'updateDisplay',
                lighterData: lighterData,
                variationalData: variationalData,
                lighterPortfolioValue: lighterPortfolioValue,
                variationalPortfolioValue: variationalPortfolioValue
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