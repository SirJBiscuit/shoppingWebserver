#!/usr/bin/env node

/**
 * Simple webhook server to trigger update-server.sh
 * Runs on the host (not in Docker) to execute the update script
 */

const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');

const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'change-me-in-production';
const UPDATE_SCRIPT = '/opt/cloudmc-shop/update-server.sh';

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/update') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const providedSecret = req.headers['x-webhook-secret'];

      // Verify secret
      if (providedSecret !== SECRET) {
        console.log('Unauthorized update attempt');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      console.log('Update webhook triggered');
      
      // Execute update script
      exec(`cd /opt/cloudmc-shop && ${UPDATE_SCRIPT}`, (error, stdout, stderr) => {
        if (error) {
          console.error('Update script failed:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message,
            output: stderr || stdout
          }));
          return;
        }

        console.log('Update script completed successfully');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Update completed successfully',
          output: stdout
        }));
      });

    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Webhook server listening on http://127.0.0.1:${PORT}`);
  console.log('Waiting for update requests...');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down webhook server...');
  server.close(() => {
    process.exit(0);
  });
});
