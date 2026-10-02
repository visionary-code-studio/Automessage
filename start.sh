#!/bin/bash
set -e

echo "=================================================="
echo "🚀 Starting AutoMessage Unified Backend Services"
echo "=================================================="

# Start WhatsApp Baileys bridge in the background
echo "[1/2] Starting WhatsApp Web Bridge daemon on port 3001..."
cd /app/whatsapp_bridge
node server.js &
BRIDGE_PID=$!
cd /app

# Give bridge 2 seconds to initialize its socket
sleep 2

# Ensure port fallback
PORT=${PORT:-8000}
echo "[2/2] Starting FastAPI server on port $PORT..."

# Trap signals for graceful shutdown
trap "kill -TERM $BRIDGE_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM

exec python -m uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
