/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov
 *
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnvironment } from '../contexts/EnvironmentContext';
import useDeviceDetection from '../hooks/useDeviceDetection';
import './SharedLayout.css';

interface SharedLayoutProps {
  children: React.ReactNode;
}

const SharedLayout: React.FC<SharedLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { environment, setEnvironment } = useEnvironment();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useDeviceDetection().isMobile;
  
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [externalExpanded, setExternalExpanded] = useState(true);
  const [nycExpanded, setNycExpanded] = useState(true);
  const [administrationExpanded, setAdministrationExpanded] = useState(true);

  // Check if user is admin or owner
  const isAdmin = user?.isAdmin || false;
  const isOwner = user?.isOwner || false;
  const canAccessAdminFeatures = isAdmin || isOwner;

  // Navigation items
  const externalItems = [
    ...(canAccessAdminFeatures ? [
      { path: '/allinvoices', label: 'All Invoices', icon: 'fas fa-list' }
    ] : []),
    ...(isAdmin ? [
      { path: '/tolls', label: 'Tolls', icon: 'fas fa-dollar-sign' },
      { path: '/parking-violations', label: 'Parking Violations', icon: 'fas fa-car' }
    ] : [])
  ];

  const nycItems = [
    { path: '/ezpass', label: 'EZ Pass', icon: 'fas fa-road' },
    { path: '/nyc-violations', label: 'NYC Violations', icon: 'fas fa-exclamation-triangle' }
  ];

  const administrationItems = [
    ...(isAdmin ? [
      { path: '/violations-checker', label: 'Violations Checker', icon: 'fas fa-search' }
    ] : [])
  ];

  // Toggle functions
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Navigate to control panel
  const goToControlPanel = () => {
    navigate('/control-panel');
    // Close mobile menu if open
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };
  
  const toggleExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExternalExpanded(!externalExpanded);
  };
  const toggleNyc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNycExpanded(!nycExpanded);
  };
  const toggleAdministration = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdministrationExpanded(!administrationExpanded);
  };

  // Close sidebar and mobile menu on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <div className="shared-layout">
      {/* Header Area - handled by Header component */}
      
      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <div className="mobile-header">
          <button 
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'}`}></i>
          </button>
          <div className="mobile-user-info" onClick={goToControlPanel} style={{ cursor: 'pointer' }}>
            <span className="mobile-user-name">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
            </span>
          </div>
        </div>
      )}
      
      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="mobile-user-info" onClick={goToControlPanel} style={{ cursor: 'pointer' }}>
                {user?.imageURL ? (
                  <img src={user.imageURL} alt="User Avatar" className="mobile-user-avatar" />
                ) : (
                  <div className="mobile-user-avatar-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
                <div className="mobile-user-details">
                  <h3>{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}</h3>
                  <p className="mobile-user-email">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>
            
            <div className="mobile-menu-nav">
              {/* External Section */}
              {externalItems.length > 0 && (
                <>
                  <div className="mobile-nav-section-header">External</div>
                  {externalItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className={item.icon}></i>
                      <span className="mobile-nav-label">{item.label}</span>
                    </Link>
                  ))}
                </>
              )}

              {/* NYC Section */}
              <div className="mobile-nav-section-header">NYC</div>
              {nycItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className={item.icon}></i>
                  <span className="mobile-nav-label">{item.label}</span>
                </Link>
              ))}

              {/* Administration Section */}
              {isAdmin && administrationItems.length > 0 && (
                <>
                  <div className="mobile-nav-section-header">Administration</div>
                  {administrationItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className={item.icon}></i>
                      <span className="mobile-nav-label">{item.label}</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
            
            <div className="mobile-menu-footer">
              <div className="mobile-environment-selector">
                <label htmlFor="mobile-environment-select">Environment</label>
                <select
                  id="mobile-environment-select"
                  className="mobile-environment-select"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as 'development' | 'production')}
                >
                  <option value="development">Development</option>
                  <option value="production">Production</option>
                </select>
                <div className="mobile-api-url">
                  API: {process.env.REACT_APP_API_URL || 'http://localhost:3001'}
                </div>
                <div className="mobile-api-url">
                  <a 
                    href="https://RYDORA-violations-dmdsf2aadjgmgdc9.canadacentral-01.azurewebsites.net/index.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="violations-link"
                  >
                    RYDORAS_VIOLATIONS
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content Area - Divided into Sidebar and Main Content */}
      <div className="content-area">
        {/* Sidebar - Hidden on Mobile */}
        {!isMobile && (
          <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="user-info" onClick={goToControlPanel} style={{ cursor: 'pointer' }}>
              {user?.imageURL ? (
                <img src={user.imageURL} alt="User Avatar" className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">
                  <i className="fas fa-user"></i>
                </div>
              )}
              <div className="user-details">
                <h3>{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}</h3>
                <p className="user-email">{user?.email || 'user@example.com'}</p>
              </div>
            </div>
          </div>

          <div className="sidebar-nav">
            {/* External Section */}
            {externalItems.length > 0 && (
              <>
                <div 
                  className="nav-section-header" 
                  onClick={toggleExternal}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  External
                  <i className={`fas fa-chevron-${externalExpanded ? 'up' : 'down'}`}></i>
                </div>
                {externalExpanded && externalItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    <i className={item.icon}></i>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* NYC Section */}
            <div 
              className="nav-section-header" 
              onClick={toggleNyc}
              onMouseDown={(e) => e.preventDefault()}
            >
              NYC
              <i className={`fas fa-chevron-${nycExpanded ? 'up' : 'down'}`}></i>
            </div>
            {nycExpanded && nycItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <i className={item.icon}></i>
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}

            {/* Administration Section */}
            {isAdmin && administrationItems.length > 0 && (
              <>
                <div 
                  className="nav-section-header" 
                  onClick={toggleAdministration}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  Administration
                  <i className={`fas fa-chevron-${administrationExpanded ? 'up' : 'down'}`}></i>
                </div>
                {administrationExpanded && administrationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    <i className={item.icon}></i>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ))}
              </>
            )}
          </div>

          <div className="sidebar-footer">
            <div className="environment-selector">
              <label htmlFor="environment-select">Environment</label>
              <select
                id="environment-select"
                className="environment-select"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'development' | 'production')}
              >
                <option value="development">Development</option>
                <option value="production">Production</option>
              </select>
              <div className="api-url">
                API: {process.env.REACT_APP_API_URL || 'http://localhost:3001'}
              </div>
              <div className="api-url">
                <a 
                  href="https://RYDORA-violations-dmdsf2aadjgmgdc9.canadacentral-01.azurewebsites.net/index.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="violations-link"
                >
                  RYDORAS_VIOLATIONS
                </a>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Main Content */}
        <div className={`main-content ${isMobile ? 'mobile' : ''}`}>
          {children}
        </div>
      </div>
      
      {/* Footer Area - handled by Footer component */}
    </div>
  );
};

export default SharedLayout;

