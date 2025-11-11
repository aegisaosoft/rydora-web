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

import React from 'react';
import './Home.css';
import HomeControlPanelCards from './HomeControlPanelCards';

const Home: React.FC = () => {
  const videoUrl = '/videos/rydora-traffic.mp4';

  return (
    <>
      <section className="hero hero-static">
        <div className="hero-video-wrapper">
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80"
          />
        </div>
      </section>
      <HomeControlPanelCards />
    </>
  );
};

export default Home;

