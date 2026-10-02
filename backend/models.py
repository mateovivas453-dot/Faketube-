from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    profile_picture = Column(String, default="default_profile.png")
    banner_url = Column(String, default="default_banner.png")
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    videos = relationship("Video", back_populates="owner")
    comments = relationship("Comment", back_populates="user")
    subscriptions = relationship("Subscription", foreign_keys="[Subscription.subscriber_id]", back_populates="subscriber")
    subscribers = relationship("Subscription", foreign_keys="[Subscription.channel_id]", back_populates="channel")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    video_url = Column(String)
    thumbnail_url = Column(String)
    views = Column(Integer, default=0)
    is_short = Column(Integer, default=0) # 0 = Regular, 1 = Short
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="videos")
    comments = relationship("Comment", back_populates="video", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="video", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="comments")
    video = relationship("Video", back_populates="comments")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    is_like = Column(Integer, default=1) # 1 = Like, -1 = Dislike
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    video = relationship("Video", back_populates="likes")

    __table_args__ = (
        UniqueConstraint('user_id', 'video_id', name='uix_user_video'),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    subscriber_id = Column(Integer, ForeignKey("users.id"))
    channel_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    subscriber = relationship("User", foreign_keys=[subscriber_id], back_populates="subscriptions")
    channel = relationship("User", foreign_keys=[channel_id], back_populates="subscribers")

    __table_args__ = (
        UniqueConstraint('subscriber_id', 'channel_id', name='uix_sub_channel'),
    )

