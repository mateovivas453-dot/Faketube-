from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    profile_picture: str
    banner_url: Optional[str] = "default_banner.png"
    bio: Optional[str] = None
    created_at: datetime
    video_count: Optional[int] = 0

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = None

class VideoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    video_url: str
    thumbnail_url: str
    views: int
    is_short: int = 0
    user_id: int
    user_name: str
    user_profile_picture: Optional[str] = None
    likes_count: int = 0
    dislikes_count: int = 0
    user_like: int = 0
    comments_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    content: str
    user_id: int
    user_name: str
    user_profile_picture: Optional[str] = None
    video_id: int
    created_at: datetime

    class Config:
        from_attributes = True
