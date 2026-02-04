#!/usr/bin/env bash
# Render Build Script for CampusConnect Backend

set -e  # Exit on error

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "🎭 Installing Playwright browsers (Chromium + Headless Shell)..."
# Playwright 1.49+ uses headless shell by default for headless=True
# Must install both chromium and chromium-headless-shell
playwright install chromium
playwright install chromium-headless-shell

echo "✅ Build complete!"
