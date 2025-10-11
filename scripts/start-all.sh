#!/bin/bash

# Start all services for Real Estate Dashboard

echo "🚀 Starting Real Estate Dashboard..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start Backend Server
echo "📡 Starting Backend Server (port 3001)..."
node server/index.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start MCP Refty Server
echo "🤖 Starting MCP Refty Server (port 3002)..."
node server/mcp-refty-server.js &
MCP_PID=$!

# Wait for MCP to start
sleep 2

# Start Next.js Frontend
echo "🎨 Starting Frontend (port 3000)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "📡 API: http://localhost:3001"
echo "🤖 MCP Refty: http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all processes
wait

