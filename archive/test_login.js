const http = require('http');

const data = new URLSearchParams();
data.append('email', 'admin@educore.com');
data.append('password', 'admin123');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/callback/credentials',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('BODY:', body));
});

req.on('error', e => console.error(e));
req.write(data.toString());
req.end();
