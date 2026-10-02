import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaFire, FaUserPlus, FaPlayCircle } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { t } from '../utils/translations';
import './Sidebar.css';

const Sidebar = () => {
  const { isSidebarOpen } = useContext(AuthContext);

  return (
    <aside className={`sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-links">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FaHome className="sidebar-icon" />
          {isSidebarOpen && <span>{t("Home")}</span>}
        </NavLink>
        <NavLink to="/trending" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FaFire className="sidebar-icon" />
          {isSidebarOpen && <span>{t("Trending")}</span>}
        </NavLink>
        <NavLink to="/subscriptions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FaUserPlus className="sidebar-icon" />
          {isSidebarOpen && <span>{t("Subscriptions")}</span>}
        </NavLink>
        <NavLink to="/shorts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <FaPlayCircle className="sidebar-icon" />
          {isSidebarOpen && <span>{t("Shorts")}</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
