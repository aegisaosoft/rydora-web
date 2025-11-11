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
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { router: authRoutes } = require('./routes/auth');
const apiRoutes = require('./routes/api');
const rydoraApiRoutes = require('./routes/rydoraApi');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure correct protocol/secure cookie handling behind reverse proxies (e.g., Azure App Service)
// This allows Express to respect X-Forwarded-* headers for determining HTTPS
app.set('trust proxy', 1);

// Security middleware - HTTP compatible
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "https://192.168.1.134", "https://192.168.1.134:9443", "https://rydora.ngrok.io", "https://agsm-back.azurewebsites.net", "https://agsm-rydora-production-api.azurewebsites.net"]
    }
  },
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false
}));

// CORS configuration - MUST come before rate limiting
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://192.168.1.134:9443', 'https://192.168.1.134', 'http://192.168.1.134:5000', 'https://rydora.ngrok.io'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://192.168.1.134:9443', 'https://rydora.ngrok.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Environment'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Rate limiting DISABLED for development - unlimited requests
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
//   message: 'Too many requests from this IP, please try again later.',
//   skip: (req) => {
//     // Skip rate limiting for login attempts
//     return req.path === '/api/auth/login';
//   }
// });
// app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Session configuration
const sameSiteSetting = (process.env.SESSION_COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase();
const sessionCookie = {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  sameSite: sameSiteSetting, // 'none' enables cross-site cookies; requires secure
};
if (process.env.SESSION_COOKIE_DOMAIN) {
  sessionCookie.domain = process.env.SESSION_COOKIE_DOMAIN;
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'rydora-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: sessionCookie
}));

// API Routes
console.log('Registering routes...');
app.use('/api/auth', authRoutes);
console.log('Auth routes registered');
app.use('/api/rydora', rydoraApiRoutes);
console.log('rydoraApi routes registered');
app.use('/api', apiRoutes);
console.log('API routes registered');

// Health check endpoint - MUST come before catch-all route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from React build (both production and Azure deployment)
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all route for React Router - MUST be LAST
app.get('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found', path: req.path });
  }
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

if (false) { // Disabled the development-only block
  // Development mode - show API info
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Rydora US API Server', 
      status: 'running',
      version: '1.0.0',
      mode: 'development',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        rydora: '/api/rydora'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.url });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle port conflicts gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying to kill existing process...`);
    
    // Try to find and kill the process using the port
    const { exec } = require('child_process');
    exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              pids.add(pid);
            }
          }
        });
        
        pids.forEach(pid => {
          exec(`taskkill /f /pid ${pid}`, (killError) => {
            if (!killError) {
              console.log(`Killed process ${pid} using port ${PORT}`);
            }
          });
        });
        
        // Wait a moment and try again
        setTimeout(() => {
          console.log('Retrying to start server...');
          const newServer = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
          });
          
          newServer.on('error', (retryErr) => {
            if (retryErr.code === 'EADDRINUSE') {
              console.error(`Still cannot start server on port ${PORT}. Please manually kill the process using this port.`);
              process.exit(1);
            }
          });
        }, 2000);
      } else {
        console.error(`Cannot find process using port ${PORT}. Please manually check and kill any process using this port.`);
        process.exit(1);
      }
    });
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

