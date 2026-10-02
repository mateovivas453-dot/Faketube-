import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { t } from '../utils/translations';
import { getAvatarColor, getInitial } from '../utils/format';
import './Subscriptions.css';

const getProfilePictureUrl = (picture) => {
  if (!picture || picture === 'default_profile.png') return null;
  if (/^https?:\/\//i.test(picture)) return picture;
  return `http://localhost:8000/${picture.replace(/^\/+/, '')}`;
};

const Subscriptions = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const res = await api.get('/subscriptions/me');
        setChannels(res.data);
      } catch (err) {
        console.error("Error fetching subscriptions");
      } finally {
        setLoading(false);
      }
    };
    fetchSubscriptions();
  }, []);

  return (
    <div className="home-container">
      <h1 className="subscriptions-title">{t("Subscriptions")}</h1>
      {loading ? (
        <div className="loading">Cargando...</div>
      ) : channels.length === 0 ? (
        <div className="subscriptions-empty">
          <p>{t("No subscriptions yet") || "Aún no tienes suscripciones"}</p>
        </div>
      ) : (
        <div className="subscriptions-list">
          {channels.map(channel => (
            <div key={channel.id} className="subscription-row">
              <Link to={`/profile/${channel.id}`} className="subscription-channel">
                <span className="subscription-avatar">
                  <span className="subscription-avatar-fallback" style={{ backgroundColor: getAvatarColor(channel.name) }}>
                    {getInitial(channel.name)}
                  </span>
                  {getProfilePictureUrl(channel.profile_picture) && (
                    <img
                      src={getProfilePictureUrl(channel.profile_picture)}
                      alt=""
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </span>
                <span><strong>{channel.name}</strong><small>{channel.video_count} {t("Videos")}</small></span>
              </Link>
              <button
              className="unsubscribe-btn"
                onClick={async () => {
                  try {
                    await api.delete(`/subscriptions/${channel.id}`);
                    setChannels(channels.filter(c => c.id !== channel.id));
                  } catch (err) {
                    console.error("Error unsubscribing");
                  }
                }}
              >
                {t("Unsubscribe")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
