import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaComment, FaHeart, FaShare, FaSortAmountDown, FaTimes } from 'react-icons/fa';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { t } from '../utils/translations';
import { formatDate, formatViews, getInitial, getAvatarColor } from '../utils/format';
import './Shorts.css';

const getMediaUrl = (path) => {
  if (!path || path === 'default_profile.png') return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`;
};

const Shorts = () => {
  const feedRef = useRef(null);
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const [videos, setVideos] = useState([]);
  const [subscribedChannels, setSubscribedChannels] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [commentsVideoId, setCommentsVideoId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [newestCommentsFirst, setNewestCommentsFirst] = useState(true);

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const res = await api.get('/videos/shorts');
        setVideos(res.data);
      } catch (err) {
        setError('No se pudieron cargar los Shorts.');
      } finally {
        setLoading(false);
      }
    };
    fetchShorts();
  }, []);

  useEffect(() => {
    if (!user) {
      setSubscribedChannels(new Set());
      return;
    }
    api.get('/subscriptions/me')
      .then((res) => setSubscribedChannels(new Set(res.data.map((channel) => channel.id))))
      .catch(() => setSubscribedChannels(new Set()));
  }, [user]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !videos.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const player = entry.target.querySelector('video');
        if (!player) return;
        if (entry.isIntersecting) player.play().catch(() => {});
        else player.pause();
      });
    }, { root: feed, threshold: 0.65 });

    feed.querySelectorAll('.short-slide').forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [videos]);

  useEffect(() => {
    const selectedVideoId = Number(searchParams.get('video'));
    if (!selectedVideoId || !videos.length || !feedRef.current) return;

    const selectedIndex = videos.findIndex((video) => video.id === selectedVideoId);
    if (selectedIndex >= 0) {
      feedRef.current.scrollTo({
        top: selectedIndex * feedRef.current.clientHeight,
        behavior: 'auto'
      });
    }
  }, [videos, searchParams]);

  useEffect(() => {
    if (commentsVideoId === null) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCommentsVideoId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [commentsVideoId]);

  const openComments = async (videoId) => {
    setCommentsVideoId(videoId);
    setCommentsLoading(true);
    setCommentText('');
    try {
      const res = await api.get(`/videos/${videoId}/comments`);
      setComments(res.data);
    } catch (err) {
      setComments([]);
      window.alert('No se pudieron cargar los comentarios.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || !commentsVideoId || commentSubmitting) return;
    if (!user) {
      window.alert(`${t('Sign in')} para comentar`);
      return;
    }
    setCommentSubmitting(true);
    try {
      const res = await api.post(`/videos/${commentsVideoId}/comments`, { content });
      setComments((current) => [res.data, ...current]);
      setVideos((current) => current.map((video) => (
        video.id === commentsVideoId
          ? { ...video, comments_count: (video.comments_count || 0) + 1 }
          : video
      )));
      setCommentText('');
    } catch (err) {
      window.alert('No se pudo publicar el comentario. Inténtalo de nuevo.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReaction = async (videoId) => {
    if (!user) {
      window.alert(`${t('Sign in')} para indicar que te gusta este Short`);
      return;
    }
    try {
      const res = await api.post(`/videos/${videoId}/like`, null, { params: { reaction: 'like' } });
      setVideos((current) => current.map((video) => video.id === videoId ? { ...video, ...res.data } : video));
    } catch (err) {
      window.alert('No se pudo guardar tu me gusta. Inténtalo de nuevo.');
    }
  };

  const handleSubscribe = async (video) => {
    if (!user) {
      window.alert(`${t('Sign in')} para suscribirte`);
      return;
    }
    const isSubscribed = subscribedChannels.has(video.user_id);
    try {
      if (isSubscribed) await api.delete(`/subscriptions/${video.user_id}`);
      else await api.post(`/subscriptions/${video.user_id}`);
      setSubscribedChannels((current) => {
        const next = new Set(current);
        if (isSubscribed) next.delete(video.user_id);
        else next.add(video.user_id);
        return next;
      });
    } catch (err) {
      window.alert('No se pudo actualizar la suscripción.');
    }
  };

  const handleShare = async (video) => {
    const url = `${window.location.origin}/video/${video.id}`;
    try {
      if (navigator.share) await navigator.share({ title: video.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMessage('Enlace copiado');
        window.setTimeout(() => setShareMessage(''), 2000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') window.alert('No se pudo compartir este Short.');
    }
  };

  if (loading) return <div className="shorts-loading">{t("Loading...")}</div>;
  if (error) return <div className="shorts-empty">{error}</div>;
  if (videos.length === 0) return <div className="shorts-empty">{t("No shorts available yet")}</div>;

  return (
    <main className="shorts-feed" ref={feedRef}>
      {videos.map((video) => {
        const channelName = video.user_name || 'Canal';
        const avatarUrl = getMediaUrl(video.user_profile_picture);
        const isLiked = Number(video.user_like) === 1;
        const isSubscribed = subscribedChannels.has(video.user_id);
        const videoComments = commentsVideoId === video.id
          ? [...comments].sort((first, second) => {
            const difference = new Date(first.created_at) - new Date(second.created_at);
            return newestCommentsFirst ? -difference : difference;
          })
          : [];

        return (
          <article key={video.id} className={`short-slide ${commentsVideoId === video.id ? 'with-comments' : ''}`}>
            <div className="short-player-column">
              <div className="short-player-stage">
                <video
                  src={`http://localhost:8000${video.video_url}`}
                  poster={`http://localhost:8000${video.thumbnail_url}`}
                  className="short-player-video"
                  controls
                  loop
                  muted
                  playsInline
                />
                <div className="short-video-caption">
                  <div className="short-channel-row">
                    <Link to={`/profile/${video.user_id}`} className="short-channel-avatar">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={channelName} />
                      ) : (
                        <span style={{ backgroundColor: getAvatarColor(channelName) }}>{getInitial(channelName)}</span>
                      )}
                    </Link>
                    <Link to={`/profile/${video.user_id}`} className="short-channel-name">@{channelName}</Link>
                    {user?.id !== video.user_id && (
                      <button
                        type="button"
                        className={`short-subscribe-button ${isSubscribed ? 'subscribed' : ''}`}
                        onClick={() => handleSubscribe(video)}
                      >
                        {isSubscribed ? 'Suscrito' : 'Suscribirse'}
                      </button>
                    )}
                  </div>
                  <p className="short-video-title">{video.title}</p>
                </div>
              </div>

              <aside className="short-action-rail" aria-label="Acciones del Short">
                <button
                  type="button"
                  className={`short-action-button ${isLiked ? 'active' : ''}`}
                  onClick={() => handleReaction(video.id)}
                  aria-label="Me gusta"
                >
                  <span className="short-action-icon"><FaHeart /></span>
                  <span>{formatViews(video.likes_count || 0)}</span>
                </button>
                <button
                  type="button"
                  className={`short-action-button ${commentsVideoId === video.id ? 'active' : ''}`}
                  onClick={() => commentsVideoId === video.id ? setCommentsVideoId(null) : openComments(video.id)}
                  aria-label="Ver comentarios"
                  aria-expanded={commentsVideoId === video.id}
                >
                  <span className="short-action-icon"><FaComment /></span>
                  <span>{formatViews(video.comments_count || 0)}</span>
                </button>
                <button type="button" className="short-action-button" onClick={() => handleShare(video)} aria-label="Compartir">
                  <span className="short-action-icon"><FaShare /></span>
                  <span>{shareMessage || 'Compartir'}</span>
                </button>
              </aside>
            </div>

            {commentsVideoId === video.id && (
              <section className="short-comments-panel" aria-label="Comentarios">
                <header className="short-comments-header">
                  <h2>Comentarios <span>{formatViews(comments.length)}</span></h2>
                  <div className="short-comments-header-actions">
                    <button
                      type="button"
                      onClick={() => setNewestCommentsFirst((current) => !current)}
                      aria-label={newestCommentsFirst ? 'Ordenar del más antiguo' : 'Ordenar del más reciente'}
                      title={newestCommentsFirst ? 'Más recientes primero' : 'Más antiguos primero'}
                    >
                      <FaSortAmountDown />
                    </button>
                    <button type="button" onClick={() => setCommentsVideoId(null)} aria-label="Cerrar comentarios">
                      <FaTimes />
                    </button>
                  </div>
                </header>

                <div className="short-comments-list">
                  {commentsLoading ? (
                    <p className="short-comments-empty">Cargando comentarios...</p>
                  ) : videoComments.length ? videoComments.map((comment) => {
                    const commentAvatar = getMediaUrl(comment.user_profile_picture);
                    return (
                      <article key={comment.id} className="short-comment">
                        {commentAvatar ? (
                          <img src={commentAvatar} alt={comment.user_name} className="short-comment-avatar" />
                        ) : (
                          <span className="short-comment-avatar" style={{ backgroundColor: getAvatarColor(comment.user_name) }}>
                            {getInitial(comment.user_name)}
                          </span>
                        )}
                        <div className="short-comment-body">
                          <div className="short-comment-meta">
                            <strong>@{comment.user_name}</strong>
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                          <p>{comment.content}</p>
                        </div>
                      </article>
                    );
                  }) : (
                    <p className="short-comments-empty">Sé el primero en comentar este Short.</p>
                  )}
                </div>

                {user ? (
                  <form className="short-comment-form" onSubmit={handleAddComment}>
                    {getMediaUrl(user.profile_picture) ? (
                      <img src={getMediaUrl(user.profile_picture)} alt={user.name} className="short-comment-avatar" />
                    ) : (
                      <span className="short-comment-avatar" style={{ backgroundColor: getAvatarColor(user.name) }}>
                        {getInitial(user.name)}
                      </span>
                    )}
                    <input
                      aria-label="Agrega un comentario"
                      placeholder="Agrega un comentario..."
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      maxLength={2000}
                    />
                    <button type="submit" disabled={!commentText.trim() || commentSubmitting}>
                      {commentSubmitting ? '...' : 'Publicar'}
                    </button>
                  </form>
                ) : (
                  <p className="short-comments-signin"><Link to="/login">Inicia sesión</Link> para comentar.</p>
                )}
              </section>
            )}
          </article>
        );
      })}
    </main>
  );
};

export default Shorts;
