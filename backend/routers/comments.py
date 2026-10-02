from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, auth, database
from typing import List

router = APIRouter(tags=["comments"])

@router.post("/videos/{video_id}/comments", response_model=schemas.CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    video_id: int,
    comment: schemas.CommentCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    new_comment = models.Comment(
        content=comment.content,
        user_id=current_user.id,
        video_id=video_id
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return {
        **new_comment.__dict__,
        "user_name": current_user.name,
        "user_profile_picture": current_user.profile_picture
    }

@router.get("/videos/{video_id}/comments", response_model=List[schemas.CommentResponse])
def get_comments(video_id: int, db: Session = Depends(database.get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    comments = db.query(models.Comment).filter(models.Comment.video_id == video_id).order_by(models.Comment.created_at.desc()).all()
    
    result = []
    for comment in comments:
        user = db.query(models.User).filter(models.User.id == comment.user_id).first()
        comment_dict = {
            **comment.__dict__,
            "user_name": user.name if user else "Unknown",
            "user_profile_picture": user.profile_picture if user else None
        }
        result.append(comment_dict)
        
    return result
