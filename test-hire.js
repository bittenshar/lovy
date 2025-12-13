const axios = require('axios');

const testHire = async () => {
  try {
    // Get an employer token first (you'll need valid credentials)
    console.log('Testing employer hire endpoint...');
    
    const baseURL = 'http://localhost:3000/api';
    
    // This is a sample test - replace with actual test data
    const employerId = '67559d5a8f8f8f8f8f8f8f01'; // Replace with real employer ID
    const applicationId = '67559d5a8f8f8f8f8f8f8f02'; // Replace with real app ID
    const token = 'your_token_here'; // Replace with real token
    
    const response = await axios.patch(
      `${baseURL}/employers/me/applications/${applicationId}`,
      { status: 'hired' },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

testHire();
