// Haptic Feedback utility for web and mobile devices
// Uses the Web Vibration API where available

class HapticManager {
  constructor() {
    this.isSupported = 'vibrate' in navigator;
    this.isEnabled = true; // Could be made user-configurable
  }

  // Light success vibration (successful word submission)
  success() {
    if (!this.isSupported || !this.isEnabled) return;
    
    try {
      // Pattern: short pulse for success
      navigator.vibrate([50]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Warning vibration (invalid word, errors)
  warning() {
    if (!this.isSupported || !this.isEnabled) return;
    
    try {
      // Pattern: two quick pulses for warning/error
      navigator.vibrate([30, 50, 30]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Light impact for button taps
  impact() {
    if (!this.isSupported || !this.isEnabled) return;
    
    try {
      // Pattern: very brief pulse for button feedback
      navigator.vibrate([20]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Medium impact for major actions
  mediumImpact() {
    if (!this.isSupported || !this.isEnabled) return;
    
    try {
      // Pattern: slightly longer pulse for major actions
      navigator.vibrate([40]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Heavy impact for significant events
  heavyImpact() {
    if (!this.isSupported || !this.isEnabled) return;
    
    try {
      // Pattern: longer pulse for significant events
      navigator.vibrate([80]);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  // Enable/disable haptic feedback
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Check if haptic feedback is supported
  isHapticSupported() {
    return this.isSupported;
  }
}

// Singleton instance
export const haptics = new HapticManager();

// React hook for haptic feedback
export function useHaptics() {
  return {
    success: () => haptics.success(),
    warning: () => haptics.warning(),
    impact: () => haptics.impact(),
    mediumImpact: () => haptics.mediumImpact(),
    heavyImpact: () => haptics.heavyImpact(),
    isSupported: haptics.isHapticSupported()
  };
}

export default haptics;