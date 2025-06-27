const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

class QueueManager {
  constructor() {
    this.wsClient = null;
    this.allPatients = [];
    this.currentConfig = null;
    this.reconnectTimer = null;
    
    this.initializeElements();
    this.loadConfiguration();
    this.bindEvents();
    this.loadPatients();
    this.renderQueues();
  }

  initializeElements() {
    // Status bar elements
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    this.serverUrlDisplay = document.getElementById('serverUrl');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.reconnectBtn = document.getElementById('reconnectBtn');
    
    // Form elements
    this.addPatientForm = document.getElementById('addPatientForm');
    this.patientNameInput = document.getElementById('patientName');
    
    // Queue display elements
    this.doctor1Queue = document.getElementById('doctor1Queue');
    this.doctor2Queue = document.getElementById('doctor2Queue');
    
    // Overlay elements
    this.connectionOverlay = document.getElementById('connectionOverlay');
    this.openSettingsBtn = document.getElementById('openSettingsBtn');
    this.retryConnectionBtn = document.getElementById('retryConnectionBtn');
  }

  // Config management methods (inline implementation)
  getConfigPath() {
    const os = require('os');
    const configDir = path.join(os.homedir(), '.queue-manager');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    return path.join(configDir, 'config.json');
  }

  getDefaultConfig() {
    return {
      serverUrl: '192.168.1.11:8080',
      autoReconnect: true,
      reconnectInterval: 2000
    };
  }

  loadConfig() {
    try {
      const configPath = this.getConfigPath();
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return { ...this.getDefaultConfig(), ...JSON.parse(configData) };
      }
    } catch (error) {
      console.warn('Error loading config:', error);
    }
    return this.getDefaultConfig();
  }

  getWebSocketUrl(serverUrl) {
    if (serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')) {
      return serverUrl;
    }
    return `ws://${serverUrl}`;
  }

  loadConfiguration() {
    try {
      this.currentConfig = this.loadConfig();
      this.updateServerUrlDisplay(this.currentConfig.serverUrl);
      console.log('Configuration loaded:', this.currentConfig);
    } catch (error) {
      console.error('Error loading configuration:', error);
      this.showConnectionOverlay();
    }
  }

  bindEvents() {
    // Settings button
    this.settingsBtn.addEventListener('click', () => {
      this.openSettings();
    });

    // Reconnect button
    this.reconnectBtn.addEventListener('click', () => {
      this.connectToServer();
    });

    // Overlay buttons
    this.openSettingsBtn.addEventListener('click', () => {
      this.openSettings();
    });

    this.retryConnectionBtn.addEventListener('click', () => {
      this.connectToServer();
    });

    // Patient form
    this.addPatientForm.addEventListener('submit', (e) => {
      this.addPatient(e);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        this.openSettings();
      }
    });

    // Listen for settings updates from main process
    try {
      ipcRenderer.on('settings-changed', (event, newConfig) => {
        console.log('Settings updated, reloading configuration');
        this.currentConfig = newConfig;
        this.updateServerUrlDisplay(newConfig.serverUrl);
        this.connectToServer();
      });
    } catch (error) {
      console.warn('IPC not available:', error);
    }

    // Auto-connect on startup
    setTimeout(() => {
      this.connectToServer();
    }, 500);
  }

  connectToServer() {
    if (!this.currentConfig || !this.currentConfig.serverUrl) {
      console.warn('No server configuration found');
      this.showConnectionOverlay();
      return;
    }

    // Disconnect existing connection
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const wsUrl = this.getWebSocketUrl(this.currentConfig.serverUrl);
    console.log('Connecting to server:', wsUrl);
    
    this.updateConnectionStatus('connecting');
    
    try {
      this.wsClient = new WebSocket(wsUrl);
      
      this.wsClient.onopen = () => {
        console.log('WebSocket connected');
        this.updateConnectionStatus('connected');
        this.hideConnectionOverlay();
        this.syncWithServer();
      };

      this.wsClient.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.updateConnectionStatus('disconnected');
        
        // Auto-reconnect if enabled
        if (this.currentConfig.autoReconnect && !event.wasClean) {
          this.scheduleReconnect();
        }
      };

      this.wsClient.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus('error');
      };

      this.wsClient.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error('Error parsing server message:', error);
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.updateConnectionStatus('error');
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    const interval = this.currentConfig.reconnectInterval || 2000;
    console.log(`Scheduling reconnect in ${interval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectToServer();
    }, interval);
  }

  async openSettings() {
    try {
      await ipcRenderer.invoke('open-settings');
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }

  updateConnectionStatus(status) {
    this.statusIndicator.className = 'status-indicator';
    this.reconnectBtn.style.display = 'none';
    
    switch (status) {
      case 'connected':
        this.statusIndicator.classList.add('connected');
        this.statusText.textContent = 'Connected';
        break;
      case 'connecting':
        this.statusIndicator.classList.add('connecting');
        this.statusText.textContent = 'Connecting...';
        break;
      case 'error':
        this.statusText.textContent = 'Connection Error';
        this.reconnectBtn.style.display = 'inline-block';
        break;
      case 'disconnected':
      default:
        this.statusText.textContent = 'Disconnected';
        this.reconnectBtn.style.display = 'inline-block';
        break;
    }
  }

  updateServerUrlDisplay(serverUrl) {
    if (serverUrl) {
      this.serverUrlDisplay.textContent = serverUrl;
    } else {
      this.serverUrlDisplay.textContent = 'No server configured';
    }
  }

  showConnectionOverlay() {
    this.connectionOverlay.style.display = 'flex';
  }

  hideConnectionOverlay() {
    this.connectionOverlay.style.display = 'none';
  }

  // Patient Management Functions
  loadPatients() {
    try {
      const stored = localStorage.getItem('patients');
      if (stored) {
        this.allPatients = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      this.allPatients = [];
    }
  }

  savePatients() {
    try {
      // Save patients to localStorage in the format expected by other components
      localStorage.setItem('patients', JSON.stringify(this.allPatients));
      console.log('Patients saved to localStorage:', this.allPatients.length);
    } catch (error) {
      console.error('Error saving patients:', error);
    }
  }

  addPatient(event) {
    event.preventDefault();
    
    const patientName = this.patientNameInput.value.trim();
    if (!patientName) {
      alert('Please enter a patient name');
      return;
    }

    // Get the selected doctor from radio buttons
    const selectedDoctorRadio = document.querySelector('input[name="doctorSelection"]:checked');
    const selectedDoctor = selectedDoctorRadio ? selectedDoctorRadio.value : 'doctor1';

    const newPatient = {
      id: Date.now() + Math.random(),
      patientName: patientName, // Use patientName to match existing system
      doctorId: selectedDoctor,
      timestamp: Date.now(),
      position: this.getNextPosition(selectedDoctor),
      createdAt: new Date().toISOString() // Add createdAt for proper sorting
    };

    this.allPatients.push(newPatient);
    this.savePatients();
    this.renderQueues();
    this.broadcastUpdate();

    // Clear the form
    this.patientNameInput.value = '';
    
    // Reset radio buttons
    const radioButtons = document.querySelectorAll('input[name="doctorSelection"]');
    radioButtons.forEach(radio => radio.checked = false);
    
    console.log('Patient added:', newPatient);
  }

  getNextPosition(doctorId) {
    const doctorPatients = this.allPatients.filter(p => p.doctorId === doctorId);
    return doctorPatients.length;
  }

  rebuildTimestamps(doctorId) {
    const doctorPatients = this.allPatients
      .filter(p => p.doctorId === doctorId)
      .sort((a, b) => a.position - b.position);
    
    doctorPatients.forEach((patient, index) => {
      patient.position = index;
      patient.timestamp = Date.now() - (doctorPatients.length - index) * 1000;
    });
  }

  movePatientUp(patientId, doctorId) {
    const doctorPatients = this.allPatients.filter(p => p.doctorId === doctorId);
    const patient = this.allPatients.find(p => p.id === patientId);
    
    if (!patient || patient.position === 0) return;

    // Find patient above
    const patientAbove = doctorPatients.find(p => p.position === patient.position - 1);
    if (patientAbove) {
      // Swap positions
      const tempPos = patient.position;
      patient.position = patientAbove.position;
      patientAbove.position = tempPos;
      
      this.rebuildTimestamps(doctorId);
      this.savePatients();
      this.renderQueues();
      this.broadcastUpdate();
    }
  }

  movePatientDown(patientId, doctorId) {
    const doctorPatients = this.allPatients.filter(p => p.doctorId === doctorId);
    const patient = this.allPatients.find(p => p.id === patientId);
    const maxPosition = doctorPatients.length - 1;
    
    if (!patient || patient.position === maxPosition) return;

    // Find patient below
    const patientBelow = doctorPatients.find(p => p.position === patient.position + 1);
    if (patientBelow) {
      // Swap positions
      const tempPos = patient.position;
      patient.position = patientBelow.position;
      patientBelow.position = tempPos;
      
      this.rebuildTimestamps(doctorId);
      this.savePatients();
      this.renderQueues();
      this.broadcastUpdate();
    }
  }

  movePatientToOtherDoctor(patientId, currentDoctorId) {
    const patient = this.allPatients.find(p => p.id === patientId);
    if (!patient) return;

    const newDoctorId = currentDoctorId === 'doctor1' ? 'doctor2' : 'doctor1';
    const newPosition = this.getNextPosition(newDoctorId);
    
    patient.doctorId = newDoctorId;
    patient.position = newPosition;
    patient.timestamp = Date.now();
    
    // Rebuild positions for the old doctor
    this.rebuildTimestamps(currentDoctorId);
    
    this.savePatients();
    this.renderQueues();
    this.broadcastUpdate();
  }

  removePatient(patientId, patientName) {
    if (confirm(`Are you sure you want to remove ${patientName} from the queue?`)) {
      const patientIndex = this.allPatients.findIndex(p => p.id === patientId);
      if (patientIndex !== -1) {
        const patient = this.allPatients[patientIndex];
        const doctorId = patient.doctorId;
        
        this.allPatients.splice(patientIndex, 1);
        this.rebuildTimestamps(doctorId);
        this.savePatients();
        this.renderQueues();
        this.broadcastUpdate();
      }
    }
  }

  renderQueues() {
    this.renderDoctorQueue('doctor1');
    this.renderDoctorQueue('doctor2');
  }

  renderDoctorQueue(doctorId) {
    const queueElement = doctorId === 'doctor1' ? this.doctor1Queue : this.doctor2Queue;
    const doctorPatients = this.allPatients
      .filter(p => p.doctorId === doctorId)
      .sort((a, b) => a.position - b.position);

    queueElement.innerHTML = '';

    if (doctorPatients.length === 0) {
      queueElement.innerHTML = '<div class="empty-queue">No patients in queue</div>';
      return;
    }

    doctorPatients.forEach((patient, index) => {
      const patientElement = document.createElement('div');
      patientElement.className = 'patient-item';
      patientElement.innerHTML = `
        <div class="patient-info">
          <span class="patient-position">${index + 1}</span>
          <span class="patient-name">${patient.patientName}</span>
        </div>
        <div class="patient-actions">
          ${index > 0 ? `<button onclick="queueManager.movePatientUp(${patient.id}, '${doctorId}')" class="btn btn-sm">↑</button>` : ''}
          ${index < doctorPatients.length - 1 ? `<button onclick="queueManager.movePatientDown(${patient.id}, '${doctorId}')" class="btn btn-sm">↓</button>` : ''}
          <button onclick="queueManager.movePatientToOtherDoctor(${patient.id}, '${doctorId}')" class="btn btn-sm btn-transfer">⇄</button>
          <button onclick="queueManager.removePatient(${patient.id}, '${patient.patientName}')" class="btn btn-sm btn-remove">✕</button>
        </div>
      `;
      queueElement.appendChild(patientElement);
    });
  }

  handleServerMessage(data) {
    console.log('Received from server:', data);
    
    if (data.type === 'update') {
      // Update from other clients
      this.allPatients = data.patients || [];
      this.savePatients();
      this.renderQueues();
    }
  }

  syncWithServer() {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      // Send initial sync message with current patients
      this.wsClient.send(JSON.stringify({
        type: 'sync',
        patients: this.allPatients,
        role: 'queue-manager',
        doctorId: 'all' // Queue manager handles both doctors
      }));
    }
  }

  broadcastUpdate() {
    if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
      // Send update message in the format expected by the server
      this.wsClient.send(JSON.stringify({
        type: 'update',
        patients: this.allPatients,
        role: 'queue-manager',
        doctorId: 'all'
      }));
      console.log('Broadcasted queue update to all clients');
    } else {
      console.log('WebSocket not ready for broadcast');
    }
  }
}

// Initialize queue manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing queue manager...');
  window.queueManager = new QueueManager();
});
