#!/usr/bin/env bash
# Render Build Script for CampusConnect Backend

set -e  # Exit on error

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🎭 Installing Playwright Chromium browser..."
# Only install regular chromium - we use headless="new" mode which uses 
# the regular chromium binary with --headless=new flag (not headless_shell)
playwright install chromium

echo "✅ Build complete!"
