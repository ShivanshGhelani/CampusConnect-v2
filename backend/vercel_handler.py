"""
Vercel-specific handler for FastAPI application.
This file serves as the entry point for Vercel deployments.
"""

from main import app
from mangum import Mangum

# Create the Mangum handler for Vercel
# Use lifespan="off" to disable startup/shutdown events in serverless
handler = Mangum(app, lifespan="off")

# Export for Vercel
__all__ = ['handler']