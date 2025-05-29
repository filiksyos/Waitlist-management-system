const { screen } = require('electron');

class DisplayManager {
  constructor() {
    this.displays = [];
    this.primaryDisplay = null;
    this.tvDisplay = null;
  }

  /**
   * Get all available displays and identify the TV display
   */
  detectDisplays() {
    this.displays = screen.getAllDisplays();
    this.primaryDisplay = screen.getPrimaryDisplay();
    this.tvDisplay = this.identifyTVDisplay();
    
    console.log('Display detection results:');
    console.log('Total displays:', this.displays.length);
    console.log('Primary display:', this.primaryDisplay.id);
    console.log('TV display:', this.tvDisplay ? this.tvDisplay.id : 'Not found');
    
    return {
      total: this.displays.length,
      primary: this.primaryDisplay,
      tv: this.tvDisplay,
      all: this.displays
    };
  }

  /**
   * Identify which display is likely the TV/HDMI display
   * Logic: Secondary display (not primary) with largest resolution
   */
  identifyTVDisplay() {
    const secondaryDisplays = this.displays.filter(display => display.id !== this.primaryDisplay.id);
    
    if (secondaryDisplays.length === 0) {
      console.log('No secondary displays found');
      return null;
    }

    // If only one secondary display, that's likely the TV
    if (secondaryDisplays.length === 1) {
      console.log('Found single secondary display - using as TV:', secondaryDisplays[0].id);
      return secondaryDisplays[0];
    }

    // If multiple secondary displays, choose the largest one
    const largestDisplay = secondaryDisplays.reduce((largest, current) => {
      const currentArea = current.bounds.width * current.bounds.height;
      const largestArea = largest.bounds.width * largest.bounds.height;
      return currentArea > largestArea ? current : largest;
    });

    console.log('Found multiple secondary displays - using largest as TV:', largestDisplay.id);
    return largestDisplay;
  }

  /**
   * Get window bounds for positioning on TV display
   */
  getTVWindowBounds() {
    if (!this.tvDisplay) {
      console.log('No TV display available, using primary display');
      return this.primaryDisplay.workingArea;
    }

    return {
      x: this.tvDisplay.bounds.x,
      y: this.tvDisplay.bounds.y,
      width: this.tvDisplay.bounds.width,
      height: this.tvDisplay.bounds.height
    };
  }

  /**
   * Check if TV display is available
   */
  isTVDisplayAvailable() {
    return this.tvDisplay !== null;
  }

  /**
   * Get display info for logging
   */
  getDisplayInfo() {
    return this.displays.map(display => ({
      id: display.id,
      bounds: display.bounds,
      workingArea: display.workingArea,
      scaleFactor: display.scaleFactor,
      rotation: display.rotation,
      isPrimary: display.id === this.primaryDisplay.id
    }));
  }

  /**
   * Listen for display changes
   */
  onDisplayChanged(callback) {
    screen.on('display-added', () => {
      console.log('Display added - re-detecting displays');
      this.detectDisplays();
      callback('added', this.detectDisplays());
    });

    screen.on('display-removed', () => {
      console.log('Display removed - re-detecting displays');
      this.detectDisplays();
      callback('removed', this.detectDisplays());
    });

    screen.on('display-metrics-changed', () => {
      console.log('Display metrics changed - re-detecting displays');
      this.detectDisplays();
      callback('changed', this.detectDisplays());
    });
  }
}

module.exports = DisplayManager; 