import React from 'react';
import { Link } from 'react-router-dom';
import { formatViews, formatDate, getInitial, getAvatarColor } from '../utils/format';
import './VideoCard.css';

const getProfilePictureUrl = (picture) => {
  if (!picture || picture === 'default_profile.png') return null;
  if (/^https?:\/\//i.test(picture)) return picture;
  return `http://localhost:8000/${picture.replace(/^\/+/, '')}`;
};

const VideoCard = ({ video }) => {
  const channelName = video.user_name || video.user?.name || 'Unknown Channel';
  const profilePictureUrl = getProfilePictureUrl(video.user_profile_picture || video.user?.profile_picture);

  return (
    <Link to={`/video/${video.id}`} className="video-card">
      <div className="thumbnail-container">
        <img 
          src={`http://localhost:8000${video.thumbnail_url}`} 
          alt={video.title} 
          className="thumbnail-img"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/640x360.png?text=No+Thumbnail'; }}
        />
      </div>
      <div className="video-info">
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt={channelName}
            className="channel-avatar"
            style={{ objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div 
          className="channel-avatar" 
          style={{
            backgroundColor: getAvatarColor(channelName),
            display: profilePictureUrl ? 'none' : 'flex'
          }}
        >
          {getInitial(channelName)}
        </div>
        <div className="video-text">
          <h3 className="video-title" title={video.title}>{video.title}</h3>
          <div className="channel-name">{channelName}</div>
          <div className="video-stats">
            {formatViews(video.views)} views • {formatDate(video.created_at)}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
