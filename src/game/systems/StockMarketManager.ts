import { GameObjects, Input } from 'phaser';
import { MainScene } from '../scenes/MainScene';
import { Constants } from '../utils/Constants';

interface NPCSprite extends GameObjects.Sprite {
  nameText?: GameObjects.Text;
}

interface Stock {
  id: string;
  name: string;
  currentPrice: number;
  priceHistory: number[];
  debtEquityRatio: number;
  businessGrowth: number;
  news: string[];
}

export class StockMarketManager {
  private scene: MainScene;
  private broker: NPCSprite;
  private interactionKey: Input.Keyboard.Key | null = null;
  private readonly interactionDistance: number = 150;
  private interactionText: GameObjects.Text;
  private isPlayerNearBroker: boolean = false;
  private activeDialog: boolean = false;
  private speechBubble: GameObjects.Sprite | null = null;
  private stockData: Stock[];
  private newsItems: Record<string, string[]>;

  constructor(scene: MainScene) {
    this.scene = scene;
    
    // Setup interaction key with null check
    if (scene.input.keyboard) {
      this.interactionKey = scene.input.keyboard.addKey('E');
    }
    
    // Initialize mock stock data
    this.stockData = this.generateInitialStockData();
    
    // Initialize news database
    this.newsItems = this.setupNewsDatabase();
    
    // Create broker NPC at predefined position (will be moved by game system)
    const brokerX = 800;
    const brokerY = 600;
    this.broker = scene.add.sprite(brokerX, brokerY, 'character') as NPCSprite;
    this.broker.setScale(5);
    this.broker.anims.play('idle-down');
    
    // Add broker name text
    const brokerNameText = scene.add.text(this.broker.x, this.broker.y - 50, "Stock Broker", {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#00ffff',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
    
    // Add interaction text (initially hidden)
    this.interactionText = scene.add.text(this.broker.x, this.broker.y - 80, "Press E to interact", {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(100);
    
    // Add to game container
    const gameContainer = scene.getGameContainer();
    if (gameContainer) {
      gameContainer.add(this.broker);
      gameContainer.add(brokerNameText);
      gameContainer.add(this.interactionText);
      this.broker.nameText = brokerNameText;
    }
    
    // Hide the broker initially - will show only in the stock market
    this.toggleVisibility(false);
    
    // Setup speech bubble animations
    this.setupSpeechBubbleAnimations();
    
    console.log("Stock Market NPC created at position:", brokerX, brokerY);
    
    // Start the stock price simulation
    this.simulateStockPrices();
  }
  
  private setupSpeechBubbleAnimations(): void {
    // Create speech bubble for NPC dialog (initially hidden)
    this.speechBubble = this.scene.add.sprite(this.broker.x, this.broker.y - 70, 'speech-bubble');
    this.speechBubble.setVisible(false);
    this.speechBubble.setDepth(100);
    this.speechBubble.setScale(0.1);
    this.speechBubble.setAlpha(0);
    
    // Add to game container
    const gameContainer = this.scene.getGameContainer();
    if (gameContainer && this.speechBubble) {
      gameContainer.add(this.speechBubble);
    }
  }

  /**
   * Generate initial stock data for the market
   */
  private generateInitialStockData(): Stock[] {
    return [
      {
        id: 'technova',
        name: 'TechNova',
        currentPrice: 1500,
        priceHistory: Array.from({ length: 15 }, 
          (_, i) => 1500 + Math.random() * 300 - 150),
        debtEquityRatio: 0.7,
        businessGrowth: 4.2,
        news: []
      },
      {
        id: 'greenedge',
        name: 'GreenEdge',
        currentPrice: 850,
        priceHistory: Array.from({ length: 15 }, 
          (_, i) => 850 + Math.random() * 200 - 100),
        debtEquityRatio: 1.2,
        businessGrowth: 2.8,
        news: []
      },
      {
        id: 'bytex',
        name: 'ByteX',
        currentPrice: 3200,
        priceHistory: Array.from({ length: 15 }, 
          (_, i) => 3200 + Math.random() * 600 - 300),
        debtEquityRatio: 0.5,
        businessGrowth: -1.3,
        news: []
      },
      {
        id: 'solarsphere',
        name: 'SolarSphere',
        currentPrice: 620,
        priceHistory: Array.from({ length: 15 }, 
          (_, i) => 620 + Math.random() * 150 - 75),
        debtEquityRatio: 1.8,
        businessGrowth: 6.5,
        news: []
      }
    ];
  }

  /**
   * Setup a database of possible news items for each stock
   */
  private setupNewsDatabase(): Record<string, string[]> {
    return {
      technova: [
        "TechNova announces new AI platform, expected to boost revenues by 15%.",
        "TechNova's CEO steps down unexpectedly, interim CEO appointed.",
        "TechNova reports quarterly earnings above analyst expectations.",
        "TechNova acquires promising startup for ₹500 million.",
        "TechNova faces patent infringement lawsuit from competitor."
      ],
      greenedge: [
        "GreenEdge secures government contract for sustainable energy project.",
        "GreenEdge's new solar panel achieves 30% higher efficiency.",
        "GreenEdge expands operations to three new countries.",
        "Regulatory changes pose challenges for GreenEdge's main product line.",
        "GreenEdge partners with major tech company for smart energy solutions."
      ],
      bytex: [
        "ByteX launches revolutionary quantum computing service, stock surges.",
        "ByteX's cloud platform experiences major outage affecting thousands.",
        "ByteX reports disappointing quarterly results due to increased competition.",
        "ByteX announces stock buyback program of ₹2 billion.",
        "ByteX's new encryption algorithm receives industry acclaim."
      ],
      solarsphere: [
        "SolarSphere's new manufacturing process cuts costs by 22%.",
        "SolarSphere begins construction on world's largest solar farm.",
        "SolarSphere forms strategic partnership with major utility provider.",
        "SolarSphere's CFO resigns amid accounting concerns.",
        "SolarSphere wins environmental innovation award for new technology."
      ]
    };
  }

  /**
   * Simulate daily stock price changes
   */
  private simulateStockPrices(): void {
    // Create a recurring timer to update stock prices
    this.scene.time.addEvent({
      delay: 60000, // Update every minute (60,000ms)
      callback: this.updateStocks,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Update stock prices and metrics
   */
  private updateStocks(): void {
    this.stockData.forEach(stock => {
      // Calculate price change percentage (-3% to +3%)
      const changePercent = (Math.random() * 6) - 3;
      const priceChange = stock.currentPrice * (changePercent / 100);
      
      // Update current price
      const newPrice = Math.max(1, stock.currentPrice + priceChange);
      stock.currentPrice = Math.round(newPrice * 100) / 100;
      
      // Update price history
      stock.priceHistory.push(stock.currentPrice);
      if (stock.priceHistory.length > 20) {
        stock.priceHistory.shift(); // Remove oldest price data
      }
      
      // Occasionally update business growth (10% chance)
      if (Math.random() < 0.1) {
        const growthChange = (Math.random() * 2) - 1; // -1% to +1%
        stock.businessGrowth = Math.round((stock.businessGrowth + growthChange) * 10) / 10;
      }
      
      // Occasionally update debt-equity ratio (5% chance)
      if (Math.random() < 0.05) {
        const ratioChange = (Math.random() * 0.4) - 0.2; // -0.2 to +0.2
        stock.debtEquityRatio = Math.max(0.1, Math.round((stock.debtEquityRatio + ratioChange) * 10) / 10);
      }
      
      // Generate random news (2% chance per stock per update)
      if (Math.random() < 0.02 && this.newsItems[stock.id]) {
        const availableNews = this.newsItems[stock.id];
        const randomNewsIndex = Math.floor(Math.random() * availableNews.length);
        const newsItem = availableNews[randomNewsIndex];
        
        // Add news if it's not already in the stock's news array
        if (!stock.news.includes(newsItem)) {
          stock.news.unshift(newsItem);
          if (stock.news.length > 3) {
            stock.news.pop(); // Keep only 3 most recent news items
          }
          
          // News can affect stock price
          const newsImpact = Math.random() * 10 - 5; // -5% to +5%
          const impactAmount = stock.currentPrice * (newsImpact / 100);
          stock.currentPrice = Math.max(1, stock.currentPrice + impactAmount);
        }
      }
    });
    
    // Log updated data for debugging
    console.log("Stock market updated:", new Date().toLocaleTimeString());
  }

  /**
   * Toggle broker visibility based on player location
   */
  public toggleVisibility(visible: boolean): void {
    if (this.broker) {
      this.broker.setVisible(visible);
      if (this.broker.nameText) {
        this.broker.nameText.setVisible(visible);
      }
    }
    
    // Also hide interaction text when broker is hidden
    if (!visible) {
      this.interactionText.setAlpha(0);
    }
  }

  /**
   * Main update function to be called each frame
   */
  public update(): void {
    if (!this.broker.visible) return;
    
    const player = this.scene.getPlayer();
    const playerPosition = player.getPosition();
    const playerX = playerPosition.x;
    const playerY = playerPosition.y;
    
    // Calculate distance between player and broker
    const distance = Phaser.Math.Distance.Between(
      playerX, playerY,
      this.broker.x, this.broker.y
    );
    
    // Check if player is close enough to interact
    const wasNearBroker = this.isPlayerNearBroker;
    this.isPlayerNearBroker = distance < this.interactionDistance;
    
    // Show interaction prompt if player is in range and no dialog is active
    if (this.isPlayerNearBroker && !this.activeDialog) {
      this.interactionText.setAlpha(1);
      this.interactionText.setPosition(this.broker.x, this.broker.y - 80);
      
      // Make the broker face the player
      this.updateBrokerOrientation(playerX, playerY);
      
      // Check for interaction key press
      if (this.interactionKey && Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
        this.startStockMarketInteraction();
      }
    } else if (!this.isPlayerNearBroker && wasNearBroker) {
      // Player just left interaction zone
      this.interactionText.setAlpha(0);
      this.broker.anims.play('idle-front', true);
    }
  }
  
  /**
   * Update the broker's facing direction to look at the player
   */
  private updateBrokerOrientation(playerX: number, playerY: number): void {
    const dx = playerX - this.broker.x;
    const dy = playerY - this.broker.y;
    
    // Determine which direction the broker should face
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal movement is greater
      if (dx > 0) {
        this.broker.anims.play('idle-right', true);
      } else {
        this.broker.anims.play('idle-left', true);
      }
    } else {
      // Vertical movement is greater
      if (dy > 0) {
        this.broker.anims.play('idle-down', true);
      } else {
        this.broker.anims.play('idle-up', true);
      }
    }
  }
  
  /**
   * Start the stock market interaction UI
   */
  private startStockMarketInteraction(): void {
    if (this.activeDialog) return;
    
    console.log("Starting stock market interaction");
    this.activeDialog = true;
    this.interactionText.setAlpha(0);
    
    // Skip showing speech bubble - direct stock market UI open
    
    // Force the stock market UI container to be active
    document.getElementById('stock-market-ui-container')?.classList.add('active');
    
    // Signal to MainScene to open stock market UI
    this.scene.openStockMarketUI(this.stockData);
  }
  
  /**
   * Close the stock market interaction
   */
  public endStockMarketInteraction(): void {
    if (!this.activeDialog) return;
    
    console.log("Ending stock market interaction");
    this.activeDialog = false;
    
    // Remove the active class from stock market container
    document.getElementById('stock-market-ui-container')?.classList.remove('active');
    
    // Skip speech bubble closing animation since we're not showing it anymore
    
    // Show interaction text again if player is still nearby
    if (this.isPlayerNearBroker) {
      this.interactionText.setAlpha(1);
    }
  }
  
  /**
   * Get the current stock market data
   */
  public getStockMarketData(): Stock[] {
    return this.stockData;
  }
  
  /**
   * Called when the player enters a building
   * @param buildingType The type of building entered (optional)
   */
  public onEnterBuilding(buildingType?: string): void {
    // Show the broker only if the player is in the stock market building
    if (buildingType === 'stockmarket') {
      this.toggleVisibility(true);
      console.log("Player entered stock market building, showing broker");
    }
  }

  /**
   * Called when the player exits a building
   */
  public onExitBuilding(): void {
    // Hide the broker when exiting any building
    this.toggleVisibility(false);
    console.log("Player exited building, hiding broker");
  }
  
  /**
   * Clean up resources when scene is being destroyed
   */
  public destroy(): void {
    if (this.broker.nameText) {
      this.broker.nameText.destroy();
    }
    
    if (this.speechBubble) {
      this.speechBubble.destroy();
    }
    
    this.broker.destroy();
    this.interactionText.destroy();
  }
}