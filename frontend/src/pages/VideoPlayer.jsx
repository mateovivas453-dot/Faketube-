import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaThumbsUp, FaShare } from 'react-icons/fa';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { formatViews, formatDate, getInitial, getAvatarColor } from '../utils/format';
import VideoCard from '../components/VideoCard';
import { t } from '../utils/translations';
import './VideoPlayer.css';

const getMediaUrl = (path) => {
  if (!path || path === 'default_profile.png') return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`;
};

const VideoPlayer = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [video, setVideo] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const fetchVideoData = async () => {
      setLoading(true);
      setError('');
      try {
        const [videoRes, recRes, commentsRes] = await Promise.all([
          api.get(`/videos/${id}`),
          api.get(`/videos/${id}/recommended`).catch(() => ({ data: [] })),
          api.get(`/videos/${id}/comments`).catch(() => ({ data: [] }))
        ]);
        setVideo(videoRes.data);
        setRecommended(recRes.data);
        setComments(commentsRes.data);

        // Check if currently subscribed
        if (user) {
          try {
            const subRes = await api.get('/subscriptions/me');
            setIsSubscribed(subRes.data.some(s => s.id === videoRes.data.user_id));
          } catch (e) { console.error("Error checking subscription"); }
        }
      } catch (err) {
        setError(t("Video not found or error loading video."));
      }
      setLoading(false);
    };

    fetchVideoData();
    window.scrollTo(0, 0);
  }, [id, user]);

  useEffect(() => {
    if (!loading && window.location.hash === '#comments-section') {
      document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, comments.length]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/videos/${id}/comments`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch (err) {
      alert(t("Failed to post comment"));
    }
    setSubmittingComment(false);
  };

  const handleLike = async (reaction) => {
    if (!user) return alert(t("Sign in") + " to like this video");
    try {
      const res = await api.post(`/videos/${id}/like`, null, { params: { reaction } });
      setVideo(res.data);
    } catch (err) {
      alert(t("Error processing like"));
    }
  };

  const handleSubscribe = async () => {
    if (!user) return alert(t("Sign in") + " to subscribe");
    try {
      if (isSubscribed) {
        await api.delete(`/subscriptions/${video.user_id}`);
        setIsSubscribed(false);
      } else {
        await api.post(`/subscriptions/${video.user_id}`);
        setIsSubscribed(true);
      }
    } catch (err) {
      alert(t("Error processing subscription"));
    }
  };

  if (loading) return <div className="video-player-loading">{t("Loading...")}</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!video) return null;

  const channelName = video.user_name || 'Unknown Channel';
  const channelAvatarUrl = getMediaUrl(video.user_profile_picture || video.user?.profile_picture);
  const liked = Number(video.user_like) === 1;
  const disliked = Number(video.user_like) === -1;

  return (
    <div className="video-page-container">
      <div className="video-primary">
        <div className="video-player-wrapper">
          <video
            src={`http://localhost:8000${video.video_url}`}
            poster={`http://localhost:8000${video.thumbnail_url}`}
            controls
            autoPlay
            className="html5-video-player"
          />
        </div>

        <h1 className="video-page-title">{video.title}</h1>

        <div className="video-info-bar">
          <div className="video-channel-info">
            <Link to={`/profile/${video.user_id}`} className="channel-avatar-link">
              {channelAvatarUrl ? (
                <img
                  src={channelAvatarUrl}
                  alt={channelName}
                  className="channel-avatar-large"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="channel-avatar-large"
                  style={{ backgroundColor: getAvatarColor(channelName) }}
                >
                  {getInitial(channelName)}
                </div>
              )}
            </Link>
            <div className="channel-text">
              <Link to={`/profile/${video.user_id}`} className="channel-name-link">
                <h2>{channelName}</h2>
              </Link>
            </div>
            <button
              className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
              onClick={handleSubscribe}
            >
              {isSubscribed ? t("Subscribed") : t("Subscribe")}
            </button>
          </div>

          <div className="video-actions">
            <div className="action-group">
              <button className={`action-btn like-btn ${liked ? 'active' : ''}`} onClick={() => handleLike('like')}>
                <FaThumbsUp /> <span>{video.likes_count ?? 0}</span>
              </button>
              <div className="action-divider"></div>
              <button className={`action-btn dislike-btn ${disliked ? 'active' : ''}`} onClick={() => handleLike('dislike')}>
                <FaThumbsUp style={{ transform: 'rotate(180deg)' }} />
                <span>{video.dislikes_count ?? 0}</span>
              </button>
            </div>
            <button className="action-btn share-btn">
              <FaShare /> <span>{t("Share")}</span>
            </button>
          </div>
        </div>

        <div className="video-description-box" onClick={() => setShowFullDesc(!showFullDesc)}>
          <div className="description-stats">
            {formatViews(video.views)} {t("Views")}  •  {formatDate(video.created_at)}
          </div>
          <div className={`description-content ${showFullDesc ? 'expanded' : 'collapsed'}`}>
            {video.description || t("No description provided.")}
          </div>
          <button className="show-more-btn">
            {showFullDesc ? t("Show less") : '...more'}
          </button>
        </div>

        <div className="comments-section" id="comments-section">
          <h3>{comments.length} {t(comments.length === 1 ? "Comment" : "Comments")}</h3>
          {user ? (
            <form className="add-comment" onSubmit={handleAddComment}>
              {getMediaUrl(user.profile_picture) ? (
                <img
                  src={getMediaUrl(user.profile_picture)}
                  alt={user.name}
                  className="comment-avatar"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="comment-avatar"
                  style={{ backgroundColor: getAvatarColor(user.name) }}
                >
                  {getInitial(user.name)}
                </div>
              )}
              <div className="comment-input-wrapper">
                <input
                  type="text"
                  placeholder={t("Add a comment...")}
                  className="comment-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                {newComment.trim() && (
                  <div className="comment-buttons">
                    <button type="button" className="cancel-comment-btn" onClick={() => setNewComment('')}>{t("Cancel")}</button>
                    <button type="submit" className="submit-comment-btn" disabled={submittingComment}>
                      {submittingComment ? t("Posting...") : t("Post")}
                    </button>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <p className="sign-in-prompt"><Link to="/login">{t("Sign in")}</Link> {t("to add a comment")}</p>
          )}
          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                {getMediaUrl(comment.user_profile_picture) ? (
                  <img
                    src={getMediaUrl(comment.user_profile_picture)}
                    alt={comment.user_name}
                    className="comment-avatar"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="comment-avatar"
                    style={{ backgroundColor: getAvatarColor(comment.user_name) }}
                  >
                    {getInitial(comment.user_name)}
                  </div>
                )}
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author">@{comment.user_name}</span>
                    <span className="comment-time">{formatDate(comment.created_at)}</span>
                  </div>
                  <div className="comment-text">{comment.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="video-secondary">
        <h3 className="recommended-title">{t("Recommended")}</h3>
        <div className="recommended-list">
          {recommended.length > 0 ? (
            recommended.map(rec => (
              <VideoCard key={rec.id} video={rec} />
            ))
          ) : (
            <p className="no-recommended">{t("No recommended videos")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
