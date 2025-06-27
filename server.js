require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Shared utility functions for doctor count management
function getDoctorCount() {
  const count = process.env.DOCTOR_COUNT || '1';
  return parseInt(count) === 2 ? 2 : 1;
}

function filterPatientsByDoctorCount(patients, doctorCount) {
  if (doctorCount === 1) {
    return patients.filter(p => p.doctorId === 'doctor1');
  }
  return patients; // Return all when doctorCount === 2
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '.')));

// API endpoint to serve doctor count configuration
app.get('/api/config', (req, res) => {
  res.json({
    doctorCount: getDoctorCount()
  });
});

// WebSocket message relay logic
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    // Broadcast update to all clients except sender
    if (data.type === 'update' || data.type === 'sync') {
      const doctorCount = getDoctorCount();
      const filteredPatients = filterPatientsByDoctorCount(data.patients || [], doctorCount);
      
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'update', patients: filteredPatients }));
        }
      });
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 