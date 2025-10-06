#!/bin/bash

# Maya RAG Server Setup Script

echo "🚀 Setting up Maya RAG Server..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Maya server directory"
    exit 1
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully!"

# Check if Docker is running
echo "🐳 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL with pgvector
echo "🚀 Starting PostgreSQL with pgvector extension..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start PostgreSQL"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec maya-postgres-1 pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start within 30 seconds"
        exit 1
    fi
    
    sleep 1
done

# Enable pgvector extension
echo "🔧 Enabling pgvector extension..."
docker exec maya-postgres-1 psql -U postgres -d dhaniverse_vector -c "CREATE EXTENSION IF NOT EXISTS vector;" > /dev/null 2>&1

# Check environment variables
echo "🔧 Checking configuration..."
if [ -z "$GEMINI_API_KEY" ] && ! grep -q "your-gemini-api-key-here" .env; then
    echo "⚠️  Warning: Gemini API key not set in .env file"
    echo "   Please edit .env and add your Gemini API key before running the server"
fi

# Build the TypeScript project
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "⚠️  Build had some warnings, but continuing..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your Gemini API key"
echo "2. Run 'npm run introspect' to analyze your MongoDB schema"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Open test-client.html in your browser to test the chat"
echo ""
echo "API will be available at: http://localhost:3001"
echo "WebSocket will be available at: ws://localhost:8081"
echo "PostgreSQL with pgvector is running at: localhost:5432"
