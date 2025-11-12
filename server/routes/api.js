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

const express = require('express');
const { verifyToken } = require('./auth');
const router = express.Router();

// General API routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Rydora-US API'
  });
});

// Get app configuration
router.get('/config', (req, res) => {
  res.json({
    appName: 'Rydora',
    version: '1.0.0',
    features: {
      ezPass: true,
      parkingViolations: true,
      nycViolations: true,
      payments: true
    }
  });
});

// Get current Rydora API configuration
router.get('/rydora-api-config', (req, res) => {
  const environment = req.headers['x-environment'] || 'development';
  
  // Import the same config from rydoraApi.js
  const RYDORA_API_CONFIG = {
    baseUrl: process.env.RYDORA_API_BASE_URL || 'https://agsm-back.azurewebsites.net',
    baseUrlDev: process.env.RYDORA_API_BASE_DEV_URL || 'https://agsm-back.azurewebsites.net',
    // Use the same production API as the old project since it works fine
    baseUrlProd: process.env.RYDORA_API_BASE_URL_PROD || 'https://agsm-huur-production-api.azurewebsites.net'
  };

  // Determine which URL is currently being used
  let currentUrl;
  switch (environment) {
    case 'production':
      currentUrl = RYDORA_API_CONFIG.baseUrlProd;
      break;
    case 'development':
    default:
      currentUrl = RYDORA_API_CONFIG.baseUrlDev;
      break;
  }

  console.log('🔧 Environment from header:', environment);
  console.log('🔗 Selected API URL:', currentUrl);

  res.json({
    environment,
    currentRydoraApiUrl: currentUrl,
    allConfigs: RYDORA_API_CONFIG
  });
});

// Test route to verify environment switching
router.get('/test-environment', (req, res) => {
  const environment = req.headers['x-environment'] || 'development';
  const timestamp = new Date().toISOString();
  
  console.log('🧪 Test route called with environment:', environment);
  
  res.json({
    message: 'Environment test',
    environment,
    timestamp,
    working: true
  });
});

// Protected route example
router.get('/protected', verifyToken, (req, res) => {
  res.json({ 
    message: 'This is a protected route',
    user: req.user 
  });
});

module.exports = router;

