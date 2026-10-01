from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, claims, dashboard, items, matching, notifications
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="AI-Powered Intelligent Lost and Found System",
    description="Backend API for reporting, matching, and recovering lost and found items.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "lost-and-found-ai-backend"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    # Never leak stack traces to the client - log server-side instead.
    import logging

    logging.getLogger("uvicorn.error").exception("Unhandled exception on %s", request.url)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})


app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(matching.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(claims.router, prefix="/api")
