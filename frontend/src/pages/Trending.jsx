import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import VideoCard from '../components/VideoCard';
import { t } from '../utils/translations';
import './Home.css';

const Trending = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get('/videos?trending=true');
        setVideos(res.data);
      } catch (err) {
        console.error("Error fetching trending videos");
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="home-container">
      <h2 style={{ padding: '12px 4px 20px' }}>{t("Trending")}</h2>
      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="home-grid">
          {videos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;
