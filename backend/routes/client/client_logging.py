"""
Utility functions to standardize logging across client routes.

These functions help ensure consistent error handling and logging
throughout the client routes module.
"""

import logging
from fastapi import Request
from fastapi.templating import Jinja2Templates
from typing import Dict, Any, Optional

# Get logger for client routes
logger = logging.getLogger('routes.client')

# Configure templates
templates = Jinja2Templates(directory="templates")

def log_route_error(route_name: str, error: Exception, details: Optional[Dict[str, Any]] = None) -> None:
    """
    Log an error that occurred in a client route.
    
    Args:
        route_name: Name of the route where the error occurred
        error: The exception that was caught
        details: Additional details about the context of the error
    """
    error_msg = f"Error in client {route_name}: {str(error)}"
    
    if details:
        context_info = ', '.join([f"{k}={v}" for k, v in details.items()])
        error_msg += f" (Context: {context_info})"
        
    logger.error(error_msg, exc_info=True)

def handle_route_exception(
    request: Request, 
    error: Exception, 
    route_name: str, 
    template_path: str, 
    context: Dict[str, Any]
):
    """
    Handle an exception in a client route with standardized logging and response.
    
    Args:
        request: The FastAPI request object
        error: The exception that was caught
        route_name: Name of the route where the error occurred
        template_path: Path to the template to render
        context: Context for the template response
        
    Returns:
        TemplateResponse with appropriate error information
    """
    # Log the error
    log_route_error(route_name, error)
    
    # Add error to context
    context.update({
        "request": request,
        "error": str(error)
    })
    
    # Return response with error information
    return templates.TemplateResponse(template_path, context)
