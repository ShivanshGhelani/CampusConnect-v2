#!/usr/bin/env bash
# Render Build Script for CampusConnect Backend

set -e  # Exit on error

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🎭 Installing Playwright Chromium browser..."
playwright install chromium --with-deps

echo "✅ Build complete!"
