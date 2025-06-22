const { ipcRenderer } = require('electron');
const WebSocket = require('ws');

class QueueDisplay {
  constructor() {
    this.patients = [];
    
    this.initializeElements();
    this.loadInitialData();
    this.setupWebSocketIntegration();
  }

  initializeElements() {
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
  }

  loadInitialData() {
    // Load initial data from localStorage
    try {
      const storedPatients = localStorage.getItem('patients');
      if (storedPatients) {
        this.patients = JSON.parse(storedPatients);
        this.renderQueue(this.patients);
      }
    } catch (error) {
      console.error('Error loading initial patient data:', error);
    }
  }

  setupWebSocketIntegration() {
    // Set up integration with client.js WebSocket system
    window.renderQueue = (patients) => {
      this.patients = patients || [];
      this.renderQueue(this.patients);
    };

    window.updateDisplay = (patients) => {
      this.patients = patients || [];
      this.renderQueue(this.patients);
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

  // Create position badge element
  createPositionBadge(position) {
    const badge = document.createElement('div');
    badge.className = 'position-badge';
    badge.textContent = position;
    return badge;
  }

  // Truncate patient name if too long
  truncatePatientName(name, maxLength = 25) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  }

  // Function to render a single doctor's queue
  renderDoctorQueue(patients, doctorId) {
    const queueList = document.getElementById(`${doctorId}QueueList`);
    const emptyState = document.getElementById(`${doctorId}EmptyState`);
    
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
      queueList.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }
    
    queueList.style.display = 'flex';
    emptyState.style.display = 'none';
    
    // Limit to 10 patients maximum
    const displayPatients = sortedPatients.slice(0, 10);
    
    displayPatients.forEach((patient, idx) => {
      const queueItem = document.createElement('div');
      queueItem.className = 'queue-item';
      
      // Create position badge
      const badge = this.createPositionBadge(idx + 1);
      queueItem.appendChild(badge);
      
      // Create patient name element
      const nameElement = document.createElement('div');
      nameElement.className = 'patient-name';
      nameElement.textContent = this.truncatePatientName(patient.patientName || 'Unknown Patient');
      queueItem.appendChild(nameElement);
      
      queueList.appendChild(queueItem);
    });
  }

  // Main function to render both doctor queues
  renderQueue(patients) {
    if (!patients || !Array.isArray(patients)) {
      patients = [];
    }
    
    // Render both doctor queues
    this.renderDoctorQueue(patients, 'doctor1');
    this.renderDoctorQueue(patients, 'doctor2');
    
    console.log('Queue rendered with', patients.length, 'total patients');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const display = new QueueDisplay();
  
  // Also expose the display instance globally for debugging
  window.queueDisplay = display;
  
  // Set up the global renderQueue function for client.js integration
  window.renderQueue = (patients) => {
    display.renderQueue(patients);
  };
}); 