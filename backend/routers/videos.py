from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import models, schemas, auth, database
from typing import List, Optional
import os
import uuid
import aiofiles
from sqlalchemy import func

router = APIRouter(tags=["videos"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
VIDEOS_DIR = os.path.join(UPLOAD_DIR, "videos")
THUMBNAILS_DIR = os.path.join(UPLOAD_DIR, "thumbnails")


def serialize_video(video, user, db, current_user_id: Optional[int] = None):
    likes_count = db.query(models.Like).filter(
        models.Like.video_id == video.id,
        models.Like.is_like == 1
    ).count()
    dislikes_count = db.query(models.Like).filter(
        models.Like.video_id == video.id,
        models.Like.is_like == -1
    ).count()
    comments_count = db.query(models.Comment).filter(
        models.Comment.video_id == video.id
    ).count()

    user_like = 0
    if current_user_id is not None:
        like = db.query(models.Like).filter(
            models.Like.video_id == video.id,
            models.Like.user_id == current_user_id
        ).first()
        user_like = like.is_like if like else 0

    return {
        **video.__dict__,
        "user_name": user.name if user else "Unknown",
        "user_profile_picture": user.profile_picture if user else None,
        "likes_count": likes_count,
        "dislikes_count": dislikes_count,
        "user_like": user_like,
        "comments_count": comments_count,
    }

@router.post("/videos", response_model=schemas.VideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    title: str = Form(...),
    description: str = Form(""),
    video_file: UploadFile = File(...),
    thumbnail_file: UploadFile = File(...),
    is_short: bool = Form(False),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if not video_file.filename.endswith('.mp4'):
        raise HTTPException(status_code=400, detail="Only .mp4 videos are allowed")
    
    valid_thumb_exts = ('.jpg', '.jpeg', '.png')
    if not thumbnail_file.filename.lower().endswith(valid_thumb_exts):
        raise HTTPException(status_code=400, detail="Only .jpg, .jpeg, .png thumbnails are allowed")

    video_ext = os.path.splitext(video_file.filename)[1]
    thumb_ext = os.path.splitext(thumbnail_file.filename)[1]
    
    video_id_str = str(uuid.uuid4())
    video_filename = f"{video_id_str}{video_ext}"
    thumb_filename = f"{video_id_str}_thumb{thumb_ext}"
    
    video_path = os.path.join(VIDEOS_DIR, video_filename)
    thumb_path = os.path.join(THUMBNAILS_DIR, thumb_filename)
    
    async with aiofiles.open(video_path, 'wb') as out_file:
        content = await video_file.read()
        await out_file.write(content)
        
    async with aiofiles.open(thumb_path, 'wb') as out_file:
        content = await thumbnail_file.read()
        await out_file.write(content)

    new_video = models.Video(
        title=title,
        description=description,
        video_url=f"/uploads/videos/{video_filename}",
        thumbnail_url=f"/uploads/thumbnails/{thumb_filename}",
        user_id=current_user.id,
        is_short=1 if is_short else 0
    )
    
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    return serialize_video(new_video, current_user, db, current_user.id)

@router.get("/videos", response_model=List[schemas.VideoResponse])
def get_videos(search: Optional[str] = None, user_id: Optional[int] = None, trending: bool = False, db: Session = Depends(database.get_db)):
    query = db.query(models.Video)
    if search:
        query = query.filter(models.Video.title.ilike(f"%{search}%"))
    if user_id:
        query = query.filter(models.Video.user_id == user_id)

    if trending:
        query = query.filter(models.Video.is_short == 0)
        query = query.order_by(models.Video.views.desc())
    else:
        query = query.order_by(models.Video.created_at.desc())

    videos = query.all()
    result = []
    for video in videos:
        user = db.query(models.User).filter(models.User.id == video.user_id).first()
        result.append(serialize_video(video, user, db))
    return result


@router.get("/videos/{video_id:int}", response_model=schemas.VideoResponse)
def get_video(video_id: int, db: Session = Depends(database.get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    video.views += 1
    db.commit()
    db.refresh(video)
    
    user = db.query(models.User).filter(models.User.id == video.user_id).first()
    return serialize_video(video, user, db)

@router.put("/videos/{video_id}", response_model=schemas.VideoResponse)
def update_video(
    video_id: int,
    video_update: schemas.VideoUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this video")
        
    if video_update.title is not None:
        video.title = video_update.title
    if video_update.description is not None:
        video.description = video_update.description
        
    db.commit()
    db.refresh(video)
    
    return serialize_video(video, current_user, db, current_user.id)

@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")
        
    # Delete files
    video_path = os.path.join(".", video.video_url.lstrip("/"))
    thumb_path = os.path.join(".", video.thumbnail_url.lstrip("/"))
    
    try:
        if os.path.exists(video_path):
            os.remove(video_path)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
    except Exception as e:
        pass # Handle if files are already missing or permission denied
        
    db.delete(video)
    db.commit()
    return None

@router.get("/videos/{video_id}/recommended", response_model=List[schemas.VideoResponse])
def get_recommended_videos(video_id: int, db: Session = Depends(database.get_db)):
    videos = db.query(models.Video).filter(
        models.Video.id != video_id,
        models.Video.is_short == 0
    ).order_by(func.random()).limit(10).all()
    result = []
    for video in videos:
        user = db.query(models.User).filter(models.User.id == video.user_id).first()
        result.append(serialize_video(video, user, db))
    return result

@router.get("/videos/shorts", response_model=List[schemas.VideoResponse])
def get_shorts(
    db: Session = Depends(database.get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_user)
):
    videos = db.query(models.Video).filter(models.Video.is_short == 1).order_by(models.Video.created_at.desc()).all()
    result = []
    for video in videos:
        user = db.query(models.User).filter(models.User.id == video.user_id).first()
        result.append(serialize_video(video, user, db, current_user.id if current_user else None))
    return result

@router.post("/videos/{video_id}/like", response_model=schemas.VideoResponse)
async def toggle_like(
    video_id: int,
    reaction: str = 'like',
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    target = 1 if reaction == 'like' else -1
    if reaction not in {'like', 'dislike'}:
        raise HTTPException(status_code=400, detail='Reaction must be like or dislike')

    like = db.query(models.Like).filter(
        models.Like.user_id == current_user.id,
        models.Like.video_id == video_id
    ).first()

    if like:
        if like.is_like == target:
            db.delete(like)
        else:
            like.is_like = target
        db.commit()
    else:
        new_like = models.Like(user_id=current_user.id, video_id=video_id, is_like=target)
        db.add(new_like)
        db.commit()

    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    user = db.query(models.User).filter(models.User.id == video.user_id).first()
    return serialize_video(video, user, db, current_user.id)

