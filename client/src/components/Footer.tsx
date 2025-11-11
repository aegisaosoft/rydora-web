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

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useDeviceDetection from '../hooks/useDeviceDetection';
import './Footer.css';

const Footer: React.FC = () => {
  const { isMobile } = useDeviceDetection();
  const [showCopyright, setShowCopyright] = useState(false);

  const closeCopyright = () => setShowCopyright(false);

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
              <button
                type="button"
                className="mobile-legal-link mobile-copyright-link"
                onClick={() => setShowCopyright(true)}
              >
                © Aegis AO Soft LLC
              </button>
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
            <div className="footer-copyright">
              <button
                type="button"
                className="footer-link-button"
                onClick={() => setShowCopyright(true)}
              >
                © Aegis AO Soft LLC
              </button>
            </div>
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
      {showCopyright && (
        <>
          <div className="footer-modal-backdrop" onClick={closeCopyright} />
          <div className="footer-modal" role="dialog" aria-modal="true" aria-labelledby="copyright-title">
            <div className="footer-modal-header">
              <h3 id="copyright-title">Intellectual Property Notice</h3>
              <button type="button" className="footer-modal-close" onClick={closeCopyright} aria-label="Close notice">
                &times;
              </button>
            </div>
            <div className="footer-modal-body">
              <p><strong>Copyright (c) 2024-2025 Aegis AO Soft LLC and Alexander Orlov. All rights reserved.</strong></p>
              <p>
                This software and its source code are the exclusive property of Aegis AO Soft LLC and Alexander Orlov.
                No part of this software, including but not limited to source code, documentation, compiled binaries,
                or derivative works, may be used, reproduced, modified, distributed, or transmitted in any form or by
                any means without the express written permission of Aegis AO Soft LLC and Alexander Orlov.
              </p>
              <p>
                THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
                LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
                IN NO EVENT SHALL AEGIS AO SOFT LLC OR ALEXANDER ORLOV BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
                WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
              </p>
              <p>
                Unauthorized use, copying, modification, distribution, or any other exploitation of this software is
                strictly prohibited and may result in severe civil and criminal penalties.
              </p>
            </div>
          </div>
        </>
      )}
    </footer>
  );
};

export default Footer;

