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
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();

// rydoraApi configuration
const RYDORA_API_CONFIG = {
  baseUrl: process.env.RYDORA_API_BASE_URL || 'https://agsm-back.azurewebsites.net',
  baseUrlDev: process.env.RYDORA_API_BASE_DEV_URL || 'https://agsm-back.azurewebsites.net',
  // Use the same production API as the old project since it works fine
  baseUrlProd: process.env.RYDORA_API_BASE_URL_PROD || 'https://agsm-huur-production-api.azurewebsites.net',
  apiKey: process.env.RYDORA_API_KEY || ''
};

// Function to get API base URL based on environment parameter
function getApiBaseUrl(req) {
  // Get environment from request headers (set by frontend)
  const environment = req.headers['x-environment'] || 'development';
  
  console.log('🔧 Auth route - Environment from header:', environment);
  
  // Use environment parameter to determine API URL
  let selectedUrl;
  switch (environment) {
    case 'production':
      selectedUrl = RYDORA_API_CONFIG.baseUrlProd;
      break;
    case 'development':
    default:
      selectedUrl = RYDORA_API_CONFIG.baseUrlDev;
      break;
  }
  
  console.log('🔗 Auth route - Selected API URL for environment', environment, ':', selectedUrl);
  return selectedUrl;
}

// Simple test function to verify environment switching
function testEnvironmentSwitching(req) {
  const environment = req.headers['x-environment'] || 'development';
  const apiUrl = getApiBaseUrl(req);
  
  console.log('🧪 Test - Environment:', environment, 'API URL:', apiUrl);
  return { environment, apiUrl };
}

// Mock user data - DEVELOPMENT ONLY - Remove in production
const users = [
  {
    id: 1,
    email: 'admin@rydora.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    firstName: 'Admin',
    lastName: 'User',
    phone: '347-444-2424',
    addressLine1: '34 Middletown Ave',
    city: 'Atlantic Highlands',
    stateId: 1,
    isOwner: true,
    isAdmin: true,
    imageURL: '/images/_img0011.jpg'
  },
  {
    id: 2,
    email: 'mirzoev.siyovush@outlook.com',
    password: 'Iroc@2020', // Using plain text for demo - in production, this would be hashed
    firstName: 'Siyovush',
    lastName: 'Mirzoev',
    phone: '347-444-2424',
    addressLine1: '34 Middletown Ave',
    city: 'Atlantic Highlands',
    stateId: 1,
    isOwner: true,
    isAdmin: true,
    imageURL: '/images/_img0022.jpg'
  }
];

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      // Get environment-specific API base URL
      const apiBaseUrl = getApiBaseUrl(req);
      
      console.log('Attempting login with:', { email, apiBaseUrl, hasApiKey: !!RYDORA_API_CONFIG.apiKey });
      
      // Call real rydoraApi authentication
      const response = await axios.post(`${apiBaseUrl}/UserAuth/signin`, {
        email: email,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': RYDORA_API_CONFIG.apiKey
        },
        timeout: 30000
      });
      
      console.log('rydoraApi response status:', response.status);

      const apiResponse = response.data;
      console.log('rydoraApi response data:', apiResponse);
      
      // Check if authentication was successful
      if (apiResponse.reason === 0 && apiResponse.result) {
        // Use API response data - map SigninResult properties
        const user = {
          id: apiResponse.result.id || 1,
          email: apiResponse.result.email || email,
          firstName: apiResponse.result.firstName || 'User',
          lastName: apiResponse.result.lastName || 'User',
          middleName: apiResponse.result.middleName || null,
          nickName: apiResponse.result.nickName || '',
          phone: apiResponse.result.phone || '',
          addressLine1: apiResponse.result.addressLine1 || '',
          addressLine2: apiResponse.result.addressLine2 || null,
          city: apiResponse.result.city || '',
          cityId: apiResponse.result.cityId || '',
          stateId: apiResponse.result.stateId || 1,
          birthDate: apiResponse.result.birthDate || null,
          employerId: apiResponse.result.employerId || '',
          isOwner: apiResponse.result.isOwner || false,
          isRenter: apiResponse.result.isRenter || false,
          isEmployee: apiResponse.result.isEmployee || false,
          isAdmin: apiResponse.result.isAdmin || false,
          isEmployeeRequestAccepted: apiResponse.result.isEmployeeRequestAccepted || false,
          isCompany: apiResponse.result.isCompany || false,
          imageURL: apiResponse.result.imageURL || '/images/rydora-logo.png', // Use real ImageURL from API
          rydoraApiToken: apiResponse.result.token
        };

        // Store user data AND token in session
        req.session.user = user;
        req.session.rydoraApiToken = user.rydoraApiToken;

        console.log('Session created with user:', user.email);
        console.log('Token stored in session:', user.rydoraApiToken ? 'Yes' : 'No');

        // Return response in format expected by frontend
        res.json({
          success: true,
          token: user.rydoraApiToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            nickName: user.nickName,
            phone: user.phone,
            addressLine1: user.addressLine1,
            addressLine2: user.addressLine2,
            city: user.city,
            cityId: user.cityId,
            stateId: user.stateId,
            birthDate: user.birthDate,
            employerId: user.employerId,
            isOwner: user.isOwner,
            isRenter: user.isRenter,
            isEmployee: user.isEmployee,
            isAdmin: user.isAdmin,
            isEmployeeRequestAccepted: user.isEmployeeRequestAccepted,
            isCompany: user.isCompany,
            imageURL: user.imageURL
          }
        });
        return;
      } else {
        // Authentication failed
        return res.status(401).json({ 
          message: apiResponse.message || 'Invalid credentials' 
        });
      }
    } catch (apiError) {
      console.error('rydoraApi authentication error:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        code: apiError.code
      });
      
      // DEVELOPMENT ONLY: Fallback to mock authentication when API is unavailable
      console.log('Using fallback mock authentication for development');
      const user = users.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // In a real application, you would verify the password hash here
      // For now, we'll check against known passwords for demo users
      const validPasswords = {
        'admin@rydora.com': 'password',
        'mirzoev.siyovush@outlook.com': 'Iroc@2020'
      };
      
      if (!password || password !== validPasswords[email]) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // DEVELOPMENT ONLY: Create a mock rydoraApi token for fallback authentication
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          isOwner: user.isOwner,
          type: 'mock-rydora-token'
        },
        process.env.JWT_SECRET || 'rydora-jwt-secret-change-in-production',
        { expiresIn: '24h' }
      );

      // Store user data in session
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        addressLine1: user.addressLine1,
        city: user.city,
        stateId: user.stateId,
        isOwner: user.isOwner,
        isAdmin: user.isAdmin,
        imageURL: user.imageURL
      };

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          addressLine1: user.addressLine1,
          city: user.city,
          stateId: user.stateId,
          isOwner: user.isOwner,
          isAdmin: user.isAdmin,
          imageURL: user.imageURL
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out, please try again' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Clear session when environment changes
router.post('/clear-session', (req, res) => {
  console.log('Environment change - clearing session');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error clearing session on environment change:', err);
      return res.status(500).json({ message: 'Could not clear session' });
    }
    res.json({ message: 'Session cleared for environment change' });
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth API is working', timestamp: new Date().toISOString() });
});

// Handle preflight requests
router.options('/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Get current user
router.get('/me', async (req, res) => {
  console.log('=== AUTH/ME REQUEST ===');
  console.log('Session user:', req.session.user);
  console.log('isAdmin in session:', req.session.user?.isAdmin);
  console.log('isOwner in session:', req.session.user?.isOwner);
  console.log('Authorization header:', req.headers.authorization);
  
  // First check for token in Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    console.log('Token found in header');
    
    // If we have a session with this token, return the session user
    if (req.session.user && req.session.rydoraApiToken === token) {
      console.log('Returning session user with matching token');
      return res.json({ user: req.session.user });
    }
    
    // If no session or token doesn't match, validate token with rydoraApi
    try {
      const apiBaseUrl = getApiBaseUrl(req);
      console.log('Validating token with rydoraApi:', apiBaseUrl);
      
      // Call rydoraApi to validate token and get user info
      const response = await axios.get(`${apiBaseUrl}/UserAuth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.result) {
        const userData = response.data.result;
        
        // Store user in session for future requests
        req.session.user = {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          middleName: userData.middleName,
          nickName: userData.nickName,
          phone: userData.phone,
          addressLine1: userData.addressLine1,
          addressLine2: userData.addressLine2,
          city: userData.city,
          cityId: userData.cityId,
          stateId: userData.stateId,
          birthDate: userData.birthDate,
          employerId: userData.employerId,
          isOwner: userData.isOwner,
          isRenter: userData.isRenter,
          isEmployee: userData.isEmployee,
          isAdmin: userData.isAdmin,
          isEmployeeRequestAccepted: userData.isEmployeeRequestAccepted,
          isCompany: userData.isCompany,
          imageURL: userData.imageURL
        };
        req.session.rydoraApiToken = token;
        
        console.log('Token validated and session updated');
        return res.json({ user: req.session.user });
      }
    } catch (apiError) {
      console.log('Token validation failed:', apiError.message);
      // Token is invalid, continue to check session
    }
  }
  
  // Fallback to session-based auth
  if (!req.session.user) {
    console.log('No session user found and no valid token');
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  console.log('Returning session user (no token)');
  res.json({ user: req.session.user });
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rydora-jwt-secret-change-in-production');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Test route for environment switching
router.get('/test-env', (req, res) => {
  const result = testEnvironmentSwitching(req);
  res.json({
    message: 'Environment test from auth route',
    ...result,
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, verifyToken };

