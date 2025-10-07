import { ConversationTree, UserProfile, NPCPersonality } from '../types/schema.js';

export class ConversationService {
  private static instance: ConversationService;

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService();
    }
    return ConversationService.instance;
  }

  /**
   * Extract user profile from enriched user data (not just ContRAG chunks)
   */
  public extractUserProfileFromEnrichedData(enrichedData: any): UserProfile {
    const { user, playerState, bankAccounts, stockPortfolio, stockTransactions, achievements } = enrichedData;
    
    const level = user?.gameData?.level || playerState?.progress?.level || 1;
    const experience = user?.gameData?.experience || playerState?.progress?.experience || 0;
    const character = user?.selectedCharacter || 'unknown';
    
    // Calculate financial metrics
    const bankBalance = playerState?.financial?.bankBalance || 0;
    const stockValue = playerState?.financial?.stockPortfolioValue || 0;
    const totalWealth = playerState?.financial?.totalWealth || bankBalance + stockValue;
    
    // Determine risk profile based on asset allocation
    let riskProfile: 'low' | 'medium' | 'high' = 'medium';
    if (totalWealth > 0) {
      const stockRatio = stockValue / totalWealth;
      if (stockRatio > 0.7) riskProfile = 'high';
      else if (stockRatio < 0.3) riskProfile = 'low';
    }
    
    // Determine investment experience
    let investmentExperience: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    const transactionCount = stockTransactions?.length || 0;
    const portfolioValue = stockValue;
    
    if (transactionCount > 50 && portfolioValue > 50000) {
      investmentExperience = 'advanced';
    } else if (transactionCount > 10 && portfolioValue > 10000) {
      investmentExperience = 'intermediate';
    }
    
    // Extract past choices from various data
    const pastChoices: string[] = [];
    if (character) pastChoices.push(`chose_character_${character}`);
    if (stockValue > 0) pastChoices.push('invested_in_stocks');
    if (bankBalance > 1000) pastChoices.push('built_savings');
    if (transactionCount > 0) pastChoices.push('active_trader');
    if (bankAccounts && bankAccounts.length > 0) pastChoices.push('opened_bank_account');
    if (playerState?.onboarding?.hasMetMaya) pastChoices.push('completed_maya_tutorial');
    
    // Determine financial goals based on current state
    const financialGoals: string[] = [];
    if (riskProfile === 'low') {
      financialGoals.push('build_emergency_fund', 'stable_returns', 'safe_investments');
    } else if (riskProfile === 'high') {
      financialGoals.push('maximize_growth', 'explore_investments', 'active_trading');
    } else {
      financialGoals.push('balanced_portfolio', 'learn_investing', 'diversification');
    }
    
    // Extract achievements
    const achievementList = achievements?.map((a: any) => a.title || a.achievementId) || [];
    
    // Determine personality traits
    const personalityTraits: string[] = [];
    if (riskProfile === 'high') personalityTraits.push('risk_taker', 'adventurous');
    if (riskProfile === 'low') personalityTraits.push('cautious', 'practical');
    if (level > 10) personalityTraits.push('dedicated', 'persistent');
    if (transactionCount > 20) personalityTraits.push('active_investor');
    if (achievementList.length > 5) personalityTraits.push('achievement_oriented');
    
    return {
      risk_profile: riskProfile,
      investment_experience: investmentExperience,
      past_choices: pastChoices,
      financial_goals: financialGoals,
      character_type: character,
      game_level: level,
      achievements: achievementList,
      personality_traits: personalityTraits
    };
  }

  // NPC Personalities available in the game
  private npcPersonalities: { [key: string]: NPCPersonality } = {
    maya: {
      name: "Maya",
      role: "financial_advisor",
      personality_traits: ["helpful", "patient", "educational", "encouraging"],
      conversation_style: "friendly and supportive",
      financial_expertise: ["budgeting", "savings", "basic_investing", "financial_literacy"]
    },
    finbot: {
      name: "FinBot",
      role: "trader",
      personality_traits: ["quirky", "tech-savvy", "humorous", "market-obsessed"],
      conversation_style: "casual and witty with financial humor",
      financial_expertise: ["stocks", "crypto", "market_analysis", "trading_strategies"]
    },
    risky_rick: {
      name: "Risky Rick",
      role: "risk_taker",
      personality_traits: ["bold", "adventurous", "optimistic", "high-energy"],
      conversation_style: "enthusiastic and motivational",
      financial_expertise: ["high_risk_investments", "startup_funding", "venture_capital", "aggressive_trading"]
    },
    budget_beth: {
      name: "Budget Beth",
      role: "saver",
      personality_traits: ["practical", "organized", "cautious", "detail-oriented"],
      conversation_style: "methodical and thorough",
      financial_expertise: ["budgeting", "expense_tracking", "debt_management", "conservative_investing"]
    }
  };

  /**
   * Extract user profile data from Contrag chunks
   */
  public extractUserProfile(contextChunks: any[]): UserProfile {
    if (!contextChunks || contextChunks.length === 0) {
      return this.getDefaultUserProfile();
    }

    const content = contextChunks[0].content;
    
    // Extract user data from the content string
    const levelMatch = content.match(/level: (\d+)/);
    const experienceMatch = content.match(/experience: (\d+)/);
    const characterMatch = content.match(/selectedCharacter: ([^\n]+)/);
    const achievementsMatch = content.match(/achievements: \[([^\]]*)\]/);
    const emailMatch = content.match(/email: ([^\n]+)/);
    const createdMatch = content.match(/createdAt: ([^\n]+)/);
    
    // Analyze financial behavior patterns from bank/portfolio data
    const bankBalanceMatch = content.match(/bankBalance: (\d+)/);
    const stockPortfolioMatch = content.match(/stockPortfolioValue: (\d+)/);
    const rupeesMatch = content.match(/rupees: (\d+)/);
    
    // Determine risk profile based on available data
    let riskProfile: 'low' | 'medium' | 'high' = 'medium';
    const level = parseInt(levelMatch?.[1] || '1');
    const bankBalance = parseInt(bankBalanceMatch?.[1] || '0');
    const stockValue = parseInt(stockPortfolioMatch?.[1] || '0');
    
    if (stockValue > bankBalance * 2) {
      riskProfile = 'high';
    } else if (bankBalance > stockValue * 3) {
      riskProfile = 'low';
    }
    
    // Determine investment experience based on level and activity
    let investmentExperience: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (level > 10 && stockValue > 5000) {
      investmentExperience = 'advanced';
    } else if (level > 5 && stockValue > 1000) {
      investmentExperience = 'intermediate';
    }
    
    // Extract past choices from various game data
    const pastChoices: string[] = [];
    if (stockValue > 0) pastChoices.push('invested_in_stocks');
    if (bankBalance > 1000) pastChoices.push('built_savings');
    if (level > 5) pastChoices.push('completed_tutorials');
    if (characterMatch?.[1]) pastChoices.push(`chose_character_${characterMatch[1]}`);
    
    // Generate financial goals based on profile
    const financialGoals: string[] = [];
    if (riskProfile === 'low') {
      financialGoals.push('build_emergency_fund', 'stable_returns');
    } else if (riskProfile === 'high') {
      financialGoals.push('maximize_growth', 'explore_investments');
    } else {
      financialGoals.push('balanced_portfolio', 'learn_investing');
    }
    
    // Extract achievements
    const achievements = achievementsMatch?.[1] ? 
      achievementsMatch[1].split(',').map((a: string) => a.trim()).filter((a: string) => a.length > 0) : [];
    
    // Determine personality traits based on choices and behavior
    const personalityTraits: string[] = [];
    if (riskProfile === 'high') personalityTraits.push('risk_taker', 'adventurous');
    if (riskProfile === 'low') personalityTraits.push('cautious', 'practical');
    if (level > 10) personalityTraits.push('dedicated', 'persistent');
    if (achievements.length > 5) personalityTraits.push('achievement_oriented');
    
    return {
      risk_profile: riskProfile,
      investment_experience: investmentExperience,
      past_choices: pastChoices,
      financial_goals: financialGoals,
      character_type: characterMatch?.[1] || 'unknown',
      game_level: level,
      achievements: achievements,
      personality_traits: personalityTraits
    };
  }

  /**
   * Generate a conversation tree using LLM-style logic with enriched data
   */
  public generateConversationTree(
    userProfile: UserProfile, 
    npcPersonality: NPCPersonality,
    topic?: string,
    enrichedData?: any
  ): ConversationTree {
    
    // Log what enriched data we're using
    console.log('🌳 Generating conversation tree with enriched data:', {
      hasStockTransactions: enrichedData?.stockTransactions?.length || 0,
      hasBankAccounts: enrichedData?.bankAccounts?.length || 0,
      hasPortfolio: !!enrichedData?.stockPortfolio,
      hasPlayerState: !!enrichedData?.playerState,
      topic
    });
    
    const conversationTopics = this.selectConversationTopics(userProfile, npcPersonality, topic, enrichedData);
    const personalizedIntro = this.generatePersonalizedIntro(userProfile, npcPersonality, conversationTopics, enrichedData);
    
    // Generate conversation tree structure
    const conversationTree: ConversationTree = {
      npc_name: npcPersonality.name,
      intro: personalizedIntro,
      conversation_tree: {}
    };

    // Generate the conversation flow with enriched data
    conversationTree.conversation_tree = this.buildConversationFlow(
      userProfile, 
      npcPersonality, 
      conversationTopics,
      enrichedData
    );

    return conversationTree;
  }

  /**
   * Select conversation topics based on user profile and NPC expertise
   */
  private selectConversationTopics(
    userProfile: UserProfile, 
    npcPersonality: NPCPersonality,
    requestedTopic?: string,
    enrichedData?: any
  ): string[] {
    const topics: string[] = [];
    
    // If specific topic requested, prioritize it
    if (requestedTopic) {
      topics.push(requestedTopic);
    }
    
    // Add topics based on enriched data insights
    if (enrichedData?.stockTransactions && enrichedData.stockTransactions.length > 0) {
      const txnCount = enrichedData.stockTransactions.length;
      const recentTrades = enrichedData.stockTransactions.slice(0, 5);
      console.log(`📊 Found ${txnCount} stock transactions, including recent trades for: ${recentTrades.map((t: any) => t.stockName).join(', ')}`);
      topics.push(`your_${txnCount}_stock_transactions`);
      topics.push('trading_history_analysis');
    }
    
    if (enrichedData?.stockPortfolio && enrichedData.stockPortfolio.holdings?.length > 0) {
      const holdings = enrichedData.stockPortfolio.holdings;
      console.log(`💼 Found ${holdings.length} portfolio holdings: ${holdings.map((h: any) => h.symbol).join(', ')}`);
      topics.push('current_portfolio_holdings');
    }
    
    if (enrichedData?.bankAccounts && enrichedData.bankAccounts.length > 0) {
      const totalBalance = enrichedData.bankAccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
      console.log(`🏦 Found ${enrichedData.bankAccounts.length} bank accounts with total balance: ₹${totalBalance}`);
      topics.push('banking_strategy');
    }
    
    // Add topics based on user's risk profile and experience
    if (userProfile.risk_profile === 'high' && npcPersonality.financial_expertise.includes('high_risk_investments')) {
      topics.push('aggressive_investing', 'market_volatility', 'crypto_discussion');
    } else if (userProfile.risk_profile === 'low' && npcPersonality.financial_expertise.includes('budgeting')) {
      topics.push('safe_investments', 'budgeting_tips', 'debt_management');
    } else {
      topics.push('balanced_portfolio', 'financial_goals', 'investment_basics');
    }
    
    // Add topics based on past choices
    if (userProfile.past_choices.includes('invested_in_stocks')) {
      topics.push('portfolio_review', 'market_discussion');
    }
    if (userProfile.past_choices.includes('built_savings')) {
      topics.push('savings_optimization', 'interest_rates');
    }
    
    // Add character-specific topics
    if (userProfile.character_type) {
      topics.push(`character_${userProfile.character_type}_advice`);
    }
    
    return topics.slice(0, 5); // Limit to top 5 topics
  }

  /**
   * Generate personalized intro based on user profile and enriched data
   */
  private generatePersonalizedIntro(
    userProfile: UserProfile, 
    npcPersonality: NPCPersonality,
    topics: string[],
    enrichedData?: any
  ): string {
    // Extract specific data points for personalization
    const txnCount = enrichedData?.stockTransactions?.length || 0;
    const holdings = enrichedData?.stockPortfolio?.holdings?.length || 0;
    const bankBalance = enrichedData?.bankAccounts?.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0) || 0;
    
    console.log('💬 Generating intro with:', { txnCount, holdings, bankBalance, topics: topics.slice(0, 3) });
    
    const templates = {
      maya: [
        txnCount > 0 
          ? `Hey there! I've been reviewing your ${txnCount} stock transactions - impressive activity for a level ${userProfile.game_level} player! Let's discuss what I've learned about your investment strategy.`
          : `Hey there! I see you're level ${userProfile.game_level} - that's fantastic progress! I've been reviewing your financial journey, and I have some thoughts about your next steps.`,
        holdings > 0
          ? `Welcome back! I've analyzed your ${holdings}-stock portfolio with your ${userProfile.risk_profile} risk approach. Some interesting patterns are emerging!`
          : `Welcome back! As your financial advisor, I've noticed some interesting patterns in your ${userProfile.risk_profile}-risk approach. Let's chat about optimizing your strategy.`,
        `Hi! I love seeing how ${userProfile.character_type} characters like you approach their finances. Your ${userProfile.investment_experience} level experience shows real dedication!`
      ],
      finbot: [
        txnCount > 0
          ? `*analyzes data* WHOA! ${txnCount} transactions?! BitRodent's circuits are BUZZING! Let's talk about your trading patterns - I've spotted some interesting moves! 🐹⚡`
          : `Yo! BitRodent here told me you're into ${userProfile.risk_profile}-risk plays. Respect! How's that ${userProfile.character_type} character treating your portfolio?`,
        holdings > 0
          ? `*digital glasses gleam* Your ${holdings} stock holdings just pinged my radar! With your ${userProfile.risk_profile} risk tolerance, there's definitely room for optimization!`
          : `*adjusts digital glasses* Level ${userProfile.game_level}, ${userProfile.investment_experience} investor, ${userProfile.risk_profile} risk tolerance... I see interesting patterns in your data!`,
        `Hey! Just analyzed your trading history - that ${userProfile.past_choices.join(', ')} combo tells me you know what you're doing... mostly. 😏`
      ],
      risky_rick: [
        txnCount > 10
          ? `🚀 ${txnCount} TRADES?! Now THAT'S what I'm talking about! Your ${userProfile.character_type} character is making MOVES! Let's review your boldest plays!`
          : `YOLO time! I see you're level ${userProfile.game_level} and ready for some action! That ${userProfile.risk_profile} risk profile is calling my name!`,
        holdings > 2
          ? `BOOM! ${holdings} stocks in your portfolio! Your ${userProfile.risk_profile} approach is showing some SERIOUS potential! Let's maximize those gains!`
          : `What's up, ${userProfile.character_type}! Your portfolio tells me you're ready to take some calculated risks. Let's talk about maximizing those gains!`,
        `High energy incoming! I've been watching your progress, and with ${userProfile.achievements.length} achievements, you're clearly not afraid of challenges!`
      ],
      budget_beth: [
        bankBalance > 5000
          ? `Hello dear! I'm so proud - you've saved ₹${bankBalance.toLocaleString()} in your bank account! Such wonderful discipline from a level ${userProfile.game_level} player!`
          : `Hello dear! I've been reviewing your finances, and I'm impressed with your level ${userProfile.game_level} discipline. Let's optimize your budget strategy.`,
        txnCount > 0
          ? `Welcome! I see you've made ${txnCount} stock transactions while maintaining a ${userProfile.risk_profile} risk approach. Smart and sensible!`
          : `Welcome! Your ${userProfile.risk_profile} risk approach shows real financial wisdom. I have some practical tips for your ${userProfile.character_type} character.`,
        `Hi there! I noticed you've ${userProfile.past_choices.includes('built_savings') ? 'built good savings habits' : 'got room to improve your savings'}. Let's make a plan!`
      ]
    };

    const npcKey = npcPersonality.name.toLowerCase().replace(' ', '_') as keyof typeof templates;
    const introTemplates = templates[npcKey] || templates.maya;
    
    return introTemplates[Math.floor(Math.random() * introTemplates.length)];
  }

  /**
   * Build the conversation flow with branching dialogue
   */
  private buildConversationFlow(
    userProfile: UserProfile, 
    npcPersonality: NPCPersonality,
    topics: string[],
    enrichedData?: any
  ): { [nodeId: string]: any } {
    
    const flow: { [nodeId: string]: any } = {};
    
    // Node 1: Initial response options
    flow["1"] = {
      npc: this.generatePersonalizedIntro(userProfile, npcPersonality, topics, enrichedData),
      options: {
        "1a": {
          text: this.generateResponseOption(userProfile, "curious", topics[0] || "general", enrichedData),
          next: "2a"
        },
        "1b": {
          text: this.generateResponseOption(userProfile, "cautious", topics[1] || "safe", enrichedData),
          next: "2b"
        }
      }
    };

    // Node 2a: Following curious path
    flow["2a"] = {
      npc: this.generateNPCResponse(userProfile, npcPersonality, "curious_follow", topics[0], enrichedData),
      options: {
        "2a1": {
          text: this.generateResponseOption(userProfile, "enthusiastic", topics[0], enrichedData),
          next: "3a"
        },
        "2a2": {
          text: this.generateResponseOption(userProfile, "analytical", topics[0], enrichedData),
          next: "3b"
        }
      }
    };

    // Node 2b: Following cautious path
    flow["2b"] = {
      npc: this.generateNPCResponse(userProfile, npcPersonality, "cautious_follow", topics[1] || "safe", enrichedData),
      options: {
        "2b1": {
          text: this.generateResponseOption(userProfile, "interested", topics[1] || "safe", enrichedData),
          next: "3c"
        },
        "2b2": {
          text: this.generateResponseOption(userProfile, "questioning", topics[1] || "safe", enrichedData),
          next: "3d"
        }
      }
    };

    // Terminal nodes (3a, 3b, 3c, 3d)
    flow["3a"] = {
      npc: this.generateFinalResponse(userProfile, npcPersonality, "enthusiastic_conclusion", enrichedData)
    };
    
    flow["3b"] = {
      npc: this.generateFinalResponse(userProfile, npcPersonality, "analytical_conclusion", enrichedData)
    };
    
    flow["3c"] = {
      npc: this.generateFinalResponse(userProfile, npcPersonality, "supportive_conclusion")
    };
    
    flow["3d"] = {
      npc: this.generateFinalResponse(userProfile, npcPersonality, "educational_conclusion")
    };

    return flow;
  }

  /**
   * Generate response options based on user profile and context
   */
  private generateResponseOption(userProfile: UserProfile, tone: string, topic: string, enrichedData?: any): string {
    const riskLevel = userProfile.risk_profile;
    const experience = userProfile.investment_experience;
    const txnCount = enrichedData?.stockTransactions?.length || 0;
    
    const templates = {
      curious: {
        high: [`Tell me more about high-yield opportunities!`, `What's the most exciting investment trend?`, `I'm ready for some aggressive plays!`],
        medium: [`That sounds interesting, explain more.`, `How does this fit my balanced approach?`, `What are the risks and rewards?`],
        low: [`Is this safe for beginners like me?`, `Can you break this down simply?`, `What's the safest way to start?`]
      },
      cautious: {
        high: [`Even though I like risk, what are the downsides?`, `I want high returns but safely.`, `What's the smart aggressive play here?`],
        medium: [`I prefer balanced approaches.`, `What's a moderate way to handle this?`, `How do I minimize risk while growing?`],
        low: [`I prefer to play it very safe.`, `What's the most conservative option?`, `How do I protect my money first?`]
      },
      enthusiastic: {
        high: [`This is exactly what I was looking for!`, `Let's maximize this opportunity!`, `I'm all in on this strategy!`],
        medium: [`This sounds like a good balanced move.`, `I like this measured approach.`, `This fits my moderate strategy well.`],
        low: [`This seems like a safe way to start.`, `I appreciate the conservative approach.`, `This feels right for my comfort level.`]
      },
      analytical: {
        high: [`What are the specific metrics on this?`, `Show me the risk-reward calculations.`, `How does this compare to alternatives?`],
        medium: [`Can you analyze the pros and cons?`, `What does the data say about this?`, `How do I evaluate this properly?`],
        low: [`What makes this option safe?`, `Can you walk through the numbers?`, `What guarantees does this have?`]
      },
      interested: {
        high: [`I'm intrigued by the potential here.`, `This could be a game-changer.`, `Tell me about the upside.`],
        medium: [`This seems worth considering.`, `I'd like to explore this option.`, `This fits my investment philosophy.`],
        low: [`This seems like something I could try.`, `I'm interested in learning more.`, `This sounds manageable for me.`]
      },
      questioning: {
        high: [`But what about the volatility?`, `Are there hidden risks here?`, `What could go wrong with this?`],
        medium: [`What questions should I be asking?`, `How do I know if this is right for me?`, `What are the key considerations?`],
        low: [`Is this really as safe as it sounds?`, `What if something goes wrong?`, `How do I protect myself?`]
      }
    };

    const toneTemplates = templates[tone as keyof typeof templates] || templates.curious;
    const riskTemplates = toneTemplates[riskLevel] || toneTemplates.medium;
    
    return riskTemplates[Math.floor(Math.random() * riskTemplates.length)];
  }

  /**
   * Generate NPC responses based on personality and context
   */
  private generateNPCResponse(
    userProfile: UserProfile, 
    npcPersonality: NPCPersonality, 
    responseType: string, 
    topic: string,
    enrichedData?: any
  ): string {
    const txnCount = enrichedData?.stockTransactions?.length || 0;
    const holdings = enrichedData?.stockPortfolio?.holdings || [];
    const recentTxns = enrichedData?.stockTransactions?.slice(0, 3) || [];
    
    console.log(`💬 Generating NPC response for ${npcPersonality.name}, type: ${responseType}, txns: ${txnCount}`);
    
    const responses = {
      maya: {
        curious_follow: txnCount > 0 
          ? `Great question! I've analyzed your ${txnCount} transactions - your ${userProfile.risk_profile} risk profile combined with active trading shows you're learning fast. Here's my recommendation...`
          : `Great question! Based on your level ${userProfile.game_level} progress and ${userProfile.risk_profile} risk profile, here's what I recommend...`,
        cautious_follow: holdings.length > 0
          ? `I love that you're thinking carefully! With ${holdings.length} stocks in your portfolio and ${userProfile.investment_experience} experience, let's review your holdings: ${holdings.map((h: any) => h.symbol).slice(0, 3).join(', ')}...`
          : `I love that you're thinking carefully about this. With your ${userProfile.investment_experience} experience, let's explore safe options...`
      },
      finbot: {
        curious_follow: txnCount > 0
          ? `*analyzes charts* OH YEAH! I've been tracking your ${txnCount} trades! ${recentTxns.length > 0 ? `Recent moves in ${recentTxns.map((t: any) => t.stockName).join(', ')} caught my attention!` : 'Your data tells a story!'} BitRodent is impressed! 🐹📊`
          : `Oh, you want the juicy details? *rubs digital hands together* Your ${userProfile.character_type} character data shows you're ready for this!`,
        cautious_follow: holdings.length > 0
          ? `Smart caution! Your portfolio has ${holdings.length} positions (${holdings.map((h: any) => h.symbol).join(', ')}). With that ${userProfile.risk_profile} risk approach, you're building steadily!`
          : `Smart move being cautious! Even my crypto hamster approves of your ${userProfile.risk_profile} risk approach. Here's the deal...`
      },
      risky_rick: {
        curious_follow: txnCount > 10
          ? `BOOM! ${txnCount} TRANSACTIONS! That's the ENERGY I love! Your recent moves show you're not afraid to EXECUTE! Let's amplify those gains! 🚀`
          : `NOW WE'RE TALKING! With ${userProfile.achievements.length} achievements under your belt, you're ready for the big leagues!`,
        cautious_follow: txnCount > 0
          ? `Hey, I respect strategy! Your ${txnCount} trades show you're active but calculated. That ${userProfile.risk_profile} profile keeps you grounded. Smart combo!`
          : `Hey, even risk-takers need strategy! Your ${userProfile.investment_experience} level shows you know when to hold back...`
      },
      budget_beth: {
        curious_follow: txnCount > 0
          ? `Such good questions! I've reviewed your ${txnCount} transactions - you're trading responsibly with your ${userProfile.risk_profile} approach. That's wonderful discipline!`
          : `I appreciate your curiosity! Let's look at this methodically, considering your current level ${userProfile.game_level} position...`,
        cautious_follow: holdings.length > 0
          ? `Perfect mindset! Your ${holdings.length} stock holdings (${holdings.map((h: any) => h.symbol).join(', ')}) show you're diversifying wisely. Your careful planning is paying off!`
          : `Exactly the right mindset! Your careful approach aligns perfectly with sound financial principles...`
      }
    };

    const npcKey = npcPersonality.name.toLowerCase().replace(' ', '_') as keyof typeof responses;
    const npcResponses = responses[npcKey] || responses.maya;
    
    return npcResponses[responseType as keyof typeof npcResponses] || 
           `That's an interesting perspective! Let me share some thoughts based on your profile...`;
  }

  /**
   * Generate final responses for conversation endings
   */
  private generateFinalResponse(
    userProfile: UserProfile, 
    npcPersonality: NPCPersonality, 
    conclusionType: string,
    enrichedData?: any
  ): string {
    const txnCount = enrichedData?.stockTransactions?.length || 0;
    const holdings = enrichedData?.stockPortfolio?.holdings?.length || 0;
    
    const conclusions = {
      maya: {
        enthusiastic_conclusion: `Perfect! With your ${userProfile.character_type} character strengths and level ${userProfile.game_level} experience, you're set for success. Keep up the great work!`,
        analytical_conclusion: `Excellent analysis! Your ${userProfile.investment_experience} background really shows. This approach should align well with your ${userProfile.risk_profile} risk tolerance.`,
        supportive_conclusion: `You're on the right track! Remember, every expert was once a beginner. Your progress to level ${userProfile.game_level} shows real dedication.`,
        educational_conclusion: `Great questions! Learning is the foundation of good investing. Your ${userProfile.character_type} character will benefit from this knowledge.`
      },
      finbot: {
        enthusiastic_conclusion: `You get it! BitRodent is literally doing backflips in his wheel. Your ${userProfile.risk_profile} risk game is strong!`,
        analytical_conclusion: `*chef's kiss* Beautiful analysis! Your data-driven approach would make any algorithm proud. Keep crunching those numbers!`,
        supportive_conclusion: `Every trader starts somewhere! Your ${userProfile.achievements.length} achievements prove you're no quitter. To the moon! 🚀`,
        educational_conclusion: `Knowledge is power, and power is profit! Well, responsible profit. Your character ${userProfile.character_type} is lucky to have such a thoughtful player.`
      },
      risky_rick: {
        enthusiastic_conclusion: `BOOM! That's the energy I love to see! Your level ${userProfile.game_level} momentum plus this attitude = SUCCESS COMBO!`,
        analytical_conclusion: `Smart risk-taking is the best kind! Your analytical side keeps your adventurous side in check. Perfect balance!`,
        supportive_conclusion: `Every champion started as a challenger! Your ${userProfile.character_type} character journey is just beginning. Keep pushing!`,
        educational_conclusion: `Knowledge + Action = RESULTS! Your willingness to learn while staying bold is what separates winners from wannabes!`
      },
      budget_beth: {
        enthusiastic_conclusion: `Wonderful enthusiasm channeled through careful planning! Your approach honors both ambition and prudence.`,
        analytical_conclusion: `Thorough analysis leads to confident decisions. Your methodical approach will serve your ${userProfile.character_type} character well.`,
        supportive_conclusion: `Steady progress beats hasty decisions every time. Your level ${userProfile.game_level} achievements speak to your patience and persistence.`,
        educational_conclusion: `The best investment is in your own knowledge! Your commitment to learning will pay dividends throughout your financial journey.`
      }
    };

    const npcKey = npcPersonality.name.toLowerCase().replace(' ', '_') as keyof typeof conclusions;
    const npcConclusions = conclusions[npcKey] || conclusions.maya;
    
    return npcConclusions[conclusionType as keyof typeof npcConclusions] || 
           `Thanks for the great conversation! Keep up the excellent work on your financial journey!`;
  }

  /**
   * Get default user profile for users without context
   */
  private getDefaultUserProfile(): UserProfile {
    return {
      risk_profile: 'medium',
      investment_experience: 'beginner',
      past_choices: ['new_player'],
      financial_goals: ['learn_basics', 'build_savings'],
      character_type: 'unknown',
      game_level: 1,
      achievements: [],
      personality_traits: ['curious', 'learning']
    };
  }

  /**
   * Get NPC personality by name
   */
  public getNPCPersonality(npcName: string): NPCPersonality {
    const normalizedName = npcName.toLowerCase().replace(' ', '_');
    return this.npcPersonalities[normalizedName] || this.npcPersonalities.maya;
  }

  /**
   * Get available NPC personalities
   */
  public getAvailableNPCs(): NPCPersonality[] {
    return Object.values(this.npcPersonalities);
  }
}
