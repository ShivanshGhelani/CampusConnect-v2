"""
GraphQL Context Management for CampusConnect API v2
Handles authentication and request context for GraphQL operations
"""

from typing import Dict, Any, Optional
from fastapi import Request
import jwt
from datetime import datetime

def get_context(info) -> Dict[str, Any]:
    """
    Extract context from GraphQL info object
    Returns authentication and request data
    """
    try:
        # Get request from GraphQL context
        request: Request = info.context.get("request")
        
        if not request:
            return {}
        
        # Check for session-based authentication
        session_user = None
        if hasattr(request, 'session'):
            if 'admin' in request.session:
                session_user = {
                    **request.session['admin'],
                    'user_type': 'admin'
                }
            elif 'student' in request.session:
                session_user = {
                    **request.session['student'],
                    'user_type': 'student'
                }
            elif 'faculty' in request.session:
                session_user = {
                    **request.session['faculty'],
                    'user_type': 'faculty'
                }
        
        # Check for token-based authentication
        token_user = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                # Decode JWT token (implement based on your JWT setup)
                payload = jwt.decode(token, verify=False)  # Use proper secret in production
                token_user = payload.get('user')
            except jwt.InvalidTokenError:
                pass
        
        # Return context with user information
        return {
            'request': request,
            'user': session_user or token_user,
            'headers': dict(request.headers),
            'client_ip': request.client.host if request.client else None,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Error getting GraphQL context: {e}")
        return {}

def require_auth(context: Dict[str, Any], user_types: Optional[list] = None) -> bool:
    """
    Check if user is authenticated and has required user type
    """
    user = context.get('user')
    if not user:
        return False
    
    if user_types and user.get('user_type') not in user_types:
        return False
    
    return True

def require_admin(context: Dict[str, Any], min_role: str = None) -> bool:
    """
    Check if user is admin with minimum role
    """
    user = context.get('user')
    if not user or user.get('user_type') != 'admin':
        return False
    
    if min_role:
        role_hierarchy = {
            'organizer_admin': 1,
            'executive_admin': 2,
            'super_admin': 3
        }
        
        user_role_level = role_hierarchy.get(user.get('role'), 0)
        min_role_level = role_hierarchy.get(min_role, 0)
        
        return user_role_level >= min_role_level
    
    return True

def get_user_from_context(context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract user information from context
    """
    return context.get('user')

def create_graphql_context(request: Request) -> Dict[str, Any]:
    """
    Create GraphQL context from FastAPI request
    """
    return {
        'request': request
    }
