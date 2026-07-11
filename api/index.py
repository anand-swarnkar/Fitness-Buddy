"""
Vercel serverless entry point for Fitness Buddy.
Vercel's @vercel/python runtime expects an `app` (WSGI callable) in this file.
"""
import sys
import os

# Make the project root importable so `from config.agent_instructions import ...` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: F401  — Vercel picks up `app` as the WSGI handler
