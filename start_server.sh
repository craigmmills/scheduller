#!/bin/bash

# Simple server startup script
echo "🤖 Starting LLM-Space Server..."

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    python3 server.py
elif command -v python &> /dev/null; then
    echo "✅ Python found"
    python server.py
else
    echo "❌ Python not found. Please install Python 3."
    exit 1
fi 