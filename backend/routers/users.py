from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import models, schemas, auth, database
from typing import Optional
from datetime import timedelta
import os
import uuid
import aiofiles

router = APIRouter(tags=["users"])

@router.post("/users", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.LoginResponse)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    video_count = db.query(models.Video).filter(models.Video.user_id == user.id).count()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_picture": user.profile_picture,
            "created_at": user.created_at,
            "video_count": video_count
        }
    }

@router.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    video_count = db.query(models.Video).filter(models.Video.user_id == current_user.id).count()
    user_dict = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "profile_picture": current_user.profile_picture,
        "created_at": current_user.created_at,
        "video_count": video_count
    }
    return user_dict

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    video_count = db.query(models.Video).filter(models.Video.user_id == user_id).count()
    user_dict = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "profile_picture": user.profile_picture,
        "banner_url": user.banner_url,
        "bio": user.bio,
        "created_at": user.created_at,
        "video_count": video_count
    }
    return user_dict

@router.patch("/users/me", response_model=schemas.UserResponse)
async def update_user_me(
    name: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    profile_picture: Optional[UploadFile] = File(None),
    banner: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if name:
        current_user.name = name
    if bio is not None:
        current_user.bio = bio

    # Manejo de Foto de Perfil
    if profile_picture:
        ext = os.path.splitext(profile_picture.filename)[1]
        filename = f"profile_{uuid.uuid4()}{ext}"
        upload_path = os.path.join("./uploads", "profiles", filename)
        os.makedirs(os.path.dirname(upload_path), exist_ok=True)
        async with aiofiles.open(upload_path, 'wb') as f:
            await f.write(await profile_picture.read())
        current_user.profile_picture = f"/uploads/profiles/{filename}"

    # Manejo de Banner
    if banner:
        ext = os.path.splitext(banner.filename)[1]
        filename = f"banner_{uuid.uuid4()}{ext}"
        upload_path = os.path.join("./uploads", "banners", filename)
        os.makedirs(os.path.dirname(upload_path), exist_ok=True)
        async with aiofiles.open(upload_path, 'wb') as f:
            await f.write(await banner.read())
        current_user.banner_url = f"/uploads/banners/{filename}"

    db.commit()
    db.refresh(current_user)

    video_count = db.query(models.Video).filter(models.Video.user_id == current_user.id).count()
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "profile_picture": current_user.profile_picture,
        "banner_url": current_user.banner_url,
        "bio": current_user.bio,
        "created_at": current_user.created_at,
        "video_count": video_count
    }

