import asyncio
from main import app

# For Vercel, we need to ensure the app is properly wrapped
# Try without Mangum first - Vercel might handle ASGI directly
def handler(event, context):
    """
    Vercel handler that wraps the FastAPI app
    """
    # Import mangum only when needed
    from mangum import Mangum
    
    # Create mangum instance for this request
    mangum_handler = Mangum(app, lifespan="off")
    
    # Call the handler
    return mangum_handler(event, context)

# Also export the app directly for Vercel's automatic detection
application = app