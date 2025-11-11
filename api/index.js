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

const { app } = require('@azure/functions');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const expressApp = express();

// Security middleware
expressApp.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://ashy-forest-035b62d0f.3.azurestaticapps.net", "https://agsm-back.azurewebsites.net", "https://agsm-rydora-production-api.azurewebsites.net"]
    }
  }
}));

// CORS configuration
expressApp.use(cors({
  origin: ['https://ashy-forest-035b62d0f.3.azurestaticapps.net', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Environment'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
expressApp.use('/api/', limiter);

// Body parsing middleware
expressApp.use(express.json({ limit: '10mb' }));
expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
expressApp.use(compression());

// Logging middleware
expressApp.use(morgan('combined'));

// Session configuration
expressApp.use(session({
  secret: process.env.SESSION_SECRET || 'rydora-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    maxAge: 60 * 60 * 1000, // 1 hour
    sameSite: 'none'
  }
}));

// API Routes
// Auth routes
expressApp.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint working', timestamp: new Date().toISOString() });
});

expressApp.post('/api/auth/register', (req, res) => {
  res.json({ message: 'Register endpoint working', timestamp: new Date().toISOString() });
});

expressApp.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logout endpoint working', timestamp: new Date().toISOString() });
});

// Rydora API routes
expressApp.get('/api/rydora/*', (req, res) => {
  res.json({ message: 'Rydora API endpoint working', path: req.path, timestamp: new Date().toISOString() });
});

expressApp.post('/api/rydora/*', (req, res) => {
  res.json({ message: 'Rydora API endpoint working', path: req.path, timestamp: new Date().toISOString() });
});

// General API routes
expressApp.get('/api/*', (req, res) => {
  res.json({ message: 'API endpoint working', path: req.path, timestamp: new Date().toISOString() });
});

expressApp.post('/api/*', (req, res) => {
  res.json({ message: 'API endpoint working', path: req.path, timestamp: new Date().toISOString() });
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
expressApp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
expressApp.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.url });
});

// Azure Functions handler
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    return new Promise((resolve) => {
      expressApp(request, null, (err) => {
        if (err) {
          context.log.error('Express error:', err);
          resolve({
            status: 500,
            body: JSON.stringify({ message: 'Internal server error' })
          });
        }
      });
    });
  }
});
