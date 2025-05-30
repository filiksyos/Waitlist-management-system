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
        patients: patients ? JSON.parse(patients) : [] 
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'update') {
        // Update localStorage
        localStorage.setItem('patients', JSON.stringify(msg.patients));
        
        // Update UI - try all possible render functions
        if (window.renderQueue) {
          window.renderQueue(msg.patients);
        }
        if (typeof displayPatients === 'function') {
          displayPatients();
        }
        if (window.updateDisplay) {
          window.updateDisplay(msg.patients);
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
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
      patients: patients ? JSON.parse(patients) : [] 
    }));
    console.log('Broadcasted queue update');
  } else {
    console.log('WebSocket not ready for broadcast');
  }
}

// Enhanced function patching that works with timing
function patchFunctions() {
  // Patch saveFormData for Receptionist
  if (typeof window.saveFormData === 'function') {
    const originalSaveFormData = window.saveFormData;
    window.saveFormData = function(event) {
      originalSaveFormData.call(this, event);
      // Immediate broadcast after localStorage update
      setTimeout(() => {
        broadcastQueueUpdate();
      }, 100);
    };
    console.log('Patched saveFormData for broadcasting');
  }

  // Patch removePatient for Doctor
  if (typeof window.removePatient === 'function') {
    const originalRemovePatient = window.removePatient;
    window.removePatient = function(index) {
      originalRemovePatient.call(this, index);
      setTimeout(() => {
        broadcastQueueUpdate();
      }, 100);
    };
    console.log('Patched removePatient for broadcasting');
  }

  // Patch clearAllPatients for Doctor
  if (typeof window.clearAllPatients === 'function') {
    const originalClearAllPatients = window.clearAllPatients;
    window.clearAllPatients = function() {
      originalClearAllPatients.call(this);
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
// Expose WebSocket instance for monitoring
window.ws = ws; 