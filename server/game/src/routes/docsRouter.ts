import { Router } from "oak";

const docsRouter = new Router();

// API Documentation data structure
const apiDocumentation = {
  title: "Dhaniverse Game API Documentation",
  version: "1.0.0",
  description: "Comprehensive API documentation for the Dhaniverse financial education game backend services.",
  baseUrl: Deno.env.get("DENO_DEPLOYMENT_ID") ? "https://dhaniverse-backend.deno.dev" : "http://localhost:8000",
  
  sections: [
    {
      name: "Health & Status",
      description: "System health checks and status endpoints",
      endpoints: [
        {
          method: "GET",
          path: "/health",
          description: "Check server health and database connection status",
          parameters: [],
          responses: {
            200: {
              description: "Server is healthy",
              example: {
                status: "ok",
                timestamp: "2025-09-23T10:30:00.000Z",
                database: "connected"
              }
            }
          }
        },
        {
          method: "GET",
          path: "/api/health",
          description: "API-specific health check",
          parameters: [],
          responses: {
            200: {
              description: "API is healthy",
              example: {
                status: "ok",
                message: "API is running",
                version: "1.0.0"
              }
            }
          }
        },
        {
          method: "GET",
          path: "/api/game/status",
          description: "Game service status",
          parameters: [],
          responses: {
            200: {
              description: "Game service status",
              example: {
                status: "ok",
                service: "game-api",
                timestamp: "2025-09-23T10:30:00.000Z"
              }
            }
          }
        }
      ]
    },
    
    {
      name: "Authentication",
      description: "User authentication and session management",
      endpoints: [
        {
          method: "POST",
          path: "/auth/send-magic-link",
          description: "Send magic link authentication email",
          parameters: [
            { name: "email", type: "string", required: true, description: "User's email address" }
          ],
          requestBody: {
            example: {
              email: "user@example.com"
            }
          },
          responses: {
            200: {
              description: "Magic link sent successfully",
              example: {
                success: true,
                message: "Magic link sent to your email"
              }
            },
            429: {
              description: "Rate limit exceeded",
              example: {
                error: "Rate limit exceeded",
                message: "Please wait before requesting another magic link"
              }
            }
          }
        },
        {
          method: "GET",
          path: "/auth/verify-magic-link",
          description: "Verify magic link and authenticate user",
          parameters: [
            { name: "token", type: "string", required: true, description: "Magic link verification token" }
          ],
          responses: {
            200: {
              description: "Authentication successful",
              example: {
                success: true,
                user: {
                  email: "user@example.com",
                  id: "user_123"
                },
                token: "jwt_token_here"
              }
            },
            400: {
              description: "Invalid or expired token",
              example: {
                error: "Invalid token",
                message: "The magic link is invalid or has expired"
              }
            }
          }
        },
        {
          method: "GET",
          path: "/auth/me",
          description: "Get current user information",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "User information",
              example: {
                id: "user_123",
                email: "user@example.com",
                username: "player1",
                createdAt: "2025-09-23T10:30:00.000Z"
              }
            },
            401: {
              description: "Unauthorized",
              example: {
                error: "Unauthorized",
                message: "Invalid or missing authentication token"
              }
            }
          }
        },
        {
          method: "POST",
          path: "/auth/google",
          description: "Authenticate with Google OAuth",
          parameters: [
            { name: "credential", type: "string", required: true, description: "Google OAuth credential token" }
          ],
          requestBody: {
            example: {
              credential: "google_oauth_credential_token"
            }
          },
          responses: {
            200: {
              description: "Google authentication successful",
              example: {
                success: true,
                user: {
                  email: "user@gmail.com",
                  name: "John Doe",
                  picture: "https://example.com/avatar.jpg"
                },
                token: "jwt_token_here"
              }
            }
          }
        },
        {
          method: "POST",
          path: "/auth/internet-identity",
          description: "Authenticate with Internet Identity",
          parameters: [
            { name: "principal", type: "string", required: true, description: "Internet Identity principal" },
            { name: "identity", type: "object", required: true, description: "Identity verification data" }
          ],
          responses: {
            200: {
              description: "Internet Identity authentication successful"
            }
          }
        },
        {
          method: "POST",
          path: "/auth/signout",
          description: "Sign out current user",
          responses: {
            200: {
              description: "Successfully signed out",
              example: {
                success: true,
                message: "Successfully signed out"
              }
            }
          }
        }
      ]
    },

    {
      name: "Player State",
      description: "Manage player game state, progress, and currency",
      endpoints: [
        {
          method: "GET",
          path: "/game/player-state",
          description: "Get current player state including currency and progress",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Player state retrieved successfully",
              example: {
                id: "player_123",
                username: "player1",
                rupees: 1000,
                bankBalance: 5000,
                totalNetWorth: 6000,
                level: 5,
                experience: 2500,
                lastLogin: "2025-09-23T10:30:00.000Z",
                onboardingProgress: {
                  hasMetMaya: true,
                  hasFollowedMaya: true,
                  hasClaimedMoney: true,
                  hasBankAccount: true,
                  hasInvestedInStocks: false
                }
              }
            }
          }
        },
        {
          method: "PUT",
          path: "/game/player-state",
          description: "Update player state",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              level: 6,
              experience: 3000,
              onboardingProgress: {
                hasInvestedInStocks: true
              }
            }
          },
          responses: {
            200: {
              description: "Player state updated successfully",
              example: {
                success: true,
                updatedState: {
                  level: 6,
                  experience: 3000
                }
              }
            }
          }
        },
        {
          method: "PUT",
          path: "/game/player-state/rupees",
          description: "Update player's rupee balance",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              rupees: 1500,
              reason: "Quest completion reward"
            }
          },
          responses: {
            200: {
              description: "Rupee balance updated successfully",
              example: {
                success: true,
                newBalance: 1500,
                previousBalance: 1000
              }
            }
          }
        },
        {
          method: "GET",
          path: "/game/player-state/starter-status",
          description: "Check if player has claimed starter money",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Starter status retrieved",
              example: {
                hasClaimed: false,
                canClaim: true,
                amount: 1000
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/player-state/claim-starter",
          description: "Claim starter money for new players",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Starter money claimed successfully",
              example: {
                success: true,
                amount: 1000,
                newBalance: 1000
              }
            },
            400: {
              description: "Already claimed or ineligible",
              example: {
                error: "Already claimed",
                message: "You have already claimed your starter money"
              }
            }
          }
        }
      ]
    },

    {
      name: "Banking System",
      description: "Virtual banking operations including accounts, deposits, and withdrawals",
      endpoints: [
        {
          method: "POST",
          path: "/game/bank-account/create",
          description: "Create a new bank account for the player",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              accountType: "savings",
              initialDeposit: 500
            }
          },
          responses: {
            200: {
              description: "Bank account created successfully",
              example: {
                success: true,
                account: {
                  id: "acc_123",
                  accountNumber: "DHAN123456789",
                  type: "savings",
                  balance: 500,
                  interestRate: 4.5,
                  createdAt: "2025-09-23T10:30:00.000Z"
                }
              }
            }
          }
        },
        {
          method: "GET",
          path: "/game/bank-account",
          description: "Get player's bank account details",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Bank account details retrieved",
              example: {
                id: "acc_123",
                accountNumber: "DHAN123456789",
                balance: 2500,
                type: "savings",
                interestRate: 4.5,
                lastTransaction: "2025-09-23T09:15:00.000Z"
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/bank-account/deposit",
          description: "Deposit money into bank account",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              amount: 1000,
              description: "Cash deposit"
            }
          },
          responses: {
            200: {
              description: "Deposit successful",
              example: {
                success: true,
                transaction: {
                  id: "txn_123",
                  amount: 1000,
                  type: "deposit",
                  balanceAfter: 3500,
                  timestamp: "2025-09-23T10:30:00.000Z"
                }
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/bank-account/withdraw",
          description: "Withdraw money from bank account",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              amount: 500,
              description: "Cash withdrawal"
            }
          },
          responses: {
            200: {
              description: "Withdrawal successful",
              example: {
                success: true,
                transaction: {
                  id: "txn_124",
                  amount: 500,
                  type: "withdrawal",
                  balanceAfter: 3000,
                  timestamp: "2025-09-23T10:35:00.000Z"
                }
              }
            },
            400: {
              description: "Insufficient funds",
              example: {
                error: "Insufficient funds",
                message: "Account balance is insufficient for this withdrawal"
              }
            }
          }
        }
      ]
    },

    {
      name: "Fixed Deposits",
      description: "Fixed deposit investment management",
      endpoints: [
        {
          method: "GET",
          path: "/game/fixed-deposits",
          description: "Get all player's fixed deposits",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Fixed deposits retrieved",
              example: {
                deposits: [
                  {
                    id: "fd_123",
                    amount: 10000,
                    interestRate: 7.5,
                    tenure: 12,
                    maturityDate: "2026-09-23T10:30:00.000Z",
                    maturityAmount: 10750,
                    status: "active"
                  }
                ]
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/fixed-deposits",
          description: "Create a new fixed deposit",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              amount: 5000,
              tenure: 6,
              interestRate: 6.5
            }
          },
          responses: {
            200: {
              description: "Fixed deposit created successfully",
              example: {
                success: true,
                deposit: {
                  id: "fd_124",
                  amount: 5000,
                  interestRate: 6.5,
                  tenure: 6,
                  maturityDate: "2026-03-23T10:30:00.000Z",
                  maturityAmount: 5325
                }
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/fixed-deposits/:id/claim",
          description: "Claim matured fixed deposit",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          parameters: [
            { name: "id", type: "string", required: true, description: "Fixed deposit ID" }
          ],
          responses: {
            200: {
              description: "Fixed deposit claimed successfully",
              example: {
                success: true,
                amount: 10750,
                interest: 750,
                newBankBalance: 13750
              }
            }
          }
        }
      ]
    },

    {
      name: "Stock Trading",
      description: "Stock portfolio management and trading operations",
      endpoints: [
        {
          method: "GET",
          path: "/game/stock-portfolio",
          description: "Get player's stock portfolio",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Stock portfolio retrieved",
              example: {
                portfolio: [
                  {
                    symbol: "RELIANCE",
                    shares: 10,
                    avgPrice: 2500,
                    currentPrice: 2650,
                    totalValue: 26500,
                    gainLoss: 1500,
                    gainLossPercent: 6.0
                  }
                ],
                totalValue: 26500,
                totalInvestment: 25000,
                totalGainLoss: 1500
              }
            }
          }
        },
        {
          method: "GET",
          path: "/game/stock-transactions",
          description: "Get stock transaction history",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Stock transactions retrieved",
              example: {
                transactions: [
                  {
                    id: "stock_txn_123",
                    symbol: "RELIANCE",
                    type: "buy",
                    shares: 10,
                    price: 2500,
                    total: 25000,
                    timestamp: "2025-09-20T10:30:00.000Z"
                  }
                ]
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/stock-portfolio/buy",
          description: "Buy stocks",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              symbol: "TCS",
              shares: 5,
              price: 3200
            }
          },
          responses: {
            200: {
              description: "Stock purchase successful",
              example: {
                success: true,
                transaction: {
                  symbol: "TCS",
                  shares: 5,
                  price: 3200,
                  total: 16000,
                  newBankBalance: 4000
                }
              }
            }
          }
        },
        {
          method: "POST",
          path: "/game/stock-portfolio/sell",
          description: "Sell stocks",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          requestBody: {
            example: {
              symbol: "TCS",
              shares: 2,
              price: 3300
            }
          },
          responses: {
            200: {
              description: "Stock sale successful",
              example: {
                success: true,
                transaction: {
                  symbol: "TCS",
                  shares: 2,
                  price: 3300,
                  total: 6600,
                  newBankBalance: 10600,
                  gainLoss: 200
                }
              }
            }
          }
        }
      ]
    },

    {
      name: "Game Sync",
      description: "Data synchronization and onboarding status",
      endpoints: [
        {
          method: "GET",
          path: "/game/sync",
          description: "Sync all player data",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "All player data synchronized",
              example: {
                playerState: {
                  rupees: 1000,
                  bankBalance: 5000
                },
                bankAccount: {
                  balance: 5000,
                  accountNumber: "DHAN123456789"
                },
                portfolio: {
                  totalValue: 26500
                },
                fixedDeposits: {
                  active: 2,
                  totalAmount: 15000
                }
              }
            }
          }
        },
        {
          method: "GET",
          path: "/game/bank-onboarding/status",
          description: "Get bank onboarding progress status",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Bearer JWT token" }
          ],
          responses: {
            200: {
              description: "Bank onboarding status",
              example: {
                hasAccount: true,
                hasDeposited: true,
                hasWithdrawn: false,
                completionPercentage: 67
              }
            }
          }
        }
      ]
    },

    {
      name: "Admin Panel",
      description: "Administrative endpoints for game management",
      endpoints: [
        {
          method: "GET",
          path: "/admin/summary",
          description: "Get admin dashboard summary",
          headers: [
            { name: "Authorization", type: "string", required: true, description: "Admin JWT token" }
          ],
          responses: {
            200: {
              description: "Admin summary data",
              example: {
                totalPlayers: 1250,
                activePlayers: 89,
                totalTransactions: 5643,
                systemHealth: "good"
              }
            }
          }
        },
        {
          method: "GET",
          path: "/admin/active-players",
          description: "Get list of currently active players",
          responses: {
            200: {
              description: "Active players list",
              example: {
                players: [
                  {
                    username: "player1",
                    level: 5,
                    lastActivity: "2025-09-23T10:30:00.000Z"
                  }
                ]
              }
            }
          }
        },
        {
          method: "POST",
          path: "/admin/ban",
          description: "Ban a player",
          requestBody: {
            example: {
              playerId: "player_123",
              reason: "Violation of terms",
              duration: "24h"
            }
          },
          responses: {
            200: {
              description: "Player banned successfully"
            }
          }
        },
        {
          method: "POST",
          path: "/admin/announce",
          description: "Send announcement to all players",
          requestBody: {
            example: {
              message: "Server maintenance in 30 minutes",
              type: "warning"
            }
          },
          responses: {
            200: {
              description: "Announcement sent successfully"
            }
          }
        }
      ]
    }
  ]
};

// Main documentation page - HTML response
docsRouter.get(["/", "/docs"], (ctx) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${apiDocumentation.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background-color: #fafbfc;
            font-weight: 400;
        }
        
        .header {
            background: #34495e;
            color: #ecf0f1;
            padding: 3rem 0;
            text-align: center;
            border-bottom: 1px solid #bdc3c7;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 300;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
        }
        
        .header p {
            font-size: 1rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .header code {
            background: rgba(255,255,255,0.1);
            padding: 0.2rem 0.5rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }
        
        .nav {
            background: #ffffff;
            padding: 1.5rem 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
            border-bottom: 1px solid #e1e8ed;
        }
        
        .nav ul {
            list-style: none;
            display: flex;
            gap: 0;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .nav a {
            color: #5a6c7d;
            text-decoration: none;
            font-weight: 500;
            padding: 0.75rem 1.5rem;
            border-radius: 0;
            transition: all 0.2s ease;
            border-right: 1px solid #e1e8ed;
            font-size: 0.95rem;
        }
        
        .nav a:last-child {
            border-right: none;
        }
        
        .nav a:hover {
            background: #f8f9fa;
            color: #2c3e50;
        }
        
        .content {
            padding: 3rem 0;
        }
        
        .section {
            background: #ffffff;
            margin-bottom: 2.5rem;
            border-radius: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid #e1e8ed;
            overflow: hidden;
        }
        
        .section-header {
            background: #f8f9fa;
            padding: 2rem 2.5rem;
            border-bottom: 1px solid #e1e8ed;
        }
        
        .section-title {
            font-size: 1.75rem;
            color: #2c3e50;
            margin-bottom: 0.75rem;
            font-weight: 300;
            letter-spacing: -0.3px;
        }
        
        .section-description {
            color: #5a6c7d;
            font-size: 1rem;
            font-weight: 400;
        }
        
        .endpoint {
            padding: 2rem 2.5rem;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .endpoint:last-child {
            border-bottom: none;
        }
        
        .method-path {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #f1f3f4;
        }
        
        .method {
            padding: 0.4rem 1rem;
            border-radius: 0;
            font-weight: 600;
            font-size: 0.8rem;
            min-width: 70px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 2px solid #95a5a6;
            background: transparent;
            color: #34495e;
        }
        
        .method.get { 
            border-color: #7f8c8d;
            color: #2c3e50;
        }
        
        .method.post { 
            border-color: #34495e;
            color: #2c3e50;
            background: #ecf0f1;
        }
        
        .method.put { 
            border-color: #95a5a6;
            color: #2c3e50;
        }
        
        .method.delete { 
            border-color: #7f8c8d;
            color: #2c3e50;
            background: #bdc3c7;
        }
        
        .path {
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 1.1rem;
            color: #2c3e50;
            font-weight: 500;
            background: #f8f9fa;
            padding: 0.5rem 1rem;
            border-radius: 3px;
            border: 1px solid #e1e8ed;
        }
        
        .description {
            color: #34495e;
            margin-bottom: 1.5rem;
            font-size: 1rem;
            line-height: 1.7;
        }
        
        .params-section {
            margin: 1.5rem 0;
        }
        
        .params-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 1rem;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .param {
            background: #f8f9fa;
            padding: 1rem 1.25rem;
            margin: 0.75rem 0;
            border-left: 3px solid #bdc3c7;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.9rem;
            border-radius: 0;
        }
        
        .required {
            color: #34495e;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 1px;
        }
        
        .example {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 1.5rem;
            border-radius: 0;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            margin: 1rem 0;
            border: 1px solid #34495e;
            white-space: pre-wrap;
            line-height: 1.5;
        }
        
        .response-code {
            font-weight: 700;
            color: #2c3e50;
            font-family: 'Monaco', 'Consolas', monospace;
            background: #ecf0f1;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
        }
        
        .response-code.error {
            background: #95a5a6;
            color: #ffffff;
        }
        
        .footer {
            background: #2c3e50;
            color: #bdc3c7;
            text-align: center;
            padding: 3rem 0;
            margin-top: 4rem;
            border-top: 1px solid #34495e;
        }
        
        .footer p {
            font-weight: 300;
            font-size: 0.95rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 1rem;
            }
            
            .method-path {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
            }
            
            .section-header, .endpoint {
                padding: 1.5rem;
            }
            
            .nav a {
                padding: 0.5rem 1rem;
                border-right: none;
                border-bottom: 1px solid #e1e8ed;
            }
        }
        
        .api-info {
            background: #ffffff;
            padding: 2rem 2.5rem;
            margin-bottom: 2.5rem;
            border: 1px solid #e1e8ed;
            border-radius: 0;
        }
        
        .api-info h3 {
            color: #2c3e50;
            font-weight: 400;
            margin-bottom: 1rem;
            font-size: 1.25rem;
        }
        
        .api-info p {
            color: #5a6c7d;
            margin-bottom: 0.75rem;
        }
        
        .api-info code {
            background: #f8f9fa;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            color: #2c3e50;
            border: 1px solid #e1e8ed;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>${apiDocumentation.title}</h1>
            <p>Version ${apiDocumentation.version}</p>
            <p>${apiDocumentation.description}</p>
            <p><strong>Base URL:</strong> <code>${apiDocumentation.baseUrl}</code></p>
        </div>
    </div>

    <nav class="nav">
        <div class="container">
            <ul>
                ${apiDocumentation.sections.map(section => 
                    `<li><a href="#${section.name.toLowerCase().replace(/\s+/g, '-')}">${section.name}</a></li>`
                ).join('')}
                <li><a href="/api/docs/json">JSON API</a></li>
            </ul>
        </div>
    </nav>

    <div class="content">
        <div class="container">
            <div class="api-info">
                <h3>API Information</h3>
                <p><strong>Base URL:</strong> <code>${apiDocumentation.baseUrl}</code></p>
                <p><strong>Version:</strong> ${apiDocumentation.version}</p>
                <p><strong>Authentication:</strong> Bearer JWT tokens required for protected endpoints</p>
                <p><strong>Content Type:</strong> application/json</p>
            </div>
            
            ${apiDocumentation.sections.map(section => `
                <div class="section" id="${section.name.toLowerCase().replace(/\s+/g, '-')}">
                    <div class="section-header">
                        <h2 class="section-title">${section.name}</h2>
                        <p class="section-description">${section.description}</p>
                    </div>
                    
                    ${section.endpoints.map(endpoint => `
                        <div class="endpoint">
                            <div class="method-path">
                                <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                                <span class="path">${endpoint.path}</span>
                            </div>
                            
                            <p class="description">${endpoint.description}</p>
                            
                            ${endpoint.parameters ? `
                                <div class="params-section">
                                    <div class="params-title">Parameters</div>
                                    ${endpoint.parameters.map(param => `
                                        <div class="param">
                                            <strong>${param.name}</strong> 
                                            <em>(${param.type})</em>
                                            ${param.required ? '<span class="required">REQUIRED</span>' : 'optional'}
                                            — ${param.description}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${endpoint.headers ? `
                                <div class="params-section">
                                    <div class="params-title">Headers</div>
                                    ${endpoint.headers.map(header => `
                                        <div class="param">
                                            <strong>${header.name}</strong> 
                                            <em>(${header.type})</em>
                                            ${header.required ? '<span class="required">REQUIRED</span>' : 'optional'}
                                            — ${header.description}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${endpoint.requestBody ? `
                                <div class="params-section">
                                    <div class="params-title">Request Body Example</div>
                                    <div class="example">${JSON.stringify(endpoint.requestBody.example, null, 2)}</div>
                                </div>
                            ` : ''}
                            
                            <div class="params-section">
                                <div class="params-title">Response Codes</div>
                                ${Object.entries(endpoint.responses).map(([code, response]) => `
                                    <div style="margin: 1.25rem 0;">
                                        <span class="response-code ${parseInt(code) >= 400 ? 'error' : ''}">${code}</span>
                                        — ${response.description}
                                        ${response.example ? `<div class="example">${JSON.stringify(response.example, null, 2)}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="footer">
        <div class="container">
            <p>&copy; 2025 Dhaniverse Financial Education Game API</p>
            <p>Built with Deno and Oak Framework</p>
        </div>
    </div>
</body>
</html>
  `;
  
  ctx.response.headers.set("Content-Type", "text/html");
  ctx.response.body = html;
});

// JSON API documentation endpoint
docsRouter.get("/api/docs/json", (ctx) => {
  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = JSON.stringify(apiDocumentation, null, 2);
});

// OpenAPI/Swagger compatible format
docsRouter.get("/api/docs/openapi", (ctx) => {
  const openApiDoc = {
    openapi: "3.0.0",
    info: {
      title: apiDocumentation.title,
      version: apiDocumentation.version,
      description: apiDocumentation.description
    },
    servers: [
      {
        url: apiDocumentation.baseUrl,
        description: "Main API Server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    paths: {}
  };
  
  // Convert our documentation format to OpenAPI paths
  apiDocumentation.sections.forEach(section => {
    section.endpoints.forEach(endpoint => {
      const pathKey = endpoint.path;
      if (!openApiDoc.paths[pathKey]) {
        openApiDoc.paths[pathKey] = {};
      }
      
      const operation = {
        summary: endpoint.description,
        description: endpoint.description,
        tags: [section.name],
        responses: {}
      };
      
      // Add security if headers include Authorization
      if (endpoint.headers && endpoint.headers.some(h => h.name === 'Authorization')) {
        operation.security = [{ bearerAuth: [] }];
      }
      
      // Add parameters
      if (endpoint.parameters) {
        operation.parameters = endpoint.parameters.map(param => ({
          name: param.name,
          in: param.name === 'id' ? 'path' : 'query',
          required: param.required,
          description: param.description,
          schema: { type: param.type }
        }));
      }
      
      // Add request body
      if (endpoint.requestBody) {
        operation.requestBody = {
          content: {
            'application/json': {
              example: endpoint.requestBody.example
            }
          }
        };
      }
      
      // Add responses
      Object.entries(endpoint.responses).forEach(([code, response]) => {
        operation.responses[code] = {
          description: response.description,
          content: response.example ? {
            'application/json': {
              example: response.example
            }
          } : {}
        };
      });
      
      openApiDoc.paths[pathKey][endpoint.method.toLowerCase()] = operation;
    });
  });
  
  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = JSON.stringify(openApiDoc, null, 2);
});

// Quick API test endpoint for documentation
docsRouter.get("/api/docs/test", (ctx) => {
  ctx.response.headers.set("Content-Type", "application/json");
  ctx.response.body = {
    status: "operational",
    message: "API Documentation system is functional",
    timestamp: new Date().toISOString(),
    endpoints: {
      documentation: "/docs",
      jsonSpecification: "/api/docs/json", 
      openApiSpecification: "/api/docs/openapi",
      healthCheck: "/api/docs/test"
    },
    notice: "Visit /docs for complete interactive documentation"
  };
});

export default docsRouter;