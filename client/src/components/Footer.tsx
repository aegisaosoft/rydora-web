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

import React from 'react';
import { Link } from 'react-router-dom';
import useDeviceDetection from '../hooks/useDeviceDetection';
import './Footer.css';

const Footer: React.FC = () => {
  const { isMobile } = useDeviceDetection();

  if (isMobile) {
    return (
      <footer className="footer mobile-footer">
        <div className="container">
          <div className="mobile-footer-content">
            {/* Legal Links Only */}
            <div className="mobile-legal-section">
              <div className="mobile-legal-links">
                <Link to="/terms" className="mobile-legal-link">Terms of Use</Link>
                <Link to="/privacy" className="mobile-legal-link">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-bottom">
          <div className="footer-leftbar">
            <div className="footer-contact">
              <div className="contact-item">
                <i className="fas fa-phone"></i>
                <span>347-444-2424</span>
              </div>
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <span>support@rydora.com</span>
              </div>
            </div>
            <div className="footer-social footer-bottom-social">
              <a href="https://www.facebook.com/profile.php?id=100081812364508#" target="_blank" rel="noopener noreferrer" className="social-icon-link">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://x.com/RYDORA_us" target="_blank" rel="noopener noreferrer" className="social-icon-link">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://www.youtube.com/channel/UCAKDf5qc9twMLyh-VfZkz3g/featured" target="_blank" rel="noopener noreferrer" className="social-icon-link">
                <i className="fab fa-youtube"></i>
              </a>
              <a href="https://www.instagram.com/RYDORA_us/" target="_blank" rel="noopener noreferrer" className="social-icon-link">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>
          <div className="footer-center">
            <div className="footer-apps">
              <a href="https://play.google.com/store/apps/details?id=com.iroc.RYDORA.app" target="_blank" rel="noopener noreferrer" className="app-link google-play">
                <i className="fab fa-google-play"></i>
                <span>Google Play</span>
              </a>
              <a href="https://apps.apple.com/us/app/RYDORA/id1612416360" target="_blank" rel="noopener noreferrer" className="app-link app-store">
                <i className="fab fa-apple"></i>
                <span>App Store</span>
              </a>
              <a href="https://agsmRYDORAproduction.blob.core.windows.net/RYDORA-owner-mvp-app/RYDORAOwner-win-Setup.exe" target="_blank" rel="noopener noreferrer" className="app-link desktop-app">
                <i className="fab fa-windows"></i>
                <span>DESKTOP APP</span>
              </a>
            </div>
            <div className="footer-legal footer-legal-small">
              <Link to="/terms" className="legal-link">Terms of use</Link>
              <Link to="/privacy" className="legal-link">Privacy policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

