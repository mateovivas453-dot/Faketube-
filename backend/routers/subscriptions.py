from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, auth, database
from typing import List
from datetime import datetime, timezone

router = APIRouter(tags=["subscriptions"])

@router.post("/{channel_id}", status_code=status.HTTP_201_CREATED)
def subscribe(
    channel_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if current_user.id == channel_id:
        raise HTTPException(status_code=400, detail="You cannot subscribe to yourself")

    existing = db.query(models.Subscription).filter(
        models.Subscription.subscriber_id == current_user.id,
        models.Subscription.channel_id == channel_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed")

    new_sub = models.Subscription(subscriber_id=current_user.id, channel_id=channel_id)
    db.add(new_sub)
    db.commit()
    return {"message": "Subscribed successfully"}

@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    channel_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    sub = db.query(models.Subscription).filter(
        models.Subscription.subscriber_id == current_user.id,
        models.Subscription.channel_id == channel_id
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(sub)
    db.commit()
    return None

@router.get("/me", response_model=List[schemas.UserResponse])
def get_my_subscriptions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    subs = db.query(models.Subscription).filter(
        models.Subscription.subscriber_id == current_user.id
    ).all()

    result = []
    for sub in subs:
        channel = db.query(models.User).filter(models.User.id == sub.channel_id).first()
        if channel:
            video_count = db.query(models.Video).filter(models.Video.user_id == channel.id).count()
            result.append({
                "id": channel.id,
                "name": channel.name,
                "email": channel.email,
                "profile_picture": channel.profile_picture,
                "banner_url": channel.banner_url,
                "bio": channel.bio,
                "created_at": channel.created_at,
                "video_count": video_count
            })
    return result
