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
import { ConversationService } from './services/conversationService.js';
import { UserDataEnrichmentService } from './services/userDataEnrichmentService.js';
import { ConversationTree, UserProfile, ChatResponse } from './types/schema.js';

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
  private conversationService: ConversationService;
  private enrichmentService: UserDataEnrichmentService;

  constructor() {
    Logger.startup('🚀 Initializing Maya RAG Server...');
    this.app = express();
    this.conversationService = ConversationService.getInstance();
    this.enrichmentService = UserDataEnrichmentService.getInstance();
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
        version: '1.2.0',
        features: {
          simple_chat: 'POST /api/chat/:userId',
          conversation_graphs: 'POST /api/conversation-graph/:userId',
          available_npcs: 'GET /api/npcs',
          user_context: 'POST /api/build-context/:userId',
          raw_query: 'POST /api/query/:userId'
        },
        conversation_service: {
          npcs_available: this.conversationService.getAvailableNPCs().length,
          personalities: this.conversationService.getAvailableNPCs().map(npc => npc.name)
        }
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
        
        // Log OpenAI API key details before making the call
        Logger.info('🔑 OpenAI API Key Status before buildFor call', {
          keyExists: !!this.contragConfig.embedder?.config?.apiKey,
          keyLength: this.contragConfig.embedder?.config?.apiKey?.length || 0,
          keyPrefix: this.contragConfig.embedder?.config?.apiKey ? 
            this.contragConfig.embedder?.config?.apiKey.substring(0, 15) + '...' : 'none',
          model: this.contragConfig.embedder?.config?.model,
          plugin: this.contragConfig.embedder?.plugin,
          dimensions: this.contragConfig.embedder?.config?.dimensions,
          fullApiKey: this.contragConfig.embedder?.config?.apiKey
        });
        
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
        
        // Log additional details about the OpenAI API error
        if (error instanceof Error && error.message.includes('OpenAI')) {
          Logger.error('🔑 OpenAI API Error Details', {
            errorMessage: error.message,
            currentApiKey: this.contragConfig.embedder?.config?.apiKey,
            keyLength: this.contragConfig.embedder?.config?.apiKey?.length || 0,
            model: this.contragConfig.embedder?.config?.model,
            dimensions: this.contragConfig.embedder?.config?.dimensions
          });
        }
        
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

    // REST endpoint for LLM-generated responses (Enhanced)
    this.app.post('/api/chat/:userId', async (req, res) => {
      const { userId } = req.params;
      const { query, responseType = 'simple' } = req.body;
      const startTime = Date.now();
      
      if (!query) {
        Logger.warn(`Chat request missing query parameter for user ${userId}`);
        return res.status(400).json({
          success: false,
          message: 'Query is required'
        });
      }

      try {
        Logger.info(`🤖 Processing ${responseType} chat request for user ${userId}`, { 
          query: query.substring(0, 100) + (query.length > 100 ? '...' : '') 
        });
        
        // ENHANCED: Fetch enriched user data from all related collections
        const enrichedData = await this.enrichmentService.getEnrichedUserContext(userId);
        
        // Extract user profile from enriched data (not just ContRAG chunks)
        const userProfile = this.conversationService.extractUserProfileFromEnrichedData(enrichedData);
        
        Logger.info(`📊 User profile extracted`, {
          level: userProfile.game_level,
          risk: userProfile.risk_profile,
          experience: userProfile.investment_experience,
          stockTransactions: enrichedData.stockTransactions?.length || 0
        });
        
        let aiResponse: string;
        
        if (responseType === 'conversation_graph') {
          // This should redirect to the conversation graph endpoint
          return res.status(400).json({
            success: false,
            message: 'Use /api/conversation-graph/:userId for conversation tree responses',
            suggestion: 'POST /api/conversation-graph/:userId'
          });
        } else {
          // Generate enhanced AI response based on enriched data and user profile
          aiResponse = this.generateEnhancedAIResponseWithEnrichedData(query, enrichedData, userProfile);
        }
        
        const duration = Date.now() - startTime;
        Logger.success(`Chat response generated for user ${userId} in ${duration}ms`, {
          dataSourcesUsed: Object.keys(enrichedData).filter(k => !k.startsWith('_')).length,
          stockTransactions: enrichedData.stockTransactions?.length || 0,
          responseLength: aiResponse.length,
          responseType
        });
        
        const chatResponse: ChatResponse = {
          id: uuidv4(),
          userId,
          message: aiResponse,
          timestamp: new Date(),
          type: 'simple',
          response_data: {
            text: aiResponse
          }
        };
        
        res.json({
          success: true,
          result: chatResponse,
          context: {
            enrichedData: {
              hasPlayerState: !!enrichedData.playerState,
              hasBankAccounts: enrichedData.bankAccounts?.length > 0,
              hasStockPortfolio: !!enrichedData.stockPortfolio,
              stockTransactionsCount: enrichedData.stockTransactions?.length || 0,
              achievementsCount: enrichedData.achievements?.length || 0
            },
            userProfile
          },
          query: query,
          timestamp: new Date().toISOString(),
          executionTime: `${duration}ms`
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

    // NEW: REST endpoint for conversation tree generation (ENHANCED with enriched data)
    this.app.post('/api/conversation-graph/:userId', async (req, res) => {
      const { userId } = req.params;
      const { npcName = 'maya', topic } = req.body;
      const startTime = Date.now();
      
      try {
        Logger.info(`🌳 Generating conversation tree for user ${userId}`, { 
          npcName,
          topic: topic || 'general'
        });
        
        // ENHANCED: Fetch enriched user data from all related collections
        const enrichedData = await this.enrichmentService.getEnrichedUserContext(userId);
        
        // Extract user profile from enriched data (not just ContRAG chunks)
        const userProfile = this.conversationService.extractUserProfileFromEnrichedData(enrichedData);
        
        Logger.info(`📊 User profile extracted for conversation tree`, {
          level: userProfile.game_level,
          risk: userProfile.risk_profile,
          experience: userProfile.investment_experience,
          stockTransactions: enrichedData.stockTransactions?.length || 0,
          achievements: enrichedData.achievements?.length || 0
        });
        
        // Get NPC personality
        const npcPersonality = this.conversationService.getNPCPersonality(npcName);
        
        // Generate conversation tree with enriched context
        const conversationTree = this.conversationService.generateConversationTree(
          userProfile, 
          npcPersonality, 
          topic,
          enrichedData  // Pass enriched data to conversation generation
        );
        
        const duration = Date.now() - startTime;
        Logger.success(`Conversation tree generated for user ${userId} in ${duration}ms`, {
          npcName: npcPersonality.name,
          nodeCount: Object.keys(conversationTree.conversation_tree).length,
          userLevel: userProfile.game_level,
          riskProfile: userProfile.risk_profile,
          dataSourcesUsed: Object.keys(enrichedData).filter(k => !k.startsWith('_')).length
        });
        
        const chatResponse: ChatResponse = {
          id: uuidv4(),
          userId,
          message: `Conversation tree generated for ${npcPersonality.name}`,
          timestamp: new Date(),
          type: 'conversation_graph',
          response_data: {
            conversation_tree: conversationTree,
            user_profile: userProfile
          }
        };
        
        res.json({
          success: true,
          result: chatResponse,
          context: {
            enrichedData: {
              hasPlayerState: !!enrichedData.playerState,
              hasBankAccounts: enrichedData.bankAccounts?.length > 0,
              hasStockPortfolio: !!enrichedData.stockPortfolio,
              stockTransactionsCount: enrichedData.stockTransactions?.length || 0,
              achievementsCount: enrichedData.achievements?.length || 0,
              bankAccountsCount: enrichedData.bankAccounts?.length || 0,
              gameSessionsCount: enrichedData.gameSessions?.length || 0
            },
            userProfile,
            npcPersonality
          },
          timestamp: new Date().toISOString(),
          executionTime: `${duration}ms`
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        Logger.error(`Failed to generate conversation tree for user ${userId} after ${duration}ms`, error);
        res.status(500).json({
          success: false,
          message: 'Failed to generate conversation tree',
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          npcName
        });
      }
    });

    // NEW: REST endpoint to get available NPCs
    this.app.get('/api/npcs', (req, res) => {
      try {
        const npcs = this.conversationService.getAvailableNPCs();
        
        Logger.info('📋 Available NPCs requested', {
          npcCount: npcs.length
        });
        
        res.json({
          success: true,
          result: {
            npcs: npcs.map(npc => ({
              name: npc.name,
              role: npc.role,
              personality_traits: npc.personality_traits,
              conversation_style: npc.conversation_style,
              expertise: npc.financial_expertise
            }))
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        Logger.error('Failed to get available NPCs', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get available NPCs',
          error: error instanceof Error ? error.message : 'Unknown error'
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
      if (process.env.OPENAI_API_KEY) {
        this.contragConfig.embedder.config.apiKey = process.env.OPENAI_API_KEY;
        Logger.info('✅ OpenAI API key loaded from environment', {
          keyExists: !!process.env.OPENAI_API_KEY,
          keyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
          keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 15) + '...' : 'none',
          apiKey: process.env.OPENAI_API_KEY // Full key for debugging
        });
      } else {
        Logger.warn('❌ No OpenAI API key found in environment variables');
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
      
      // Log the configuration being used
      Logger.info('📋 ContRAG Configuration Details', {
        database: {
          plugin: this.contragConfig.database?.plugin,
          url: this.contragConfig.database?.config?.url ? '***configured***' : 'missing',
          name: this.contragConfig.database?.config?.name
        },
        vectorStore: {
          plugin: this.contragConfig.vectorStore?.plugin,
          host: this.contragConfig.vectorStore?.config?.host,
          port: this.contragConfig.vectorStore?.config?.port,
          database: this.contragConfig.vectorStore?.config?.database
        },
        embedder: {
          plugin: this.contragConfig.embedder?.plugin,
          model: this.contragConfig.embedder?.config?.model,
          dimensions: this.contragConfig.embedder?.config?.dimensions,
          apiKeyConfigured: !!this.contragConfig.embedder?.config?.apiKey,
          apiKeyLength: this.contragConfig.embedder?.config?.apiKey?.length || 0,
          actualApiKey: this.contragConfig.embedder?.config?.apiKey // Full key for debugging
        }
      });
      
      this.contragSDK = new ContragSDK();
      await this.contragSDK.configure(this.contragConfig);
      
      const duration = Date.now() - startTime;
      Logger.success(`ContRAG SDK configured successfully in ${duration}ms`);
      
      // Initialize User Data Enrichment Service
      Logger.info('🔧 Initializing User Data Enrichment Service...');
      const mongoUri = this.contragConfig.database?.config?.url;
      const dbName = this.contragConfig.database?.config?.database || 'dhaniverse';
      if (mongoUri) {
        await this.enrichmentService.connect(mongoUri, dbName);
        Logger.success('User Data Enrichment Service connected to MongoDB');
      } else {
        Logger.warn('MongoDB URI not found in ContRAG config, enrichment service not initialized');
      }
      
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
      const queryResult = await this.contragSDK.query(`users:${userId}`, message.message);
      const duration = Date.now() - startTime;
      
      Logger.success(`RAG query completed for ${username} in ${duration}ms`, {
        chunksFound: queryResult.chunks?.length || 0,
        hasContext: queryResult.chunks && queryResult.chunks.length > 0
      });
      
      // Extract user profile from context
      const userProfile = this.conversationService.extractUserProfile(queryResult.chunks || []);
      
      // Generate enhanced AI response based on context and user profile
      let aiResponse = this.generateEnhancedAIResponse(message.message, queryResult.chunks, userProfile);
      
      Logger.info(`💬 Generated enhanced AI response for ${username}`, {
        responseLength: aiResponse.length,
        contextUsed: queryResult.chunks?.length || 0,
        userLevel: userProfile.game_level,
        riskProfile: userProfile.risk_profile
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
        message: "I'm sorry, I'm having trouble accessing your information right now. Please try again later or make sure your context has been built first using the build-context endpoint.",
        timestamp: new Date(),
        type: 'ai'
      };
      
      this.sendMessage(ws, errorMessage);
    }
  }

  private generateEnhancedAIResponseWithEnrichedData(userQuery: string, enrichedData: any, userProfile: UserProfile): string {
    // Log the enriched data analysis
    Logger.info('🧠 Generating AI response with enriched data', {
      queryLength: userQuery.length,
      hasStockTransactions: enrichedData.stockTransactions?.length > 0,
      transactionCount: enrichedData.stockTransactions?.length || 0,
      hasBankAccount: enrichedData.bankAccounts?.length > 0,
      hasPortfolio: !!enrichedData.stockPortfolio,
      userLevel: userProfile.game_level,
      riskProfile: userProfile.risk_profile
    });
    
    const query = userQuery.toLowerCase();
    const userData = enrichedData.user;
    
    // Handle stock transaction queries
    if (query.includes('transaction') || query.includes('trade') || query.includes('history') || query.includes('stock')) {
      return this.generateStockTransactionResponse(enrichedData, userProfile);
    }
    
    // Handle portfolio queries
    if (query.includes('portfolio') || query.includes('holding') || query.includes('investment')) {
      return this.generatePortfolioResponse(enrichedData, userProfile);
    }
    
    // Handle bank account queries
    if (query.includes('bank') || query.includes('account') || query.includes('balance') || query.includes('deposit')) {
      return this.generateBankAccountResponse(enrichedData, userProfile);
    }
    
    // Handle stats/profile queries  
    if (query.includes('stats') || query.includes('profile') || query.includes('detail')) {
      return this.generateEnrichedStatsResponse(enrichedData, userProfile);
    }
    
    // Default: provide comprehensive overview
    return this.generateComprehensiveOverview(enrichedData, userProfile, query);
  }

  private generateStockTransactionResponse(enrichedData: any, userProfile: UserProfile): string {
    const { stockTransactions, stockPortfolio, user } = enrichedData;
    
    if (!stockTransactions || stockTransactions.length === 0) {
      return `📈 **Stock Transaction History for ${user?.gameUsername}**\n\n❌ **No Transactions Found**\n\nYou haven't made any stock transactions yet. As a level ${userProfile.game_level} ${userProfile.character_type} character, you're ready to start investing!\n\n💡 **Getting Started:**\n• Visit the stock market in the game\n• Start with small investments to learn\n• Your ${userProfile.character_type} character gets special bonuses\n• Current risk profile: ${userProfile.risk_profile}\n\nReady to make your first trade?`;
    }
    
    let response = `📈 **Complete Stock Transaction History for ${user?.gameUsername}**\n\n`;
    response += `📊 **Transaction Summary:**\n`;
    response += `• Total Transactions: **${stockTransactions.length}**\n`;
    
    const buyTransactions = stockTransactions.filter((t: any) => t.type === 'buy');
    const sellTransactions = stockTransactions.filter((t: any) => t.type === 'sell');
    response += `• Buy Orders: ${buyTransactions.length}\n`;
    response += `• Sell Orders: ${sellTransactions.length}\n`;
    
    const totalInvested = buyTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
    const totalReturns = sellTransactions.reduce((sum: number, t: any) => sum + t.total, 0);
    response += `• Total Invested: ₹${totalInvested.toLocaleString()}\n`;
    response += `• Total Returns from Sales: ₹${totalReturns.toLocaleString()}\n\n`;
    
    // Group transactions by stock
    const stockGroups = new Map();
    stockTransactions.forEach((t: any) => {
      if (!stockGroups.has(t.stockId)) {
        stockGroups.set(t.stockId, []);
      }
      stockGroups.get(t.stockId).push(t);
    });
    
    response += `📋 **Transaction Details (Recent 20):**\n\n`;
    stockTransactions.slice(0, 20).forEach((txn: any, idx: number) => {
      const date = new Date(txn.timestamp).toLocaleDateString();
      const time = new Date(txn.timestamp).toLocaleTimeString();
      response += `${idx + 1}. **${txn.type.toUpperCase()}** ${txn.quantity}x ${txn.stockName} (${txn.stockId})\n`;
      response += `   Price: ₹${txn.price.toLocaleString()} | Total: ₹${txn.total.toLocaleString()}\n`;
      response += `   Date: ${date} at ${time}\n\n`;
    });
    
    if (stockTransactions.length > 20) {
      response += `\n_...and ${stockTransactions.length - 20} more transactions_\n\n`;
    }
    
    response += `🎯 **Trading Analysis:**\n`;
    response += `• Your Experience Level: ${userProfile.investment_experience}\n`;
    response += `• Risk Profile: ${userProfile.risk_profile}\n`;
    response += `• Trading Activity: ${stockTransactions.length} total trades\n`;
    response += `• Character Bonus: ${this.getInvestmentCharacterBonus(userProfile.character_type)}\n\n`;
    
    if (stockPortfolio && stockPortfolio.holdings && stockPortfolio.holdings.length > 0) {
      response += `💼 **Current Portfolio Holdings:**\n`;
      stockPortfolio.holdings.forEach((h: any) => {
        response += `• ${h.symbol}: ${h.quantity} shares @ ₹${h.currentPrice} (${h.gainLoss >= 0 ? '+' : ''}${h.gainLossPercentage.toFixed(2)}%)\n`;
      });
    }
    
    return response;
  }

  private generatePortfolioResponse(enrichedData: any, userProfile: UserProfile): string {
    const { stockPortfolio, stockTransactions, user } = enrichedData;
    
    if (!stockPortfolio) {
      return `💼 **Portfolio Analysis for ${user?.gameUsername}**\n\n❌ **No Portfolio Found**\n\nYou haven't created a portfolio yet. Start investing to build your wealth!\n\n💡 **Next Steps:**\n• Make your first stock purchase\n• Build a diversified portfolio\n• Track your investments\n• Your ${userProfile.character_type} character provides special advantages`;
    }
    
    let response = `💼 **Complete Portfolio Analysis for ${user?.gameUsername}**\n\n`;
    response += `📊 **Portfolio Overview:**\n`;
    response += `• Total Value: **₹${(stockPortfolio.totalValue || 0).toLocaleString()}**\n`;
    response += `• Total Invested: ₹${(stockPortfolio.totalInvested || 0).toLocaleString()}\n`;
    response += `• Total Gain/Loss: ${stockPortfolio.totalGainLoss >= 0 ? '🟢' : '🔴'} ₹${(stockPortfolio.totalGainLoss || 0).toLocaleString()}\n`;
    
    if (stockPortfolio.totalInvested > 0) {
      const returnPercent = ((stockPortfolio.totalGainLoss / stockPortfolio.totalInvested) * 100).toFixed(2);
      response += `• Return on Investment: ${returnPercent}%\n`;
    }
    response += `• Number of Holdings: ${stockPortfolio.holdings?.length || 0}\n\n`;
    
    if (stockPortfolio.holdings && stockPortfolio.holdings.length > 0) {
      response += `📈 **Detailed Holdings:**\n\n`;
      stockPortfolio.holdings.forEach((holding: any, idx: number) => {
        response += `${idx + 1}. **${holding.name}** (${holding.symbol})\n`;
        response += `   Quantity: ${holding.quantity} shares\n`;
        response += `   Avg Buy Price: ₹${holding.averagePrice.toLocaleString()}\n`;
        response += `   Current Price: ₹${holding.currentPrice.toLocaleString()}\n`;
        response += `   Total Value: ₹${holding.totalValue.toLocaleString()}\n`;
        response += `   Gain/Loss: ${holding.gainLoss >= 0 ? '🟢' : '🔴'} ₹${holding.gainLoss.toLocaleString()} (${holding.gainLossPercentage.toFixed(2)}%)\n`;
        response += `   Purchase Date: ${new Date(holding.purchaseDate).toLocaleDateString()}\n\n`;
      });
    }
    
    response += `🎯 **Portfolio Insights:**\n`;
    response += `• Total Trades Made: ${stockTransactions?.length || 0}\n`;
    response += `• Risk Profile: ${userProfile.risk_profile}\n`;
    response += `• Experience Level: ${userProfile.investment_experience}\n`;
    response += `• Character Advantage: ${this.getInvestmentCharacterBonus(userProfile.character_type)}\n\n`;
    
    response += `💡 **Recommendations:**\n`;
    if (userProfile.risk_profile === 'high' && stockPortfolio.holdings?.length < 3) {
      response += `• Consider diversifying into more stocks\n`;
    }
    if (stockPortfolio.totalGainLoss < 0) {
      response += `• Review underperforming stocks\n• Consider your long-term strategy\n`;
    }
    if (stockPortfolio.holdings?.length > 0) {
      response += `• Monitor market trends regularly\n• Set profit-taking targets\n`;
    }
    
    return response;
  }

  private generateBankAccountResponse(enrichedData: any, userProfile: UserProfile): string {
    const { bankAccounts, playerState, user } = enrichedData;
    
    let response = `🏦 **Banking Overview for ${user?.gameUsername}**\n\n`;
    
    if (!bankAccounts || bankAccounts.length === 0) {
      response += `❌ **No Bank Accounts Found**\n\n`;
      response += `You haven't opened a bank account yet!\n\n`;
      response += `💡 **Getting Started with Banking:**\n`;
      response += `• Visit the bank in the game\n`;
      response += `• Open your first account\n`;
      response += `• Start saving and earning interest\n`;
      response += `• ${userProfile.character_type} characters get special banking perks!\n`;
      return response;
    }
    
    response += `📊 **Account Summary:**\n`;
    response += `• Total Accounts: ${bankAccounts.length}\n`;
    const totalBankBalance = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);
    response += `• Combined Balance: **₹${totalBankBalance.toLocaleString()}**\n\n`;
    
    bankAccounts.forEach((account: any, idx: number) => {
      response += `### 🏦 Account ${idx + 1}: ${account.accountNumber}\n`;
      response += `• Account Holder: ${account.accountHolder}\n`;
      response += `• Current Balance: **₹${(account.balance || 0).toLocaleString()}**\n`;
      response += `• Created: ${new Date(account.createdAt).toLocaleDateString()}\n`;
      response += `• Total Transactions: ${account.transactions?.length || 0}\n\n`;
      
      if (account.transactions && account.transactions.length > 0) {
        response += `**Recent Transactions (last 5):**\n`;
        account.transactions.slice(-5).reverse().forEach((txn: any) => {
          const icon = txn.type === 'deposit' ? '💰' : '💸';
          response += `${icon} ${txn.type.toUpperCase()}: ₹${txn.amount.toLocaleString()} - ${txn.description}\n`;
          response += `   ${new Date(txn.timestamp).toLocaleDateString()} at ${new Date(txn.timestamp).toLocaleTimeString()}\n`;
        });
        response += `\n`;
      }
    });
    
    response += `🎯 **Banking Insights:**\n`;
    response += `• Character Bonus: ${this.getCharacterFinancialAdvice(userProfile.character_type)}\n`;
    response += `• Savings Strategy: ${userProfile.risk_profile === 'low' ? 'Conservative (Perfect!)' : userProfile.risk_profile === 'high' ? 'Consider keeping more in savings' : 'Balanced approach'}\n`;
    
    return response;
  }

  private generateEnrichedStatsResponse(enrichedData: any, userProfile: UserProfile): string {
    const { user, playerState, bankAccounts, stockPortfolio, stockTransactions, achievements } = enrichedData;
    
    let response = `📊 **Complete Profile for ${user?.gameUsername}**\n\n`;
    
    response += `## 🎮 Game Profile\n`;
    response += `• Character: ${userProfile.character_type}\n`;
    response += `• Level: ${userProfile.game_level}\n`;
    response += `• Experience: ${user?.gameData?.experience || 0} XP\n`;
    response += `• Achievements: ${achievements?.length || 0}\n\n`;
    
    response += `## 💰 Financial Overview\n`;
    if (playerState) {
      response += `• Cash on Hand: ₹${(playerState.financial?.rupees || 0).toLocaleString()}\n`;
      response += `• Bank Balance: ₹${(playerState.financial?.bankBalance || 0).toLocaleString()}\n`;
      response += `• Stock Portfolio: ₹${(playerState.financial?.stockPortfolioValue || 0).toLocaleString()}\n`;
      response += `• Total Wealth: **₹${(playerState.financial?.totalWealth || 0).toLocaleString()}**\n\n`;
    }
    
    response += `## 📈 Investment Profile\n`;
    response += `• Risk Tolerance: ${userProfile.risk_profile.toUpperCase()}\n`;
    response += `• Experience Level: ${userProfile.investment_experience}\n`;
    response += `• Total Trades: ${stockTransactions?.length || 0}\n`;
    response += `• Portfolio Holdings: ${stockPortfolio?.holdings?.length || 0} stocks\n`;
    if (stockPortfolio) {
      response += `• Portfolio Performance: ${stockPortfolio.totalGainLoss >= 0 ? '🟢' : '🔴'} ₹${(stockPortfolio.totalGainLoss || 0).toLocaleString()}\n`;
    }
    response += `\n`;
    
    response += `## 🏦 Banking\n`;
    response += `• Bank Accounts: ${bankAccounts?.length || 0}\n`;
    if (bankAccounts && bankAccounts.length > 0) {
      const totalTransactions = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.transactions?.length || 0), 0);
      response += `• Total Bank Transactions: ${totalTransactions}\n`;
    }
    response += `\n`;
    
    response += `## 🎯 Character Advantages\n`;
    response += `${this.getCharacterBenefits(userProfile.character_type)}\n`;
    
    return response;
  }

  private generateComprehensiveOverview(enrichedData: any, userProfile: UserProfile, query: string): string {
    const { user } = enrichedData;
    
    let response = `👋 Hello ${user?.gameUsername}!\n\n`;
    response += `I see you're asking about: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"\n\n`;
    response += `Let me provide you with a comprehensive overview:\n\n`;
    
    response += `🎮 **Your Profile:**\n`;
    response += `• Level ${userProfile.game_level} ${userProfile.character_type} character\n`;
    response += `• ${userProfile.investment_experience} investor with ${userProfile.risk_profile} risk tolerance\n`;
    response += `• ${enrichedData.stockTransactions?.length || 0} total stock transactions\n`;
    response += `• ${enrichedData.bankAccounts?.length || 0} bank account(s)\n\n`;
    
    response += `💡 **What I can help you with:**\n`;
    response += `• "Show my stock transactions" - View all your trading history\n`;
    response += `• "Display my portfolio" - See your current holdings and performance\n`;
    response += `• "Check my bank account" - Review account balance and transactions\n`;
    response += `• "Show my complete stats" - Get a full profile overview\n`;
    response += `• "Give me investment advice" - Get personalized recommendations\n\n`;
    
    response += `Ask me anything about your financial journey in Dhaniverse!`;
    
    return response;
  }

  private generateEnhancedAIResponse(userQuery: string, contextChunks: any[], userProfile: UserProfile): string {
    // Log the context analysis
    Logger.info('🧠 Generating enhanced AI response', {
      queryLength: userQuery.length,
      contextChunks: contextChunks?.length || 0,
      userLevel: userProfile.game_level,
      riskProfile: userProfile.risk_profile,
      queryPreview: userQuery.substring(0, 50) + (userQuery.length > 50 ? '...' : '')
    });
    
    if (contextChunks.length === 0) {
      Logger.warn('No context chunks found - providing fallback response');
      return `Hello! I don't have specific information about your account yet. As a level ${userProfile.game_level} ${userProfile.character_type} character with ${userProfile.investment_experience} investment experience, I'd recommend building your context first by calling the build-context endpoint. Then I can provide personalized financial advice tailored to your ${userProfile.risk_profile} risk profile!`;
    }

    const query = userQuery.toLowerCase();
    
    // Extract enhanced user data from context chunks
    let userData = this.extractUserDataFromChunks(contextChunks);
    
    // Handle different query types with enhanced, personalized responses
    if (query.includes('stats') || query.includes('detail') || query.includes('profile') || query.includes('account')) {
      return this.generatePersonalizedStatsResponse(userData, userProfile);
    }
    
    if (query.includes('bank') || query.includes('account') || query.includes('balance') || query.includes('financial')) {
      return this.generatePersonalizedFinancialResponse(userData, userProfile);
    }
    
    if (query.includes('invest') || query.includes('stock') || query.includes('portfolio')) {
      return this.generatePersonalizedInvestmentResponse(userData, userProfile);
    }
    
    if (query.includes('achievement') || query.includes('progress') || query.includes('milestone')) {
      return this.generatePersonalizedProgressResponse(userData, userProfile);
    }
    
    if (query.includes('advice') || query.includes('recommend') || query.includes('suggest')) {
      return this.generatePersonalizedAdviceResponse(userData, userProfile, query);
    }
    
    // Default personalized response
    return this.generatePersonalizedDefaultResponse(userData, userProfile, query);
  }

  private extractUserDataFromChunks(contextChunks: any[]): any {
    if (!contextChunks || contextChunks.length === 0) return null;
    
    const content = contextChunks[0].content;
    
    // Enhanced extraction with more data points
    return {
      email: content.match(/email: ([^\n]+)/)?.[1] || 'Unknown',
      username: content.match(/gameUsername: ([^\n]+)/)?.[1] || 'Unknown',
      character: content.match(/selectedCharacter: ([^\n]+)/)?.[1] || 'Unknown',
      level: content.match(/level: ([^\n]+)/)?.[1] || '1',
      experience: content.match(/experience: ([^\n]+)/)?.[1] || '0',
      createdAt: content.match(/createdAt: ([^\n]+)/)?.[1] || 'Unknown',
      lastLoginAt: content.match(/lastLoginAt: ([^\n]+)/)?.[1] || 'Unknown',
      bankBalance: content.match(/bankBalance: (\d+)/)?.[1] || '0',
      stockValue: content.match(/stockPortfolioValue: (\d+)/)?.[1] || '0',
      rupees: content.match(/rupees: (\d+)/)?.[1] || '0',
      soundEnabled: content.match(/soundEnabled: ([^\n]+)/)?.[1] === 'true',
      musicEnabled: content.match(/musicEnabled: ([^\n]+)/)?.[1] === 'true',
      language: content.match(/language: ([^\n]+)/)?.[1] || 'en'
    };
  }

  private generatePersonalizedStatsResponse(userData: any, userProfile: UserProfile): string {
    return `📊 **Enhanced Profile Analysis for ${userData?.username || 'Player'}**

🎮 **Game Progress & Identity:**
• Username: ${userData?.username || 'Unknown'} (${userProfile.character_type} character)
• Current Level: ${userProfile.game_level} (${userProfile.investment_experience} investor)
• Experience Points: ${userData?.experience || '0'}
• Risk Tolerance: ${userProfile.risk_profile.toUpperCase()} 
• Achievements: ${userProfile.achievements.length} unlocked

💰 **Financial Overview:**
• Current Rupees: ₹${userData?.rupees || '0'}
• Bank Balance: ₹${userData?.bankBalance || '0'}
• Portfolio Value: ₹${userData?.stockValue || '0'}
• Total Wealth: ₹${parseInt(userData?.bankBalance || '0') + parseInt(userData?.stockValue || '0')}

📈 **Investment Profile:**
• Risk Preference: ${userProfile.risk_profile} (${this.getRiskDescription(userProfile.risk_profile)})
• Experience Level: ${userProfile.investment_experience}
• Past Decisions: ${userProfile.past_choices.join(', ') || 'Still learning'}
• Financial Goals: ${userProfile.financial_goals.join(', ')}

🎯 **Personality Insights:**
Based on your choices, you exhibit: ${userProfile.personality_traits.join(', ')}

⚙️ **Preferences:**
• Audio: ${userData?.soundEnabled ? '🔊' : '🔇'} Sound, ${userData?.musicEnabled ? '🎵' : '🔇'} Music
• Language: ${userData?.language?.toUpperCase()}
• Character Benefits: ${this.getCharacterBenefits(userProfile.character_type)}

📅 **Account Timeline:**
• Joined: ${userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
• Last Active: ${userData?.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleDateString() : 'Unknown'}
• Days Playing: ${this.calculateDaysPlaying(userData?.createdAt)}

💡 **Personalized Recommendations:**
${this.getPersonalizedRecommendations(userProfile)}`;
  }

  private generatePersonalizedFinancialResponse(userData: any, userProfile: UserProfile): string {
    const bankBalance = parseInt(userData?.bankBalance || '0');
    const stockValue = parseInt(userData?.stockValue || '0');
    const totalWealth = bankBalance + stockValue;
    
    return `💰 **Personalized Financial Analysis for ${userData?.username}**

🏦 **Current Financial Standing:**
• Liquid Assets (Bank): ₹${bankBalance.toLocaleString()}
• Investment Assets (Stocks): ₹${stockValue.toLocaleString()}
• Total Net Worth: ₹${totalWealth.toLocaleString()}
• Asset Allocation: ${bankBalance > 0 ? Math.round((bankBalance / totalWealth) * 100) : 0}% Cash, ${stockValue > 0 ? Math.round((stockValue / totalWealth) * 100) : 0}% Investments

📊 **Risk Profile Assessment:**
Your ${userProfile.risk_profile} risk tolerance suggests:
${this.getFinancialAdviceByRisk(userProfile.risk_profile, totalWealth)}

🎯 **Character-Specific Advantages:**
As a ${userProfile.character_type} character:
${this.getCharacterFinancialAdvice(userProfile.character_type)}

📈 **Progress Analysis:**
• Financial Experience Level: ${userProfile.investment_experience}
• Game Level Impact: Level ${userProfile.game_level} unlocks ${this.getLevelUnlocks(userProfile.game_level)}
• Achievement Bonus: ${userProfile.achievements.length} achievements provide ${this.getAchievementBonus(userProfile.achievements.length)}

🎲 **Next Financial Steps:**
${this.getNextFinancialSteps(userProfile, totalWealth)}

⚠️ **Personalized Warnings:**
${this.getPersonalizedWarnings(userProfile, bankBalance, stockValue)}`;
  }

  private generatePersonalizedInvestmentResponse(userData: any, userProfile: UserProfile): string {
    return `📈 **Investment Strategy for ${userData?.username} (${userProfile.character_type})**

💼 **Current Portfolio Analysis:**
• Investment Value: ₹${userData?.stockValue || '0'}
• Experience Level: ${userProfile.investment_experience} investor
• Risk Capacity: ${userProfile.risk_profile} tolerance
• Character Bonus: ${this.getInvestmentCharacterBonus(userProfile.character_type)}

🎯 **Personalized Investment Strategy:**
Based on your ${userProfile.risk_profile} risk profile and ${userProfile.investment_experience} experience:

${this.getInvestmentStrategy(userProfile)}

📊 **Risk-Adjusted Recommendations:**
${this.getRiskAdjustedRecommendations(userProfile)}

🚀 **Level-Based Opportunities:**
At level ${userProfile.game_level}, you have access to:
${this.getLevelBasedInvestments(userProfile.game_level)}

🏆 **Achievement-Based Bonuses:**
Your ${userProfile.achievements.length} achievements unlock:
${this.getInvestmentAchievementBonuses(userProfile.achievements.length)}

💡 **Character-Specific Tips:**
${this.getCharacterInvestmentTips(userProfile.character_type, userProfile.risk_profile)}`;
  }

  private generatePersonalizedProgressResponse(userData: any, userProfile: UserProfile): string {
    return `🏆 **Progress & Achievement Analysis for ${userData?.username}**

🎮 **Current Status:**
• Level: ${userProfile.game_level}/100 (${Math.round(userProfile.game_level * 1.0)}% through journey)
• Experience: ${userData?.experience} XP
• Character: ${userProfile.character_type} (${this.getCharacterDescription(userProfile.character_type)})
• Achievements: ${userProfile.achievements.length}/50+ available

📈 **Financial Milestones:**
${this.getFinancialMilestones(userProfile, userData)}

🎯 **Next Level Requirements:**
To reach level ${userProfile.game_level + 1}:
${this.getNextLevelRequirements(userProfile.game_level)}

🏅 **Available Achievements:**
${this.getAvailableAchievements(userProfile)}

🌟 **Character Progression:**
${userProfile.character_type} characters excel at:
${this.getCharacterProgression(userProfile.character_type)}

📊 **Performance Metrics:**
${this.getPerformanceMetrics(userProfile, userData)}`;
  }

  private generatePersonalizedAdviceResponse(userData: any, userProfile: UserProfile, query: string): string {
    return `💡 **Personalized Financial Advice for ${userData?.username}**

🎯 **Tailored to Your Profile:**
• Risk Level: ${userProfile.risk_profile}
• Experience: ${userProfile.investment_experience}
• Character: ${userProfile.character_type}
• Level: ${userProfile.game_level}

${this.getSpecificAdvice(userProfile, query)}

📚 **Learning Path:**
${this.getPersonalizedLearningPath(userProfile)}

🚀 **Action Items:**
${this.getPersonalizedActionItems(userProfile, userData)}

⚠️ **Important Considerations:**
${this.getPersonalizedConsiderations(userProfile)}`;
  }

  private generatePersonalizedDefaultResponse(userData: any, userProfile: UserProfile, query: string): string {
    return `Hello ${userData?.username}! 👋

I see you're a level ${userProfile.game_level} ${userProfile.character_type} character with ${userProfile.investment_experience} investment experience and ${userProfile.risk_profile} risk tolerance.

Based on your question about "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}", here's what I found relevant to your profile:

${userProfile.past_choices.length > 0 ? 
  `🔍 **Your Financial Journey So Far:**\n${userProfile.past_choices.map(choice => `• ${choice.replace('_', ' ')}`).join('\n')}\n\n` : 
  '🆕 **Getting Started:** You\'re just beginning your financial adventure!\n\n'}

💡 **Personalized Suggestion:**
${this.getContextualSuggestion(userProfile, query)}

🎯 **Character Advantage:**
As a ${userProfile.character_type}, you have special bonuses for ${this.getCharacterBonuses(userProfile.character_type)}.

How can I help you make the most of your financial journey in Dhaniverse?`;
  }

  // Helper methods for generating personalized content
  private getRiskDescription(riskProfile: string): string {
    const descriptions = {
      'low': 'Prefers stability and guaranteed returns',
      'medium': 'Balanced approach with moderate risk for moderate returns',
      'high': 'Seeks high growth opportunities, comfortable with volatility'
    };
    return descriptions[riskProfile as keyof typeof descriptions] || 'Balanced approach';
  }

  private getCharacterBenefits(characterType: string): string {
    const benefits = {
      'C1': 'Enhanced trading analytics and market insights',
      'C2': 'Improved savings rates and banking bonuses',
      'C3': 'Advanced investment opportunities and portfolio management',
      'C4': 'Entrepreneurial bonuses and startup investment access',
      'unknown': 'Choose your character to unlock special benefits!'
    };
    return benefits[characterType as keyof typeof benefits] || benefits.unknown;
  }

  private calculateDaysPlaying(createdAt?: string): string {
    if (!createdAt) return 'Unknown';
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  }

  private getPersonalizedRecommendations(userProfile: UserProfile): string {
    const recommendations = [];
    
    if (userProfile.game_level < 5) {
      recommendations.push('🎓 Complete basic financial tutorials to gain experience');
    }
    
    if (userProfile.risk_profile === 'high' && userProfile.investment_experience === 'beginner') {
      recommendations.push('⚖️ Consider learning risk management before high-risk investments');
    }
    
    if (userProfile.achievements.length < 3) {
      recommendations.push('🏅 Focus on earning achievements for bonus rewards');
    }
    
    if (userProfile.past_choices.includes('new_player')) {
      recommendations.push('🚀 Explore different game features to discover your investing style');
    }
    
    return recommendations.join('\n') || '✅ You\'re doing great! Keep up the excellent progress!';
  }

  private getFinancialAdviceByRisk(riskProfile: string, totalWealth: number): string {
    const advice = {
      'low': `Perfect for steady, predictable growth. With ₹${totalWealth.toLocaleString()}, consider high-yield savings and government bonds.`,
      'medium': `Great balance! Your wealth of ₹${totalWealth.toLocaleString()} can be diversified across stocks, bonds, and savings.`,
      'high': `Excellent for growth! With ₹${totalWealth.toLocaleString()}, you can explore stocks, crypto, and growth investments.`
    };
    return advice[riskProfile as keyof typeof advice] || advice.medium;
  }

  private getCharacterFinancialAdvice(characterType: string): string {
    const advice = {
      'C1': '• 15% bonus on stock trading profits\n• Access to advanced market analysis tools\n• Reduced trading fees',
      'C2': '• 20% higher savings account interest rates\n• Exclusive banking products\n• Lower loan interest rates',
      'C3': '• Access to premium investment portfolios\n• Professional advisor consultations\n• Advanced risk management tools',
      'C4': '• Startup investment opportunities\n• Business loan advantages\n• Entrepreneurship bonuses',
      'unknown': '• Choose a character to unlock financial bonuses!\n• Each character has unique advantages\n• Specializations affect available products'
    };
    return advice[characterType as keyof typeof advice] || advice.unknown;
  }

  private getLevelUnlocks(level: number): string {
    if (level < 5) return 'basic banking services';
    if (level < 10) return 'investment portfolios and trading';
    if (level < 20) return 'advanced financial products and crypto';
    if (level < 50) return 'professional trading tools and business loans';
    return 'exclusive wealth management and premium services';
  }

  private getAchievementBonus(achievementCount: number): string {
    if (achievementCount === 0) return 'no bonuses yet - start earning achievements!';
    if (achievementCount < 5) return `${achievementCount * 2}% bonus experience from financial activities`;
    if (achievementCount < 10) return `${achievementCount * 2}% bonus XP plus reduced fees`;
    return `${achievementCount * 2}% bonus XP, reduced fees, and exclusive products`;
  }

  private getNextFinancialSteps(userProfile: UserProfile, totalWealth: number): string {
    const steps = [];
    
    if (totalWealth < 1000) {
      steps.push('💰 Build emergency fund: Save ₹1,000 for financial security');
    }
    
    if (userProfile.investment_experience === 'beginner') {
      steps.push('📚 Complete investment tutorial to unlock advanced features');
    }
    
    if (userProfile.risk_profile === 'medium' && totalWealth > 5000) {
      steps.push('🎯 Consider diversifying into balanced portfolio');
    }
    
    if (userProfile.game_level < 10) {
      steps.push('🎮 Focus on leveling up to unlock better financial products');
    }
    
    return steps.join('\n') || '✅ You\'re on track! Continue with your current strategy.';
  }

  private getPersonalizedWarnings(userProfile: UserProfile, bankBalance: number, stockValue: number): string {
    const warnings = [];
    
    if (stockValue > bankBalance * 5 && userProfile.risk_profile !== 'high') {
      warnings.push('⚠️ High stock allocation detected - consider keeping some cash reserves');
    }
    
    if (bankBalance === 0 && stockValue > 0) {
      warnings.push('⚠️ No emergency fund - keep some money in savings for unexpected expenses');
    }
    
    if (userProfile.investment_experience === 'beginner' && stockValue > 10000) {
      warnings.push('⚠️ Large investment for beginner level - ensure you understand the risks');
    }
    
    return warnings.join('\n') || '✅ No immediate concerns with your current financial allocation.';
  }

  private getInvestmentStrategy(userProfile: UserProfile): string {
    const strategies = {
      'low': '🛡️ **Conservative Strategy:**\n• 70% savings/bonds, 30% stable stocks\n• Focus on dividend-paying companies\n• Monthly systematic investments',
      'medium': '⚖️ **Balanced Strategy:**\n• 40% stocks, 40% bonds, 20% savings\n• Mix of growth and value investments\n• Quarterly portfolio rebalancing',
      'high': '🚀 **Growth Strategy:**\n• 70% stocks, 20% growth investments, 10% cash\n• Focus on high-growth sectors\n• Active trading opportunities'
    };
    return strategies[userProfile.risk_profile as keyof typeof strategies] || strategies.medium;
  }

  private getRiskAdjustedRecommendations(userProfile: UserProfile): string {
    // Implementation for risk-adjusted recommendations
    return `Based on your ${userProfile.risk_profile} risk tolerance and ${userProfile.investment_experience} experience level, focus on ${userProfile.financial_goals.join(', ')}.`;
  }

  private getLevelBasedInvestments(level: number): string {
    if (level < 5) return '• Basic stocks and bonds\n• Savings accounts\n• Financial education modules';
    if (level < 10) return '• Mutual funds\n• ETFs\n• Basic cryptocurrency';
    if (level < 20) return '• Options trading\n• Real estate investments\n• Advanced crypto';
    return '• Professional trading tools\n• Private equity\n• Wealth management services';
  }

  private getInvestmentAchievementBonuses(count: number): string {
    return `• ${count * 5}% reduced trading fees\n• ${count * 2}% bonus returns on investments\n• Access to ${Math.floor(count / 3)} exclusive investment products`;
  }

  private getCharacterInvestmentTips(characterType: string, riskProfile: string): string {
    return `${characterType} characters with ${riskProfile} risk tolerance should focus on leveraging their unique bonuses while maintaining appropriate risk levels.`;
  }

  private getFinancialMilestones(userProfile: UserProfile, userData: any): string {
    const milestones = [
      `✅ Account Created: Level 1 reached`,
      `${userProfile.game_level >= 5 ? '✅' : '⏳'} Financial Literacy: ${userProfile.game_level >= 5 ? 'Completed' : 'In Progress'}`,
      `${parseInt(userData?.bankBalance || '0') >= 1000 ? '✅' : '⏳'} Emergency Fund: ${parseInt(userData?.bankBalance || '0') >= 1000 ? '₹1,000+ saved' : 'Build ₹1,000 savings'}`,
      `${parseInt(userData?.stockValue || '0') > 0 ? '✅' : '⏳'} First Investment: ${parseInt(userData?.stockValue || '0') > 0 ? 'Portfolio created' : 'Make first investment'}`
    ];
    return milestones.join('\n');
  }

  private getNextLevelRequirements(currentLevel: number): string {
    const nextLevel = currentLevel + 1;
    const requirements = [
      `• Complete ${nextLevel} financial challenges`,
      `• Earn ${nextLevel * 100} experience points`,
      `• Maintain positive portfolio performance`
    ];
    return requirements.join('\n');
  }

  private getAvailableAchievements(userProfile: UserProfile): string {
    const available = [
      '🏦 "Banking Basics" - Open your first account',
      '📈 "First Investment" - Buy your first stock',
      '💰 "Saver" - Accumulate ₹5,000 in savings',
      '🎯 "Goal Setter" - Set and achieve a financial goal'
    ];
    return available.slice(0, 3).join('\n');
  }

  private getCharacterDescription(characterType: string): string {
    const descriptions = {
      'C1': 'The Analytical Trader - Excels at market analysis',
      'C2': 'The Smart Saver - Masters savings and banking',
      'C3': 'The Investment Pro - Sophisticated portfolio management',
      'C4': 'The Entrepreneur - Business and startup focused',
      'unknown': 'Choose your specialization!'
    };
    return descriptions[characterType as keyof typeof descriptions] || descriptions.unknown;
  }

  private getCharacterProgression(characterType: string): string {
    return `${characterType} characters gain specialized abilities related to their financial focus area as they level up.`;
  }

  private getPerformanceMetrics(userProfile: UserProfile, userData: any): string {
    return `• Portfolio Growth: ${userData?.stockValue ? '+' + userData.stockValue : 'Starting'}\n• Savings Rate: ${userData?.bankBalance ? userData.bankBalance + ' accumulated' : 'Building'}\n• Risk Management: ${userProfile.risk_profile} tolerance applied`;
  }

  private getSpecificAdvice(userProfile: UserProfile, query: string): string {
    if (query.includes('save')) {
      return `For your ${userProfile.risk_profile} risk profile, I recommend starting with high-yield savings accounts and gradually building an emergency fund.`;
    }
    if (query.includes('invest')) {
      return `As a ${userProfile.investment_experience} investor, begin with diversified index funds before exploring individual stocks.`;
    }
    return `Based on your ${userProfile.character_type} character and level ${userProfile.game_level} progress, focus on building fundamental financial skills.`;
  }

  private getPersonalizedLearningPath(userProfile: UserProfile): string {
    const path = [];
    if (userProfile.investment_experience === 'beginner') {
      path.push('1. Financial Basics & Budgeting');
      path.push('2. Savings & Emergency Funds');
      path.push('3. Introduction to Investing');
    }
    return path.join('\n') || 'Continue with advanced financial strategies!';
  }

  private getPersonalizedActionItems(userProfile: UserProfile, userData: any): string {
    const items = [];
    if (parseInt(userData?.bankBalance || '0') < 1000) {
      items.push('💰 Build emergency fund to ₹1,000');
    }
    if (userProfile.achievements.length < 3) {
      items.push('🏅 Earn more achievements for bonuses');
    }
    return items.join('\n') || '✅ You\'re on track with your current plan!';
  }

  private getPersonalizedConsiderations(userProfile: UserProfile): string {
    return `• Your ${userProfile.risk_profile} risk tolerance guides investment choices\n• Character bonuses enhance your ${userProfile.character_type} specialization\n• Level ${userProfile.game_level} unlocks specific financial products`;
  }

  private getContextualSuggestion(userProfile: UserProfile, query: string): string {
    if (query.includes('help') || query.includes('start')) {
      return `Start with your character's strengths: ${userProfile.character_type} characters excel at specific financial areas. Build on those advantages first!`;
    }
    return `With your current progress, focus on ${userProfile.financial_goals[0] || 'building financial literacy'} to advance your game.`;
  }

  private getInvestmentCharacterBonus(characterType: string): string {
    const bonuses = {
      'C1': '15% trading profit bonus + advanced analytics',
      'C2': '20% savings interest bonus + banking perks',
      'C3': 'Premium portfolio tools + advisor access',
      'C4': 'Startup investment access + business loans',
      'unknown': 'Select character to unlock investment bonuses'
    };
    return bonuses[characterType as keyof typeof bonuses] || bonuses.unknown;
  }

  private getCharacterBonuses(characterType: string): string {
    const bonuses = {
      'C1': 'trading analytics and market insights',
      'C2': 'savings optimization and banking rewards',
      'C3': 'investment portfolio management and risk analysis',
      'C4': 'entrepreneurship and business opportunities',
      'unknown': 'character selection (choose to unlock bonuses!)'
    };
    return bonuses[characterType as keyof typeof bonuses] || bonuses.unknown;
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
      Logger.info(`🤖 Simple Chat: POST http://localhost:${port}/api/chat/{userId}`);
      Logger.info(`🌳 Conversation Graph: POST http://localhost:${port}/api/conversation-graph/{userId}`);
      Logger.info(`👥 Available NPCs: GET http://localhost:${port}/api/npcs`);
    });

    // Start WebSocket server
    this.setupWebSocket();

    // Print startup summary
    console.log('\n' + '='.repeat(70));
    Logger.startup('🎉 Maya RAG Server started successfully!');
    Logger.startup(`📡 HTTP API: http://localhost:${port}`);
    Logger.startup(`🔌 WebSocket: ws://localhost:${process.env.WS_PORT || '8081'}`);
    Logger.startup('💬 Simple Chat Responses: Enhanced with user profiling');
    Logger.startup('🌳 Conversation Graphs: Dynamic NPC dialogue trees');
    Logger.startup(`👥 Available NPCs: ${this.conversationService.getAvailableNPCs().length} personalities`);
    Logger.startup('💡 Ready to process RAG queries and personalized chat');
    console.log('='.repeat(70) + '\n');
    
    // Log environment info
    Logger.info('🔧 Environment Configuration', {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: port,
      wsPort: process.env.WS_PORT || '8081',
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
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
