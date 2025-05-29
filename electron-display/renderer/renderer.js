const WebSocket = require('ws');

class QueueDisplay {
  constructor() {
    this.ws = null;
    this.serverUrl = 'ws://localhost:8080';
    this.patients = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    
    this.initializeElements();
    this.connect();
  }

  initializeElements() {
    this.queueList = document.getElementById('queueList');
    this.emptyMessage = document.getElementById('emptyMessage');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
  }

  connect() {
    try {
      this.updateConnectionStatus('connecting', 'Connecting to server...');
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to server');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.updateConnectionStatus('connected', 'Connected');
        
        // Request current queue state
        this.ws.send(JSON.stringify({ type: 'sync' }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'update' && data.patients) {
            this.patients = data.patients;
            this.renderQueue();
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Connection closed');
        this.updateConnectionStatus('disconnected', 'Connection lost');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus('disconnected', 'Connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.updateConnectionStatus('disconnected', 'Failed to connect');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      this.updateConnectionStatus('connecting', `Reconnecting in ${Math.ceil(delay/1000)}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.updateConnectionStatus('disconnected', 'Max reconnection attempts reached');
      // Reset after 30 seconds to try again
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.scheduleReconnect();
      }, 30000);
    }
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
    
    this.patients.forEach((patient, idx) => {
      const div = document.createElement('div');
      div.className = 'queue-item';
      div.textContent = `${idx + 1}. ${patient.patientName || 'Unknown Patient'}`;
      this.queueList.appendChild(div);
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new QueueDisplay();
}); 