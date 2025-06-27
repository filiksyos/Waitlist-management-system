// Import required modules for Electron renderer process
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

class SettingsManager {
  constructor() {
    this.testClient = null;
    this.currentConfig = null;
    
    this.initializeElements();
    this.loadCurrentSettings();
    this.bindEvents();
  }

  initializeElements() {
    // Form elements
    this.form = document.getElementById('settingsForm');
    this.serverUrlInput = document.getElementById('serverUrl');
    this.autoReconnectInput = document.getElementById('autoReconnect');
    this.reconnectIntervalInput = document.getElementById('reconnectInterval');
    
    // Status elements
    this.statusLight = document.getElementById('statusLight');
    this.statusText = document.getElementById('statusText');
    
    // Button elements
    this.saveBtn = document.getElementById('saveBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.testConnectionBtn = document.getElementById('testConnectionBtn');
    
    // Message elements
    this.validationMessage = document.getElementById('validationMessage');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    
    console.log('Elements initialized:', {
      saveBtn: !!this.saveBtn,
      cancelBtn: !!this.cancelBtn,
      resetBtn: !!this.resetBtn,
      testConnectionBtn: !!this.testConnectionBtn
    });
  }

  loadCurrentSettings() {
    try {
      this.currentConfig = this.loadConfig();
      this.populateForm(this.currentConfig);
      console.log('Settings loaded:', this.currentConfig);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showMessage('Error loading settings', 'error');
    }
  }

  populateForm(config) {
    this.serverUrlInput.value = config.serverUrl || '192.168.1.11:8080';
    this.autoReconnectInput.checked = config.autoReconnect !== false;
    this.reconnectIntervalInput.value = config.reconnectInterval || 2000;
  }

  bindEvents() {
    console.log('Binding events to buttons...');
    
    // Save button
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', (e) => {
        console.log('Save button clicked');
        e.preventDefault();
        this.saveSettings();
      });
    }

    // Cancel button
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', (e) => {
        console.log('Cancel button clicked');
        e.preventDefault();
        this.cancelSettings();
      });
    }

    // Reset button
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', (e) => {
        console.log('Reset button clicked');
        e.preventDefault();
        this.resetToDefaults();
      });
    }

    // Test connection button
    if (this.testConnectionBtn) {
      this.testConnectionBtn.addEventListener('click', (e) => {
        console.log('Test connection button clicked');
        e.preventDefault();
        this.testConnection();
      });
    }

    // Form submission
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }

    // Real-time validation
    if (this.serverUrlInput) {
      this.serverUrlInput.addEventListener('input', () => {
        this.validateServerUrlField();
      });
    }

    if (this.reconnectIntervalInput) {
      this.reconnectIntervalInput.addEventListener('input', () => {
        this.validateReconnectInterval();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveSettings();
      }
      if (e.key === 'Escape') {
        this.cancelSettings();
      }
    });
    
    console.log('Events bound successfully');
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

  saveConfig(config) {
    try {
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const configPath = this.getConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('Config saved to:', configPath);
      return { success: true };
    } catch (error) {
      console.error('Error saving config:', error);
      return { success: false, error: error.message };
    }
  }

  validateConfig(config) {
    // Validate server URL
    const urlValidation = this.validateServerUrl(config.serverUrl);
    if (!urlValidation.valid) {
      return urlValidation;
    }

    // Validate reconnect interval
    if (config.reconnectInterval < 1000 || config.reconnectInterval > 30000) {
      return {
        valid: false,
        error: 'Reconnect interval must be between 1000 and 30000 milliseconds'
      };
    }

    return { valid: true };
  }

  validateServerUrl(url) {
    if (!url || url.trim().length === 0) {
      return { valid: false, error: 'Server URL is required' };
    }

    // Basic URL validation (IP:PORT format)
    const urlPattern = /^(?:(\d{1,3}\.){3}\d{1,3}|localhost|[\w\.-]+):(\d{1,5})$/;
    if (!urlPattern.test(url.trim())) {
      return {
        valid: false,
        error: 'Invalid URL format. Use IP:PORT (e.g., 192.168.1.11:8080)'
      };
    }

    return { valid: true };
  }

  getWebSocketUrl(serverUrl) {
    if (serverUrl.startsWith('ws://') || serverUrl.startsWith('wss://')) {
      return serverUrl;
    }
    return `ws://${serverUrl}`;
  }

  validateServerUrlField() {
    const url = this.serverUrlInput.value.trim();
    const validation = this.validateServerUrl(url);
    
    if (!validation.valid && url.length > 0) {
      this.serverUrlInput.style.borderColor = '#dc3545';
      this.showMessage(validation.error, 'error');
      return false;
    } else {
      this.serverUrlInput.style.borderColor = '#4CAF50';
      this.hideMessage();
      return true;
    }
  }

  validateReconnectInterval() {
    const interval = parseInt(this.reconnectIntervalInput.value);
    
    if (interval < 1000 || interval > 30000) {
      this.reconnectIntervalInput.style.borderColor = '#dc3545';
      this.showMessage('Reconnect interval must be between 1000 and 30000 milliseconds', 'error');
      return false;
    } else {
      this.reconnectIntervalInput.style.borderColor = '#4CAF50';
      this.hideMessage();
      return true;
    }
  }

  getFormData() {
    return {
      serverUrl: this.serverUrlInput.value.trim(),
      autoReconnect: this.autoReconnectInput.checked,
      reconnectInterval: parseInt(this.reconnectIntervalInput.value)
    };
  }

  async saveSettings() {
    console.log('saveSettings called');
    try {
      const formData = this.getFormData();
      console.log('Form data:', formData);
      
      // Validate all fields
      const validation = this.validateConfig(formData);
      if (!validation.valid) {
        this.showMessage(validation.error, 'error');
        return;
      }

      // Save configuration
      const result = this.saveConfig(formData);
      if (!result.success) {
        this.showMessage(result.error, 'error');
        return;
      }

      this.showMessage('Settings saved successfully!', 'success');
      
      // Notify main process that settings have changed
      try {
        await ipcRenderer.invoke('settings-updated', formData);
      } catch (error) {
        console.warn('Could not notify main process of settings update:', error);
      }

      // Close settings window after short delay
      setTimeout(() => {
        this.closeWindow();
      }, 1500);

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showMessage('Error saving settings: ' + error.message, 'error');
    }
  }

  cancelSettings() {
    console.log('cancelSettings called');
    // Restore original settings
    if (this.currentConfig) {
      this.populateForm(this.currentConfig);
    }
    this.hideMessage();
    this.closeWindow();
  }

  resetToDefaults() {
    console.log('resetToDefaults called');
    const defaults = this.getDefaultConfig();
    this.populateForm(defaults);
    this.showMessage('Settings reset to defaults', 'warning');
  }

  async testConnection() {
    console.log('testConnection called');
    const formData = this.getFormData();
    
    // Validate URL first
    const validation = this.validateServerUrl(formData.serverUrl);
    if (!validation.valid) {
      this.showMessage(validation.error, 'error');
      return;
    }

    this.showLoading(true);
    this.updateConnectionStatus('connecting');
    
    try {
      // Create a simple WebSocket test
      const wsUrl = this.getWebSocketUrl(formData.serverUrl);
      console.log('Testing connection to:', wsUrl);
      
      const testTimeout = setTimeout(() => {
        this.updateConnectionStatus('test-failed');
        this.showLoading(false);
        this.showMessage('Connection test timed out (10 seconds)', 'error');
      }, 10000);

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        clearTimeout(testTimeout);
        this.updateConnectionStatus('test-success');
        this.showLoading(false);
        this.showMessage('✅ Connection test successful! Server is reachable.', 'success');
        
        // Close the test connection cleanly
        setTimeout(() => {
          ws.close();
        }, 1000);
        
        // Reset status to disconnected after showing success for 5 seconds
        setTimeout(() => {
          this.updateConnectionStatus('disconnected');
        }, 5000);
      };

      ws.onclose = () => {
        console.log('Test WebSocket connection closed');
      };

      ws.onerror = (error) => {
        clearTimeout(testTimeout);
        this.updateConnectionStatus('test-failed');
        this.showLoading(false);
        this.showMessage('❌ Connection failed: Unable to reach server at ' + formData.serverUrl, 'error');
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      this.showLoading(false);
      this.updateConnectionStatus('test-failed');
      this.showMessage('Connection test failed: ' + error.message, 'error');
    }
  }

  updateConnectionStatus(status) {
    this.statusLight.className = 'status-light';
    
    switch (status) {
      case 'connected':
        this.statusLight.classList.add('connected');
        this.statusText.textContent = 'Connected';
        break;
      case 'connecting':
        this.statusLight.classList.add('connecting');
        this.statusText.textContent = 'Testing connection...';
        break;
      case 'test-success':
        this.statusLight.classList.add('connected');
        this.statusText.textContent = 'Test Successful';
        break;
      case 'test-failed':
        this.statusLight.classList.add('error');
        this.statusText.textContent = 'Test Failed';
        break;
      case 'disconnected':
      default:
        this.statusText.textContent = 'Ready to test';
        break;
    }
  }

  showMessage(message, type = 'info') {
    this.validationMessage.textContent = message;
    this.validationMessage.className = `validation-message ${type}`;
    this.validationMessage.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        this.hideMessage();
      }, 3000);
    }
  }

  hideMessage() {
    this.validationMessage.style.display = 'none';
  }

  showLoading(show) {
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
    
    // Disable buttons during loading
    this.testConnectionBtn.disabled = show;
    this.saveBtn.disabled = show;
  }

  closeWindow() {
    try {
      // Close the window
      window.close();
    } catch (error) {
      console.warn('Could not close window:', error);
    }
  }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing settings manager...');
  window.settingsManager = new SettingsManager();
});
