"""
Fitness Buddy — WSGI entry point for IBM Cloud / production deployment.
Used by Gunicorn: gunicorn -b 0.0.0.0:$PORT wsgi:app
"""
from app import app

if __name__ == "__main__":
    app.run()
