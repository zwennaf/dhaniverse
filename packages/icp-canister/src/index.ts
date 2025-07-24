import { 
    Canister, 
    query, 
    update, 
    text, 
    nat64, 
    Record, 
    Vec, 
    Opt, 
    Principal, 
    init, 
    StableBTreeMap,
    ic,
    TimerId,
    Duration,
    setTimer,
    clearTimer,
    HttpResponse,
    HttpTransformArgs
} from 'azle';

// Types
const BankAccount = Record({
    principal: text,
    rupeesBalance: nat64,
    tokenBalance: nat64,
    createdAt: nat64,
    lastUpdated: nat64
});

const Transaction = Record({
    id: text,
    from: text,
    to: text,
    amount: nat64,
    currency: text, // 'rupees' or 'tokens'
    type: text, // 'deposit', 'withdraw', 'transfer', 'exchange'
    timestamp: nat64,
    status: text // 'pending', 'completed', 'failed'
});

const TradeRecord = Record({
    playerId: text,
    symbol: text,
    action: text, // 'buy' or 'sell'
    quantity: nat64,
    price: nat64,
    profit: nat64,
    timestamp: nat64
});

const Achievement = Record({
    id: text,
    playerId: text,
    title: text,
    description: text,
    category: text,
    rarity: text,
    unlockedAt: nat64,
    rewardAmount: nat64,
    rewardCurrency: text
});

const StockPrice = Record({
    symbol: text,
    price: nat64,
    change: text, // percentage change
    lastUpdated: nat64,
    source: text
});

const NewsItem = Record({
    id: text,
    title: text,
    summary: text,
    category: text, // 'finance', 'crypto', 'market'
    timestamp: nat64,
    impact: text // 'positive', 'negative', 'neutral'
});

// Storage
let accounts = StableBTreeMap(text, BankAccount, 0);
let transactions = StableBTreeMap(text, Transaction, 1);
let trades = StableBTreeMap(text, Vec(TradeRecord), 2);
let achievements = StableBTreeMap(text, Vec(Achievement), 3);
let stockPrices = StableBTreeMap(text, StockPrice, 4);
let financialNews = StableBTreeMap(text, NewsItem, 5);

// Timer management
let priceUpdateTimer: Opt<TimerId> = { None: null };
let newsUpdateTimer: Opt<TimerId> = { None: null };

export default Canister({
    // Initialize canister with timers
    init: init([], () => {
        console.log('Dhaniverse Banking Canister initialized');
        
        // Start periodic price updates every 5 minutes
        priceUpdateTimer = { 
            Some: setTimer(Duration.fromNanos(300_000_000_000n), updateStockPricesFromAPI)
        };
        
        // Start periodic news updates every 30 minutes
        newsUpdateTimer = { 
            Some: setTimer(Duration.fromNanos(1_800_000_000_000n), fetchFinancialNews)
        };
        
        // Initialize some default stock prices
        initializeDefaultStocks();
    }),

    // Banking Operations
    createAccount: update([text], BankAccount, (principal) => {
        const existingAccount = accounts.get(principal);
        if (existingAccount.Some) {
            return existingAccount.Some;
        }

        const newAccount = {
            principal,
            rupeesBalance: 1000n, // Starting balance
            tokenBalance: 0n,
            createdAt: BigInt(Date.now()),
            lastUpdated: BigInt(Date.now())
        };

        accounts.insert(principal, newAccount);
        return newAccount;
    }),

    getAccount: query([text], Opt(BankAccount), (principal) => {
        return accounts.get(principal);
    }),

    deposit: update([text, nat64, text], Transaction, (principal, amount, currency) => {
        const accountOpt = accounts.get(principal);
        if (accountOpt.None) {
            throw new Error('Account not found');
        }

        const account = accountOpt.Some;
        const transactionId = `dep_${principal}_${Date.now()}`;
        
        if (currency === 'rupees') {
            account.rupeesBalance += amount;
        } else if (currency === 'tokens') {
            account.tokenBalance += amount;
        } else {
            throw new Error('Invalid currency');
        }

        account.lastUpdated = BigInt(Date.now());
        accounts.insert(principal, account);

        const transaction = {
            id: transactionId,
            from: 'system',
            to: principal,
            amount,
            currency,
            type: 'deposit',
            timestamp: BigInt(Date.now()),
            status: 'completed'
        };

        transactions.insert(transactionId, transaction);
        return transaction;
    }),

    withdraw: update([text, nat64, text], Transaction, (principal, amount, currency) => {
        const accountOpt = accounts.get(principal);
        if (accountOpt.None) {
            throw new Error('Account not found');
        }

        const account = accountOpt.Some;
        const transactionId = `wit_${principal}_${Date.now()}`;

        if (currency === 'rupees') {
            if (account.rupeesBalance < amount) {
                throw new Error('Insufficient rupees balance');
            }
            account.rupeesBalance -= amount;
        } else if (currency === 'tokens') {
            if (account.tokenBalance < amount) {
                throw new Error('Insufficient token balance');
            }
            account.tokenBalance -= amount;
        } else {
            throw new Error('Invalid currency');
        }

        account.lastUpdated = BigInt(Date.now());
        accounts.insert(principal, account);

        const transaction = {
            id: transactionId,
            from: principal,
            to: 'system',
            amount,
            currency,
            type: 'withdraw',
            timestamp: BigInt(Date.now()),
            status: 'completed'
        };

        transactions.insert(transactionId, transaction);
        return transaction;
    }),

    exchangeCurrency: update([text, nat64, text, text], Transaction, (principal, amount, fromCurrency, toCurrency) => {
        const accountOpt = accounts.get(principal);
        if (accountOpt.None) {
            throw new Error('Account not found');
        }

        const account = accountOpt.Some;
        const exchangeRate = 10n; // 1 token = 10 rupees
        const transactionId = `exc_${principal}_${Date.now()}`;

        if (fromCurrency === 'rupees' && toCurrency === 'tokens') {
            if (account.rupeesBalance < amount) {
                throw new Error('Insufficient rupees balance');
            }
            const tokensToReceive = amount / exchangeRate;
            account.rupeesBalance -= amount;
            account.tokenBalance += tokensToReceive;
        } else if (fromCurrency === 'tokens' && toCurrency === 'rupees') {
            if (account.tokenBalance < amount) {
                throw new Error('Insufficient token balance');
            }
            const rupeesToReceive = amount * exchangeRate;
            account.tokenBalance -= amount;
            account.rupeesBalance += rupeesToReceive;
        } else {
            throw new Error('Invalid currency exchange');
        }

        account.lastUpdated = BigInt(Date.now());
        accounts.insert(principal, account);

        const transaction = {
            id: transactionId,
            from: principal,
            to: principal,
            amount,
            currency: `${fromCurrency}_to_${toCurrency}`,
            type: 'exchange',
            timestamp: BigInt(Date.now()),
            status: 'completed'
        };

        transactions.insert(transactionId, transaction);
        return transaction;
    }),

    // Trading Operations
    recordTrade: update([text, text, text, nat64, nat64, nat64], TradeRecord, (playerId, symbol, action, quantity, price, profit) => {
        const trade = {
            playerId,
            symbol,
            action,
            quantity,
            price,
            profit,
            timestamp: BigInt(Date.now())
        };

        const existingTrades = trades.get(playerId);
        if (existingTrades.Some) {
            existingTrades.Some.push(trade);
            trades.insert(playerId, existingTrades.Some);
        } else {
            trades.insert(playerId, [trade]);
        }

        return trade;
    }),

    getTrades: query([text], Vec(TradeRecord), (playerId) => {
        const playerTrades = trades.get(playerId);
        return playerTrades.Some || [];
    }),

    // Achievement System
    unlockAchievement: update([text, text, text, text, text, nat64, text], Achievement, (playerId, title, description, category, rarity, rewardAmount, rewardCurrency) => {
        const achievementId = `ach_${playerId}_${Date.now()}`;
        const achievement = {
            id: achievementId,
            playerId,
            title,
            description,
            category,
            rarity,
            unlockedAt: BigInt(Date.now()),
            rewardAmount,
            rewardCurrency
        };

        const existingAchievements = achievements.get(playerId);
        if (existingAchievements.Some) {
            existingAchievements.Some.push(achievement);
            achievements.insert(playerId, existingAchievements.Some);
        } else {
            achievements.insert(playerId, [achievement]);
        }

        // Award the achievement reward
        if (rewardAmount > 0n) {
            const accountOpt = accounts.get(playerId);
            if (accountOpt.Some) {
                const account = accountOpt.Some;
                if (rewardCurrency === 'rupees') {
                    account.rupeesBalance += rewardAmount;
                } else if (rewardCurrency === 'tokens') {
                    account.tokenBalance += rewardAmount;
                }
                account.lastUpdated = BigInt(Date.now());
                accounts.insert(playerId, account);
            }
        }

        return achievement;
    }),

    getAchievements: query([text], Vec(Achievement), (playerId) => {
        const playerAchievements = achievements.get(playerId);
        return playerAchievements.Some || [];
    }),

    // Leaderboard
    getTopTraders: query([], Vec(text), () => {
        // Simple implementation - return all players with trades
        const allTraders: string[] = [];
        for (const [playerId] of trades.items()) {
            allTraders.push(playerId);
        }
        return allTraders.slice(0, 10); // Top 10
    }),

    // Advanced ICP Features - HTTP Outcalls for Real-time Data
    fetchStockPrice: update([text], StockPrice, async (symbol) => {
        try {
            // HTTP Outcall to fetch real stock price data
            const response = await ic.call(ic.management_canister.http_request, {
                args: [{
                    url: `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=demo`,
                    max_response_bytes: 2000n,
                    method: { GET: null },
                    headers: [],
                    body: null,
                    transform: { Some: { function: [ic.id(), 'transform_stock_response'], context: new Uint8Array() } }
                }]
            });

            if (response.status === 200n) {
                const data = JSON.parse(new TextDecoder().decode(response.body));
                const price = Math.floor(data.results?.[0]?.c * 100) || 10000n; // Default fallback
                
                const stockPrice = {
                    symbol,
                    price: BigInt(price),
                    change: '+2.5%', // Simplified for demo
                    lastUpdated: BigInt(Date.now()),
                    source: 'polygon.io'
                };

                stockPrices.insert(symbol, stockPrice);
                return stockPrice;
            }
        } catch (error) {
            console.log('HTTP outcall failed, using simulated data');
        }

        // Fallback to simulated data if HTTP outcall fails
        return generateSimulatedStockPrice(symbol);
    }),

    // HTTP Transform function (required for HTTP outcalls)
    transform_stock_response: query([HttpTransformArgs], HttpResponse, (args) => {
        return {
            status: args.response.status,
            body: args.response.body,
            headers: []
        };
    }),

    // Fetch financial news using HTTP outcalls
    fetchFinancialNews: update([], Vec(NewsItem), async () => {
        try {
            const response = await ic.call(ic.management_canister.http_request, {
                args: [{
                    url: 'https://newsapi.org/v2/top-headlines?category=business&country=in&apiKey=demo',
                    max_response_bytes: 5000n,
                    method: { GET: null },
                    headers: [],
                    body: null,
                    transform: { Some: { function: [ic.id(), 'transform_news_response'], context: new Uint8Array() } }
                }]
            });

            if (response.status === 200n) {
                const data = JSON.parse(new TextDecoder().decode(response.body));
                const articles = data.articles?.slice(0, 5) || [];
                
                const newsItems: any[] = [];
                articles.forEach((article: any, index: number) => {
                    const newsItem = {
                        id: `news_${Date.now()}_${index}`,
                        title: article.title || 'Financial Update',
                        summary: article.description || 'Market news update',
                        category: 'finance',
                        timestamp: BigInt(Date.now()),
                        impact: 'neutral'
                    };
                    
                    financialNews.insert(newsItem.id, newsItem);
                    newsItems.push(newsItem);
                });

                return newsItems;
            }
        } catch (error) {
            console.log('News fetch failed, generating simulated news');
        }

        // Fallback to simulated news
        return generateSimulatedNews();
    }),

    transform_news_response: query([HttpTransformArgs], HttpResponse, (args) => {
        return {
            status: args.response.status,
            body: args.response.body,
            headers: []
        };
    }),

    // Timer-based automatic stock price updates
    updateStockPricesFromAPI: update([], text, async () => {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NFLX'];
        let updatedCount = 0;

        for (const symbol of symbols) {
            try {
                await ic.call(ic.id(), 'fetchStockPrice', { args: [symbol] });
                updatedCount++;
            } catch (error) {
                console.log(`Failed to update ${symbol}`);
            }
        }

        // Reset timer for next update
        if (priceUpdateTimer.Some) {
            clearTimer(priceUpdateTimer.Some);
        }
        priceUpdateTimer = { 
            Some: setTimer(Duration.fromNanos(300_000_000_000n), updateStockPricesFromAPI)
        };

        return `Updated ${updatedCount} stock prices via HTTP outcalls`;
    }),

    // Get current stock prices
    getStockPrices: query([], Vec(StockPrice), () => {
        const prices: StockPrice[] = [];
        for (const [symbol, price] of stockPrices.items()) {
            prices.push(price);
        }
        return prices;
    }),

    // Get latest financial news
    getFinancialNews: query([], Vec(NewsItem), () => {
        const news: NewsItem[] = [];
        for (const [id, item] of financialNews.items()) {
            news.push(item);
        }
        return news.slice(-10); // Return latest 10 news items
    }),

    // Advanced DeFi Staking with Compound Interest (Timer-based)
    createStakingPool: update([text, nat64, nat64], text, (playerId, amount, durationDays) => {
        const accountOpt = accounts.get(playerId);
        if (accountOpt.None) {
            throw new Error('Account not found');
        }

        const account = accountOpt.Some;
        if (account.tokenBalance < amount) {
            throw new Error('Insufficient tokens for staking');
        }

        // Deduct tokens from account
        account.tokenBalance -= amount;
        account.lastUpdated = BigInt(Date.now());
        accounts.insert(playerId, account);

        const poolId = `stake_${playerId}_${Date.now()}`;
        const maturityTime = BigInt(Date.now()) + (BigInt(durationDays) * 86400000n);

        // Set timer for automatic reward distribution
        const rewardTimer = setTimer(
            Duration.fromNanos(BigInt(durationDays) * 86400000000000n),
            () => distributeStakingRewards(poolId, playerId, amount)
        );

        // Store staking info (simplified - in real implementation, use proper storage)
        return `Staking pool ${poolId} created with timer ${rewardTimer}`;
    }),

    // Automated reward distribution via timers
    distributeStakingRewards: update([text, text, nat64], text, (poolId, playerId, stakedAmount) => {
        const accountOpt = accounts.get(playerId);
        if (accountOpt.Some) {
            const account = accountOpt.Some;
            const rewards = stakedAmount + (stakedAmount * 10n / 100n); // 10% APY
            account.tokenBalance += rewards;
            account.lastUpdated = BigInt(Date.now());
            accounts.insert(playerId, account);

            // Unlock achievement for completing staking
            const achievementId = `stake_complete_${Date.now()}`;
            const achievement = {
                id: achievementId,
                playerId,
                title: 'Staking Master',
                description: 'Successfully completed a staking period',
                category: 'staking',
                rarity: 'rare',
                unlockedAt: BigInt(Date.now()),
                rewardAmount: 100n,
                rewardCurrency: 'tokens'
            };

            const existingAchievements = achievements.get(playerId);
            if (existingAchievements.Some) {
                existingAchievements.Some.push(achievement);
                achievements.insert(playerId, existingAchievements.Some);
            } else {
                achievements.insert(playerId, [achievement]);
            }

            return `Rewards distributed: ${rewards} tokens to ${playerId}`;
        }
        return 'Player not found';
    }),

    // Health check with system stats
    healthCheck: query([], text, () => {
        const accountCount = accounts.len();
        const transactionCount = transactions.len();
        const newsCount = financialNews.len();
        const priceCount = stockPrices.len();
        
        return `Dhaniverse Banking Canister is healthy! Stats: ${accountCount} accounts, ${transactionCount} transactions, ${newsCount} news items, ${priceCount} stock prices. Timers active: ${priceUpdateTimer.Some ? 'Yes' : 'No'}`;
    })
});

// Helper functions
function generateSimulatedStockPrice(symbol: string): StockPrice {
    const basePrice = 10000n + BigInt(Math.floor(Math.random() * 5000));
    return {
        symbol,
        price: basePrice,
        change: Math.random() > 0.5 ? '+1.2%' : '-0.8%',
        lastUpdated: BigInt(Date.now()),
        source: 'simulated'
    };
}

function generateSimulatedNews(): NewsItem[] {
    const newsTemplates = [
        { title: 'Indian Stock Market Reaches New Heights', impact: 'positive' },
        { title: 'RBI Announces New Digital Currency Guidelines', impact: 'neutral' },
        { title: 'Tech Stocks Show Strong Performance', impact: 'positive' },
        { title: 'Cryptocurrency Regulations Updated', impact: 'neutral' },
        { title: 'Banking Sector Shows Steady Growth', impact: 'positive' }
    ];

    return newsTemplates.map((template, index) => ({
        id: `sim_news_${Date.now()}_${index}`,
        title: template.title,
        summary: 'Simulated financial news for educational purposes',
        category: 'finance',
        timestamp: BigInt(Date.now()),
        impact: template.impact
    }));
}

function initializeDefaultStocks(): void {
    const defaultStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NFLX'];
    defaultStocks.forEach(symbol => {
        stockPrices.insert(symbol, generateSimulatedStockPrice(symbol));
    });
}