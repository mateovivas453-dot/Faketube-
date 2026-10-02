import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import UploadModal from '../components/UploadModal';
import { getInitial, getAvatarColor } from '../utils/format';
import { t } from '../utils/translations';
import './Profile.css';

const getMediaUrl = (path) => {
  if (!path || path === 'default_profile.png' || path === 'default_banner.png') return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`;
};

const Profile = () => {
  const { id } = useParams();
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadIsShort, setUploadIsShort] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [error, setError] = useState('');

  const isOwnProfile = !id || (user && user.id === parseInt(id));
  const targetId = id || (user ? user.id : null);

  useEffect(() => {
    if (!targetId) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const [userRes, videosRes] = await Promise.all([
          api.get(`/users/${targetId}`),
          api.get(`/videos?user_id=${targetId}`)
        ]);
        setProfileData(userRes.data);
        setVideos(videosRes.data);
        if (isOwnProfile) {
          setEditForm({ name: userRes.data.name, bio: userRes.data.bio || '' });
        }
      } catch (err) {
        setError(t("Failed to load profile"));
      }
      setLoading(false);
    };

    fetchProfile();
  }, [targetId, user, navigate, isOwnProfile]);

  useEffect(() => {
    if (!user || isOwnProfile || profileData?.id !== Number(targetId)) {
      setIsSubscribed(false);
      return undefined;
    }

    let active = true;
    api.get('/subscriptions/me')
      .then((res) => {
        if (active) setIsSubscribed(res.data.some((channel) => channel.id === profileData.id));
      })
      .catch(() => {
        if (active) setIsSubscribed(false);
      });

    return () => { active = false; };
  }, [user, isOwnProfile, targetId, profileData?.id]);

  const handleToggleSubscription = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSubscriptionLoading(true);
    try {
      if (isSubscribed) await api.delete(`/subscriptions/${profileData.id}`);
      else await api.post(`/subscriptions/${profileData.id}`);
      setIsSubscribed((current) => !current);
    } catch (err) {
      alert(isSubscribed ? 'No se pudo cancelar la suscripción.' : 'No se pudo completar la suscripción.');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleDelete = async (videoId) => {
    if (window.confirm(t("Are you sure you want to delete this video?"))) {
      try {
        await api.delete(`/videos/${videoId}`);
        setVideos(videos.filter(v => v.id !== videoId));
      } catch (err) {
        alert(t("Failed to delete video"));
      }
    }
  };

  const handleUploadSuccess = (newVideo) => {
    setVideos([newVideo, ...videos]);
    setIsUploadModalOpen(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('bio', editForm.bio);

    try {
      const res = await api.patch('/users/me', formData);
      setProfileData(res.data);
      updateUser(res.data);
      setIsEditMode(false);
    } catch (err) {
      alert(t("Error updating profile"));
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(field, file);

    try {
      const res = await api.patch('/users/me', formData);
      setProfileData(res.data);
      updateUser(res.data);
    } catch (err) {
      alert(t("Error uploading file"));
    }
  };

  if (loading) return <div className="profile-loading">{t("Loading profile...")}</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!profileData) return null;

  const bannerUrl = getMediaUrl(profileData.banner_url);
  const avatarUrl = getMediaUrl(profileData.profile_picture);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div
          className="profile-banner"
          style={{
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {isOwnProfile && (
            <label className="banner-upload-label">
              {t("Upload Banner")}
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} style={{ display: 'none' }} />
            </label>
          )}
        </div>
        <div className="profile-info-section">
          <div className="avatar-wrapper">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="profile-avatar-img" />
            ) : (
              <div
                className="profile-avatar-large"
                style={{ backgroundColor: getAvatarColor(profileData.name) }}
              >
                {getInitial(profileData.name)}
              </div>
            )}
            {isOwnProfile && (
              <label className="avatar-upload-label">
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'profile_picture')} style={{ display: 'none' }} />
                📷
              </label>
            )}
          </div>
          <div className="profile-details">
            {isEditMode ? (
              <form onSubmit={handleUpdateProfile} className="edit-profile-form">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder={t("Name")}
                />
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder={t("Bio")}
                />
                <div className="edit-btns">
                  <button type="submit" className="save-btn">{t("Save Changes")}</button>
                  <button type="button" className="cancel-btn" onClick={() => setIsEditMode(false)}>{t("Cancel")}</button>
                </div>
              </form>
            ) : (
              <>
                <h1>{profileData.name}</h1>
                <p className="profile-handle">@{profileData?.name?.toLowerCase().replace(/\s/g, '')} • {videos.length} {t("Videos")}</p>
                <p className="profile-bio">{profileData.bio || t("Welcome to my channel!")}</p>
              </>
            )}
          </div>
          {!isOwnProfile && (
            <button
              type="button"
              className={`profile-subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
              onClick={handleToggleSubscription}
              disabled={subscriptionLoading}
            >
              {subscriptionLoading ? 'Procesando...' : isSubscribed ? 'Suscrito' : 'Suscribirse'}
            </button>
          )}
          {isOwnProfile && (
            <div className="profile-owner-actions">
              <button className="upload-btn" onClick={() => { setUploadIsShort(false); setIsUploadModalOpen(true); }}>{t("Upload Video")}</button>
              <button className="upload-btn short-upload-btn" onClick={() => { setUploadIsShort(true); setIsUploadModalOpen(true); }}>Subir Short</button>
              <button className="edit-profile-btn" onClick={() => setIsEditMode(!isEditMode)}>
                {isEditMode ? t("Cancel") : t("Edit Profile")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        <button className="tab active">{t("Videos")}</button>
        <button className="tab">Playlists</button>
        <button className="tab">Channels</button>
        <button className="tab">About</button>
      </div>

      <div className="profile-content">
        {videos.length === 0 ? (
          <div className="empty-profile">
            <p>{t("This channel has no videos.")}</p>
          </div>
        ) : (
          <div className="profile-video-grid">
            {videos.map(video => (
              <div key={video.id} className="profile-video-card">
                <VideoCard video={video} />
                {isOwnProfile && (
                  <div className="video-management">
                    <button className="edit-btn">{t("Edit")}</button>
                    <button className="delete-btn" onClick={() => handleDelete(video.id)}>{t("Delete")}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isUploadModalOpen && (
        <UploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
          isShort={uploadIsShort}
        />
      )}
    </div>
  );
};

export default Profile;
