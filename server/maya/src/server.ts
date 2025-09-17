import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ContragSDK, ContragConfig } from 'contrag';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

// Enhanced logging utilities
class Logger {
  static info(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`${chalk.blue('[INFO]')} ${chalk.gray(timestamp)} ${message}`);
    if (data) console.log(chalk.gray('Data:'), data);
  }

  static success(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`${chalk.green('[SUCCESS]')} ${chalk.gray(timestamp)} ${message}`);
    if (data) console.log(chalk.gray('Data:'), data);
  }

  static warn(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`${chalk.yellow('[WARN]')} ${chalk.gray(timestamp)} ${message}`);
    if (data) console.log(chalk.gray('Data:'), data);
  }

  static error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.log(`${chalk.red('[ERROR]')} ${chalk.gray(timestamp)} ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.log(chalk.red('Error:'), error.message);
        console.log(chalk.red('Stack:'), error.stack);
      } else {
        console.log(chalk.red('Error:'), error);
      }
    }
  }

  static websocket(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`${chalk.magenta('[WS]')} ${chalk.gray(timestamp)} ${message}`);
    if (data) console.log(chalk.gray('Data:'), data);
  }

  static api(method: string, path: string, status?: number, userId?: string) {
    const timestamp = new Date().toISOString();
    const statusColor = status && status >= 400 ? chalk.red : chalk.green;
    const statusText = status ? ` - ${statusColor(status)}` : '';
    const userText = userId ? chalk.cyan(` [User: ${userId}]`) : '';
    console.log(`${chalk.blue('[API]')} ${chalk.gray(timestamp)} ${chalk.bold(method)} ${path}${statusText}${userText}`);
  }

  static startup(message: string) {
    console.log(`${chalk.green.bold('[STARTUP]')} ${message}`);
  }
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
}

interface UserConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  isAlive: boolean;
}

class MayaRAGServer {
  private app: express.Application;
  private wss!: WebSocketServer;
  private contragSDK!: ContragSDK;
  private connections = new Map<string, UserConnection>();
  private contragConfig!: ContragConfig;

  constructor() {
    Logger.startup('🚀 Initializing Maya RAG Server...');
    this.app = express();
    this.setupExpress();
    this.loadContragConfig();
    this.setupContrag();
  }

  private setupExpress() {
    Logger.info('Setting up Express server...');
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      Logger.api(req.method, req.path);
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        Logger.api(req.method, req.path, res.statusCode, req.params.userId);
        Logger.info(`Request completed in ${duration}ms`);
      });
      
      next();
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      Logger.info('Health check requested');
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        server: 'Maya RAG Server',
        version: '1.0.0'
      });
    });

    // Debug endpoint to list users
    this.app.get('/api/debug/users', async (req, res) => {
      try {
        Logger.info('🔍 Debug: Fetching users from MongoDB...');
        const startTime = Date.now();
        
        // Use Contrag's MongoDB connection to query users
        const result = await this.contragSDK.query('*', 'list users');
        
        const duration = Date.now() - startTime;
        Logger.success(`Users fetched successfully in ${duration}ms`, {
          resultType: typeof result,
          hasChunks: result.chunks ? result.chunks.length : 0
        });
        
        res.json({
          success: true,
          message: 'Debug query executed',
          result,
          executionTime: `${duration}ms`
        });
      } catch (error) {
        Logger.error('Failed to fetch users', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch users',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // REST endpoint to build context for a user
    this.app.post('/api/build-context/:userId', async (req, res) => {
      const { userId } = req.params;
      const startTime = Date.now();
      
      try {
        Logger.info(`🔨 Building context for user: ${userId}`);
        
        // Use 'users' (lowercase) as it appears in the database
        const result = await this.contragSDK.buildFor('users', userId);
        
        const duration = Date.now() - startTime;
        Logger.success(`Context built successfully for user ${userId} in ${duration}ms`, {
          resultType: typeof result,
          success: true
        });
        
        res.json({
          success: true,
          message: 'Context built successfully',
          result,
          executionTime: `${duration}ms`,
          userId
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        Logger.error(`Failed to build context for user ${userId} after ${duration}ms`, error);
        res.status(500).json({
          success: false,
          message: 'Failed to build context',
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        });
      }
    });

    // REST endpoint to query user context (raw chunks)
    this.app.post('/api/query/:userId', async (req, res) => {
      const { userId } = req.params;
      const { query } = req.body;
      const startTime = Date.now();
      
      if (!query) {
        Logger.warn(`Query request missing query parameter for user ${userId}`);
        return res.status(400).json({
          success: false,
          message: 'Query is required'
        });
      }

      try {
        Logger.info(`🔍 Querying context for user ${userId}`, { query: query.substring(0, 100) + (query.length > 100 ? '...' : '') });
        
        // Use 'users' (lowercase) to match the database collection name
        const result = await this.contragSDK.query(`users:${userId}`, query);
        
        const duration = Date.now() - startTime;
        Logger.success(`Context query completed for user ${userId} in ${duration}ms`, {
          chunksFound: result.chunks ? result.chunks.length : 0,
          queryLength: query.length
        });
        
        res.json({
          success: true,
          result: {
            chunks: result.chunks,
            query: query,
            timestamp: new Date().toISOString(),
            executionTime: `${duration}ms`
          }
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        Logger.error(`Failed to query context for user ${userId} after ${duration}ms`, error);
        res.status(500).json({
          success: false,
          message: 'Failed to query context',
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          query: query.substring(0, 50) + '...'
        });
      }
    });

    // REST endpoint for LLM-generated responses
    this.app.post('/api/chat/:userId', async (req, res) => {
      const { userId } = req.params;
      const { query } = req.body;
      const startTime = Date.now();
      
      if (!query) {
        Logger.warn(`Chat request missing query parameter for user ${userId}`);
        return res.status(400).json({
          success: false,
          message: 'Query is required'
        });
      }

      try {
        Logger.info(`🤖 Processing chat request for user ${userId}`, { 
          query: query.substring(0, 100) + (query.length > 100 ? '...' : '') 
        });
        
        // Query the user's context using Contrag
        const queryResult = await this.contragSDK.query(`users:${userId}`, query);
        
        // Generate AI response based on context
        const aiResponse = this.generateAIResponse(query, queryResult.chunks);
        
        const duration = Date.now() - startTime;
        Logger.success(`Chat response generated for user ${userId} in ${duration}ms`, {
          chunksUsed: queryResult.chunks?.length || 0,
          responseLength: aiResponse.length
        });
        
        res.json({
          success: true,
          result: {
            response: aiResponse,
            context: {
              chunks: queryResult.chunks,
              chunksCount: queryResult.chunks?.length || 0
            },
            query: query,
            timestamp: new Date().toISOString(),
            executionTime: `${duration}ms`
          }
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        Logger.error(`Failed to generate chat response for user ${userId} after ${duration}ms`, error);
        res.status(500).json({
          success: false,
          message: 'Failed to generate chat response',
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          query: query.substring(0, 50) + '...'
        });
      }
    });
    
    Logger.success('Express server setup completed');
  }

  private loadContragConfig() {
    try {
      Logger.info('📋 Loading ContRAG configuration...');
      const configPath = join(__dirname, '..', 'contrag.config.json');
      Logger.info(`Config path: ${configPath}`);
      
      const configFile = readFileSync(configPath, 'utf-8');
      this.contragConfig = JSON.parse(configFile);
      
      // Override with environment variables if available
      if (process.env.GEMINI_API_KEY) {
        this.contragConfig.embedder.config.apiKey = process.env.GEMINI_API_KEY;
        Logger.info('✅ Gemini API key loaded from environment');
      }
      
      Logger.success('ContRAG configuration loaded successfully', {
        dbPlugin: this.contragConfig.database?.plugin,
        vectorPlugin: this.contragConfig.vectorStore?.plugin,
        embedderPlugin: this.contragConfig.embedder?.plugin
      });
    } catch (error) {
      Logger.error('Failed to load Contrag config', error);
      throw error;
    }
  }

  private async setupContrag() {
    try {
      Logger.info('🔧 Setting up ContRAG SDK...');
      const startTime = Date.now();
      
      this.contragSDK = new ContragSDK();
      await this.contragSDK.configure(this.contragConfig);
      
      const duration = Date.now() - startTime;
      Logger.success(`ContRAG SDK configured successfully in ${duration}ms`);
      
      // Test the connection
      Logger.info('🧪 Testing ContRAG connections...');
      try {
        // Test basic query to verify everything is working
        const testResult = await this.contragSDK.query('*', 'test connection');
        Logger.success('ContRAG connection test passed', {
          hasChunks: testResult.chunks ? testResult.chunks.length : 0
        });
      } catch (testError) {
        Logger.warn('ContRAG connection test failed, but SDK is configured', testError);
      }
    } catch (error) {
      Logger.error('Failed to setup ContRAG SDK', error);
      throw error;
    }
  }

  private setupWebSocket() {
    const wsPort = parseInt(process.env.WS_PORT || '8081');
    
    Logger.info(`🌐 Setting up WebSocket server on port ${wsPort}...`);
    
    this.wss = new WebSocketServer({ 
      port: wsPort,
      clientTracking: true 
    });

    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const userId = url.searchParams.get('userId');
      const username = url.searchParams.get('username');

      if (!userId || !username) {
        Logger.warn('WebSocket connection rejected: Missing userId or username', {
          url: request.url,
          headers: request.headers
        });
        ws.close(1008, 'Missing userId or username');
        return;
      }

      const connectionId = uuidv4();
      const connection: UserConnection = {
        ws,
        userId,
        username,
        isAlive: true
      };

      this.connections.set(connectionId, connection);
      
      Logger.websocket(`User connected: ${username} (${userId})`, {
        connectionId,
        totalConnections: this.connections.size
      });

      // Send welcome message
      this.sendMessage(ws, {
        id: uuidv4(),
        userId: 'system',
        username: 'Maya',
        message: `Welcome ${username}! I'm Maya, your AI financial advisor. How can I help you today?`,
        timestamp: new Date(),
        type: 'ai'
      });

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          Logger.websocket(`Message received from ${username}`, {
            messageLength: message.message?.length || 0,
            type: message.type || 'unknown'
          });
          await this.handleChatMessage(connectionId, message);
        } catch (error) {
          Logger.error(`Error handling message from ${username}`, error);
          this.sendError(ws, 'Failed to process message');
        }
      });

      // Handle connection close
      ws.on('close', (code, reason) => {
        Logger.websocket(`User disconnected: ${username} (${userId})`, {
          code,
          reason: reason.toString(),
          totalConnections: this.connections.size - 1
        });
        this.connections.delete(connectionId);
      });

      // Handle errors
      ws.on('error', (error) => {
        Logger.error(`WebSocket error for user ${username}`, error);
        this.connections.delete(connectionId);
      });

      // Ping/pong for connection health
      ws.on('pong', () => {
        connection.isAlive = true;
        Logger.websocket(`Pong received from ${username} - connection alive`);
      });
    });

    // Cleanup dead connections
    const interval = setInterval(() => {
      Logger.info(`🔄 Connection health check - Active connections: ${this.connections.size}`);
      
      this.wss.clients.forEach((ws) => {
        const connection = Array.from(this.connections.values())
          .find(conn => conn.ws === ws);
        
        if (connection && !connection.isAlive) {
          Logger.warn(`Terminating dead connection for user: ${connection.username}`);
          ws.terminate();
          return;
        }
        
        if (connection) {
          connection.isAlive = false;
          ws.ping();
        }
      });
    }, 30000);

    this.wss.on('close', () => {
      Logger.info('WebSocket server closed');
      clearInterval(interval);
    });

    Logger.success(`WebSocket server started on port ${wsPort}`);
  }

  private async handleChatMessage(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { ws, userId, username } = connection;

    // Echo the user message back
    const userMessage: ChatMessage = {
      id: uuidv4(),
      userId,
      username,
      message: message.message,
      timestamp: new Date(),
      type: 'user'
    };
    
    this.sendMessage(ws, userMessage);

    try {
      // Query the user's context using Contrag
      Logger.info(`🤖 Processing RAG query for user ${userId} (${username})`, {
        queryLength: message.message?.length || 0,
        query: message.message?.substring(0, 100) + (message.message?.length > 100 ? '...' : '')
      });
      
      const startTime = Date.now();
      const queryResult = await this.contragSDK.query(`User:${userId}`, message.message);
      const duration = Date.now() - startTime;
      
      Logger.success(`RAG query completed for ${username} in ${duration}ms`, {
        chunksFound: queryResult.chunks?.length || 0,
        hasContext: queryResult.chunks && queryResult.chunks.length > 0
      });
      
      // Generate AI response based on context
      let aiResponse = this.generateAIResponse(message.message, queryResult.chunks);
      
      Logger.info(`💬 Generated AI response for ${username}`, {
        responseLength: aiResponse.length,
        contextUsed: queryResult.chunks?.length || 0
      });
      
      // Send AI response
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        userId: 'maya-ai',
        username: 'Maya',
        message: aiResponse,
        timestamp: new Date(),
        type: 'ai'
      };
      
      this.sendMessage(ws, aiMessage);
      
    } catch (error) {
      Logger.error(`Failed to process RAG query for ${username}`, error);
      
      // Send fallback response
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        userId: 'maya-ai',
        username: 'Maya',
        message: "I'm sorry, I'm having trouble accessing your information right now. Please try again later or make sure your context has been built first.",
        timestamp: new Date(),
        type: 'ai'
      };
      
      this.sendMessage(ws, errorMessage);
    }
  }

  private generateAIResponse(userQuery: string, contextChunks: any[]): string {
    // Log the context analysis
    Logger.info('🧠 Generating AI response', {
      queryLength: userQuery.length,
      contextChunks: contextChunks?.length || 0,
      queryPreview: userQuery.substring(0, 50) + (userQuery.length > 50 ? '...' : '')
    });
    
    // Simple rule-based response generation for now
    // In a real implementation, you'd integrate with an LLM here
    
    if (contextChunks.length === 0) {
      Logger.warn('No context chunks found - providing fallback response');
      return "I don't have any specific information about your account yet. Make sure to build your context first by calling the build-context endpoint, then I can provide personalized financial advice!";
    }

    const query = userQuery.toLowerCase();
    
    // Extract user data from context chunks
    let userData = null;
    let gamePreferences = null;
    let achievements = null;
    
    if (contextChunks.length > 0) {
      const content = contextChunks[0].content;
      // Parse user data from the content string
      const emailMatch = content.match(/email: ([^\n]+)/);
      const usernameMatch = content.match(/gameUsername: ([^\n]+)/);
      const characterMatch = content.match(/selectedCharacter: ([^\n]+)/);
      const levelMatch = content.match(/level: ([^\n]+)/);
      const experienceMatch = content.match(/experience: ([^\n]+)/);
      const createdMatch = content.match(/createdAt: ([^\n]+)/);
      const lastLoginMatch = content.match(/lastLoginAt: ([^\n]+)/);
      const googleIdMatch = content.match(/googleId: ([^\n]+)/);
      
      // Parse preferences
      const soundMatch = content.match(/soundEnabled: ([^\n]+)/);
      const musicMatch = content.match(/musicEnabled: ([^\n]+)/);
      const languageMatch = content.match(/language: ([^\n]+)/);
      const achievementsMatch = content.match(/achievements: \[(\d+) items\]/);
      
      userData = {
        email: emailMatch?.[1] || 'Unknown',
        username: usernameMatch?.[1] || 'Unknown',
        character: characterMatch?.[1] || 'Unknown',
        level: levelMatch?.[1] || 'Unknown',
        experience: experienceMatch?.[1] || 'Unknown',
        createdAt: createdMatch?.[1] || 'Unknown',
        lastLoginAt: lastLoginMatch?.[1] || 'Unknown',
        googleId: googleIdMatch?.[1] || 'Unknown'
      };
      
      gamePreferences = {
        soundEnabled: soundMatch?.[1] === 'true',
        musicEnabled: musicMatch?.[1] === 'true',
        language: languageMatch?.[1] || 'en'
      };
      
      achievements = {
        count: achievementsMatch?.[1] || '0'
      };
    }
    
    // Handle different query types with enhanced responses
    if (query.includes('stats') || query.includes('detail') || query.includes('profile') || query.includes('account')) {
      Logger.info('📊 Stats/profile query detected');
      if (userData) {
        return `Here are your detailed stats, ${userData.username}:

🎮 **Game Profile:**
• Username: ${userData.username}
• Character: ${userData.character}
• Level: ${userData.level}
• Experience Points: ${userData.experience}
• Achievements Unlocked: ${achievements?.count || 0}

👤 **Account Details:**
• Email: ${userData.email}
• Google ID: ${userData.googleId}
• Account Created: ${new Date(userData.createdAt).toLocaleDateString()}
• Last Login: ${new Date(userData.lastLoginAt).toLocaleDateString()}

⚙️ **Game Preferences:**
• Sound Effects: ${gamePreferences?.soundEnabled ? '🔊 Enabled' : '� Disabled'}
• Background Music: ${gamePreferences?.musicEnabled ? '🎵 Enabled' : '🔇 Disabled'}
• Language: ${gamePreferences?.language?.toUpperCase() || 'EN'}

�📈 **Progress Summary:**
You're currently at level ${userData.level} with ${userData.experience} experience points. As a ${userData.character} character, you're just getting started on your financial journey in Dhaniverse!

💡 **Next Steps:**
• Complete more financial challenges to gain experience
• Explore banking and investment options
• Level up by making smart financial decisions

Is there any specific aspect of your progress you'd like to know more about?`;
      }
    }
    
    if (query.includes('bank') || query.includes('account') || query.includes('balance') || query.includes('financial')) {
      Logger.info('🏦 Banking/Financial query detected');
      if (userData) {
        return `💰 **Financial Account Summary for ${userData.username}:**

🏦 **Banking Status:**
• Account Level: ${userData.level} (Beginner)
• Financial Experience: ${userData.experience} points
• Character Type: ${userData.character} (affects available banking products)

📊 **Current Financial Standing:**
Based on your profile data, you're just starting your financial journey in Dhaniverse. Here's what I can see:

• **Account Created:** ${new Date(userData.createdAt).toLocaleDateString()}
• **Profile Status:** Active and verified through Google (${userData.googleId})
• **Game Progress:** Level ${userData.level} - Still building your financial foundation

💡 **Available Banking Services:**
As a level ${userData.level} player, you have access to:
• Basic savings accounts
• Beginner investment tutorials
• Financial literacy challenges
• Character-specific banking products for ${userData.character}

⚠️ **Note:** I don't see specific account balances in your current data. You may need to:
1. Create your first bank account in the game
2. Complete the banking tutorial
3. Make your first deposit to activate detailed financial tracking

Would you like guidance on setting up your first bank account or exploring investment options?`;
      }
    }
    
    if (query.includes('invest') || query.includes('stock') || query.includes('portfolio')) {
      Logger.info('📈 Investment/Portfolio query detected');
      if (userData) {
        return `📈 **Investment Portfolio Analysis for ${userData.username}:**

🎯 **Investment Profile:**
• Investor Level: ${userData.level} (Novice)
• Experience Points: ${userData.experience}
• Character: ${userData.character} (affects investment strategies)

📊 **Current Investment Status:**
You're at the beginning of your investment journey! Here's your profile:

• **Account Age:** ${Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
• **Investment Experience:** Just starting (Level ${userData.level})
• **Character Benefits:** ${userData.character} characters typically excel in different investment areas

💼 **Recommended Investment Path:**
1. **Start with Basics:** Complete investment tutorials to gain experience
2. **Paper Trading:** Practice with virtual investments first
3. **Diversified Portfolio:** Begin with low-risk investments suitable for ${userData.character}
4. **Growth Strategy:** Level up through successful trades and financial decisions

🎮 **Game Integration:**
• Each successful investment earns experience points
• Level up to unlock advanced trading features
• Character-specific investment bonuses available

⚠️ **Note:** I don't see active investments in your current profile. Ready to start your investment journey? I can guide you through:
• Setting up your first investment account
• Understanding risk tolerance for ${userData.character} characters
• Beginner-friendly investment options

What type of investments interest you most?`;
      }
    }
    
    if (query.includes('achievement') || query.includes('progress') || query.includes('milestone')) {
      Logger.info('🏆 Achievement/Progress query detected');
      if (userData && achievements) {
        return `🏆 **Achievement & Progress Report for ${userData.username}:**

🎮 **Current Status:**
• Level: ${userData.level}
• Experience Points: ${userData.experience}
• Achievements Unlocked: ${achievements.count}
• Character: ${userData.character}

📈 **Progress Milestones:**
• **Account Creation:** ✅ Completed (${new Date(userData.createdAt).toLocaleDateString()})
• **Character Selection:** ✅ ${userData.character} chosen
• **Profile Setup:** ✅ Complete with Google integration
• **Game Preferences:** ✅ Configured (Sound: ${gamePreferences?.soundEnabled ? 'On' : 'Off'}, Music: ${gamePreferences?.musicEnabled ? 'On' : 'Off'})

🎯 **Next Milestones to Unlock:**
• **First Financial Challenge:** Complete a banking tutorial (Level 1 → 2)
• **Investment Basics:** Learn about different investment types
• **Achievement Hunter:** Unlock your first achievement badge
• **Social Features:** Connect with other players

⭐ **Available Achievements:**
Since you have ${achievements.count} achievements unlocked, here are some you can work toward:
• 🏦 "First Bank Account" - Open your first savings account
• 📈 "Investment Explorer" - Complete investment tutorial
• 💰 "Money Manager" - Track expenses for 7 days
• 🎯 "Goal Setter" - Set your first financial goal

🚀 **Leveling Up Tips:**
• Each completed challenge gives experience points
• ${userData.character} characters get bonus XP for specific activities
• Regular gameplay maintains your progress streak

Ready to tackle your next challenge and level up?`;
      }
    }
    
    if (query.includes('preference') || query.includes('setting') || query.includes('configuration')) {
      Logger.info('⚙️ Preferences/Settings query detected');
      if (userData && gamePreferences) {
        return `⚙️ **Game Preferences & Settings for ${userData.username}:**

🎵 **Audio Settings:**
• Sound Effects: ${gamePreferences.soundEnabled ? '🔊 Enabled' : '🔇 Disabled'}
• Background Music: ${gamePreferences.musicEnabled ? '🎵 Enabled' : '🔇 Disabled'}

🌍 **Language & Region:**
• Game Language: ${gamePreferences.language.toUpperCase()}
• Account Region: Detected from Google account

👤 **Profile Configuration:**
• Character: ${userData.character}
• Display Username: ${userData.username}
• Account Type: Google-integrated (${userData.googleId})
• Privacy Level: Standard

🎮 **Game Settings:**
• Tutorial Mode: Available (Level ${userData.level})
• Difficulty: Beginner (auto-adjusted for ${userData.character})
• Progress Tracking: Enabled

📱 **Accessibility Options:**
Based on your ${userData.character} character selection:
• Visual themes optimized for your character
• Character-specific UI elements
• Personalized financial advice style

⚙️ **Account Settings:**
• Email Notifications: ${userData.email}
• Last Updated: ${new Date(userData.lastLoginAt).toLocaleDateString()}
• Account Status: Active

💡 **Customization Tips:**
• Characters have different UI themes and advice styles
• Audio settings can be adjusted anytime in-game
• Language settings affect tutorial content and advice tone

Would you like to modify any of these settings or learn more about ${userData.character} character benefits?`;
      }
    }
    
    if (query.includes('transaction') || query.includes('history') || query.includes('spending')) {
      Logger.info('💳 Transaction/History query detected');
      if (userData) {
        return `💳 **Transaction History for ${userData.username}:**

📊 **Account Overview:**
• Current Level: ${userData.level}
• Account Age: ${Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
• Character: ${userData.character}

📈 **Financial Activity Summary:**
Based on your profile, you're just getting started with financial tracking in Dhaniverse.

🔍 **What I Found:**
• Account created on ${new Date(userData.createdAt).toLocaleDateString()}
• Last active on ${new Date(userData.lastLoginAt).toLocaleDateString()}
• Experience level: ${userData.experience} points (indicating minimal financial activity so far)

⚠️ **Transaction Status:**
I don't see specific transaction records in your current profile data. This suggests:
• You haven't made your first in-game financial transaction yet
• Banking features may not be activated
• You're still in the tutorial/setup phase

🚀 **Get Started with Transactions:**
To begin tracking your financial activity:
1. **Complete Banking Tutorial** - Learn about different account types
2. **Open First Account** - Choose savings, checking, or investment
3. **Make Initial Deposit** - Start with any amount to activate tracking
4. **Set Financial Goals** - This helps track progress toward objectives

💡 **Character Benefits:**
As a ${userData.character} character, you'll get:
• Specialized transaction categories
• Character-specific spending insights
• Tailored financial recommendations

Ready to make your first transaction and start building your financial history?`;
      }
    }

    // Default response with context
    Logger.info('💬 General query - using default response with context');
    if (userData) {
      return `Hello ${userData.username}! I found some relevant information about you. You're currently at level ${userData.level} with ${userData.experience} experience points, playing as character ${userData.character}. How can I help you with your financial goals today?`;
    }
    
    return `I found some relevant information about you: ${contextChunks.slice(0, 3).map(chunk => chunk.content.substring(0, 100)).join('... ')}... How can I help you with your financial goals today?`;
  }

  private sendMessage(ws: WebSocket, message: ChatMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      Logger.websocket(`Message sent to user`, {
        messageId: message.id,
        type: message.type,
        from: message.username,
        length: message.message.length
      });
    } else {
      Logger.warn('Attempted to send message to closed WebSocket', {
        readyState: ws.readyState,
        messageType: message.type
      });
    }
  }

  private sendError(ws: WebSocket, error: string) {
    const errorMessage: ChatMessage = {
      id: uuidv4(),
      userId: 'system',
      username: 'System',
      message: `Error: ${error}`,
      timestamp: new Date(),
      type: 'system'
    };
    
    Logger.error(`Sending error message to client: ${error}`);
    this.sendMessage(ws, errorMessage);
  }

  public async start() {
    const port = parseInt(process.env.PORT || '3001');
    
    Logger.startup('🚀 Starting Maya RAG Server...');
    
    // Start Express server
    this.app.listen(port, () => {
      Logger.success(`🌐 HTTP API Server running on port ${port}`);
      Logger.info(`📊 Health check: http://localhost:${port}/health`);
      Logger.info(`🔍 Debug endpoint: http://localhost:${port}/api/debug/users`);
      Logger.info(`🔨 Build context: POST http://localhost:${port}/api/build-context/{userId}`);
      Logger.info(`📋 Raw query: POST http://localhost:${port}/api/query/{userId}`);
      Logger.info(`🤖 Chat (LLM): POST http://localhost:${port}/api/chat/{userId}`);
    });

    // Start WebSocket server
    this.setupWebSocket();

    // Print startup summary
    console.log('\n' + '='.repeat(60));
    Logger.startup('🎉 Maya RAG Server started successfully!');
    Logger.startup(`📡 HTTP API: http://localhost:${port}`);
    Logger.startup(`🔌 WebSocket: ws://localhost:${process.env.WS_PORT || '8081'}`);
    Logger.startup('💡 Ready to process RAG queries and chat requests');
    console.log('='.repeat(60) + '\n');
    
    // Log environment info
    Logger.info('🔧 Environment Configuration', {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: port,
      wsPort: process.env.WS_PORT || '8081',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasMongoUri: !!process.env.MONGODB_URI
    });
  }
}

// Start the server
const server = new MayaRAGServer();

// Graceful shutdown handling
process.on('SIGINT', () => {
  Logger.warn('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.warn('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  Logger.error('💥 Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('🚫 Unhandled Rejection at Promise', { reason, promise });
});

server.start().catch((error) => {
  Logger.error('💥 Failed to start Maya RAG Server', error);
  process.exit(1);
});
