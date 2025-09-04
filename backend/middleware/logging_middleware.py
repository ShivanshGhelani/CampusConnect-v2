# backend/middleware/logging_middleware.py
import time
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000  # ms

        # logger.info(
        #     f"{request.method} {request.url.path} "
        #     f"completed_in={process_time:.2f}ms "
        #     f"status={response.status_code}"
        # )
        return response
