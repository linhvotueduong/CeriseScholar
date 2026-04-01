#!/bin/bash
# Cerise Scholar — Quick Start Script
# Run this to start the app: ./start.sh

echo "Starting Cerise Scholar..."
echo "Open http://localhost:3000 in your browser"
echo "Press Ctrl+C to stop"
echo ""

npx next dev --port 3000 --hostname 0.0.0.0
