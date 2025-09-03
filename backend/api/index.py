"""
Vercel entrypoint for FastAPI backend.
Exposes the FastAPI ASGI app to Vercel's Python runtime.
"""

import os
import sys

# Ensure repository root is on PYTHONPATH
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.main import app  # ASGI callable expected by Vercel
