// Lighter와 Variational 탭을 찾는 함수
async function findTradingTabs() {
    const tabs = await chrome.tabs.query({});
    const lighterTab = tabs.find(tab => tab.url && tab.url.includes('app.lighter.xyz/trade/'));
    const variationalTab = tabs.find(tab => tab.url && tab.url.includes('omni.variational.io/perpetual/'));
    return { lighterTab, variationalTab };
}

// 특정 탭에 스크립트를 주입하여 함수를 실행하는 함수
function executeOnTab(tabId, file, functionName, args = []) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [file],
    }, () => {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (name, funcArgs) => {
                // window 객체에 함수가 정의되어 있는지 확인 후 실행
                if (typeof window[name] === 'function') {
                    window[name](...funcArgs);
                }
            },
            args: [functionName, args],
        });
    });
}

// 팝업으로부터 메시지를 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const { lighterTab, variationalTab } = await findTradingTabs();

        if (request.action === 'setQuantity') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'setQuantity', [request.quantity]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'setQuantity', [request.quantity]);
        }
        else if (request.action === 'selectOrderType') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'selectOrderType', [request.lighterOrder]);
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'selectOrderType', [request.variationalOrder]);
        }
        else if (request.action === 'submitOrder') {
            if (lighterTab) executeOnTab(lighterTab.id, 'lighter.js', 'clickSubmitButton');
            if (variationalTab) executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton');
        }
        else if (request.action === 'setCoin') {
            if (lighterTab) {
                chrome.tabs.update(lighterTab.id, { url: `https://app.lighter.xyz/trade/${request.coin}` });
            }
            if (variationalTab) {
                chrome.tabs.update(variationalTab.id, { url: `https://omni.variational.io/perpetual/${request.coin}` });
            }
        }
    })();
    return true; // 비동기 응답을 위해 true 반환
});