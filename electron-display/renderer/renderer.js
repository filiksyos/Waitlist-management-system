const { ipcRenderer } = require('electron');
const WebSocket = require('ws');

class QueueDisplay {
  constructor() {
    this.patients = [];
    this.doctorCount = 1; // Default to 1 doctor
    this.maxPatientsDisplayed = 10; // Default to 10 patients
    
    this.initializeElements();
    this.setupIPC();
    this.loadInitialData();
    this.setupWebSocketIntegration();
    this.updateDynamicStyles(); // Initialize default styles
  }

  initializeElements() {
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
  }

  setupIPC() {
    try {
      // Listen for doctor count configuration from main process
      ipcRenderer.on('doctor-count-config', (event, doctorCount) => {
        console.log('Doctor count configuration received:', doctorCount);
        this.doctorCount = doctorCount;
        this.setupDoctorDisplay();
        this.cleanupInvalidPatients();
        this.renderQueue(this.patients);
      });

      // Listen for max patients configuration from main process
      ipcRenderer.on('max-patients-config', (event, maxPatients) => {
        console.log('Max patients configuration received:', maxPatients);
        const previousValue = this.maxPatientsDisplayed;
        this.maxPatientsDisplayed = maxPatients;
        
        // Only update styles and re-render if value actually changed
        if (previousValue !== maxPatients) {
          this.updateDynamicStyles();
          this.renderQueue(this.patients);
          console.log(`Dynamic styles updated for ${maxPatients} patients`);
        }
      });

      // Listen for display status updates
      ipcRenderer.on('display-status', (event, status) => {
        console.log('Display status received:', status);
      });
    } catch (error) {
      console.warn('IPC not available:', error);
    }
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
    
    // Limit to configured maximum patients
    const displayPatients = sortedPatients.slice(0, this.maxPatientsDisplayed);
    
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

  // Main function to render doctor queues based on doctor count
  renderQueue(patients) {
    if (!patients || !Array.isArray(patients)) {
      patients = [];
    }
    
    // Store patients for later use
    this.patients = patients;
    
    if (this.doctorCount === 1) {
      // Single doctor mode - only render doctor1
      this.renderDoctorQueue(patients, 'doctor1');
    } else {
      // Multi doctor mode - render both doctors
      this.renderDoctorQueue(patients, 'doctor1');
      this.renderDoctorQueue(patients, 'doctor2');
    }
    
    console.log('Queue rendered with', patients.length, 'total patients');
  }

  setupDoctorDisplay() {
    const doctor2Section = document.querySelector('.queue-section:nth-child(2)');
    
    if (this.doctorCount === 1) {
      // Hide doctor 2 section
      if (doctor2Section) {
        doctor2Section.style.display = 'none';
      }
      
      document.body.classList.add('single-doctor-mode');
      document.body.classList.remove('multi-doctor-mode');
    } else {
      // Show doctor 2 section
      if (doctor2Section) {
        doctor2Section.style.display = 'block';
      }
      
      document.body.classList.add('multi-doctor-mode');
      document.body.classList.remove('single-doctor-mode');
    }
  }

  cleanupInvalidPatients() {
    if (this.doctorCount === 1) {
      // Filter out doctor2 patients
      const originalLength = this.patients.length;
      this.patients = this.patients.filter(patient => patient.doctorId === 'doctor1');
      
      if (this.patients.length !== originalLength) {
        console.log(`Filtered out ${originalLength - this.patients.length} doctor2 patients due to single doctor mode`);
        // Update localStorage to reflect the filtered data
        try {
          localStorage.setItem('patients', JSON.stringify(this.patients));
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
      }
    }
  }

  updateDynamicStyles() {
    try {
      // Calculate dynamic heights and sizes
      const itemHeightVh = 85 / this.maxPatientsDisplayed;
      const baseTextScale = itemHeightVh / 8.5; // 8.5vh is original item height
      
      // Apply constraints to text scaling for readability
      const textScale = Math.min(1.5, Math.max(0.5, baseTextScale));
      
      // Calculate font sizes based on original values
      const patientNameSize = 5 * textScale; // 5em is original
      const badgeSize = 3.5 * textScale; // 3.5em is original
      
      // Create CSS with custom properties
      const dynamicCSS = `
        :root {
          --queue-item-height: ${itemHeightVh}vh;
          --patient-name-size: ${patientNameSize}em;
          --position-badge-size: ${badgeSize}em;
        }
      `;
      
      // Apply styles to document
      let styleElement = document.getElementById('dynamic-patient-styles');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'dynamic-patient-styles';
        document.head.appendChild(styleElement);
      }
      
      styleElement.innerHTML = dynamicCSS;
      
      console.log(`Dynamic styles applied - Items: ${this.maxPatientsDisplayed}, Height: ${itemHeightVh.toFixed(1)}vh, Text scale: ${textScale.toFixed(2)}`);
      
    } catch (error) {
      console.error('Error updating dynamic styles:', error);
    }
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