"""
GraphQL API v2 Router for CampusConnect
FastAPI integration with Strawberry GraphQL
"""

from fastapi import APIRouter, Request, Depends
from strawberry.fastapi import GraphQLRouter
from api.v2.resolvers import schema
from api.v2.context import create_graphql_context

def get_graphql_context(request: Request):
    """Dependency to create GraphQL context"""
    return create_graphql_context(request)

# Create GraphQL router
graphql_router = GraphQLRouter(
    schema=schema,
    context_getter=get_graphql_context,
    graphiql=True  # Enable GraphiQL interface for development
)

# Create FastAPI router for v2 API
router = APIRouter(prefix="/api/v2", tags=["GraphQL API v2"])

# Mount GraphQL router
router.include_router(graphql_router, prefix="/graphql")

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for GraphQL API v2"""
    return {
        "status": "healthy",
        "api_version": "v2",
        "graphql_endpoint": "/api/v2/graphql",
        "graphiql_endpoint": "/api/v2/graphql",
        "schema_version": "1.0.0"
    }

# Schema introspection endpoint
@router.get("/schema")
async def get_schema():
    """Get GraphQL schema definition"""
    return {
        "schema": str(schema),
        "version": "1.0.0",
        "endpoints": {
            "graphql": "/api/v2/graphql",
            "graphiql": "/api/v2/graphql",
            "health": "/api/v2/health"
        }
    }
