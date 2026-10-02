from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import engine, Base
from routers import users, videos, comments, subscriptions

# Create tables
Base.metadata.create_all(bind=engine)

# Create upload directories
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
VIDEOS_DIR = os.path.join(UPLOAD_DIR, "videos")
THUMBNAILS_DIR = os.path.join(UPLOAD_DIR, "thumbnails")
PROFILES_DIR = os.path.join(UPLOAD_DIR, "profiles")
BANNERS_DIR = os.path.join(UPLOAD_DIR, "banners")

os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(THUMBNAILS_DIR, exist_ok=True)
os.makedirs(PROFILES_DIR, exist_ok=True)
os.makedirs(BANNERS_DIR, exist_ok=True)

app = FastAPI(title="YouTube Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(users.router)
app.include_router(videos.router)
app.include_router(comments.router)
app.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])

@app.get("/")
def read_root():
    return {"message": "YouTube Clone API"}
