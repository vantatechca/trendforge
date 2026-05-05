"""
Dummy HTTP server para masayahin si Render free tier.

Render free tier requires a "web service" na may HTTP listener. Pero ang Celery
worker at beat hindi naman HTTP servers. Para ma-deploy natin sila as web
services (kasi yan lang ang free), pinapagsabay natin ito sa Celery process.

Ginagamit ang /health endpoint din ng external pinger (cron-job.org) to keep
the service awake.
"""

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"service": "trendforge-celery-companion", "status": "alive"}


@app.get("/health")
def health():
    return {"status": "ok"}