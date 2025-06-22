// WebSocket client logic for all roles
// Dynamically determine WebSocket server URL based on current page host
let WS_SERVER_URL;

if (window.location.protocol === 'file:') {
  // Handle Electron app or local file access
  WS_SERVER_URL = 'ws://localhost:8080';
  console.log('File protocol detected, using localhost WebSocket');
} else {
  // Use same host as the web page for network access
  const currentHost = window.location.host;
  WS_SERVER_URL = `ws://${currentHost}`;
}

console.log('WebSocket connecting to:', WS_SERVER_URL);

// Expose WebSocket URL globally for debugging
window.WS_SERVER_URL = WS_SERVER_URL;

let ws;
let reconnectTimeout = 2000;
let isConnected = false;

// Utility function to get current doctor ID from URL parameters
function getCurrentDoctorId() {
  const urlParams = new URLSearchParams(window.location.search);
  const doctorId = urlParams.get('doctor');
  return doctorId || 'doctor1'; // Default to doctor1 if no parameter
}

// Utility function to filter patients by doctor ID
function filterPatientsByDoctor(patients, doctorId) {
  if (!patients || !Array.isArray(patients)) return [];
  return patients.filter(patient => patient.doctorId === doctorId);
}

// Utility function to detect current interface role
function getCurrentRole() {
  const filename = window.location.pathname.split('/').pop().toLowerCase();
  if (filename.includes('receptionist')) return 'receptionist';
  if (filename.includes('doctor')) return 'doctor';
  if (filename.includes('display')) return 'display';
  return 'unknown';
}

function connectWebSocket() {
  try {
    ws = new WebSocket(WS_SERVER_URL);
    // Always expose the current WebSocket instance
    window.ws = ws;
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    setTimeout(connectWebSocket, reconnectTimeout);
    return;
  }

  ws.onopen = () => {
    console.log('WebSocket connected');
    isConnected = true;
    
    // On connect, send our current queue (if any)
    const patients = localStorage.getItem('patients');
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'sync', 
        patients: patients ? JSON.parse(patients) : [],
        role: getCurrentRole(),
        doctorId: getCurrentDoctorId()
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log('📨 client.js received WebSocket message:', msg);
      
      if (msg.type === 'update') {
        console.log('🔄 client.js processing update with', msg.patients ? msg.patients.length : 0, 'patients');
        
        // Update localStorage
        localStorage.setItem('patients', JSON.stringify(msg.patients));
        console.log('💾 client.js updated localStorage');
        
        const currentRole = getCurrentRole();
        const currentDoctorId = getCurrentDoctorId();
        console.log(`🎭 client.js current role: ${currentRole}, doctor: ${currentDoctorId}`);
        
        // Filter patients based on current interface role
        let filteredPatients = msg.patients;
        if (currentRole === 'doctor') {
          filteredPatients = filterPatientsByDoctor(msg.patients, currentDoctorId);
          console.log(`🔍 client.js filtered to ${filteredPatients.length} patients for ${currentDoctorId}`);
        }
        
        // Update UI - try all possible render functions
        if (window.renderQueue) {
          console.log('🎯 client.js calling window.renderQueue');
          if (currentRole === 'display') {
            // Display interface needs all patients for split screen
            window.renderQueue(msg.patients);
          } else {
            window.renderQueue(filteredPatients);
          }
          console.log('✅ client.js window.renderQueue completed');
        } else {
          console.warn('⚠️ client.js window.renderQueue not available');
        }
        
        if (typeof displayPatients === 'function') {
          console.log('🎯 client.js calling displayPatients');
          displayPatients();
          console.log('✅ client.js displayPatients completed');
        }
        
        if (window.updateDisplay) {
          console.log('🎯 client.js calling window.updateDisplay');
          window.updateDisplay(msg.patients);
          console.log('✅ client.js window.updateDisplay completed');
        }
      } else {
        console.log('ℹ️ client.js received non-update message type:', msg.type);
      }
    } catch (e) {
      console.error('❌ client.js WebSocket message error:', e);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    isConnected = false;
    setTimeout(connectWebSocket, reconnectTimeout);
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    isConnected = false;
    ws.close();
  };
}

// Utility to broadcast queue changes
function broadcastQueueUpdate() {
  if (ws && ws.readyState === WebSocket.OPEN && isConnected) {
    const patients = localStorage.getItem('patients');
    ws.send(JSON.stringify({ 
      type: 'update', 
      patients: patients ? JSON.parse(patients) : [],
      role: getCurrentRole(),
      doctorId: getCurrentDoctorId()
    }));
    console.log('Broadcasted queue update');
  } else {
    console.log('WebSocket not ready for broadcast');
  }
}

// Enhanced function patching that works with timing
function patchFunctions() {
  // Note: saveFormData now handles broadcasting directly in Receptionist.html
  
  // Patch removePatient for Doctor
  if (typeof window.removePatient === 'function') {
    const originalRemovePatient = window.removePatient;
    window.removePatient = function(...args) {
      originalRemovePatient.apply(this, args);
      setTimeout(() => {
        broadcastQueueUpdate();
      }, 100);
    };
    console.log('Patched removePatient for broadcasting');
  }

  // Patch clearAllPatients for Doctor
  if (typeof window.clearAllPatients === 'function') {
    const originalClearAllPatients = window.clearAllPatients;
    window.clearAllPatients = function(...args) {
      originalClearAllPatients.apply(this, args);
      setTimeout(() => {
        broadcastQueueUpdate();
      }, 100);
    };
    console.log('Patched clearAllPatients for broadcasting');
  }
}

// Initialize WebSocket connection
connectWebSocket();

// Patch functions when DOM is ready and after a brief delay for function definitions
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(patchFunctions, 100);
});

// Also try patching after page load in case functions are defined later
window.addEventListener('load', () => {
  setTimeout(patchFunctions, 100);
});

// Export for use by other scripts
window.broadcastQueueUpdate = broadcastQueueUpdate;
window.connectWebSocket = connectWebSocket;
window.getCurrentDoctorId = getCurrentDoctorId;
window.filterPatientsByDoctor = filterPatientsByDoctor;
window.getCurrentRole = getCurrentRole;
// Expose WebSocket instance for monitoring
window.ws = ws; 