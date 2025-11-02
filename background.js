let autoHedgeState = {
    isRunning: false,
    intervalId: null,
    originalQuantity: '',
    coin: '',
    isHedging: false, 
    lockTimestamp: null,
    lastHedgeQuantity: null
};

let autoSubmitState = {
    isRunning: false,
    timeoutId: null,
    totalClicks: 0,
    clicksRemaining: 0,
    minInterval: 0,
    maxInterval: 0
};

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
                func: (name, funcArgs) => window[name] && window[name](...funcArgs),
                args: [functionName, args],
            }, (injectionResults) => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
                resolve(injectionResults && injectionResults[0] ? injectionResults[0].result : null);
            });
        });
    });
}

function stopAutoHedge(errorMessage = null) {
    if (autoHedgeState.intervalId) {
        clearInterval(autoHedgeState.intervalId);
    }
    
    if (!autoHedgeState.isRunning) return;

    autoHedgeState.isRunning = false;
    autoHedgeState.isHedging = false;
    autoHedgeState.lockTimestamp = null;
    autoHedgeState.intervalId = null;
    autoHedgeState.lastHedgeQuantity = null;

    chrome.runtime.sendMessage({
        action: 'updateAutoHedgeStatus',
        status: errorMessage ? `Error: ${errorMessage}` : 'Idle',
        originalQuantity: autoHedgeState.originalQuantity
    });
}

async function checkAndHedge(delta, lockTimeout) {
    if (!autoHedgeState.isRunning) return;

    try {
        if (autoHedgeState.isHedging) {
            const timeSinceLock = Date.now() - autoHedgeState.lockTimestamp;
            if (timeSinceLock > lockTimeout) {
                console.warn(`Lock Timeout (${lockTimeout}ms) exceeded. Forcing lock release.`);
                autoHedgeState.isHedging = false;
                autoHedgeState.lockTimestamp = null;
                chrome.runtime.sendMessage({ action: 'updateAutoHedgeStatus', status: 'Lock timed out, re-monitoring...' });
                return;
            }
            chrome.runtime.sendMessage({
                action: 'updateAutoHedgeStatus',
                status: `Waiting for hedge... (${Math.round(timeSinceLock / 1000)}s)`
            });
            return;
        }

        const { lighterTab, variationalTab } = await findTradingTabs();
        if (!lighterTab || !variationalTab) throw new Error('Trading tabs not found.');

        const [lighterPosArr, variationalPosArr] = await Promise.all([
            executeOnTab(lighterTab.id, 'lighter.js', 'getPositions', [autoHedgeState.coin]),
            executeOnTab(variationalTab.id, 'variational.js', 'getPositions', [autoHedgeState.coin])
        ]);

        const lPosData = lighterPosArr ? lighterPosArr.find(p => p.coin === autoHedgeState.coin) : null;
        const vPosData = variationalPosArr ? variationalPosArr.find(p => p.coin === autoHedgeState.coin) : null;

        const lSize = lPosData ? parseFloat(lPosData.position.replace(/,/g, '')) : 0;
        const vSize = vPosData ? parseFloat(vPosData.position.replace(/,/g, '')) : 0;
        
        const netPosition = lSize + vSize;
        const hedgeQuantity = Math.abs(netPosition);

        if (hedgeQuantity < delta) {
            if (autoHedgeState.isHedging) {
                 autoHedgeState.isHedging = false;
                 autoHedgeState.lockTimestamp = null;
            }
        }
        
        chrome.runtime.sendMessage({
            action: 'updateAutoHedgeStatus',
            status: `Monitoring... L:${lSize.toFixed(4)} V:${vSize.toFixed(4)} Net:${netPosition.toFixed(4)}`
        });
        
        if (hedgeQuantity >= delta) {
            autoHedgeState.isHedging = true;
            autoHedgeState.lockTimestamp = Date.now();
            
            const hedgeDirection = netPosition > 0 ? 'sell' : 'buy';
            const quantityToSet = String(hedgeQuantity.toFixed(5));

            console.log(`Delta(${delta}) 이상의 불균형(${hedgeQuantity}) 감지. Variational에 [${hedgeDirection}] 주문 실행.`);
            
            if (quantityToSet !== autoHedgeState.lastHedgeQuantity) {
                console.log(`New hedge quantity detected. Updating input to ${quantityToSet}`);
                await executeOnTab(variationalTab.id, 'variational.js', 'setQuantity', [quantityToSet]);
                autoHedgeState.lastHedgeQuantity = quantityToSet;
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            await executeOnTab(variationalTab.id, 'variational.js', 'clickMarketButton');
            await new Promise(resolve => setTimeout(resolve, 100));

            await executeOnTab(variationalTab.id, 'variational.js', 'selectOrderType', [hedgeDirection]);
            await new Promise(resolve => setTimeout(resolve, 100));

            await executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton');

            chrome.runtime.sendMessage({
                action: 'updateAutoHedgeStatus',
                status: `Hedging ${hedgeQuantity.toFixed(4)} on Variational...`
            });
        }
    } catch (error) {
        console.error('자동 헤징 중 오류 발생:', error);
        stopAutoHedge(error.message);
    }
}

async function runAutoSubmitCycle() {
    if (!autoSubmitState.isRunning || autoSubmitState.clicksRemaining <= 0) {
        stopAutoSubmit(autoSubmitState.clicksRemaining <= 0 ? 'Completed' : 'Stopped');
        return;
    }

    try {
        chrome.runtime.sendMessage({
            action: 'updateAutoSubmitStatus',
            status: `Clicking... (${autoSubmitState.totalClicks - autoSubmitState.clicksRemaining + 1}/${autoSubmitState.totalClicks})`
        });

        const { lighterTab, variationalTab } = await findTradingTabs();
        
        console.log(`Auto-Submit: Clicking ALL. Clicks remaining: ${autoSubmitState.clicksRemaining}`);
        
        await Promise.all([
            lighterTab ? executeOnTab(lighterTab.id, 'lighter.js', 'clickSubmitButton') : Promise.resolve(),
            variationalTab ? executeOnTab(variationalTab.id, 'variational.js', 'clickSubmitButton') : Promise.resolve()
        ]);

        autoSubmitState.clicksRemaining--;

        if (autoSubmitState.clicksRemaining > 0) {
            const delay = Math.random() * (autoSubmitState.maxInterval - autoSubmitState.minInterval) + autoSubmitState.minInterval;
            console.log(`Next click in ${Math.round(delay)}ms`);
            autoSubmitState.timeoutId = setTimeout(runAutoSubmitCycle, delay);
        } else {
            console.log('Auto-Submit: All clicks completed.');
            stopAutoSubmit('Completed');
        }
    } catch (error) {
        console.error('Auto-Submit error:', error);
        stopAutoSubmit(error.message);
    }
}

function stopAutoSubmit(statusMessage = 'Stopped') {
    if (autoSubmitState.timeoutId) {
        clearTimeout(autoSubmitState.timeoutId);
    }
    
    if (!autoSubmitState.isRunning) return;

    autoSubmitState.isRunning = false;
    autoSubmitState.timeoutId = null;
    
    const finalStatus = statusMessage === 'Completed' ? statusMessage : (statusMessage === 'Stopped' ? 'Idle' : `Error: ${statusMessage}`);
    chrome.runtime.sendMessage({
        action: 'updateAutoSubmitStatus',
        status: finalStatus
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        if (request.action === 'startAutoHedge') {
            if (autoHedgeState.isRunning) return;
            autoHedgeState.isRunning = true;
            autoHedgeState.isHedging = false;
            autoHedgeState.lockTimestamp = null;
            autoHedgeState.lastHedgeQuantity = null;
            autoHedgeState.originalQuantity = request.originalQuantity;
            autoHedgeState.coin = request.coin;
            autoHedgeState.intervalId = setInterval(checkAndHedge, request.interval, request.delta, request.lockTimeout);
            chrome.runtime.sendMessage({ action: 'updateAutoHedgeStatus', status: 'Monitoring started...' });
            return;
        }

        if (request.action === 'stopAutoHedge') {
            stopAutoHedge();
            return;
        }
        
        if (request.action === 'startAutoSubmit') {
            if (autoSubmitState.isRunning) return;
            autoSubmitState = {
                isRunning: true,
                totalClicks: request.total,
                clicksRemaining: request.total,
                minInterval: request.minInterval,
                maxInterval: request.maxInterval,
                timeoutId: null
            };
            runAutoSubmitCycle();
            return;
        }

        if (request.action === 'stopAutoSubmit') {
            stopAutoSubmit('Stopped');
            return;
        }

        const { lighterTab, variationalTab } = await findTradingTabs();
        
        if (request.action === 'getInfo') {
            let lighterData = null, variationalData = null;
            let lighterPortfolioValue = '0', variationalPortfolioValue = '0';
            try {
                if(lighterTab) {
                    [lighterData, lighterPortfolioValue] = await Promise.all([
                        executeOnTab(lighterTab.id, 'lighter.js', 'getPositions', [request.coin]),
                        executeOnTab(lighterTab.id, 'lighter.js', 'getPortfolioValue')
                    ]);
                }
                if(variationalTab) {
                   [variationalData, variationalPortfolioValue] = await Promise.all([
                        executeOnTab(variationalTab.id, 'variational.js', 'getPositions', [request.coin]),
                        executeOnTab(variationalTab.id, 'variational.js', 'getPortfolioValue')
                    ]);
                }
            } catch (error) { console.error("정보 수집 오류:", error); }
            chrome.runtime.sendMessage({ action: 'updateDisplay', lighterData: lighterData && lighterData[0], variationalData: variationalData && variationalData[0], lighterPortfolioValue, variationalPortfolioValue });
        
        } else if (request.action === 'executeHedgeOrder') {
            if (lighterTab) {
                if (request.orderbookIndex === 'X') {
                    await executeOnTab(lighterTab.id, 'lighter.js', 'clickMarketButton');
                }
                await executeOnTab(lighterTab.id, 'lighter.js', 'selectOrderType', [request.lighterOrder]);
                if (request.orderbookIndex !== 'X') {
                    await executeOnTab(lighterTab.id, 'lighter.js', 'clickOrderBookPrice', [request.lighterOrder, parseInt(request.orderbookIndex, 10)]);
                }
            }
            if (variationalTab) await executeOnTab(variationalTab.id, 'variational.js', 'selectOrderType', [request.variationalOrder]);
        
        } else if (request.action === 'updateOrderbookPrice') {
            if (lighterTab && request.orderbookIndex !== 'X') {
                await executeOnTab(lighterTab.id, 'lighter.js', 'clickOrderBookPrice', [request.lighterOrder, parseInt(request.orderbookIndex, 10)]);
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
            const coin = request.coin.toUpperCase();
            if (lighterTab) chrome.tabs.update(lighterTab.id, { url: `https://app.lighter.xyz/trade/${coin}` });
            if (variationalTab) chrome.tabs.update(variationalTab.id, { url: `https://omni.variational.io/perpetual/${coin}` });
        }
    })();
    return true; 
});