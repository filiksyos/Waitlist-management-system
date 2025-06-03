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
    this.queueList = document.getElementById('queueList');
    this.emptyMessage = document.getElementById('emptyMessage');
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
    
    // Insert after the display badge
    const displayBadge = document.querySelector('.display-badge');
    displayBadge.parentNode.insertBefore(hdmiStatus, displayBadge.nextSibling);
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
      hdmiText.textContent = 'HDMI Not Connected - Please connect external display';
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

  renderQueue() {
    this.queueList.innerHTML = '';
    
    if (!this.patients || this.patients.length === 0) {
      this.emptyMessage.style.display = 'block';
      return;
    }
    
    this.emptyMessage.style.display = 'none';
    
    // Sort patients by creation time for proper queue order
    const sortedPatients = this.patients.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });
    
    sortedPatients.forEach((patient, idx) => {
      const div = document.createElement('div');
      div.className = 'queue-item';
      div.textContent = `${idx + 1}. ${patient.patientName || 'Unknown Patient'}`;
      this.queueList.appendChild(div);
    });

    console.log('Queue rendered with', sortedPatients.length, 'patients');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const display = new QueueDisplay();
  
  // Also expose the display instance globally for debugging
  window.queueDisplay = display;
}); 