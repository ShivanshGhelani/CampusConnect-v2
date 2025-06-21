#!/bin/bash

# Script to help set up environment variables for external access
# Run this script when you want to access the app via --host or ngrok

echo "CampusConnect External Access Setup"
echo "===================================="

# Get the current external IP or ngrok URL
echo ""
echo "Please choose how you're accessing the app:"
echo "1. Local network (--host)"
echo "2. ngrok tunnel"
echo ""
read -p "Enter your choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    # Get local IP
    echo ""
    echo "Getting your local IP address..."
    if command -v ipconfig >/dev/null 2>&1; then
        # Windows
        LOCAL_IP=$(ipconfig | grep "IPv4 Address" | grep -v "127.0.0.1" | head -1 | cut -d: -f2 | xargs)
    elif command -v ifconfig >/dev/null 2>&1; then
        # macOS/Linux
        LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    else
        # Fallback
        LOCAL_IP="192.168.1.100"
        echo "Could not detect IP automatically. Using default: $LOCAL_IP"
        echo "Please update manually if this is incorrect."
    fi
    
    API_URL="http://$LOCAL_IP:8000"
    echo "Local IP detected: $LOCAL_IP"
    
elif [ "$choice" = "2" ]; then
    echo ""
    read -p "Enter your ngrok URL (e.g., https://abc123.ngrok-free.app): " NGROK_URL
    API_URL="$NGROK_URL"
    
    # Validate ngrok URL format
    if [[ ! $NGROK_URL =~ ^https://.*\.ngrok.*\.app$ ]] && [[ ! $NGROK_URL =~ ^https://.*\.ngrok\.io$ ]]; then
        echo "Warning: URL format doesn't look like a typical ngrok URL"
        echo "Expected format: https://something.ngrok-free.app or https://something.ngrok.io"
    fi
else
    echo "Invalid choice. Exiting."
    exit 1
fi

echo ""
echo "Setting up environment variables..."

# Update the .env file
cd "$(dirname "$0")/frontend"

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "Backed up existing .env file"
fi

# Update or add the API URL
if grep -q "VITE_API_BASE_URL" .env; then
    # Update existing line
    sed -i.bak "s|VITE_API_BASE_URL=.*|VITE_API_BASE_URL=$API_URL|" .env
    echo "Updated VITE_API_BASE_URL in .env"
else
    # Add new line
    echo "" >> .env
    echo "VITE_API_BASE_URL=$API_URL" >> .env
    echo "Added VITE_API_BASE_URL to .env"
fi

echo ""
echo "Configuration complete!"
echo "API Base URL set to: $API_URL"
echo ""
echo "Next steps:"
echo "1. Restart your frontend development server"
echo "2. Make sure your backend is running and accessible"
if [ "$choice" = "1" ]; then
    echo "3. Start frontend with: npm run dev -- --host"
    echo "4. Access the app at: http://$LOCAL_IP:5173"
elif [ "$choice" = "2" ]; then
    echo "3. Make sure ngrok is also tunneling your backend (port 8000)"
    echo "4. Access the app through your ngrok URL"
fi
echo ""
echo "If you still have login issues, check:"
echo "- Backend CORS configuration includes your URL"
echo "- Both frontend and backend are accessible from external network"
echo "- Firewall settings allow the connections"
