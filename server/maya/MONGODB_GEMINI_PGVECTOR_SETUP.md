# MongoDB + Gemini + pgvector RAG Integration Guide

This guide walks through integrating ContRAG into an existing project with MongoDB as the primary database, Gemini for embeddings, and pgvector for vector storage. This setup is ideal for projects that already have MongoDB with complex schemas and rich data.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Step 1: Environment Setup](#step-1-environment-setup)
- [Step 2: Database Analysis](#step-2-database-analysis)
- [Step 3: Configuration Setup](#step-3-configuration-setup)
- [Step 4: Schema Introspection](#step-4-schema-introspection)
- [Step 5: Master Entity Configuration](#step-5-master-entity-configuration)
- [Step 6: Connection Testing](#step-6-connection-testing)
- [Step 7: Sample Data Analysis](#step-7-sample-data-analysis)
- [Step 8: Vector Store Setup](#step-8-vector-store-setup)
- [Step 9: Context Building](#step-9-context-building)
- [Step 10: Query Testing](#step-10-query-testing)
- [Step 11: Production Optimization](#step-11-production-optimization)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   MongoDB       │    │   Gemini API     │    │   PostgreSQL    │
│   (Primary DB)  │────│   (Embeddings)   │────│   + pgvector    │
│                 │    │                  │    │   (Vector Store)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │                   │
                        │   ContRAG SDK     │
                        │                   │
                        └───────────────────┘
```

**Why this setup?**
- **MongoDB**: Your existing complex data with rich relationships
- **Gemini**: Google's powerful embedding model with good performance/cost ratio
- **pgvector**: High-performance vector storage with SQL capabilities
- **ContRAG**: Unified interface handling entity relationships and context building

## Prerequisites

### Software Requirements

1. **Node.js** 18+ with npm/yarn
2. **MongoDB** 5.0+ (your existing database)
3. **PostgreSQL** 13+ with pgvector extension
4. **Gemini API Key** from Google AI Studio

### Database Access

- MongoDB connection string with read access
- PostgreSQL instance with admin access for pgvector setup

### Project Requirements

- Existing Node.js/TypeScript project
- Complex MongoDB schema with relationships
- Populated data for testing

## Step 1: Environment Setup

### Install ContRAG

```bash
# Install ContRAG in your existing project
npm install contrag

# Or if you prefer global CLI access
npm install -g contrag
```

### Install Required Dependencies

```bash
# MongoDB driver (if not already installed)
npm install mongodb

# PostgreSQL driver for pgvector
npm install pg @types/pg

# Google AI SDK for Gemini
npm install @google/generative-ai
```

### Set Up pgvector

```bash
# Connect to your PostgreSQL instance
psql -U postgres -h localhost

# Create database for vectors (or use existing)
CREATE DATABASE contrag_vectors;

# Connect to the database
\c contrag_vectors;

# Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Environment Variables

Create a `.env` file in your project root:

```bash
# MongoDB Configuration (your existing database)
CONTRAG_DB_PLUGIN=mongodb
CONTRAG_DB_URL=mongodb://username:password@localhost:27017
CONTRAG_DB_NAME=your_existing_database

# pgvector Configuration  
CONTRAG_VECTOR_PLUGIN=pgvector
CONTRAG_VECTOR_HOST=localhost
CONTRAG_VECTOR_PORT=5432
CONTRAG_VECTOR_DATABASE=contrag_vectors
CONTRAG_VECTOR_USER=postgres
CONTRAG_VECTOR_PASSWORD=your_password

# Gemini Configuration
CONTRAG_EMBEDDER_PLUGIN=gemini
CONTRAG_GEMINI_API_KEY=your_gemini_api_key
CONTRAG_GEMINI_MODEL=embedding-001

# Optional: Debug logging
DEBUG=contrag:*
```

## Step 2: Database Analysis

Before setting up ContRAG, analyze your existing MongoDB schema to understand the entity relationships.

### Analyze Collections

```bash
# List all collections in your database
contrag introspect --format json > schema_analysis.json

# Or view in table format
contrag introspect
```

**Example output for an e-commerce database:**
```
✓ Schema introspection complete

Entity: users
  Fields:
    _id (ObjectId) [PK] [NOT NULL]
    email (String) [NOT NULL]
    name (String)
    created_at (Date)
    profile_id (ObjectId) [FK → profiles._id]
  Relationships:
    many-to-one → profiles (_id → profile_id)

Entity: orders
  Fields:
    _id (ObjectId) [PK] [NOT NULL]
    user_id (ObjectId) [FK → users._id]
    total (Number)
    status (String)
    items (Array)
    created_at (Date)
  Relationships:
    many-to-one → users (user_id → _id)

Entity: products
  Fields:
    _id (ObjectId) [PK] [NOT NULL]
    name (String) [NOT NULL]
    description (String)
    category_id (ObjectId) [FK → categories._id]
    price (Number)
  Relationships:
    many-to-one → categories (category_id → _id)
```

### Identify Master Entities

Master entities are the core entities around which you want to build context. Common examples:

- **E-commerce**: `users`, `products`, `orders`
- **CRM**: `customers`, `accounts`, `deals`
- **Content Management**: `users`, `articles`, `categories`
- **Social Platform**: `users`, `posts`, `communities`

## Step 3: Configuration Setup

### Initialize Configuration

```bash
# Create initial configuration with MongoDB template
contrag config init --template mongodb --force
```

This creates a `contrag.config.json` file. Let's customize it for your complex schema:

```json
{
  "database": {
    "plugin": "mongodb",
    "config": {
      "url": "mongodb://username:password@localhost:27017",
      "database": "your_existing_database"
    }
  },
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "contrag_vectors",
      "user": "postgres",
      "password": "your_password"
    }
  },
  "embedder": {
    "plugin": "gemini",
    "config": {
      "apiKey": "your_gemini_api_key",
      "model": "embedding-001"
    }
  },
  "contextBuilder": {
    "chunkSize": 1000,
    "overlap": 200,
    "maxDepth": 4,
    "relationshipLimit": 15
  }
}
```

### Validate Configuration

```bash
# Test all connections
contrag config validate
```

**Expected output:**
```
✓ Configuration validation complete

✓ Database (MongoDB) (45ms)
  serverTime: 2025-09-15T10:30:00.000Z
  collections: 12
  totalDocuments: 150,430

✓ Vector Store (pgvector) (23ms)
  version: PostgreSQL 15.4
  pgvector: 0.5.1
  
✓ Embedder (Gemini) (340ms)
  model: embedding-001
  dimensions: 768
```

## Step 4: Schema Introspection

### Deep Schema Analysis

```bash
# Get detailed schema information
contrag introspect --format json > detailed_schema.json

# Analyze specific collections
contrag sample --entity users --limit 5 --format json
contrag sample --entity orders --limit 3 --format json
contrag sample --entity products --limit 5 --format json
```

### Understand Data Relationships

Examine your sample data to understand the relationship patterns:

```bash
# Get sample user with all related data
contrag sample --entity users --uid "507f1f77bcf86cd799439011"
```

**Example output:**
```
✓ Retrieved data for users:507f1f77bcf86cd799439011

Master Entity Data:
┌─────────────────────────────┬─────────────────────┬──────────┬─────────────┐
│ _id                         │ email               │ name     │ created_at  │
├─────────────────────────────┼─────────────────────┼──────────┼─────────────┤
│ 507f1f77bcf86cd799439011    │ john@example.com    │ John Doe │ 2024-01-15  │
└─────────────────────────────┴─────────────────────┴──────────┴─────────────┘

orders (8 records):
┌─────────────────────────────┬─────────────────────────────┬────────┬───────────┐
│ _id                         │ user_id                     │ total  │ status    │
├─────────────────────────────┼─────────────────────────────┼────────┼───────────┤
│ 507f1f77bcf86cd799439012    │ 507f1f77bcf86cd799439011    │ 149.99 │ completed │
│ 507f1f77bcf86cd799439013    │ 507f1f77bcf86cd799439011    │ 89.50  │ shipped   │
└─────────────────────────────┴─────────────────────────────┴────────┴───────────┘

profiles (1 record):
┌─────────────────────────────┬─────────────────────────────┬──────────────┬─────────┐
│ _id                         │ user_id                     │ phone        │ address │
├─────────────────────────────┼─────────────────────────────┼──────────────┼─────────┤
│ 507f1f77bcf86cd799439014    │ 507f1f77bcf86cd799439011    │ +1234567890  │ 123 St  │
└─────────────────────────────┴─────────────────────────────┴──────────────┴─────────┘

Total records: 10
```

## Step 5: Master Entity Configuration

Based on your schema analysis, configure master entities in your `contrag.config.json`:

```json
{
  "masterEntities": [
    {
      "name": "users",
      "primaryKey": "_id",
      "relationships": {
        "orders": {
          "entity": "orders",
          "type": "one-to-many",
          "localKey": "_id",
          "foreignKey": "user_id"
        },
        "profile": {
          "entity": "profiles",
          "type": "one-to-one",
          "localKey": "_id",
          "foreignKey": "user_id"
        },
        "reviews": {
          "entity": "reviews",
          "type": "one-to-many",
          "localKey": "_id",
          "foreignKey": "user_id"
        }
      },
      "sampleFilters": {
        "active": true,
        "created_at": {"$gte": "2024-01-01"}
      }
    },
    {
      "name": "products",
      "primaryKey": "_id",
      "relationships": {
        "category": {
          "entity": "categories",
          "type": "many-to-one",
          "localKey": "category_id",
          "foreignKey": "_id"
        },
        "reviews": {
          "entity": "reviews",
          "type": "one-to-many",
          "localKey": "_id",
          "foreignKey": "product_id"
        },
        "orderItems": {
          "entity": "order_items",
          "type": "one-to-many",
          "localKey": "_id",
          "foreignKey": "product_id"
        }
      },
      "sampleFilters": {
        "active": true,
        "stock": {"$gt": 0}
      }
    },
    {
      "name": "orders",
      "primaryKey": "_id",
      "relationships": {
        "user": {
          "entity": "users",
          "type": "many-to-one",
          "localKey": "user_id",
          "foreignKey": "_id"
        },
        "items": {
          "entity": "order_items",
          "type": "one-to-many",
          "localKey": "_id",
          "foreignKey": "order_id"
        }
      },
      "sampleFilters": {
        "status": {"$ne": "cancelled"}
      }
    }
  ],
  "systemPrompts": {
    "default": "You are an e-commerce assistant with access to user profiles, order history, and product information. Provide personalized, helpful responses.",
    "contextBuilder": "Create comprehensive context that includes user preferences, purchase history, product details, and relevant relationships to enable personalized e-commerce assistance.",
    "queryProcessor": "Analyze user queries in the context of their purchase history, preferences, and available products. Focus on providing relevant product recommendations and order assistance.",
    "custom": {
      "recommendations": "Focus on product recommendations based on user history, preferences, and similar user behavior patterns.",
      "support": "Provide helpful customer support using order history, product information, and user profile data.",
      "analytics": "Analyze purchasing patterns, user behavior, and product performance metrics."
    }
  }
}
```

### Test Master Entity Configuration

```bash
# Test each master entity
contrag sample --entity users --uid "507f1f77bcf86cd799439011"
contrag sample --entity products --uid "507f1f77bcf86cd799439020"
contrag sample --entity orders --uid "507f1f77bcf86cd799439030"
```

## Step 6: Connection Testing

### Test Each Component

```bash
# Test MongoDB connection
contrag test db
```

**Expected output:**
```
✓ Database connection successful (45ms)
  serverTime: 2025-09-15T10:30:00.000Z
  collections: 12
  totalDocuments: 150,430
```

```bash
# Test pgvector connection
contrag test vector
```

**Expected output:**
```
✓ Vector store connection successful (23ms)
  version: PostgreSQL 15.4
  pgvector: 0.5.1
  totalVectors: 0
```

```bash
# Test Gemini connection
contrag test embedder
```

**Expected output:**
```
✓ Embedder connection successful (340ms)
  model: embedding-001
  dimensions: 768
  testEmbedding: [0.1234, -0.5678, ...]
```

### Test All Connections

```bash
# Comprehensive connection test
contrag test all
```

## Step 7: Sample Data Analysis

### Analyze Data Distribution

```bash
# Get sample data from different collections
contrag sample --entity users --limit 10 --format table
contrag sample --entity orders --limit 10 --format table
contrag sample --entity products --limit 10 --format table

# Test filters
contrag sample --entity users --filter '{"created_at": {"$gte": "2024-01-01"}}' --limit 5

# Get related data for comprehensive analysis
contrag sample --entity users --uid "507f1f77bcf86cd799439011"
```

### Identify Data Quality Issues

Look for:
- Missing relationships (null foreign keys)
- Inconsistent data formats
- Empty or malformed fields
- Circular references

```bash
# Check for data consistency
contrag sample --entity orders --filter '{"user_id": null}' --limit 5
contrag sample --entity products --filter '{"description": null}' --limit 5
```

## Step 8: Vector Store Setup

### Initialize Vector Store

```bash
# Check vector store status
contrag vector stats
```

**Initial output:**
```
✓ Vector store statistics

Total Vectors: 0
Dimensions: 768
Namespaces: []
Storage Size: 0MB
```

### Build Context for Sample Entities

Start with a small sample to test the pipeline:

```bash
# Build context for a specific user
contrag build --entity users --uid "507f1f77bcf86cd799439011"
```

**Expected output:**
```
✓ Context building complete
  Entity: users
  UID: 507f1f77bcf86cd799439011
  Namespace: users:507f1f77bcf86cd799439011
  Chunks Created: 8
```

```bash
# Build context for a product
contrag build --entity products --uid "507f1f77bcf86cd799439020"
```

```bash
# Build context for an order
contrag build --entity orders --uid "507f1f77bcf86cd799439030"
```

### Verify Vector Storage

```bash
# Check updated vector store stats
contrag vector stats
```

**Expected output:**
```
✓ Vector store statistics

Total Vectors: 24
Dimensions: 768
Namespaces: 3
Storage Size: 1.2MB

Namespaces:
  - users:507f1f77bcf86cd799439011
  - products:507f1f77bcf86cd799439020
  - orders:507f1f77bcf86cd799439030
```

```bash
# List all namespaces
contrag vector namespaces
```

## Step 9: Context Building

### Build Context for Multiple Entities

```bash
# Build context for multiple users (use a script for batch processing)
contrag sample --entity users --limit 5 --format json | jq -r '.[]._id' | while read uid; do
  echo "Building context for user: $uid"
  contrag build --entity users --uid "$uid"
done
```

### Monitor Progress

```bash
# Check vector store growth
contrag vector stats

# Monitor namespaces
contrag vector namespaces
```

### Batch Processing Script

Create a script `build_contexts.js` for efficient batch processing:

```javascript
const { ContragSDK } = require('contrag');
const config = require('./contrag.config.json');

async function buildContextsForEntity(entityName, limit = 50) {
  const sdk = new ContragSDK();
  await sdk.configure(config);
  
  try {
    // Get sample entity IDs
    const samples = await sdk.getSampleData(entityName, limit);
    console.log(`Building contexts for ${samples.length} ${entityName}...`);
    
    for (const [index, sample] of samples.entries()) {
      const uid = sample._id.toString();
      console.log(`Processing ${entityName} ${index + 1}/${samples.length}: ${uid}`);
      
      try {
        const result = await sdk.buildFor(entityName, uid);
        if (result.success) {
          console.log(`✓ Built ${result.chunksCreated} chunks for ${result.namespace}`);
        } else {
          console.error(`✗ Failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`✗ Error processing ${uid}: ${error.message}`);
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    await sdk.disconnect();
  }
}

// Build contexts
(async () => {
  await buildContextsForEntity('users', 20);
  await buildContextsForEntity('products', 30);
  await buildContextsForEntity('orders', 25);
})();
```

Run the batch script:

```bash
node build_contexts.js
```

## Step 10: Query Testing

### Test Basic Queries

```bash
# Query user context
contrag query --namespace "users:507f1f77bcf86cd799439011" --query "What orders has this user placed?"
```

**Expected output:**
```
✓ Found 3 results for "What orders has this user placed?"

Result 1:
  Chunk: 2/8
  Entity: users
  Relations: orders, profiles
  
John Doe (john@example.com) has placed 8 orders totaling $1,247.89. Recent orders include:
- Order #507f1f77bcf86cd799439012: $149.99 (completed)
- Order #507f1f77bcf86cd799439013: $89.50 (shipped)
```

```bash
# Query product context
contrag query --namespace "products:507f1f77bcf86cd799439020" --query "What do customers say about this product?"
```

```bash
# Query order context  
contrag query --namespace "orders:507f1f77bcf86cd799439030" --query "What items are in this order?"
```

### Test Vector Similarity Search

```bash
# Search for similar content across all namespaces
contrag vector search --text "user purchase history" --limit 5
```

**Expected output:**
```
✓ Found 5 similar vectors

Result 1:
  ID: chunk_users_507f1f77bcf86cd799439011_2
  Score: 0.8934
  Metadata:
    entity: users
    uid: 507f1f77bcf86cd799439011
    chunkIndex: 2
  Content:
    John Doe's purchase history shows consistent activity with 8 orders...

Result 2:
  ID: chunk_users_507f1f77bcf86cd799439022_1
  Score: 0.8756
  ...
```

### Cross-Entity Queries

```bash
# Search across multiple entity types
contrag vector search --text "electronics category products" --limit 3
contrag vector search --text "user reviews and ratings" --limit 3
```

## Step 11: Production Optimization

### Performance Tuning

#### Optimize Context Builder

```json
{
  "contextBuilder": {
    "chunkSize": 1500,        // Larger chunks for better context
    "overlap": 300,           // More overlap for continuity
    "maxDepth": 3,            // Limit depth to avoid explosion
    "relationshipLimit": 20   // More relationships for rich context
  }
}
```

#### Batch Processing Configuration

Create production batch processing:

```javascript
// production_build.js
const { ContragSDK } = require('contrag');
const config = require('./contrag.config.json');

class ProductionContextBuilder {
  constructor() {
    this.sdk = new ContragSDK();
    this.batchSize = 10;
    this.concurrency = 3;
  }
  
  async initialize() {
    await this.sdk.configure(config);
  }
  
  async buildContextsInBatches(entityName, totalLimit = 1000) {
    console.log(`Building contexts for ${entityName} (limit: ${totalLimit})`);
    
    const samples = await this.sdk.getSampleData(entityName, totalLimit);
    const batches = this.createBatches(samples, this.batchSize);
    
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);
      
      const promises = batch.map(sample => 
        this.buildContextWithRetry(entityName, sample._id.toString())
      );
      
      const results = await Promise.allSettled(promises);
      this.logBatchResults(results, batchIndex + 1);
      
      // Pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  async buildContextWithRetry(entityName, uid, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sdk.buildFor(entityName, uid);
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
  
  logBatchResults(results, batchNumber) {
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`Batch ${batchNumber}: ${successful} successful, ${failed} failed`);
  }
  
  async cleanup() {
    await this.sdk.disconnect();
  }
}

// Usage
(async () => {
  const builder = new ProductionContextBuilder();
  await builder.initialize();
  
  try {
    await builder.buildContextsInBatches('users', 500);
    await builder.buildContextsInBatches('products', 1000);
    await builder.buildContextsInBatches('orders', 750);
  } finally {
    await builder.cleanup();
  }
})();
```

### Monitoring and Maintenance

#### Create Monitoring Script

```javascript
// monitor.js
const { ContragSDK } = require('contrag');

async function monitorSystem() {
  const sdk = new ContragSDK();
  await sdk.configure(require('./contrag.config.json'));
  
  try {
    // Check all connections
    const [dbResult, vectorResult, embedderResult] = await Promise.all([
      sdk.testDatabaseConnection(),
      sdk.testVectorStoreConnection(),
      sdk.testEmbedderConnection()
    ]);
    
    // Get vector store stats
    const stats = await sdk.getVectorStoreStats();
    
    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      connections: { dbResult, vectorResult, embedderResult },
      vectorStore: stats,
      health: {
        allConnected: [dbResult, vectorResult, embedderResult].every(r => r.connected),
        totalVectors: stats.totalVectors,
        namespaceCount: stats.namespaces.length
      }
    };
    
    console.log(JSON.stringify(report, null, 2));
    
    // Alert if issues
    if (!report.health.allConnected) {
      console.error('🚨 Connection issues detected!');
      process.exit(1);
    }
    
  } finally {
    await sdk.disconnect();
  }
}

monitorSystem();
```

#### Setup Cron Jobs

```bash
# Add to crontab for monitoring
# Check system health every 15 minutes
*/15 * * * * cd /path/to/your/project && node monitor.js >> logs/contrag-health.log 2>&1

# Rebuild contexts for new data daily at 2 AM
0 2 * * * cd /path/to/your/project && node incremental_build.js >> logs/contrag-build.log 2>&1
```

### Integration with Your Application

#### SDK Integration Example

```javascript
// app/services/ragService.js
const { ContragSDK } = require('contrag');
const config = require('../config/contrag.config.json');

class RAGService {
  constructor() {
    this.sdk = new ContragSDK();
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      await this.sdk.configure(config);
      this.initialized = true;
    }
  }
  
  async getUserContext(userId, query) {
    await this.initialize();
    
    const namespace = `users:${userId}`;
    const result = await this.sdk.query(namespace, query, 5);
    
    return {
      context: result.chunks.map(chunk => chunk.content).join('\n'),
      sources: result.chunks.map(chunk => ({
        entity: chunk.metadata.entity,
        relations: chunk.metadata.relations
      }))
    };
  }
  
  async getProductRecommendations(userId, query) {
    await this.initialize();
    
    // Search across user context and product contexts
    const userResults = await this.sdk.searchSimilarVectors(
      query, `users:${userId}`, 3
    );
    
    const productResults = await this.sdk.searchSimilarVectors(
      query, undefined, 5 // Search all namespaces
    );
    
    return {
      userContext: userResults,
      productSuggestions: productResults.filter(r => 
        r.metadata.entity === 'products'
      )
    };
  }
  
  async buildContextForNewUser(userId) {
    await this.initialize();
    return await this.sdk.buildFor('users', userId);
  }
}

module.exports = new RAGService();
```

#### Express.js Route Example

```javascript
// app/routes/api.js
const express = require('express');
const ragService = require('../services/ragService');

const router = express.Router();

router.get('/users/:userId/context', async (req, res) => {
  try {
    const { userId } = req.params;
    const { query } = req.query;
    
    const context = await ragService.getUserContext(userId, query);
    
    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/users/:userId/build-context', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await ragService.buildContextForNewUser(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

## Troubleshooting

### Common Issues and Solutions

#### 1. MongoDB Connection Issues

**Problem**: `MongoDB connection failed`

```bash
# Test connection
contrag test db

# Check MongoDB status
mongosh --eval "db.runCommand({connectionStatus: 1})"
```

**Solutions**:
- Verify connection string format
- Check authentication credentials
- Ensure MongoDB is running and accessible
- Check firewall settings

#### 2. pgvector Setup Issues

**Problem**: `Vector store connection failed`

```bash
# Check PostgreSQL connection
psql -U postgres -h localhost -c "SELECT version();"

# Check pgvector extension
psql -U postgres -d contrag_vectors -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

**Solutions**:
- Install pgvector extension: `CREATE EXTENSION vector;`
- Check PostgreSQL version compatibility
- Verify database permissions

#### 3. Gemini API Issues

**Problem**: `Embedder connection failed`

```bash
# Test Gemini API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CONTRAG_GEMINI_API_KEY" \
  -d '{"text": "test"}' \
  "https://generativelanguage.googleapis.com/v1/models/embedding-001:embed"
```

**Solutions**:
- Verify API key validity
- Check API quota and limits
- Ensure proper model name (`embedding-001`)

#### 4. Context Building Failures

**Problem**: `No context chunks generated`

```bash
# Check sample data
contrag sample --entity users --uid "your_user_id"

# Verify relationships
contrag introspect --format json | jq '.[] | select(.name == "users")'
```

**Solutions**:
- Verify entity relationships in master entity config
- Check if related data exists
- Review relationship field mappings
- Ensure proper data types (ObjectId conversion)

#### 5. Performance Issues

**Problem**: Slow context building or queries

**Solutions**:
- Reduce `maxDepth` and `relationshipLimit` in config
- Add database indexes on foreign key fields
- Use batch processing for large datasets
- Monitor memory usage

### Debug Mode

Enable detailed logging:

```bash
export DEBUG=contrag:*
contrag build --entity users --uid "507f1f77bcf86cd799439011"
```

### Health Check Script

```bash
# health_check.sh
#!/bin/bash

echo "ContRAG Health Check"
echo "==================="

# Test connections
echo "Testing database connection..."
contrag test db || exit 1

echo "Testing vector store connection..."
contrag test vector || exit 1

echo "Testing embedder connection..."
contrag test embedder || exit 1

# Check vector store stats
echo "Vector store statistics:"
contrag vector stats

# Test sample queries
echo "Testing sample query..."
NAMESPACE=$(contrag vector namespaces | head -1)
if [ ! -z "$NAMESPACE" ]; then
    contrag query --namespace "$NAMESPACE" --query "test query" --limit 1
fi

echo "✓ All health checks passed!"
```

## Advanced Configuration

### Custom System Prompts

```json
{
  "systemPrompts": {
    "default": "You are an intelligent e-commerce assistant with access to comprehensive user profiles, detailed order histories, and extensive product catalogs. Provide personalized, accurate, and helpful responses.",
    
    "contextBuilder": "When building context, focus on creating comprehensive user profiles that include:\n1. Purchase history and patterns\n2. Product preferences and categories\n3. Order frequency and timing\n4. Customer service interactions\n5. Review and rating patterns\nEnsure relationships between entities are clearly established and meaningful connections are highlighted.",
    
    "queryProcessor": "When processing user queries:\n1. Consider the user's complete purchase history\n2. Identify relevant product categories and preferences\n3. Look for seasonal or behavioral patterns\n4. Provide specific, actionable recommendations\n5. Reference concrete order details when available\n6. Maintain context awareness across the conversation",
    
    "custom": {
      "productRecommendations": "Focus exclusively on product recommendations. Analyze the user's purchase history, browsing patterns, and similar customer behaviors. Prioritize:\n- Products in frequently purchased categories\n- Items that complement previous purchases\n- Products with high ratings in preferred price ranges\n- Seasonal or trending items relevant to the user",
      
      "customerSupport": "Provide empathetic and solution-focused customer support. Use order history to:\n- Quickly identify relevant orders and products\n- Understand the customer's experience and concerns\n- Offer specific solutions based on order details\n- Escalate appropriately when needed\n- Follow up on previous support interactions",
      
      "analyticsAndInsights": "Focus on data analysis and business insights. Analyze patterns in:\n- Customer purchase behaviors and trends\n- Product performance across segments\n- Order patterns and seasonality\n- Customer lifetime value indicators\n- Cross-selling and upselling opportunities",
      
      "inventoryManagement": "Provide inventory-focused insights using order and product data:\n- Identify fast-moving vs. slow-moving products\n- Predict inventory needs based on order patterns\n- Highlight stockout risks\n- Suggest reorder points and quantities\n- Analyze seasonal demand fluctuations"
    }
  }
}
```

### Performance Optimization Config

```json
{
  "contextBuilder": {
    "chunkSize": 2000,
    "overlap": 400,
    "maxDepth": 3,
    "relationshipLimit": 25
  },
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "contrag_vectors",
      "user": "postgres",
      "password": "your_password",
      "pool": {
        "max": 20,
        "min": 5,
        "idle": 10000
      },
      "indexing": {
        "lists": 100,
        "probes": 10
      }
    }
  }
}
```

This comprehensive guide should help you successfully integrate ContRAG with your existing MongoDB-based project, using Gemini for embeddings and pgvector for high-performance vector storage. The step-by-step approach ensures you can test and validate each component before moving to production.
