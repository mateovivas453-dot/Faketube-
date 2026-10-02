import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaPlay } from 'react-icons/fa';
import api from '../api/axios';
import VideoCard from '../components/VideoCard';
import { formatViews } from '../utils/format';
import { t } from '../utils/translations';
import './Home.css';

const Home = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [videos, setVideos] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const [videosRes, shortsRes] = await Promise.all([
          api.get('/videos', { params: { search: searchQuery || undefined } }),
          searchQuery
            ? Promise.resolve({ data: [] })
            : api.get('/videos/shorts').catch(() => ({ data: [] }))
        ]);
        setVideos(searchQuery ? videosRes.data : videosRes.data.filter(video => Number(video.is_short) !== 1));
        setShorts(shortsRes.data);
      } catch (err) {
        console.error("Error fetching videos");
        setVideos([]);
        setShorts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [searchQuery]);

  return (
    <div className="home-container">
      {loading ? (
        <div className="loading">Cargando...</div>
      ) : videos.length || shorts.length ? (
        <>
          {videos.length > 0 && (
            <div className="home-grid">
              {videos.map(video => <VideoCard key={video.id} video={video} />)}
            </div>
          )}
          {!searchQuery && shorts.length > 0 && (
            <section className="home-shorts-section" aria-labelledby="home-shorts-title">
              <div className="home-shorts-header">
                <h2 id="home-shorts-title"><FaPlay aria-hidden="true" /> Shorts</h2>
                <Link to="/shorts" className="home-shorts-view-all">Ver todos</Link>
              </div>
              <div className="home-shorts-grid">
                {shorts.map(short => (
                  <Link key={short.id} to={`/shorts?video=${short.id}`} className="home-short-card">
                    <div className="home-short-thumbnail-wrap">
                      <img
                        src={`http://localhost:8000${short.thumbnail_url}`}
                        alt={short.title}
                        className="home-short-thumbnail"
                        loading="lazy"
                      />
                    </div>
                    <h3>{short.title}</h3>
                    <p>{formatViews(short.views)} {t("Views")}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : <div className="empty-state"><h3>No se encontraron videos</h3></div>}
    </div>
  );
};

export default Home;