const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/admin/users',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-admin-token' 
  }
};
// But I need a real JWT token to test it. Or I can just hit a public endpoint or bypass auth for a script.
