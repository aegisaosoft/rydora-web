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

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import './Home.css';

const Home: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Example of how to use TanStack React Query for future dynamic content
  // This could be used to fetch announcements, featured content, or other dynamic data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      // This is a placeholder for future API calls
      // For now, return empty data since there's no announcements API
      return { data: [] };
    },
    enabled: false // Disabled for now since there's no announcements API
  });

  // Slides data with blue background and texts (images temporarily removed)
  const slides: any[] = [
    {
      image: null, // Temporarily removed
      brand: 'RYDORA',
      title: 'Welcome to Rydora',
      text: 'Your comprehensive toll management platform for fleets and drivers'
    },
    {
      image: null, // Temporarily removed
      brand: 'RYDORA',
      title: 'Manage Tolls Easily',
      text: 'Track, monitor, and manage all your toll transactions in one place'
    },
    {
      image: null, // Temporarily removed
      brand: 'RYDORA',
      title: 'Parking Violations',
      text: 'Stay on top of parking violations and manage payments efficiently'
    },
    {
      image: null, // Temporarily removed
      brand: 'RYDORA',
      title: 'Real-time Monitoring',
      text: 'Get instant notifications and real-time updates on all your toll activities'
    },
    {
      image: null, // Temporarily removed
      brand: 'RYDORA',
      title: 'Comprehensive Reporting',
      text: 'Generate detailed reports and analytics for better fleet management'
    }
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const changeSlide = useCallback((direction: number) => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => {
      const newSlide = prev + direction;
      if (newSlide < 0) return slides.length - 1;
      if (newSlide >= slides.length) return 0;
      return newSlide;
    });
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      changeSlide(1);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length, changeSlide]);

  return (
    <section className="hero">
      <div className="hero-carousel-background">
        {slides.length > 0 ? (
          slides.map((slide, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
              data-index={index}
            >
              {/* White background instead of image */}
              <div 
                className="hero-bg-white" 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'white',
                  zIndex: 1
                }}
              ></div>
              <div className="hero-caption">
                {slide.brand && (
                  <div className="hero-caption-brand">{slide.brand}</div>
                )}
                <h2 className="hero-caption-title">{slide.title}</h2>
                <p className="hero-caption-text">{slide.text}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="carousel-slide active">
            <div className="hero-caption">
              <div className="hero-caption-brand">RYDORA</div>
              <h2 className="hero-caption-title">Welcome to Rydora</h2>
              <p className="hero-caption-text">Your toll management platform</p>
            </div>
          </div>
        )}
      </div>
      <div className="hero-overlay"></div>
      
      {slides.length > 0 && (
        <div className="hero-controls">
          <button className="hero-control prev" onClick={() => changeSlide(-1)}>
            <i className="fas fa-long-arrow-alt-left"></i>
          </button>
          <button className="hero-control next" onClick={() => changeSlide(1)}>
            <i className="fas fa-long-arrow-alt-right"></i>
          </button>
        </div>
      )}
    </section>
  );
};

export default Home;

