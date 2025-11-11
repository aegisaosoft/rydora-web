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
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useDeviceDetection from '../hooks/useDeviceDetection';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import './Header.css';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { isMobile } = useDeviceDetection();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if server call fails
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Fixed logo outside header container */}
        <div className="mobile-logo-container">
          <Link to="/" className="brand-link">
            <img src="/images/rydora-logo.png" alt="Rydora" className="logo" />
          </Link>
        </div>
        
        <header className="header mobile-header">
          <nav className="navbar">
            <div className="container">
              <div className="mobile-nav-top">
                <button 
                className="mobile-menu-toggle"
                onClick={toggleMenu}
                style={{
                  background: '#007bff',
                  border: '2px solid #0056b3',
                  fontSize: '20px',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  minWidth: '80px',
                  minHeight: '48px'
                }}
              >
                {isMenuOpen ? '✕' : 'MENU'}
              </button>
            </div>
            
            {isMenuOpen && (
              <div className="mobile-menu">
                <div className="mobile-nav-links">
                  <Link to="/company" className="nav-link main-cta-mobile" onClick={() => setIsMenuOpen(false)} style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    fontWeight: 'bold',
                    marginTop: '8px',
                    borderRadius: '6px'
                  }}>Company</Link>
                  <Link to="/product" className="nav-link main-cta-mobile" onClick={() => setIsMenuOpen(false)} style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    fontWeight: 'bold',
                    marginTop: '8px',
                    borderRadius: '6px'
                  }}>Product</Link>
                  <Link to="/application" className="nav-link main-cta-mobile" onClick={() => setIsMenuOpen(false)} style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    fontWeight: 'bold',
                    marginTop: '8px',
                    borderRadius: '6px'
                  }}>Application</Link>
                  {isAuthenticated ? (
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="nav-link logout-btn">
                      Logout
                    </button>
                  ) : (
                    <Link to="/login" className="nav-link login-btn" onClick={() => setIsMenuOpen(false)}>
                      Login
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
      </>
    );
  }

  return (
    <header className="header">
      <nav className="navbar">
        <div className="container">
          <div className="navbar-brand brand-block">
            <Link to="/" className="brand-link">
              <img src="/images/rydora-logo.png" alt="Rydora" className="logo" />
            </Link>
          </div>
          <div className="navbar-menu">
            <Link to="/company" className="nav-link">Company</Link>
            <Link to="/product" className="nav-link">Product</Link>
            <Link to="/application" className="nav-link">Application</Link>
          </div>
          <div className="navbar-cta">
            {isAuthenticated ? (
              <button onClick={handleLogout} className="nav-cta logout-btn">
                Logout
              </button>
            ) : (
              <Link to="/login" className="nav-cta login-btn">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;

