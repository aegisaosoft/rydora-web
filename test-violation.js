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

const axios = require('axios');

async function testViolationEndpoint() {
  try {
    console.log('Testing violation endpoint...');
    
    // First login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'mirzoev.siyovush@outlook.com',
      password: 'Iroc@2020'
    });
    
    console.log('Login successful:', loginResponse.status);
    const token = loginResponse.data.token;
    
    // Test violation endpoint with token
    console.log('2. Testing violation endpoint...');
    const violationResponse = await axios.get('http://localhost:5000/api/RYDORA/violation/get/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Violation response status:', violationResponse.status);
    console.log('Violation response data:', JSON.stringify(violationResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testViolationEndpoint();

