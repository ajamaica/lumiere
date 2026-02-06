"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routes import agents, email, health

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Unlimited email for AI agents. No verification, no limits.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware (allow all origins for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(email.router, prefix="/agents", tags=["Email"])


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "status": "running"
    }
