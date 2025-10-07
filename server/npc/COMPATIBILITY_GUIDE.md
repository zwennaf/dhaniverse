# ContRAG Compatibility Testing Guide

This guide covers the comprehensive compatibility testing and dimension management features added to ContRAG v1.2.0+.

## Overview

ContRAG now includes robust compatibility testing to help you identify and fix configuration issues, dimension mismatches, and connection problems before they break your RAG pipeline.

## Compatibility Testing Features

### 1. Comprehensive System Testing

```bash
# Run all compatibility tests
contrag compatibility test
```

This command tests:
- Database connectivity and schema access
- Vector store connectivity and configuration
- Embedder connectivity and model validation
- Dimension compatibility between embedder and vector store

### 2. Component-Specific Testing

```bash
# Test individual components
contrag compat test --database-only
contrag compat test --vector-store-only
contrag compat test --embedder-only
contrag compat test --dimensions-only
```

### 3. Configuration Validation

```bash
# Validate configuration schema
contrag compat validate-config
```

Checks for:
- Missing required configuration sections
- Invalid connection parameters
- Missing API keys for cloud services
- Dimension mismatches in configuration

## Dimension Compatibility

### The Problem

One of the most common issues in RAG setups is dimension mismatches between embedders and vector stores:

- **OpenAI text-embedding-ada-002**: 1536 dimensions
- **OpenAI text-embedding-3-small**: 1536 dimensions  
- **OpenAI text-embedding-3-large**: 3072 dimensions
- **Google Gemini text-embedding-004**: 768 dimensions
- **Sentence Transformers models**: Varies (384, 512, 768, 1024, etc.)

When your embedder produces 768-dimensional vectors but your vector store expects 1536 dimensions, your RAG pipeline will fail.

### Automatic Detection

```bash
contrag compat test --dimensions-only
```

This will show:
```
Dimension Compatibility: ✗ INCOMPATIBLE

Embedder dimensions: 768
Vector store dimensions: 1536
Auto-fix available: Yes

Recommendations:
  • Align dimensions: embedder=768, vector store=1536
  • Use "contrag compatibility fix-dimensions" command
```

### Automatic Fixing

```bash
contrag compat fix-dimensions
```

This command will:
1. Detect the current dimension mismatch
2. Use the embedder's dimensions as the target
3. Update the vector store configuration
4. Migrate existing data if needed
5. Verify the fix was successful

### Configuration-Based Prevention

Add compatibility settings to your `contrag.config.json`:

```json
{
  "compatibility": {
    "autoFixDimensions": true,
    "strictDimensionChecking": true,
    "allowDimensionMigration": true
  },
  "embedder": {
    "plugin": "gemini",
    "config": {
      "apiKey": "your-api-key",
      "model": "text-embedding-004",
      "dimensions": 768
    }
  },
  "vectorStore": {
    "plugin": "pgvector",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "your_db",
      "dimensions": 768
    }
  }
}
```

## SDK Integration

Use compatibility testing in your code:

```typescript
import { ContragSDK } from 'contrag';

const sdk = new ContragSDK(config);

// Test overall compatibility
const compatibility = await sdk.testCompatibility();
if (!compatibility.overall) {
  console.log('System incompatible:', compatibility.summary);
}

// Test dimension compatibility specifically
const dimensions = await sdk.testDimensionCompatibility();
if (!dimensions.compatible && dimensions.autoFixAvailable) {
  const result = await sdk.fixDimensions();
  console.log('Fix result:', result);
}

// Test individual components
const dbTest = await sdk.testDatabaseCompatibility();
const vectorTest = await sdk.testVectorStoreCompatibility();
const embedderTest = await sdk.testEmbedderCompatibility();
```

## Common Issues and Solutions

### 1. Dimension Mismatch

**Problem**: Different dimensions between embedder and vector store
**Detection**: `contrag compat test --dimensions-only`
**Solution**: `contrag compat fix-dimensions`

### 2. Missing API Keys

**Problem**: Cloud services require API keys
**Detection**: Configuration validation will flag missing keys
**Solution**: Add keys to configuration or environment variables

### 3. Connection Failures

**Problem**: Services unreachable or credentials invalid
**Detection**: Connection tests will fail
**Solution**: Check service status, credentials, and network connectivity

### 4. Schema Access Issues

**Problem**: Database permissions insufficient for schema introspection
**Detection**: Database compatibility test will flag permission issues
**Solution**: Grant necessary permissions or use service account

### 5. Model Validation Failures

**Problem**: Invalid model names or unsupported models
**Detection**: Embedder compatibility test validates models
**Solution**: Use supported model names from provider documentation

## Error Codes and Messages

### Compatibility Issue Types

- `dimension_mismatch`: Embedder and vector store dimensions don't match
- `resource_unavailable`: Service unreachable or credentials invalid
- `config_invalid`: Configuration parameters are incorrect
- `permission_denied`: Insufficient permissions for required operations

### Severity Levels

- `error`: Critical issues that prevent functionality
- `warning`: Issues that may cause problems but aren't blocking
- `info`: Informational notices about configuration

## Best Practices

### 1. Test Before Deployment

Always run compatibility tests before deploying your RAG system:

```bash
contrag compat test
```

### 2. Use Explicit Dimensions

Specify dimensions explicitly in your configuration to avoid inference issues:

```json
{
  "embedder": {
    "config": {
      "dimensions": 768
    }
  },
  "vectorStore": {
    "config": {
      "dimensions": 768
    }
  }
}
```

### 3. Enable Auto-fixing

For development environments, enable automatic dimension fixing:

```json
{
  "compatibility": {
    "autoFixDimensions": true
  }
}
```

### 4. Regular Health Checks

Run periodic compatibility checks in production:

```bash
# In your deployment pipeline
contrag compat test || exit 1
```

### 5. Monitor Configuration Changes

Validate configuration after any changes:

```bash
contrag compat validate-config
```

## Troubleshooting

### Auto-fix Not Available

If `contrag compat fix-dimensions` reports "Auto-fix not available":

1. Check if your vector store plugin supports dimension changes
2. Verify you have sufficient permissions
3. Consider manual configuration updates

### Persistent Dimension Issues

If dimension fixes don't persist:

1. Check if your vector store recreates tables/indexes
2. Verify configuration file permissions
3. Ensure no conflicting environment variables

### Performance Impact

Compatibility tests are designed to be lightweight:

- Connection tests use minimal queries
- Schema introspection is cached
- Dimension checks are fast lookups

For production, consider running full tests periodically rather than on every request.

## Migration from v1.1.0

If upgrading from v1.1.0:

1. No breaking changes to existing functionality
2. New compatibility features are opt-in
3. Existing configurations remain valid
4. Run `contrag compat test` to identify any issues

The compatibility system is backward-compatible and won't affect existing working setups.
