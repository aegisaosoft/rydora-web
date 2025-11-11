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

import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  userAgent: string;
}

const useDeviceDetection = (): DeviceInfo => {
  const [device, setDevice] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    userAgent: ''
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      
      const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTabletUA = /iPad|Android(?=.*Tablet)|Windows(?=.*Touch)/i.test(userAgent);
      
      const isMobileWidth = width <= 768;
      const isTabletWidth = width > 768 && width <= 1024;
      
      setDevice({
        isMobile: isMobileUA || isMobileWidth,
        isTablet: isTabletUA || isTabletWidth,
        isDesktop: !isMobileUA && !isTabletUA && width > 1024,
        screenWidth: width,
        userAgent: userAgent
      });
    };

    // Initial detection
    detectDevice();

    // Handle window resize
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return device;
};

export default useDeviceDetection;
