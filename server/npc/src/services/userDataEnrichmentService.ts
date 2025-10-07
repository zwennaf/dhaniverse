import { MongoClient, ObjectId, Db } from 'mongodb';

export class UserDataEnrichmentService {
  private static instance: UserDataEnrichmentService;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  
  private constructor() {}

  public static getInstance(): UserDataEnrichmentService {
    if (!UserDataEnrichmentService.instance) {
      UserDataEnrichmentService.instance = new UserDataEnrichmentService();
    }
    return UserDataEnrichmentService.instance;
  }

  public async connect(mongoUri: string, dbName: string): Promise<void> {
    if (!this.client) {
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log('✅ UserDataEnrichmentService connected to MongoDB');
    }
  }

  /**
   * Fetch all related data for a user and return enriched context
   */
  public async getEnrichedUserContext(userId: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }

    const userIdStr = userId.toString();
    const userIdObj = new ObjectId(userId);

    console.log(`📊 Fetching enriched context for user: ${userId}`);

    // Fetch all related data in parallel
    const [
      user,
      playerState,
      bankAccounts,
      stockPortfolio,
      stockTransactions,
      fixedDeposits,
      gameSessions,
      achievements
    ] = await Promise.all([
      this.db.collection('users').findOne({ _id: userIdObj }),
      this.db.collection('playerStates').findOne({ userId: userIdStr }),
      this.db.collection('bankAccounts').find({ userId: userIdStr }).toArray(),
      this.db.collection('stockPortfolios').findOne({ userId: userIdStr }),
      this.db.collection('stockTransactions').find({ userId: userIdStr }).sort({ timestamp: -1 }).limit(50).toArray(),
      this.db.collection('fixedDeposits').find({ userId: userIdStr }).toArray(),
      this.db.collection('gameSessions').find({ userId: userIdStr }).sort({ startTime: -1 }).limit(10).toArray(),
      this.db.collection('achievements').find({ userId: userIdStr }).toArray()
    ]);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    console.log(`✅ Found enriched data:`, {
      user: !!user,
      playerState: !!playerState,
      bankAccounts: bankAccounts.length,
      stockPortfolio: !!stockPortfolio,
      stockTransactions: stockTransactions.length,
      fixedDeposits: fixedDeposits.length,
      gameSessions: gameSessions.length,
      achievements: achievements.length
    });

    return {
      user,
      playerState,
      bankAccounts,
      stockPortfolio,
      stockTransactions,
      fixedDeposits,
      gameSessions,
      achievements,
      _metadata: {
        fetchedAt: new Date(),
        userId: userIdStr,
        dataCompleteness: {
          hasPlayerState: !!playerState,
          hasBankAccounts: bankAccounts.length > 0,
          hasStockPortfolio: !!stockPortfolio,
          hasStockTransactions: stockTransactions.length > 0,
          hasFixedDeposits: fixedDeposits.length > 0,
          hasGameSessions: gameSessions.length > 0,
          hasAchievements: achievements.length > 0
        }
      }
    };
  }

  /**
   * Convert enriched data to a formatted text summary for embedding
   */
  public formatEnrichedDataForEmbedding(enrichedData: any): string {
    const { user, playerState, bankAccounts, stockPortfolio, stockTransactions, fixedDeposits, gameSessions, achievements } = enrichedData;

    let summary = `# User Profile: ${user.gameUsername}\n\n`;
    
    // User basic info
    summary += `## Basic Information\n`;
    summary += `- User ID: ${user._id.toString()}\n`;
    summary += `- Email: ${user.email}\n`;
    summary += `- Username: ${user.gameUsername}\n`;
    summary += `- Character: ${user.selectedCharacter || 'Not selected'}\n`;
    summary += `- Account Created: ${user.createdAt}\n`;
    summary += `- Last Login: ${user.lastLoginAt}\n`;
    summary += `- Game Level: ${user.gameData?.level || 0}\n`;
    summary += `- Experience Points: ${user.gameData?.experience || 0}\n\n`;

    // Player State - Financial Data
    if (playerState) {
      summary += `## Financial Overview (from Player State)\n`;
      summary += `- Current Rupees: ₹${playerState.financial?.rupees || 0}\n`;
      summary += `- Bank Balance: ₹${playerState.financial?.bankBalance || 0}\n`;
      summary += `- Stock Portfolio Value: ₹${playerState.financial?.stockPortfolioValue || 0}\n`;
      summary += `- Total Wealth: ₹${playerState.financial?.totalWealth || 0}\n`;
      summary += `- Position: ${playerState.position?.scene || 'unknown'} (${playerState.position?.x || 0}, ${playerState.position?.y || 0})\n`;
      summary += `- Onboarding Step: ${playerState.onboarding?.onboardingStep || 'not_started'}\n\n`;
    }

    // Bank Accounts
    if (bankAccounts && bankAccounts.length > 0) {
      summary += `## Banking Information\n`;
      summary += `- Total Bank Accounts: ${bankAccounts.length}\n`;
      bankAccounts.forEach((account: any, idx: number) => {
        summary += `\n### Bank Account ${idx + 1}\n`;
        summary += `- Account Number: ${account.accountNumber}\n`;
        summary += `- Account Holder: ${account.accountHolder}\n`;
        summary += `- Current Balance: ₹${account.balance}\n`;
        summary += `- Total Transactions: ${account.transactions?.length || 0}\n`;
        if (account.transactions && account.transactions.length > 0) {
          summary += `- Recent Transactions:\n`;
          account.transactions.slice(-5).forEach((txn: any) => {
            summary += `  * ${txn.type}: ₹${txn.amount} - ${txn.description} (${txn.timestamp})\n`;
          });
        }
      });
      summary += `\n`;
    }

    // Stock Portfolio
    if (stockPortfolio) {
      summary += `## Stock Portfolio\n`;
      summary += `- Total Portfolio Value: ₹${stockPortfolio.totalValue || 0}\n`;
      summary += `- Total Invested: ₹${stockPortfolio.totalInvested || 0}\n`;
      summary += `- Total Gain/Loss: ₹${stockPortfolio.totalGainLoss || 0}\n`;
      summary += `- Number of Holdings: ${stockPortfolio.holdings?.length || 0}\n`;
      
      if (stockPortfolio.holdings && stockPortfolio.holdings.length > 0) {
        summary += `\n### Current Holdings:\n`;
        stockPortfolio.holdings.forEach((holding: any) => {
          summary += `- ${holding.symbol} (${holding.name}): ${holding.quantity} shares @ ₹${holding.averagePrice}\n`;
          summary += `  Current Value: ₹${holding.totalValue}, Gain/Loss: ₹${holding.gainLoss} (${holding.gainLossPercentage}%)\n`;
        });
      }
      summary += `\n`;
    }

    // Stock Transactions
    if (stockTransactions && stockTransactions.length > 0) {
      summary += `## Stock Trading History\n`;
      summary += `- Total Transactions: ${stockTransactions.length}\n`;
      summary += `- Recent Transactions (last 10):\n`;
      stockTransactions.slice(0, 10).forEach((txn: any) => {
        summary += `  * ${txn.type.toUpperCase()}: ${txn.quantity}x ${txn.stockName} (${txn.stockId}) @ ₹${txn.price} = ₹${txn.total} on ${txn.timestamp}\n`;
      });
      summary += `\n`;
    }

    // Fixed Deposits
    if (fixedDeposits && fixedDeposits.length > 0) {
      summary += `## Fixed Deposits\n`;
      fixedDeposits.forEach((fd: any, idx: number) => {
        summary += `### FD ${idx + 1}\n`;
        summary += `- Amount: ₹${fd.amount}\n`;
        summary += `- Interest Rate: ${fd.interestRate}%\n`;
        summary += `- Duration: ${fd.duration} days\n`;
        summary += `- Status: ${fd.status}\n`;
        summary += `- Maturity Date: ${fd.maturityDate}\n\n`;
      });
    }

    // Game Sessions
    if (gameSessions && gameSessions.length > 0) {
      summary += `## Recent Game Activity\n`;
      summary += `- Total Sessions: ${gameSessions.length}\n`;
      const totalRupeesEarned = gameSessions.reduce((sum: number, s: any) => sum + (s.rupeesEarnedInSession || 0), 0);
      const totalRupeesSpent = gameSessions.reduce((sum: number, s: any) => sum + (s.rupeesSpentInSession || 0), 0);
      summary += `- Total Rupees Earned: ₹${totalRupeesEarned}\n`;
      summary += `- Total Rupees Spent: ₹${totalRupeesSpent}\n\n`;
    }

    // Achievements
    if (achievements && achievements.length > 0) {
      summary += `## Achievements Unlocked\n`;
      achievements.forEach((achievement: any) => {
        summary += `- ${achievement.title} (${achievement.category}): ${achievement.description} - ${achievement.points} points\n`;
      });
      summary += `\n`;
    } else {
      summary += `## Achievements\n`;
      summary += `- No achievements unlocked yet\n\n`;
    }

    return summary;
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('🔌 UserDataEnrichmentService disconnected from MongoDB');
    }
  }
}
