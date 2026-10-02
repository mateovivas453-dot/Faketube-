import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaSearch, FaUserCircle } from 'react-icons/fa';
import { MdAdd } from 'react-icons/md';
import { AuthContext } from '../context/AuthContext';
import { getInitial, getAvatarColor } from '../utils/format';
import { t } from '../utils/translations';
import './Navbar.css';

const getMediaUrl = (path) => {
  if (!path || path === 'default_profile.png') return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `http://localhost:8000/${path.replace(/^\/+/, '')}`;
};

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout, toggleSidebar } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="icon-btn menu-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
        <Link to="/" className="logo-link">
          <div className="logo-icon-wrapper"><div className="logo-play-triangle"></div></div>
          <span className="logo-text">YouTube</span>
        </Link>
      </div>

      <div className="navbar-center">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-container">
            <input
              type="text"
              placeholder={t("Search videos...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="search-btn">
            <FaSearch />
          </button>
        </form>
      </div>

      <div className="navbar-right">
        {user ? (
          <>
            <Link to="/profile" className="create-btn" title="Create" aria-label="Create">
              <MdAdd size={22} />
            </Link>
            <div className="profile-menu-container">
              <button
                className="profile-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ backgroundColor: getAvatarColor(user.name) }}
              >
                {getMediaUrl(user.profile_picture) ? (
                  <img src={getMediaUrl(user.profile_picture)} alt={user.name} className="profile-btn-image" />
                ) : (
                  getInitial(user.name)
                )}
              </button>
              {showDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar" style={{ backgroundColor: getAvatarColor(user.name) }}>
                      {getMediaUrl(user.profile_picture) ? (
                        <img src={getMediaUrl(user.profile_picture)} alt={user.name} className="dropdown-avatar-image" />
                      ) : (
                        getInitial(user.name)
                      )}
                    </div>
                    <div className="dropdown-user-info">
                      <p className="dropdown-name">{user.name}</p>
                      <p className="dropdown-email">{user.email}</p>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    {t("Your channel")}
                  </Link>
                  <button className="dropdown-item" onClick={() => { logout(); setShowDropdown(false); navigate('/'); }}>
                    {t("Logout")}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/login" className="sign-in-btn">
            <FaUserCircle size={20} />
            <span>{t("Sign in")}</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
