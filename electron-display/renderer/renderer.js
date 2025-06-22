const { ipcRenderer } = require('electron');
const WebSocket = require('ws');

class QueueDisplay {
  constructor() {
    this.patients = [];
    this.hdmiConnected = false;
    
    this.initializeElements();
    this.loadInitialData();
    this.setupWebSocketIntegration();
    this.setupHDMIStatusHandling();
  }

  initializeElements() {
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    
    // Create HDMI status element
    this.createHDMIStatusElement();
  }

  createHDMIStatusElement() {
    const hdmiStatus = document.createElement('div');
    hdmiStatus.className = 'hdmi-status';
    hdmiStatus.id = 'hdmiStatus';
    hdmiStatus.innerHTML = `
      <span class="hdmi-indicator" id="hdmiIndicator">📺</span>
      <span id="hdmiText">Checking HDMI...</span>
    `;
    
    // Insert at the beginning of body
    document.body.insertBefore(hdmiStatus, document.body.firstChild);
  }

  setupHDMIStatusHandling() {
    // Listen for display status from main process
    ipcRenderer.on('display-status', (event, data) => {
      this.hdmiConnected = data.hdmiConnected;
      this.updateHDMIStatus();
      console.log('Display status received:', data);
    });

    // Listen for HDMI connected
    ipcRenderer.on('hdmi-connected', (event, data) => {
      this.hdmiConnected = true;
      this.updateHDMIStatus();
      console.log('HDMI connected:', data);
    });

    // Listen for HDMI disconnected
    ipcRenderer.on('hdmi-disconnected', (event, data) => {
      this.hdmiConnected = false;
      this.updateHDMIStatus();
      console.log('HDMI disconnected');
    });
  }

  updateHDMIStatus() {
    const hdmiIndicator = document.getElementById('hdmiIndicator');
    const hdmiText = document.getElementById('hdmiText');
    const hdmiStatus = document.getElementById('hdmiStatus');
    
    if (this.hdmiConnected) {
      hdmiStatus.className = 'hdmi-status connected';
      hdmiIndicator.textContent = '📺';
      hdmiText.textContent = 'HDMI Connected';
    } else {
      hdmiStatus.className = 'hdmi-status disconnected';
      hdmiIndicator.textContent = '📺';
      hdmiText.textContent = 'HDMI Not Connected';
    }
  }

  loadInitialData() {
    // Load initial data from localStorage
    try {
      const storedPatients = localStorage.getItem('patients');
      if (storedPatients) {
        this.patients = JSON.parse(storedPatients);
        this.renderQueue();
      }
    } catch (error) {
      console.error('Error loading initial patient data:', error);
    }
  }

  setupWebSocketIntegration() {
    // Set up integration with client.js WebSocket system
    window.renderQueue = (patients) => {
      this.patients = patients || [];
      this.renderQueue();
    };

    window.updateDisplay = (patients) => {
      this.patients = patients || [];
      this.renderQueue();
    };

    // Monitor WebSocket connection status from client.js
    this.monitorConnection();
  }

  monitorConnection() {
    setInterval(() => {
      // Check if client.js WebSocket is connected
      if (window.ws && window.ws.readyState === WebSocket.OPEN) {
        this.updateConnectionStatus('connected', 'Connected');
      } else if (window.ws && window.ws.readyState === WebSocket.CONNECTING) {
        this.updateConnectionStatus('connecting', 'Connecting...');
      } else {
        this.updateConnectionStatus('disconnected', 'Disconnected');
      }
    }, 1000);
  }

  updateConnectionStatus(status, text) {
    this.statusIndicator.className = `status-indicator ${status}`;
    this.statusText.textContent = text;
  }

  // Function to render a single doctor's queue
  renderDoctorQueue(patients, doctorId) {
    const queueList = document.getElementById(`${doctorId}QueueList`);
    const emptyMessage = document.getElementById(`${doctorId}EmptyMessage`);
    
    // Clear current queue
    queueList.innerHTML = '';
    
    // Filter patients for this doctor
    const doctorPatients = patients.filter(patient => patient.doctorId === doctorId);
    
    // Sort patients by creation time (FIFO)
    const sortedPatients = doctorPatients.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });
    
    if (sortedPatients.length === 0) {
      emptyMessage.style.display = 'block';
      return;
    }
    
    emptyMessage.style.display = 'none';
    
    sortedPatients.forEach((patient, idx) => {
      const div = document.createElement('div');
      div.className = 'queue-item';
      
      const numberDiv = document.createElement('div');
      numberDiv.className = 'queue-number';
      numberDiv.textContent = idx + 1;
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'patient-name';
      nameDiv.textContent = patient.patientName || 'Unknown Patient';
      
      div.appendChild(numberDiv);
      div.appendChild(nameDiv);
      queueList.appendChild(div);
    });
  }

  renderQueue() {
    if (!this.patients || !Array.isArray(this.patients)) {
      this.patients = [];
    }
    
    // Render both doctor queues
    this.renderDoctorQueue(this.patients, 'doctor1');
    this.renderDoctorQueue(this.patients, 'doctor2');

    console.log('Queue rendered with', this.patients.length, 'patients');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const display = new QueueDisplay();
  
  // Also expose the display instance globally for debugging
  window.queueDisplay = display;
}); 