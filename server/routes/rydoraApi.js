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
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Test route to verify server is running updated code
router.get('/test-server-update', (req, res) => {
  console.log('=== SERVER UPDATE TEST ROUTE HIT ===');
  res.json({ message: 'Server is running updated code', timestamp: new Date().toISOString() });
});

// Test PUT route to see if PUT requests work at all
router.put('/test-put', (req, res) => {
  console.log('=== TEST PUT ROUTE HIT ===');
  console.log('Request body:', req.body);
  res.json({ message: 'PUT request works - server restarted', timestamp: new Date().toISOString() });
});

// rydoraApi configuration
const RYDORA_API_CONFIG = {
  baseUrl: process.env.RYDORA_API_BASE_URL || 'https://agsm-back.azurewebsites.net',
  baseUrlDev: process.env.RYDORA_API_BASE_DEV_URL || 'https://agsm-back.azurewebsites.net',
  baseUrlProd: process.env.RYDORA_API_BASE_URL_PROD || 'https://agsm-rydora-production-api.azurewebsites.net',
  apiKey: process.env.RYDORA_API_KEY || 'your-rydora-api-key-here'
};

// Function to get API base URL based on environment parameter
function getApiBaseUrl(req) {
  // Get environment from request headers (set by frontend)
  const environment = req.headers['x-environment'] || 'development';
  
  console.log('Environment from header:', environment);
  
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
  
  console.log('Selected API URL for environment', environment, ':', selectedUrl);
  return selectedUrl;
}

// Create axios instance for rydoraApi (default)
const rydoraApiClient = axios.create({
  baseURL: RYDORA_API_CONFIG.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Function to create environment-specific axios client
function createrydoraApiClient(req) {
  return axios.create({
    baseURL: getApiBaseUrl(req),
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Try multiple possible endpoint paths to handle API path differences across deployments
async function getWithFallbacks(req, paths, options) {
  let lastError;
  // Use environment-specific client
  const client = createrydoraApiClient(req);
  
  for (const p of paths) {
    try {
      // Merge headers properly with the client headers
      const requestOptions = {
        ...options,
        headers: {
          ...client.defaults.headers,
          ...options.headers
        }
      };
      console.log(`Trying ${client.defaults.baseURL}${p} with headers:`, requestOptions.headers);
      const response = await client.get(p, requestOptions);
      return response;
    } catch (err) {
      lastError = err;
      console.log(`Error on path ${p}:`, err.response?.status, err.response?.data);
      if (err.response && err.response.status === 404) {
        continue; // try next path on 404
      }
      // for timeout errors, also try next path
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        console.log(`Timeout on path ${p}, trying next path...`);
        continue;
      }
      // for other errors, stop and throw
      throw err;
    }
  }
  throw lastError;
}

// Helper to forward Authorization header from client to rydoraApi
function getForwardAuthHeaders(req) {
  const headers = {};
  
  console.log('=== SESSION AUTH DEBUG ===');
  console.log('Session exists:', !!req.session);
  console.log('Session user:', !!req.session?.user);
  console.log('Session token:', !!req.session?.rydoraApiToken);
  
  // First priority: use token from session (most reliable)
  if (req.session?.rydoraApiToken) {
    console.log('Using token from session');
    headers.Authorization = `Bearer ${req.session.rydoraApiToken}`;
  }
  // Fallback: use client Authorization header
  else if (req.headers?.authorization) {
    const authHeader = req.headers.authorization;
    const token = authHeader.replace('Bearer ', '');
    console.log('Using token from client header');
    headers.Authorization = `Bearer ${token}`;
  }
  // Last resort: use API key
  else if (RYDORA_API_CONFIG.apiKey && RYDORA_API_CONFIG.apiKey !== 'your-rydora-api-key-here') {
    console.log('Using API key as fallback');
    headers.Authorization = `Bearer ${RYDORA_API_CONFIG.apiKey}`;
  } else {
    console.log('No authentication available');
  }
  
  console.log('Final auth header set:', !!headers.Authorization);
  console.log('=== END SESSION AUTH DEBUG ===');
  
  return headers;
}

// Helpers to read endpoint paths from environment and provide sensible fallbacks
function parsePathsFromEnv(envVarName, defaultPaths) {
  const raw = process.env[envVarName];
  if (!raw || raw.trim() === '') return defaultPaths;
  return raw.split(',').map(p => p.trim()).filter(Boolean);
}

// Signin endpoint
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        reason: 1, 
        message: 'Email and password are required' 
      });
    }

    const client = createrydoraApiClient(req);
    const response = await client.post('/api/signin', {
      email,
      password
    });

    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi signin error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        reason: 1, 
        message: 'Failed to connect to rydoraApi' 
      });
    }
  }
});

// Get violations endpoint
router.get('/violations', async (req, res) => {
  try {
    const { licensePlate, state } = req.query;
    const client = createrydoraApiClient(req);
    
    const response = await client.get('/ExternalViolation/get-all', {
      params: { licensePlate, state },
      headers: getForwardAuthHeaders(req)
    });

    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi violations error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch violations' 
      });
    }
  }
});

// Get single violation by ID endpoint
router.get('/violation/get/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = createrydoraApiClient(req);
    
    console.log('=== VIOLATION GET REQUEST ===');
    console.log('Getting violation with ID:', id);
    console.log('Auth headers:', getForwardAuthHeaders(req));
    
    const response = await client.get(`/ExternalViolation/get/${id}`, {
      headers: getForwardAuthHeaders(req)
    });

    console.log('Violation response status:', response.status);
    console.log('Violation response data:', JSON.stringify(response.data, null, 2));

    // Return the response data as-is (should contain result, reason, message, stackTrace)
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi violation get error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        reason: -1,
        message: 'Failed to fetch violation: ' + error.message,
        result: null,
        stackTrace: null
      });
    }
  }
});

// Update payment status for violations endpoint (MUST come before /violation/update/:id)
router.put('/ExternalViolation/update-payment-status', async (req, res) => {
  console.log('=== VIOLATION UPDATE PAYMENT STATUS ROUTE HIT ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  
  try {
    const { ids, paymentStatus, companyId } = req.body;
    const { companyId: queryCompanyId } = req.query;
    
    console.log('=== UPDATE VIOLATION PAYMENT STATUS REQUEST ===');
    console.log('Request body:', { ids, paymentStatus, companyId });
    
    // Build query string for companyId if supplied in query
    const params = new URLSearchParams();
    const effectiveCompanyId = (queryCompanyId && String(queryCompanyId).trim() !== '') ? String(queryCompanyId) : (companyId || '');
    if (effectiveCompanyId && effectiveCompanyId.trim() !== '') {
      params.append('companyId', effectiveCompanyId);
    }
    const queryString = params.toString();
    const endpoint = `/ExternalViolation/update-payment-status${queryString ? '?' + queryString : ''}`;
    
    console.log('Calling rydoraApi endpoint:', endpoint);
    console.log('Request payload:', { ids, paymentStatus, companyId: effectiveCompanyId });
    
    const client = createrydoraApiClient(req);
    // Use the same auth strategy as GET /violations: forward only client/session auth headers
    const headers = getForwardAuthHeaders(req);

    const response = await client.put(endpoint, {
      ids,
      paymentStatus,
      companyId: effectiveCompanyId
    }, {
      headers,
      timeout: 15000
    });
    
    console.log('Update violation payment status response status:', response.status);
    console.log('Update violation payment status response data:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi update violation payment status error:', error);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to update violation payment status' 
      });
    }
  }
});

// Update violation by ID endpoint
router.put('/violation/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const violationData = req.body;
    const client = createrydoraApiClient(req);
    
    console.log('=== VIOLATION UPDATE SERVER REQUEST ===');
    console.log('Violation ID:', id);
    console.log('Violation data:', JSON.stringify(violationData, null, 2));
    console.log('Auth headers:', getForwardAuthHeaders(req));
    
    const response = await client.put(`/ExternalViolation/update/${id}`, violationData, {
      headers: getForwardAuthHeaders(req)
    });

    console.log('Violation update response status:', response.status);
    console.log('Violation update response data:', JSON.stringify(response.data, null, 2));

    res.json(response.data);
  } catch (error) {
    console.error('=== VIOLATION UPDATE SERVER ERROR ===');
    console.error('rydoraApi violation update error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({ 
        reason: -1,
        message: 'Failed to update violation: ' + error.message,
        result: null,
        stackTrace: null
      });
    }
  }
});

// Delete violation by ID endpoint
router.delete('/violation/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = createrydoraApiClient(req);
    
    const response = await client.delete(`/ExternalViolation/delete/${id}`, {
      headers: getForwardAuthHeaders(req)
    });

    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi violation delete error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to delete violation' 
      });
    }
  }
});

// Get EZ Pass data endpoint
router.get('/ezpass', async (req, res) => {
  try {
    const { dateFrom, dateTo, page = 1 } = req.query;
    console.log('EzPass request:', { dateFrom, dateTo, page });

    // Try the correct EZ Pass endpoint paths (matching C# solution)
    const paths = [
      `/TollPayment/get-ezpass-charges/${dateFrom}/${dateTo}`
    ];
    
    console.log('Trying EZ Pass paths:', paths);
    
    const response = await getWithFallbacks(
      req,
      paths,
      {
        headers: getForwardAuthHeaders(req)
      }
    );

    console.log('EZ Pass response status:', response.status);
    console.log('EZ Pass response data:', JSON.stringify(response.data, null, 2));
    
    // Transform the API data to match the exact C# EzpassCharge class structure
    const transformedData = {
      data: response.data && response.data.result && Array.isArray(response.data.result) ? response.data.result.map((record, index) => ({
        id: record.id || index + 1,
        externalFleetCode: record.externalFleetCode || null,
        fleetName: record.fleetName || null,
        vehicleId: record.vehicleId || null,
        vin: record.vin || null,
        plateNumber: record.plateNumber || null,
        driverFirstName: record.driverFirstName || null,
        driverLastName: record.driverLastName || null,
        address1: record.address1 || null,
        address2: record.address2 || null,
        city: record.city || null,
        state: record.state || null,
        zip: record.zip || null,
        driverEmailAddress: record.driverEmailAddress || null,
        tollId: record.tollId || 0,
        tollDate: record.tollDate || '',
        tollTime: record.tollTime || null,
        tollExitDate: record.tollExitDate || null,
        tollAuthority: record.tollAuthority || null,
        tollAuthorityDescription: record.tollAuthorityDescription || null,
        transactionType: record.transactionType || null,
        entry: record.entry || null,
        exit: record.exit || null,
        amount: record.amount || 0,
        currency: record.currency || null,
        dateInvoiceDeployed: record.dateInvoiceDeployed || '',
        infoHeader: record.infoHeader || null,
        dailyPaymentId: record.dailyPaymentId || null,
        adjustedAmount: record.adjustedAmount || 0,
        originalPayerId: record.originalPayerId || null,
        transponderNumber: record.transponderNumber || null
      })) : [],
      totalCount: response.data && response.data.result && Array.isArray(response.data.result) ? response.data.result.length : 0,
      page: parseInt(req.query.page) || 1,
      totalPages: response.data && response.data.result && Array.isArray(response.data.result) ? Math.ceil(response.data.result.length / 10) : 0
    };
    
    console.log('Transformed EZ Pass data:', JSON.stringify(transformedData, null, 2));
    
    res.json(transformedData);
  } catch (error) {
    console.error('rydoraApi EZ Pass error:', error);

    // If all API endpoints return 404, return empty data instead of error
    if (error.response && error.response.status === 404) {
      console.log('All API endpoints returned 404, returning empty data');
      res.json({
        data: [],
        totalCount: 0,
        page: parseInt(req.query.page) || 1,
        totalPages: 0
      });
    } else if (error.response) {
      console.log('Error response status:', error.response.status);
      console.log('Error response data:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.log('Non-response error:', error.message);
      res.status(500).json({
        message: 'Failed to fetch EZ Pass data'
      });
    }
  }
});

// Export EZ Pass data to Excel
router.post('/ezpass/export/excel', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;
    
    const client = createrydoraApiClient(req);
    const response = await client.post(
      '/api/ezpass/export/excel',
      { dateFrom, dateTo },
      { headers: getForwardAuthHeaders(req) }
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ezpass-export.xlsx"');
    res.send(response.data);
  } catch (error) {
    console.error('rydoraApi EZ Pass Excel export error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to export EZ Pass data to Excel' 
      });
    }
  }
});

// Export EZ Pass data to PDF
router.post('/ezpass/export/pdf', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;
    
    const client = createrydoraApiClient(req);
    const response = await client.post(
      '/api/ezpass/export/pdf',
      { dateFrom, dateTo },
      { headers: getForwardAuthHeaders(req) }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ezpass-export.pdf"');
    res.send(response.data);
  } catch (error) {
    console.error('rydoraApi EZ Pass PDF export error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to export EZ Pass data to PDF' 
      });
    }
  }
});

// Get parking violations endpoint
router.get('/parking-violations', async (req, res) => {
  try {
    const { dateFrom, dateTo, page = 1, ownerId } = req.query;
    
    // Build query string with optional CompanyId parameter (only if not empty or null)
    const params = new URLSearchParams();
    if (dateFrom) {
      params.append('dateFrom', dateFrom);
    }
    if (dateTo) {
      params.append('dateTo', dateTo);
    }
    if (page) {
      params.append('page', page);
    }
    if (ownerId && ownerId.trim() !== '') {
      params.append('CompanyId', ownerId); // Use CompanyId parameter name
    }
    
    const queryString = params.toString();
    
    // Try the correct endpoint paths with query parameters
    const paths = [
      `/ExternalViolation/get-all?${queryString}`
    ];
    
    console.log('Trying parking violations paths:', paths);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await getWithFallbacks(
      req,
      paths,
      {
        headers: getForwardAuthHeaders(req)
      }
    );

    console.log('Parking violations response status:', response.status);
    
    // Transform the API data to match the exact C# ParkingViolation class structure
    const transformedData = {
      data: response.data && response.data.result && Array.isArray(response.data.result) ? response.data.result.map((violation, index) => ({
        id: violation.id || index + 1,
        citationNumber: violation.citationNumber || null,
        noticeNumber: violation.noticeNumber || '',
        agency: violation.agency || '',
        address: violation.address || null,
        tag: violation.tag || '',
        state: violation.state || '',
        issueDate: violation.issueDate || null,
        startDate: violation.startDate || null,
        endDate: violation.endDate || null,
        amount: violation.amount || 0,
        currency: violation.currency || 'USD',
        paymentStatus: typeof violation.paymentStatus === 'number' ? violation.paymentStatus : 1,
        fineType: violation.fineType || 0,
        note: violation.note || null,
        link: violation.link || violation.Link || null,
        driver: violation.driver || violation.driverName || (violation.driverFirstName && violation.driverLastName ? `${violation.driverFirstName} ${violation.driverLastName}` : null) || null
      })) : [],
      totalCount: response.data && response.data.result && Array.isArray(response.data.result) ? response.data.result.length : 0,
      page: parseInt(req.query.page) || 1,
      totalPages: response.data && response.data.result && Array.isArray(response.data.result) ? Math.ceil(response.data.result.length / 10) : 0
    };
    
    res.json(transformedData);
  } catch (error) {
    console.error('rydoraApi parking violations error:', error);
    
    // If all API endpoints return 404, return empty data instead of error
    if (error.response && error.response.status === 404) {
      console.log('All API endpoints returned 404, returning empty data');
      res.json({
        data: [],
        totalCount: 0,
        page: parseInt(req.query.page) || 1,
        totalPages: 0
      });
    } else if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch parking violations' 
      });
    }
  }
});

// Export parking violations to Excel
router.post('/parking-violations/export/excel', async (req, res) => {
  try {
    const { dateFrom, dateTo, ownerId } = req.body;
    
    // Build request body with optional CompanyId parameter (only if not empty or null)
    const requestBody = { dateFrom, dateTo };
    if (ownerId && ownerId.trim() !== '') {
      requestBody.CompanyId = ownerId;
    }
    
    const client = createrydoraApiClient(req);
    const response = await client.post(
      '/api/parking-violations/export/excel',
      requestBody,
      { headers: getForwardAuthHeaders(req) }
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="parking-violations-export.xlsx"');
    res.send(response.data);
  } catch (error) {
    console.error('rydoraApi parking violations Excel export error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to export parking violations to Excel' 
      });
    }
  }
});

// Export parking violations to PDF
router.post('/parking-violations/export/pdf', async (req, res) => {
  try {
    const { dateFrom, dateTo, ownerId } = req.body;
    
    // Build request body with optional CompanyId parameter (only if not empty or null)
    const requestBody = { dateFrom, dateTo };
    if (ownerId && ownerId.trim() !== '') {
      requestBody.CompanyId = ownerId;
    }
    
    const client = createrydoraApiClient(req);
    const response = await client.post(
      '/api/parking-violations/export/pdf',
      requestBody,
      { headers: getForwardAuthHeaders(req) }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="parking-violations-export.pdf"');
    res.send(response.data);
  } catch (error) {
    console.error('rydoraApi parking violations PDF export error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to export parking violations to PDF' 
      });
    }
  }
});

// Get tolls endpoint
router.get('/tolls', async (req, res) => {
  try {
    const { dateFrom, dateTo, page = 1, ownerId } = req.query;
    
    // Build query string with optional CompanyId parameter (matching C# API)
    let queryString = `dateFrom=${dateFrom}&dateTo=${dateTo}`;
    if (ownerId && ownerId.trim() !== '') {
      queryString += `&CompanyId=${ownerId}`;
    }
    
    // Try the correct endpoint paths with query parameters
    const paths = [
      `/api/ExternalToll/get-all?${queryString}`,
      `/tolls/get-all?${queryString}`,
      `/api/tolls?${queryString}`,
      `/toll/get-all?${queryString}` // Alternative naming
    ];
    
    console.log('=== TOLLS API REQUEST ===');
    console.log('Query params:', req.query);
    console.log('Date from:', dateFrom);
    console.log('Date to:', dateTo);
    console.log('Owner ID:', ownerId);
    console.log('Query string:', queryString);
    console.log('Trying tolls paths:', paths);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await getWithFallbacks(
      req,
      paths,
      {
        headers: getForwardAuthHeaders(req)
      }
    );
    
    console.log('Tolls response status:', response.status);
    console.log('Tolls response data structure:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi tolls error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch tolls: ' + error.message
      });
    }
  }
});

// Get invoice endpoint
router.get('/invoice', async (req, res) => {
  try {
    console.log('=== INVOICE REQUEST ===');
    console.log('Request query:', req.query);
    
    // Return invoice data with the exact structure requested
    const invoiceData = {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "companyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "invoiceDate": "2025-10-16T13:26:24.729Z",
      "status": 0,
      "totalAmount": 0,
      "number": "Invoice number",
      "payments": [
        {
          "name": "string",
          "amount": 0,
          "count": 0
        }
      ]
    };
    
    console.log('Returning invoice data:', JSON.stringify(invoiceData, null, 2));
    res.json(invoiceData);
    
  } catch (error) {
    console.error('Invoice endpoint error:', error);
    
    res.status(500).json({
      reason: -1,
      message: 'Failed to fetch invoice: ' + error.message
    });
  }
});

// Get invoice details endpoint
router.get('/invoice-details', async (req, res) => {
  try {
    const { dateFrom, companyId } = req.query;
    
    // Build query string
    let queryString = '';
    if (dateFrom) queryString += `dateFrom=${dateFrom}`;
    if (companyId) queryString += `${queryString ? '&' : ''}companyId=${companyId}`;
    
    // Try the correct endpoint paths with query parameters
    const paths = [
      `/tolls-invoice-details/get-all${queryString ? '?' + queryString : ''}`,
      `/api/tolls-invoice-details${queryString ? '?' + queryString : ''}`,
      `/toll-invoice-details/get-all${queryString ? '?' + queryString : ''}` // Alternative naming
    ];
    
    console.log('Trying invoice details paths:', paths);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await getWithFallbacks(
      paths,
      {
        headers: getForwardAuthHeaders(req)
      }
    );
    
    console.log('Invoice details response status:', response.status);
    console.log('Invoice details response data structure:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi invoice details error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch invoice details: ' + error.message
      });
    }
  }
});

// Get invoice by company endpoint
router.get('/invoice-by-company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { date } = req.query;
    
    console.log('=== INVOICE BY COMPANY REQUEST ===');
    console.log('Company ID:', companyId);
    console.log('Date:', date);
    
    // Build query string
    let queryString = '';
    if (date) {
      queryString += `date=${date}`;
    }
    
    const endpoint = `/api/ExternalDailyInvoice/get-by-company/${companyId}${queryString ? '?' + queryString : ''}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await createrydoraApiClient(req).get(endpoint, {
      headers: getForwardAuthHeaders(req)
    });
    
    console.log('Invoice by company response status:', response.status);
    console.log('Invoice by company response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi invoice by company error:', error);
    
    // Check if it's a 404 with "Invoice not found for date" message
    if (error.response?.status === 404 && 
        error.response?.data && 
        typeof error.response.data === 'string' && 
        error.response.data.includes('Invoice not found for date')) {
      console.log('404 with "Invoice not found for date" message - treating as no data');
      // This is not an error, just no data found for this date
      res.status(200).json(null);
    } else if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch invoice by company: ' + error.message
      });
    }
  }
});

// Get invoice details by ID endpoint
router.get('/invoice-details-by-id/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log('=== GET INVOICE DETAILS BY ID REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    
    const endpoint = `/api/ExternalDailyInvoice/get-details/${invoiceId}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await createrydoraApiClient(req).get(endpoint, {
      headers: getForwardAuthHeaders(req)
    });
    
    console.log('Invoice details response status:', response.status);
    console.log('Invoice details response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi get invoice details error:', error);
    
    if (error.response) {
      console.log('Error response status:', error.response.status);
      console.log('Error response data:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch invoice details: ' + error.message
      });
    }
  }
});

// Submit invoice endpoint
router.post('/invoice-submit/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log('=== SUBMIT INVOICE REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    
    const endpoint = `/api/ExternalDailyInvoice/submit/${invoiceId}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await createrydoraApiClient(req).post(endpoint, {}, {
      headers: getForwardAuthHeaders(req)
    });
    
    console.log('Submit invoice response status:', response.status);
    console.log('Submit invoice response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi submit invoice error:', error);

        if (error.response) {
          console.log('Error response status:', error.response.status);
          console.log('Error response data:', JSON.stringify(error.response.data, null, 2));
          console.log('Error response headers:', error.response.headers);
          
          // Extract the actual error message from the response
          let errorMessage = error.response.data?.message || error.response.data?.error || 'Unknown error';

          
          // Check if the response body contains "Invoice not found." text (case insensitive)
          const responseText = JSON.stringify(error.response.data);
          if (responseText.toLowerCase().includes('invoice not found')) {
            errorMessage = 'Invoice not found.';
          } else {
            errorMessage = 'Bad Request';
          }
          
          res.status(error.response.status).json({
            reason: error.response.status,
            message: errorMessage
          });
        } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to submit invoice: ' + error.message
      });
    }
  }
});

// Fail invoice endpoint
router.post('/invoice-fail/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log('=== FAIL INVOICE REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    
    const endpoint = `/api/ExternalDailyInvoice/fail/${invoiceId}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await createrydoraApiClient(req).post(endpoint, {}, {
      headers: getForwardAuthHeaders(req)
    });
    
    console.log('Fail invoice response status:', response.status);
    console.log('Fail invoice response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi fail invoice error:', error);

    if (error.response) {
      console.log('Error response status:', error.response.status);
      console.log('Error response data:', JSON.stringify(error.response.data, null, 2));
      console.log('Error response headers:', error.response.headers);
      
      // Extract the actual error message from the response
      let errorMessage = error.response.data?.message || error.response.data?.error || 'Unknown error';
      
      // Check if the response body contains "Invoice not found." text (case insensitive)
      const responseText = JSON.stringify(error.response.data);
      if (responseText.toLowerCase().includes('invoice not found')) {
        errorMessage = 'Invoice not found.';
      } else {
        errorMessage = 'Bad Request';
      }
      
      res.status(error.response.status).json({
        reason: error.response.status,
        message: errorMessage
      });
    } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to mark invoice as failed: ' + error.message
      });
    }
  }
});

// Get pending payments endpoint
router.get('/pending-payments', async (req, res) => {
  try {
    const { ownerId } = req.query;
    
    // Build query string with optional ownerId parameter
    let queryString = '';
    if (ownerId && ownerId.trim() !== '') {
      queryString = `ownerId=${ownerId}`;
    }
    
    // Try the correct endpoint paths with query parameters
    const paths = [
      `/TollPayment/get-pending-payments${queryString ? '?' + queryString : ''}`,
      `/api/pending-payments${queryString ? '?' + queryString : ''}`,
      `/pending-payments${queryString ? '?' + queryString : ''}`
    ];
    
    console.log('Trying pending payments paths:', paths);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const response = await getWithFallbacks(
      paths,
      {
        headers: getForwardAuthHeaders(req)
      }
    );
    
    console.log('Pending payments response status:', response.status);
    console.log('Pending payments response data structure:', JSON.stringify(response.data, null, 2));
    
    // Return the response as-is since it's already in the correct format (direct array)
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi pending payments error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch pending payments: ' + error.message
      });
    }
  }
});

// Get NYC violations endpoint - proxy to NYC Open Data (no auth required)
router.get('/nyc-violations', async (req, res) => {
  try {
    console.log('=== NYC VIOLATIONS REQUEST (Public NYC API) ===');
    console.log('Request query:', req.query);
    
    const { licensePlates, dateFrom, dateTo, limit = 5000, offset = 0 } = req.query;
    
    // Parse license plates if provided as JSON string
    let plates = [];
    if (licensePlates) {
      try {
        plates = typeof licensePlates === 'string' ? JSON.parse(licensePlates) : licensePlates;
      } catch (e) {
        plates = Array.isArray(licensePlates) ? licensePlates : [licensePlates];
      }
    }
    
    console.log('License plates to search:', plates);
    
    if (!plates || plates.length === 0) {
      return res.json({
        rows: [],
        data: [],
        totalCount: 0,
        page: 1,
        totalPages: 0
      });
    }
    
    // Build Socrata API query
    const plateConditions = plates.map(plate => `plate='${plate.replace(/'/g, "''")}'`).join(' OR ');
    let whereClause = `(${plateConditions})`;
    
    if (dateFrom && dateTo) {
      whereClause += ` AND issue_date >= '${dateFrom}' AND issue_date <= '${dateTo}'`;
    }
    
    const socrataUrl = 'https://data.cityofnewyork.us/resource/nc67-uf89.json';
    const params = new URLSearchParams({
      '$limit': limit.toString(),
      '$offset': offset.toString(),
      '$where': whereClause
    });
    
    const fullUrl = `${socrataUrl}?${params}`;
    console.log('Calling NYC Open Data API:', fullUrl);
    
    // Call NYC Open Data API directly from server (no CORS issues)
    const response = await axios.get(fullUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Rydora-App/1.0'
      }
    });
    
    console.log('NYC API response status:', response.status);
    console.log('NYC API response data length:', response.data?.length || 0);
    
    // Transform to expected format
    const transformedData = {
      rows: response.data || [],
      data: response.data || [],
      totalCount: response.data?.length || 0,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil((response.data?.length || 0) / limit)
    };
    
    console.log('Returning NYC violations:', transformedData.totalCount, 'violations');
    
    res.json(transformedData);
    
  } catch (error) {
    console.error('NYC Open Data API error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    // Return empty data instead of error to prevent page crash
    res.json({
      rows: [],
      data: [],
      totalCount: 0,
      page: 1,
      totalPages: 0
    });
  }
});

// Get payments endpoint
router.get('/payments/:status', async (req, res) => {
  try {
    const { status } = req.params; // 'completed' or 'failed'
    
    const paths = [
      status === 'completed' ? `/TollPayment/get-complete-payments` : `/TollPayment/get-${status}-payments`
    ];
    
    console.log('Payments paths being used:', paths);
    
    const response = await getWithFallbacks(
      req,
      paths,
      { headers: getForwardAuthHeaders(req) }
    );

    console.log('Payments response status:', response.status);
    console.log('Payments response data:', JSON.stringify(response.data, null, 2));
    
    // Transform the API data to match the exact C# FailedPayment class structure
    const transformedData = {
      data: response.data && response.data.result && Array.isArray(response.data.result) ? response.data.result.map((payment, index) => ({
        id: payment.id || index + 1,
        carPlateNumber: payment.carPlateNumber || '',
        numberOfTolls: payment.numberOfTolls || 0,
        total: payment.total || 0,
        stripeAdjusted: payment.stripeAdjusted || '',
        dailyPaymentId: payment.dailyPaymentId || '',
        phone: payment.phone || '',
        email: payment.email || '',
        firstName: payment.firstName || '',
        lastName: payment.lastName || '',
        ownerFirstName: payment.ownerFirstName || '',
        ownerLastName: payment.ownerLastName || '',
        killSwitchId: payment.killSwitchId || '',
        tag: payment.tag || false,
        paymentFlowId: payment.paymentFlowId || '',
        invoiceDateDeployed: payment.invoiceDateDeployed || null,
        vin: payment.vin || '',
        bookingId: payment.bookingId || ''
      })) : [],
      totalCount: response.data && response.data.result && Array.isArray(response.data.result) ? response.data.result.length : 0,
      page: parseInt(req.query.page) || 1,
      totalPages: response.data && response.data.result && Array.isArray(response.data.result) ? Math.ceil(response.data.result.length / 10) : 0
    };
    
    console.log('Transformed payments data:', JSON.stringify(transformedData, null, 2));
    
    res.json(transformedData);
  } catch (error) {
    console.error('rydoraApi payments error:', error);
    
    // If all API endpoints return 404, return empty data instead of error
    if (error.response && error.response.status === 404) {
      console.log('All API endpoints returned 404, returning empty data');
      res.json({
        data: [],
        totalCount: 0,
        page: 1,
        totalPages: 0
      });
    } else if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch payments'
      });
    }
  }
});

// Get active companies endpoint
router.get('/Companies/active', async (req, res) => {
  try {
    console.log('=== COMPANIES REQUEST ===');
    console.log('Fetching active companies');
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const authHeaders = getForwardAuthHeaders(req);
    console.log('Auth headers:', authHeaders);
    
    const client = createrydoraApiClient(req);
    const response = await client.get('/Companies/active', {
      headers: authHeaders,
      timeout: 10000 // 10 second timeout
    });
    
    console.log('Companies response status:', response.status);
    console.log('Companies response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi companies error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Return proper error response instead of mock data
    console.log('Companies API failed, returning error response');
    res.status(500).json({
      reason: -1,
      message: 'Failed to fetch companies: ' + error.message
    });
  }
});

// Get cars list endpoint
router.post('/cars/carlist', async (req, res) => {
  try {
    const { role = 0 } = req.body;
    
    console.log('=== GET CARS LIST REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Role:', role);
    
    const client = createrydoraApiClient(req);
    const response = await client.post('/Cars/CarList', { role }, {
      headers: getForwardAuthHeaders(req),
      timeout: 10000
    });
    
    console.log('Cars list response status:', response.status);
    console.log('Cars list response data length:', response.data?.result?.length || 0);
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi cars list error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({ 
        reason: -1,
        message: 'Failed to fetch cars list: ' + error.message
      });
    }
  }
});

// External Daily Invoice endpoint
router.get('/external-daily-invoice', async (req, res) => {
  try {
    const { dateFrom, dateTo, ownerId } = req.query;
    
    console.log('=== EXTERNAL DAILY INVOICE REQUEST ===');
    console.log('Query params:', req.query);
    console.log('Date from:', dateFrom);
    console.log('Date to:', dateTo);
    console.log('Owner ID:', ownerId);
    console.log('Owner ID type:', typeof ownerId);
    console.log('Owner ID length:', ownerId ? ownerId.length : 'null/undefined');
    
    // Build query string with correct parameter names from Swagger API
    const params = new URLSearchParams();
    if (dateFrom) {
      params.append('dateFrom', dateFrom);
    }
    if (dateTo) {
      params.append('dateTo', dateTo);
    }
    if (ownerId && ownerId.trim() !== '') {
      params.append('CompanyId', ownerId); // Use CompanyId parameter name from Swagger
    }
    
    const queryString = params.toString();
    const endpoint = `/api/ExternalTollDailyInvoice/get-all${queryString ? '?' + queryString : ''}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Company ID parameter:', ownerId || 'none');
    console.log('Date range:', dateFrom, 'to', dateTo);
    
    const client = createrydoraApiClient(req);
    const response = await client.get(endpoint, {
      headers: getForwardAuthHeaders(req),
      timeout: 15000
    });
    
    console.log('rydoraApi response received successfully');
    
    console.log('External Daily Invoice response status:', response.status);
    console.log('External Daily Invoice response data length:', response.data?.result?.length || 0);
    
    // Log the first record to see what fields are available
    if (response.data?.result && response.data.result.length > 0) {
      console.log('Sample record structure:', JSON.stringify(response.data.result[0], null, 2));
    }
    
    // Filter the results on the frontend side if needed
    let filteredData = response.data?.result || [];
    
    // API handles all filtering (date range and company) server-side
    console.log('API filtering applied server-side:');
    console.log('- Date range:', dateFrom || 'none', 'to', dateTo || 'none');
    console.log('- Company ID:', ownerId || 'none (all companies)');
    console.log('- Total records returned:', filteredData.length);
    
    // Return filtered data in the same format
    const responseData = {
      ...response.data,
      result: filteredData
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('rydoraApi External Daily Invoice error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch external daily invoice: ' + error.message
      });
    }
  }
});

// Create External Daily Invoice endpoint
router.post('/external-daily-invoice/create', async (req, res) => {
  try {
    const tollData = req.body;
    
    console.log('=== CREATE EXTERNAL DAILY INVOICE REQUEST ===');
    console.log('Creating toll with data:', JSON.stringify(tollData, null, 2));
    console.log('Request headers:', req.headers);
    console.log('Authorization header:', req.headers.authorization);
    
    const response = await createrydoraApiClient(req).post('/api/ExternalTollDailyInvoice/create', tollData, {
      headers: getForwardAuthHeaders(req),
      timeout: 30000 // 30 second timeout for toll creation
    });
    
    console.log('External Daily Invoice creation response status:', response.status);
    console.log('External Daily Invoice creation response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi External Daily Invoice creation error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({
        reason: -1,
        message: 'Failed to create external daily invoice: ' + error.message
      });
    }
  }
});

// Get all external daily invoices endpoint (Admin only)
router.get('/external-daily-invoice/get-all', async (req, res) => {
  try {
    const { dateFrom, dateTo, companyId } = req.query;
    
    console.log('=== GET ALL EXTERNAL DAILY INVOICES REQUEST ===');
    console.log('Request headers:', req.headers);
    console.log('Parameters:', { dateFrom, dateTo, companyId });
    
    const endpoint = `/api/ExternalDailyInvoice/get-all`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const client = createrydoraApiClient(req);
    const response = await client.get(endpoint, {
      headers: getForwardAuthHeaders(req),
      params: {
        dateFrom,
        dateTo,
        companyId
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Get all external daily invoices response status:', response.status);
    console.log('=== FULL API RESPONSE DEBUG ===');
    console.log('Full response data:', JSON.stringify(response.data, null, 2));
    console.log('Response data type:', typeof response.data);
    console.log('Response data keys:', Object.keys(response.data || {}));
    console.log('=== END FULL API RESPONSE DEBUG ===');
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi get all external daily invoices error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch all external daily invoices: ' + error.message
      });
    }
  }
});

// Get external daily invoice details endpoint (Admin only)
router.get('/external-daily-invoice/get-details/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log('=== GET EXTERNAL DAILY INVOICE DETAILS REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    console.log('Request headers:', req.headers);
    
    const endpoint = `/api/ExternalDailyInvoice/get-details/${invoiceId}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Base URL:', RYDORA_API_CONFIG.baseUrl);
    
    const client = createrydoraApiClient(req);
    const response = await client.get(endpoint, {
      headers: getForwardAuthHeaders(req),
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Get external daily invoice details response status:', response.status);
    console.log('=== FULL API RESPONSE DEBUG ===');
    console.log('Full response data:', JSON.stringify(response.data, null, 2));
    console.log('Response data type:', typeof response.data);
    console.log('Response data keys:', Object.keys(response.data || {}));
    console.log('=== END FULL API RESPONSE DEBUG ===');
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi get external daily invoice details error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({
        reason: -1,
        message: 'Failed to fetch external daily invoice details: ' + error.message
      });
    }
  }
});

// Get External Daily Invoice by ID endpoint
router.get('/external-daily-invoice/get/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = createrydoraApiClient(req);
    
    const response = await client.get(`/api/ExternalTollDailyInvoice/get-by-id/${id}`, {
      headers: getForwardAuthHeaders(req)
    });

    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi External Daily Invoice get error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to fetch external daily invoice' 
      });
    }
  }
});

// Update payment status for external toll daily invoices endpoint (MUST come before /external-daily-invoice/update/:id)
router.put('/external-daily-invoice/update-payment-status', async (req, res) => {
  try {
    const { companyId } = req.query;
    const { ids, paymentStatus, companyId: bodyCompanyId } = req.body;
    
    console.log('=== UPDATE PAYMENT STATUS REQUEST ===');
    console.log('Query companyId:', companyId);
    console.log('Request body:', { ids, paymentStatus, companyId: bodyCompanyId });
    
    // Build query string for companyId parameter (only if not empty or null)
    const params = new URLSearchParams();
    if (companyId && companyId.trim() !== '') {
      params.append('companyId', companyId);
    }
    
    const queryString = params.toString();
    const endpoint = `/api/ExternalTollDailyInvoice/update-payment-status${queryString ? '?' + queryString : ''}`;
    
    console.log('Calling endpoint:', endpoint);
    console.log('Request payload to rydoraApi:', { ids, paymentStatus, companyId: bodyCompanyId });
    console.log('Auth headers:', getForwardAuthHeaders(req));
    
    const client = createrydoraApiClient(req);
    const response = await client.put(endpoint, {
      ids,
      paymentStatus,
      companyId: bodyCompanyId
    }, {
      headers: getForwardAuthHeaders(req),
      timeout: 15000
    });
    
    console.log('Update payment status response status:', response.status);
    console.log('Update payment status response data:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi update payment status error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to update payment status' 
      });
    }
  }
});

// Update External Daily Invoice by ID endpoint
router.put('/external-daily-invoice/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tollData = req.body;
    const client = createrydoraApiClient(req);
    
    const response = await client.put(`/api/ExternalTollDailyInvoice/update/${id}`, tollData, {
      headers: getForwardAuthHeaders(req)
    });

    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi External Daily Invoice update error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to update external daily invoice' 
      });
    }
  }
});

// Send invoice PDF via email endpoint (Admin only)
router.post('/external-daily-invoice/send-email/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { pdfBase64 } = req.body;
    
    console.log('=== SEND INVOICE EMAIL REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    console.log('PDF Base64 length:', pdfBase64 ? pdfBase64.length : 0);
    
    if (!pdfBase64) {
      return res.status(400).json({ message: 'PDF base64 is required' });
    }
    
    const endpoint = `/api/ExternalDailyInvoice/send-email/${invoiceId}`;
    console.log('Calling endpoint:', endpoint);
    console.log('Auth headers:', getForwardAuthHeaders(req));
    
    const client = createrydoraApiClient(req);
    const response = await client.post(endpoint, {
      pdfBase64
    }, {
      headers: getForwardAuthHeaders(req),
      timeout: 60000 // 60 second timeout for email sending
    });
    
    console.log('Send email response status:', response.status);
    console.log('Send email response data:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi send email error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to send invoice email' 
      });
    }
  }
});

// Delete External Daily Invoice by ID endpoint
router.delete('/external-daily-invoice/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = createrydoraApiClient(req);
    
    const response = await client.delete(`/api/ExternalTollDailyInvoice/delete/${id}`, {
      headers: getForwardAuthHeaders(req)
    });

    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi External Daily Invoice delete error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to delete external daily invoice' 
      });
    }
  }
});

// Create new car endpoint
router.post('/cars', async (req, res) => {
  try {
    const carData = req.body;
    
    console.log('=== CAR CREATION REQUEST ===');
    console.log('Creating car with data:', JSON.stringify(carData, null, 2));
    console.log('Request headers:', req.headers);
    console.log('Authorization header:', req.headers.authorization);
    
    const client = createrydoraApiClient(req);
    const response = await client.post('/Cars', carData, {
      headers: getForwardAuthHeaders(req),
      timeout: 30000 // 30 second timeout for car creation
    });
    
    console.log('Car creation response status:', response.status);
    console.log('Car creation response data:', JSON.stringify(response.data, null, 2));
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi car creation error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.response) {
      console.error('API responded with error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({
        reason: -1,
        message: 'Failed to create car: ' + error.message
      });
    }
  }
});

// Create new violation endpoint
router.post('/violations', async (req, res) => {
  try {
    const violationData = req.body;
    
    console.log('=== INBOUND REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('Original URL:', req.originalUrl);
    console.log('Path:', req.path);
    console.log('=== END INBOUND REQUEST DEBUG ===');
    
    console.log('=== VIOLATION CREATION REQUEST ===');
    console.log('Creating violation with data:', violationData);
    console.log('Request headers:', req.headers);
    console.log('Authorization header:', req.headers.authorization);
    
    // Transform the data to match the Rydora API expected format
    const transformedData = {
      citationNumber: violationData.citationNumber || null,
      noticeNumber: violationData.noticeNumber,
      agency: violationData.agency,
      address: violationData.address || null,
      tag: violationData.tag,
      state: violationData.state,
      issueDate: violationData.issueDate ? new Date(violationData.issueDate).toISOString() : null,
      startDate: violationData.startDate ? new Date(violationData.startDate).toISOString() : null,
      endDate: violationData.endDate ? new Date(violationData.endDate).toISOString() : null,
      amount: parseFloat(violationData.amount) || 0,
      currency: violationData.currency || 'USD',
      paymentStatus: 1, // Default to unpaid
      fineType: parseInt(violationData.fineType) || 0,
      note: violationData.note || null
    };
    
    console.log('Transformed violation data for Rydora API:', transformedData);
    
    // Call the real Rydora API endpoint with Bearer authentication
    const authHeaders = getForwardAuthHeaders(req);
    const bearerToken = `Bearer ${RYDORA_API_CONFIG.apiKey}`;
    
    console.log('=== BEARER AUTH DEBUG ===');
    console.log('API Key:', RYDORA_API_CONFIG.apiKey);
    console.log('Bearer Token:', bearerToken);
    console.log('Auth Headers from getForwardAuthHeaders:', authHeaders);
    console.log('Final headers being sent:', {
      'Content-Type': 'application/json',
      'Authorization': bearerToken,
      ...authHeaders
    });
    console.log('=== END BEARER AUTH DEBUG ===');
    
    // Debug external base URL and final URL
    const client = createrydoraApiClient(req);
    try {
      console.log('External Rydora API baseURL:', client?.defaults?.baseURL);
      console.log('External endpoint path:', '/ExternalViolation/create');
      if (client?.defaults?.baseURL) {
        console.log('Full external URL will be:', `${client.defaults.baseURL.replace(/\/$/, '')}/ExternalViolation/create`);
      }
    } catch (e) {
      console.log('Could not resolve full external URL for logging:', e?.message);
    }

    const response = await client.post('/ExternalViolation/create', transformedData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': bearerToken,
        ...authHeaders
      }
    });
    
    console.log('Rydora API response:', response.data);
    res.json(response.data);
    
  } catch (error) {
    console.error('rydoraApi create violation error:', error);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Network or other error:', error.message);
      res.status(500).json({ 
        reason: -1,
        message: 'Failed to create violation: ' + error.message,
        stackTrace: error.stack
      });
    }
  }
});

// Update invoice status endpoint
router.put('/external-daily-invoice/update-status', async (req, res) => {
  try {
    const { invoiceId, status } = req.body;
    
    console.log('=== UPDATE INVOICE STATUS REQUEST ===');
    console.log('Invoice ID:', invoiceId);
    console.log('New Status:', status);
    console.log('Request body:', req.body);
    
    const client = createrydoraApiClient(req);
    const response = await client.put('/api/ExternalDailyInvoice/update-status', {
      invoiceId,
      status
    }, {
      headers: getForwardAuthHeaders(req),
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Update invoice status response status:', response.status);
    console.log('Update invoice status response data:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('rydoraApi update invoice status error:', error);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        message: 'Failed to update invoice status' 
      });
    }
  }
});

// Test endpoint for violations
router.get('/violation/test', async (req, res) => {
  console.log('=== VIOLATION TEST ROUTE HIT ===');
  res.json({ message: 'Violation route is working', timestamp: new Date().toISOString() });
});

module.exports = router;

