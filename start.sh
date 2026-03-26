#!/bin/bash
# Clean start script for The Loom — Supply Chain
# Usage: ./start.sh

PORT=3002

echo "🧹 Cleaning stale cache..."
rm -rf .next

echo "🔪 Killing any process on port $PORT..."
lsof -ti :$PORT | xargs kill -9 2>/dev/null
sleep 1

echo "🐳 Ensuring database is running..."
docker compose up db -d 2>/dev/null

echo "🚀 Starting dev server on http://localhost:$PORT"
echo ""
npm run dev -- -p $PORT
