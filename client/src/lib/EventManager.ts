/**
 * A robust event management system for game events
 */
export class EventManager {
  private events: Map<string, Set<Function>>;
  private oneTimeEvents: Map<string, Set<Function>>;
  private active: boolean;

  constructor() {
    this.events = new Map();
    this.oneTimeEvents = new Map();
    this.active = true;
  }

  on(eventName: string, callback: Function) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName)?.add(callback);

    // Return cleanup function
    return () => this.off(eventName, callback);
  }

  once(eventName: string, callback: Function) {
    if (!this.oneTimeEvents.has(eventName)) {
      this.oneTimeEvents.set(eventName, new Set());
    }
    this.oneTimeEvents.get(eventName)?.add(callback);
  }

  off(eventName: string, callback: Function) {
    this.events.get(eventName)?.delete(callback);
    this.oneTimeEvents.get(eventName)?.delete(callback);
  }

  emit(eventName: string, ...args: any[]) {
    if (!this.active) return;

    try {
      // Regular events
      this.events.get(eventName)?.forEach(callback => {
        try {
          callback(...args);
        } catch (err) {
          console.error(`Error in event listener for ${eventName}:`, err);
        }
      });

      // One-time events
      this.oneTimeEvents.get(eventName)?.forEach(callback => {
        try {
          callback(...args);
          this.oneTimeEvents.get(eventName)?.delete(callback);
        } catch (err) {
          console.error(`Error in one-time event listener for ${eventName}:`, err);
        }
      });
    } catch (err) {
      console.error(`Error emitting event ${eventName}:`, err);
    }
  }

  clear() {
    this.events.clear();
    this.oneTimeEvents.clear();
  }

  disable() {
    this.active = false;
  }

  enable() {
    this.active = true;
  }
}

// Create a singleton instance for global use
export const gameEvents = new EventManager();
