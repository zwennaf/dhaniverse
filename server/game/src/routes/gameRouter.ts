import { Router, RouterContext } from "oak";
import { oakCors } from "cors";
import { config } from "../config/config.ts";
import { mongodb } from "../db/mongo.ts";
import { verifyToken } from "../auth/jwt.ts";
import { ObjectId } from "mongodb";
import {
    PlayerStateDocument,
    BankAccountDocument,
    FixedDepositDocument,
    StockPortfolioDocument,
    StockTransactionDocument,
    COLLECTIONS,
} from "../db/schemas.ts";

const gameRouter = new Router();

// Database connection middleware
gameRouter.use(async (ctx, next) => {
    // Check database connection for all requests
    if (!mongodb.isHealthy()) {
        console.error(
            "❌ Database not connected when processing game request:",
            ctx.request.url.pathname
        );
        ctx.response.status = 503;
        ctx.response.body = {
            error: "Database service unavailable",
            message:
                "The database connection is not available. Please try again later.",
        };
        return;
    }

    await next();
});

// Add CORS middleware
gameRouter.use(
    oakCors({
        origin: (origin) => {
            if (
                !origin ||
                origin.includes("localhost") ||
                origin.includes("127.0.0.1")
            ) {
                return origin || "*";
            }
            return config.corsOrigins.includes(origin) ? origin : false;
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    })
);

// Authentication middleware
async function authenticateUser(
    ctx: RouterContext<string>,
    next: () => Promise<unknown>
) {
    try {
        const authHeader = ctx.request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            ctx.response.status = 401;
            ctx.response.body = { error: "Authorization token required" };
            return;
        }

        const token = authHeader.substring(7);
        const verified = await verifyToken(token);

        if (!verified) {
            ctx.response.status = 401;
            ctx.response.body = { error: "Invalid token" };
            return;
        }

        // Add user info to context
        ctx.state.userId = verified.userId;
        await next();
    } catch (error) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Authentication failed" };
        console.error("Auth middleware error:", error);
    }
}

// Apply authentication to all game routes
gameRouter.use(authenticateUser);

// ======================
// PLAYER STATE ENDPOINTS
// ======================

// Get player state
gameRouter.get("/game/player-state", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );

        let playerState = await playerStates.findOne({ userId });
        // Create initial player state if doesn't exist
        if (!playerState) {
            const newPlayerState: PlayerStateDocument = {
                userId,
                position: { x: 400, y: 300, scene: "main" },
                financial: {
                    rupees: 0, // Starting amount
                    totalWealth: 0,
                    bankBalance: 0,
                    stockPortfolioValue: 0,
                },
                inventory: {
                    items: [],
                    capacity: 20,
                },
                progress: {
                    level: 1,
                    experience: 0,
                    unlockedBuildings: ["bank", "stockmarket"],
                    completedTutorials: [],
                },
                onboarding: {
                    hasMetMaya: false,
                    hasFollowedMaya: false,
                    hasClaimedMoney: false,
                    hasCompletedBankOnboarding: false,
                    hasReachedStockMarket: false,
                    onboardingStep: 'not_started',
                    unlockedBuildings: { bank: false, atm: false, stockmarket: false }
                },
                settings: {
                    soundEnabled: true,
                    musicEnabled: true,
                    autoSave: true,
                },
                lastUpdated: new Date(),
            };

            const result = await playerStates.insertOne(newPlayerState);
            playerState = { ...newPlayerState, _id: result.insertedId };
        }

        // Backfill onboarding defaults if missing (for legacy players)
        let needsUpdate = false;
    const claimedLegacy = (playerState as (PlayerStateDocument & { starterClaimed?: boolean })).starterClaimed === true || playerState.progress?.completedTutorials?.includes('starter-claimed');
        if (!playerState.onboarding) {
            playerState.onboarding = {
                hasMetMaya: claimedLegacy, // if legacy claimed, treat as completed
                hasFollowedMaya: claimedLegacy,
                hasClaimedMoney: claimedLegacy,
                hasCompletedBankOnboarding: false,
                hasReachedStockMarket: false,
                onboardingStep: claimedLegacy ? 'claimed_money' : 'not_started',
                unlockedBuildings: { bank: claimedLegacy, atm: false, stockmarket: false }
            };
            needsUpdate = true;
        } else if (claimedLegacy && !playerState.onboarding.hasClaimedMoney) {
            // Upgrade partially existing onboarding state to claimed completion
            playerState.onboarding.hasMetMaya = true;
            playerState.onboarding.hasFollowedMaya = true;
            playerState.onboarding.hasClaimedMoney = true;
            playerState.onboarding.onboardingStep = 'claimed_money';
            playerState.onboarding.unlockedBuildings = { ...playerState.onboarding.unlockedBuildings, bank: true };
            needsUpdate = true;
        }
        if (needsUpdate) {
            await playerStates.updateOne({ userId }, { $set: { onboarding: playerState.onboarding, lastUpdated: new Date() } });
        }

        ctx.response.body = {
            success: true,
            data: playerState,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to get player state" };
        console.error("Get player state error:", error);
    }
});

// Update player state
gameRouter.put("/game/player-state", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );

        const updateData = {
            ...body,
            lastUpdated: new Date(),
        };

        await playerStates.updateOne(
            { userId },
            { $set: updateData },
            { upsert: true }
        );

        ctx.response.body = { success: true, message: "Player state updated" };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to update player state" };
        console.error("Update player state error:", error);
    }
});

// Update player rupees
gameRouter.put("/game/player-state/rupees", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { rupees, operation = "set" } = body; // operation can be "set", "add", "subtract"

        if (typeof rupees !== "number" || rupees < 0) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid rupees amount" };
            return;
        }

        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );

        let updateOperation: {
            $inc?: Record<string, number>;
            $set: Record<string, unknown>;
        };
        if (operation === "add") {
            updateOperation = {
                $inc: { "financial.rupees": rupees },
                $set: { lastUpdated: new Date() },
            };
        } else if (operation === "subtract") {
            updateOperation = {
                $inc: { "financial.rupees": -rupees },
                $set: { lastUpdated: new Date() },
            };
        } else {
            updateOperation = {
                $set: {
                    "financial.rupees": rupees,
                    lastUpdated: new Date(),
                },
            };
        }

        const result = await playerStates.updateOne(
            { userId },
            updateOperation
        );

        if (result.matchedCount === 0) {
            ctx.response.status = 404;
            ctx.response.body = { error: "Player state not found" };
            return;
        }

        // Get updated player state
        const updatedState = await playerStates.findOne({ userId });

        ctx.response.body = {
            success: true,
            data: {
                rupees: updatedState?.financial.rupees || 0,
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to update rupees" };
        console.error("Update rupees error:", error);
    }
});

// One-time starter money claim
// Get starter claim status (idempotent, used by client to decide dialogue flow)
gameRouter.get("/game/player-state/starter-status", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const playerStates = mongodb.getCollection<PlayerStateDocument>(COLLECTIONS.PLAYER_STATES);
        const playerState = await playerStates.findOne({ userId });
        if (!playerState) {
            ctx.response.status = 200; // Treat as new user; client will show claim path
            ctx.response.body = { success: true, claimed: false, rupees: 0 };
            return;
        }
        const ps = playerState as PlayerStateDocument & { starterClaimed?: boolean };
        const claimed = ps.starterClaimed === true || ps.progress?.completedTutorials?.includes("starter-claimed");
        ctx.response.body = { success: true, claimed, rupees: playerState.financial?.rupees ?? 0 };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to get starter status" };
        console.error("Starter status error:", error);
    }
});

// One-time starter money claim (idempotent): returns current balance and whether newly claimed
gameRouter.post("/game/player-state/claim-starter", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const playerStates = mongodb.getCollection<PlayerStateDocument>(COLLECTIONS.PLAYER_STATES);

        // Ensure player state exists
        let playerState = await playerStates.findOne({ userId });
        if (!playerState) {
            const newPlayerState: PlayerStateDocument = {
                userId,
                position: { x: 400, y: 300, scene: "main" },
                financial: { rupees: 0, totalWealth: 0, bankBalance: 0, stockPortfolioValue: 0 },
                inventory: { items: [], capacity: 20 },
                progress: { level: 1, experience: 0, unlockedBuildings: ["bank", "stockmarket"], completedTutorials: [] },
                onboarding: { hasMetMaya: false, hasFollowedMaya: false, hasClaimedMoney: false, onboardingStep: 'not_started', unlockedBuildings: { bank: false, atm: false, stockmarket: false } },
                // extended flags will be added lazily later if missing
                settings: { soundEnabled: true, musicEnabled: true, autoSave: true },
                lastUpdated: new Date()
            };
            const insertRes = await playerStates.insertOne(newPlayerState);
            playerState = { ...newPlayerState, _id: insertRes.insertedId } as PlayerStateDocument & { _id: ObjectId };
        }

        const STARTER_AMOUNT = 1000;
        // Atomic conditional update to prevent race double-increment
        const filter: Record<string, unknown> = {
            userId,
            $or: [
                { starterClaimed: { $exists: false } },
                { starterClaimed: false }
            ],
            "progress.completedTutorials": { $ne: "starter-claimed" }
        };
        const updateOp: Record<string, unknown> = {
            $inc: { "financial.rupees": STARTER_AMOUNT, "financial.totalWealth": STARTER_AMOUNT },
            $addToSet: { "progress.completedTutorials": "starter-claimed" },
            $set: { starterClaimed: true, lastUpdated: new Date() }
        };

        const updateResult = await playerStates.updateOne(filter, updateOp);
        const newlyClaimed = updateResult.modifiedCount === 1;

        // Fetch latest state
        const updated = await playerStates.findOne({ userId });
        const finalRupees = updated?.financial.rupees ?? 0;
        ctx.response.body = {
            success: true,
            amount: newlyClaimed ? STARTER_AMOUNT : 0,
            newlyClaimed,
            claimed: true,
            rupees: finalRupees
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to claim starter money" };
        console.error("Claim starter money error:", error);
    }
});

// ======================
// BANKING ENDPOINTS
// ======================

// Create bank account with initial deposit
gameRouter.post("/game/bank-account/create", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { accountHolder, initialDeposit } = body;

        if (!accountHolder || typeof accountHolder !== "string") {
            ctx.response.status = 400;
            ctx.response.body = { error: "Account holder name is required" };
            return;
        }

        if (typeof initialDeposit !== "number" || initialDeposit < 0) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid initial deposit amount" };
            return;
        }

        // Check if account already exists
        const bankAccounts = mongodb.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );
        const existingAccount = await bankAccounts.findOne({ userId });
        
        if (existingAccount) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Bank account already exists" };
            return;
        }

        // Generate account number with DIN- prefix
        const randomSix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const accountNumber = `DIN-${randomSix}`;

        // If there's an initial deposit, verify player has enough rupees
        if (initialDeposit > 0) {
            const playerStates = mongodb.getCollection<PlayerStateDocument>(
                COLLECTIONS.PLAYER_STATES
            );
            const playerState = await playerStates.findOne({ userId });

            if (!playerState || playerState.financial.rupees < initialDeposit) {
                ctx.response.status = 400;
                ctx.response.body = { error: "Insufficient rupees for initial deposit" };
                return;
            }
        }

        // Create the bank account
        const newBankAccount: BankAccountDocument = {
            userId,
            accountNumber,
            accountHolder,
            balance: initialDeposit,
            transactions: initialDeposit > 0 ? [{
                id: new ObjectId().toString(),
                type: "deposit" as const,
                amount: initialDeposit,
                timestamp: new Date(),
                description: `Initial deposit of ₹${initialDeposit}`,
            }] : [],
            createdAt: new Date(),
            lastUpdated: new Date(),
        };

        const result = await bankAccounts.insertOne(newBankAccount);

        // Deduct rupees from player if initial deposit
        if (initialDeposit > 0) {
            const playerStates = mongodb.getCollection<PlayerStateDocument>(
                COLLECTIONS.PLAYER_STATES
            );
            await playerStates.updateOne(
                { userId },
                {
                    $inc: { "financial.rupees": -initialDeposit },
                    $set: { lastUpdated: new Date() },
                }
            );
        }

        const createdAccount = { ...newBankAccount, _id: result.insertedId };

        ctx.response.body = {
            success: true,
            data: createdAccount,
            message: `Bank account created successfully${initialDeposit > 0 ? ` with initial deposit of ₹${initialDeposit}` : ''}`
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to create bank account" };
        console.error("Create bank account error:", error);
    }
});

// Get bank account
gameRouter.get("/game/bank-account", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const bankAccounts = mongodb.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );

        let bankAccount = await bankAccounts.findOne({ userId });
        // Create initial bank account if doesn't exist
        if (!bankAccount) {
            const newBankAccount: BankAccountDocument = {
                userId,
                balance: 0,
                transactions: [],
                createdAt: new Date(),
                lastUpdated: new Date(),
            };

            const result = await bankAccounts.insertOne(newBankAccount);
            bankAccount = { ...newBankAccount, _id: result.insertedId };
        }

        ctx.response.body = {
            success: true,
            data: bankAccount,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to get bank account" };
        console.error("Get bank account error:", error);
    }
});

// Deposit to bank account
gameRouter.post("/game/bank-account/deposit", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { amount } = body;

        if (typeof amount !== "number" || amount <= 0) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid deposit amount" };
            return;
        }

        // Check if player has enough rupees
        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );
        const playerState = await playerStates.findOne({ userId });

        if (!playerState || playerState.financial.rupees < amount) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Insufficient rupees" };
            return;
        }

        // Start transaction
        const bankAccounts = mongodb.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );

        // Update bank balance and add transaction
        const transaction = {
            id: new ObjectId().toString(),
            type: "deposit" as const,
            amount,
            timestamp: new Date(),
            description: `Deposit of ₹${amount}`,
        };

        await bankAccounts.updateOne(
            { userId },
            {
                $inc: { balance: amount },
                $push: { transactions: transaction },
                $set: { lastUpdated: new Date() },
            } as unknown as Parameters<typeof bankAccounts.updateOne>[1],
            { upsert: true }
        );

        // Deduct rupees from player
        await playerStates.updateOne(
            { userId },
            {
                $inc: { "financial.rupees": -amount },
                $set: { lastUpdated: new Date() },
            }
        );

        ctx.response.body = {
            success: true,
            message: `Successfully deposited ₹${amount}`,
            transaction,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to process deposit" };
        console.error("Deposit error:", error);
    }
});

// Withdraw from bank account
gameRouter.post("/game/bank-account/withdraw", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { amount } = body;

        if (typeof amount !== "number" || amount <= 0) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid withdrawal amount" };
            return;
        }

        // Check if bank has enough balance
        const bankAccounts = mongodb.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );
        const bankAccount = await bankAccounts.findOne({ userId });

        if (!bankAccount || bankAccount.balance < amount) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Insufficient bank balance" };
            return;
        }

        // Start transaction
        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );

        // Create transaction record
        const transaction = {
            id: new ObjectId().toString(),
            type: "withdrawal" as const,
            amount,
            timestamp: new Date(),
            description: `Withdrawal of ₹${amount}`,
        };

        // Update bank balance and add transaction
        await bankAccounts.updateOne(
            { userId },
            {
                $inc: { balance: -amount },
                $push: { transactions: transaction },
                $set: { lastUpdated: new Date() },
            } as unknown as Parameters<typeof bankAccounts.updateOne>[1]
        );

        // Add rupees to player
        await playerStates.updateOne(
            { userId },
            {
                $inc: { "financial.rupees": amount },
                $set: { lastUpdated: new Date() },
            }
        );

        ctx.response.body = {
            success: true,
            message: `Successfully withdrew ₹${amount}`,
            transaction,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to process withdrawal" };
        console.error("Withdrawal error:", error);
    }
});

// ======================
// FIXED DEPOSIT ENDPOINTS
// ======================

// Get fixed deposits
gameRouter.get("/game/fixed-deposits", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const fixedDeposits = mongodb.getCollection<FixedDepositDocument>(
            COLLECTIONS.FIXED_DEPOSITS
        );

        const deposits = await fixedDeposits.find({ userId }).toArray();

        // Check for matured deposits
        const currentTime = new Date();
        const updatedDeposits = deposits.map((deposit) => {
            if (!deposit.matured && deposit.maturityDate <= currentTime) {
                return {
                    ...deposit,
                    matured: true,
                    status: "matured" as const,
                };
            }
            return deposit;
        });

        ctx.response.body = {
            success: true,
            data: updatedDeposits,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to get fixed deposits" };
        console.error("Get fixed deposits error:", error);
    }
});

// Create fixed deposit
gameRouter.post("/game/fixed-deposits", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { amount, duration } = body; // duration in days

        if (
            typeof amount !== "number" ||
            amount <= 0 ||
            typeof duration !== "number" ||
            duration <= 0
        ) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid amount or duration" };
            return;
        }

        // Check bank balance
        const bankAccounts = mongodb.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );
        const bankAccount = await bankAccounts.findOne({ userId });

        if (!bankAccount || bankAccount.balance < amount) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Insufficient bank balance" };
            return;
        }

        // Calculate interest rate based on duration
        let interestRate = 5.0; // Base rate
        if (duration >= 730) interestRate = 9.5;
        else if (duration >= 365) interestRate = 8.5;
        else if (duration >= 180) interestRate = 7.5;
        else if (duration >= 90) interestRate = 6.5;

        const startDate = new Date();
        const maturityDate = new Date(
            startDate.getTime() + duration * 24 * 60 * 60 * 1000
        );

        // Create fixed deposit
        const fixedDeposit: FixedDepositDocument = {
            userId,
            accountId: bankAccount._id?.toString() || "",
            amount,
            interestRate,
            startDate,
            duration,
            maturityDate,
            matured: false,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const fixedDeposits = mongodb.getCollection<FixedDepositDocument>(
            COLLECTIONS.FIXED_DEPOSITS
        );
        const result = await fixedDeposits.insertOne(fixedDeposit);

        // Deduct from bank balance
        await bankAccounts.updateOne(
            { userId },
            {
                $inc: { balance: -amount },
                $push: {
                    transactions: {
                        id: new ObjectId().toString(),
                        type: "withdrawal" as const,
                        amount,
                        timestamp: new Date(),
                        description: `Fixed Deposit creation - ₹${amount} for ${duration} days`,
                    },
                },
                $set: { lastUpdated: new Date() },
            } as unknown as Parameters<typeof bankAccounts.updateOne>[1]
        );

        ctx.response.body = {
            success: true,
            message: `Fixed deposit created successfully`,
            data: { ...fixedDeposit, _id: result.insertedId },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to create fixed deposit" };
        console.error("Create fixed deposit error:", error);
    }
});

// Claim matured fixed deposit
gameRouter.post("/game/fixed-deposits/:id/claim", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const depositId = ctx.params.id;

        if (!ObjectId.isValid(depositId)) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid deposit ID" };
            return;
        }

        const fixedDeposits = mongodb.getCollection<FixedDepositDocument>(
            COLLECTIONS.FIXED_DEPOSITS
        );
        const deposit = await fixedDeposits.findOne({
            _id: new ObjectId(depositId),
            userId,
        });

        if (!deposit) {
            ctx.response.status = 404;
            ctx.response.body = { error: "Fixed deposit not found" };
            return;
        }

        if (deposit.status !== "matured" && !deposit.matured) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Fixed deposit not yet matured" };
            return;
        }

        if (deposit.status === "claimed") {
            ctx.response.status = 400;
            ctx.response.body = { error: "Fixed deposit already claimed" };
            return;
        }

        // Calculate interest
        const durationInYears = deposit.duration / 365;
        const interestEarned = Math.round(
            deposit.amount * (deposit.interestRate / 100) * durationInYears
        );
        const totalAmount = deposit.amount + interestEarned;

        // Update fixed deposit status
        await fixedDeposits.updateOne(
            { _id: new ObjectId(depositId) },
            {
                $set: {
                    status: "claimed",
                    claimedAt: new Date(),
                    updatedAt: new Date(),
                },
            }
        );

        // Add to bank balance
        const bankAccounts = mongodb.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );
        await bankAccounts.updateOne(
            { userId },
            {
                $inc: { balance: totalAmount },
                $push: {
                    transactions: {
                        id: new ObjectId().toString(),
                        type: "deposit" as const,
                        amount: totalAmount,
                        timestamp: new Date(),
                        description: `Fixed Deposit maturity - Principal: ₹${deposit.amount}, Interest: ₹${interestEarned}`,
                    },
                },
                $set: { lastUpdated: new Date() },
            } as unknown as Parameters<typeof bankAccounts.updateOne>[1]
        );

        ctx.response.body = {
            success: true,
            message: `Fixed deposit claimed successfully`,
            data: {
                principal: deposit.amount,
                interest: interestEarned,
                total: totalAmount,
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to claim fixed deposit" };
        console.error("Claim fixed deposit error:", error);
    }
});

// ======================
// STOCK PORTFOLIO ENDPOINTS
// ======================

// Get stock portfolio
gameRouter.get("/game/stock-portfolio", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const stockPortfolios = mongodb.getCollection<StockPortfolioDocument>(
            COLLECTIONS.STOCK_PORTFOLIOS
        );

        let portfolio = await stockPortfolios.findOne({ userId });
        // Create initial portfolio if doesn't exist
        if (!portfolio) {
            const newPortfolio: StockPortfolioDocument = {
                userId,
                holdings: [],
                totalValue: 0,
                totalInvested: 0,
                totalGainLoss: 0,
                createdAt: new Date(),
                lastUpdated: new Date(),
            };

            const result = await stockPortfolios.insertOne(newPortfolio);
            portfolio = { ...newPortfolio, _id: result.insertedId };
        }

        ctx.response.body = {
            success: true,
            data: portfolio,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to get stock portfolio" };
        console.error("Get stock portfolio error:", error);
    }
});

// Get stock transactions
gameRouter.get("/game/stock-transactions", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const stockTransactions =
            mongodb.getCollection<StockTransactionDocument>(
                COLLECTIONS.STOCK_TRANSACTIONS
            );

        const transactions = await stockTransactions
            .find({ userId })
            .sort({ timestamp: -1 })
            .limit(100)
            .toArray();

        ctx.response.body = {
            success: true,
            data: transactions,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to get stock transactions" };
        console.error("Get stock transactions error:", error);
    }
});

// Buy stock
gameRouter.post("/game/stock-portfolio/buy", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { stockId, stockName, quantity, price } = body;

        if (
            !stockId ||
            !stockName ||
            typeof quantity !== "number" ||
            quantity <= 0 ||
            typeof price !== "number" ||
            price <= 0
        ) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid stock purchase parameters" };
            return;
        }

        const totalCost = price * quantity;

        // Check if player has enough rupees
        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );
        const playerState = await playerStates.findOne({ userId });

        if (!playerState || playerState.financial.rupees < totalCost) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Insufficient rupees" };
            return;
        } // Get or create portfolio
        const stockPortfolios = mongodb.getCollection<StockPortfolioDocument>(
            COLLECTIONS.STOCK_PORTFOLIOS
        );
        let portfolio = await stockPortfolios.findOne({ userId });

        if (!portfolio) {
            const newPortfolio: StockPortfolioDocument = {
                userId,
                holdings: [],
                totalValue: 0,
                totalInvested: 0,
                totalGainLoss: 0,
                createdAt: new Date(),
                lastUpdated: new Date(),
            };

            const result = await stockPortfolios.insertOne(newPortfolio);
            portfolio = { ...newPortfolio, _id: result.insertedId };
        }

        // Update portfolio holdings
        const existingHoldingIndex = portfolio.holdings.findIndex(
            (h) => h.symbol === stockId
        );

        if (existingHoldingIndex >= 0) {
            // Update existing holding
            const holding = portfolio.holdings[existingHoldingIndex];
            const totalShares = holding.quantity + quantity;
            const totalInvestment =
                holding.averagePrice * holding.quantity + totalCost;
            const newAveragePrice = totalInvestment / totalShares;

            portfolio.holdings[existingHoldingIndex] = {
                ...holding,
                quantity: totalShares,
                averagePrice: newAveragePrice,
                currentPrice: price,
                totalValue: price * totalShares,
                gainLoss: price * totalShares - totalInvestment,
                gainLossPercentage:
                    ((price * totalShares - totalInvestment) /
                        totalInvestment) *
                    100,
            };
        } else {
            // Add new holding
            portfolio.holdings.push({
                symbol: stockId,
                name: stockName,
                quantity,
                averagePrice: price,
                currentPrice: price,
                totalValue: totalCost,
                gainLoss: 0,
                gainLossPercentage: 0,
                purchaseDate: new Date(),
            });
        }

        // Update portfolio totals
        portfolio.totalInvested += totalCost;
        portfolio.totalValue = portfolio.holdings.reduce(
            (sum, h) => sum + h.totalValue,
            0
        );
        portfolio.totalGainLoss =
            portfolio.totalValue - portfolio.totalInvested;
        portfolio.lastUpdated = new Date();

        // Update portfolio in database
        await stockPortfolios.updateOne({ userId }, { $set: portfolio });

        // Create transaction record
        const stockTransactions =
            mongodb.getCollection<StockTransactionDocument>(
                COLLECTIONS.STOCK_TRANSACTIONS
            );
        const transaction: StockTransactionDocument = {
            userId,
            stockId,
            stockName,
            type: "buy",
            price,
            quantity,
            total: totalCost,
            timestamp: new Date(),
            portfolioId: portfolio._id?.toString() || "",
        };

        await stockTransactions.insertOne(transaction);

        // Deduct rupees from player
        await playerStates.updateOne(
            { userId },
            {
                $inc: { "financial.rupees": -totalCost },
                $set: { lastUpdated: new Date() },
            }
        );

        ctx.response.body = {
            success: true,
            message: `Successfully purchased ${quantity} shares of ${stockName}`,
            data: {
                transaction,
                totalCost,
                holding: portfolio.holdings.find((h) => h.symbol === stockId),
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to buy stock" };
        console.error("Buy stock error:", error);
    }
});

// Sell stock
gameRouter.post("/game/stock-portfolio/sell", async (ctx) => {
    try {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();
        const { stockId, quantity, price } = body;

        if (
            !stockId ||
            typeof quantity !== "number" ||
            quantity <= 0 ||
            typeof price !== "number" ||
            price <= 0
        ) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid stock sale parameters" };
            return;
        }

        // Get portfolio
        const stockPortfolios = mongodb.getCollection<StockPortfolioDocument>(
            COLLECTIONS.STOCK_PORTFOLIOS
        );
        const portfolio = await stockPortfolios.findOne({ userId });

        if (!portfolio) {
            ctx.response.status = 404;
            ctx.response.body = { error: "Portfolio not found" };
            return;
        }

        // Find holding
        const holdingIndex = portfolio.holdings.findIndex(
            (h) => h.symbol === stockId
        );
        if (holdingIndex === -1) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Stock not found in portfolio" };
            return;
        }

        const holding = portfolio.holdings[holdingIndex];
        if (holding.quantity < quantity) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Insufficient shares to sell" };
            return;
        }

        const saleValue = price * quantity;
        const costBasis = holding.averagePrice * quantity;
        const profit = saleValue - costBasis;

        // Update or remove holding
        if (holding.quantity === quantity) {
            // Remove holding completely
            portfolio.holdings.splice(holdingIndex, 1);
        } else {
            // Update holding
            const remainingShares = holding.quantity - quantity;
            portfolio.holdings[holdingIndex] = {
                ...holding,
                quantity: remainingShares,
                currentPrice: price,
                totalValue: price * remainingShares,
                gainLoss:
                    price * remainingShares -
                    holding.averagePrice * remainingShares,
                gainLossPercentage:
                    ((price * remainingShares -
                        holding.averagePrice * remainingShares) /
                        (holding.averagePrice * remainingShares)) *
                    100,
            };
        }

        // Update portfolio totals
        portfolio.totalInvested -= costBasis;
        portfolio.totalValue = portfolio.holdings.reduce(
            (sum, h) => sum + h.totalValue,
            0
        );
        portfolio.totalGainLoss =
            portfolio.totalValue - portfolio.totalInvested;
        portfolio.lastUpdated = new Date();

        // Update portfolio in database
        await stockPortfolios.updateOne({ userId }, { $set: portfolio });

        // Create transaction record
        const stockTransactions =
            mongodb.getCollection<StockTransactionDocument>(
                COLLECTIONS.STOCK_TRANSACTIONS
            );
        const transaction: StockTransactionDocument = {
            userId,
            stockId,
            stockName: holding.name,
            type: "sell",
            price,
            quantity,
            total: saleValue,
            timestamp: new Date(),
            portfolioId: portfolio._id?.toString() || "",
        };

        await stockTransactions.insertOne(transaction);

        // Add rupees to player
        const playerStates = mongodb.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );
        await playerStates.updateOne(
            { userId },
            {
                $inc: { "financial.rupees": saleValue },
                $set: { lastUpdated: new Date() },
            }
        );

        ctx.response.body = {
            success: true,
            message: `Successfully sold ${quantity} shares of ${holding.name}`,
            data: {
                transaction,
                saleValue,
                profit,
                profitPercent: (profit / costBasis) * 100,
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to sell stock" };
        console.error("Sell stock error:", error);
    }
});

// ======================
// GENERAL GAME DATA SYNC
// ======================

// Sync all game data (comprehensive endpoint)
gameRouter.get("/game/sync", async (ctx) => {
    try {
        const userId = ctx.state.userId;

        // Get all game data
        const [
            playerState,
            bankAccount,
            fixedDeposits,
            stockPortfolio,
            stockTransactions,
        ] = await Promise.all([
            mongodb
                .getCollection<PlayerStateDocument>(COLLECTIONS.PLAYER_STATES)
                .findOne({ userId }),
            mongodb
                .getCollection<BankAccountDocument>(COLLECTIONS.BANK_ACCOUNTS)
                .findOne({ userId }),
            mongodb
                .getCollection<FixedDepositDocument>(COLLECTIONS.FIXED_DEPOSITS)
                .find({ userId })
                .toArray(),
            mongodb
                .getCollection<StockPortfolioDocument>(
                    COLLECTIONS.STOCK_PORTFOLIOS
                )
                .findOne({ userId }),
            mongodb
                .getCollection<StockTransactionDocument>(
                    COLLECTIONS.STOCK_TRANSACTIONS
                )
                .find({ userId })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray(),
        ]);

        ctx.response.body = {
            success: true,
            data: {
                playerState,
                bankAccount,
                fixedDeposits,
                stockPortfolio,
                stockTransactions,
            },
            timestamp: new Date(),
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to sync game data" };
        console.error("Sync game data error:", error);
    }
});

export default gameRouter;
