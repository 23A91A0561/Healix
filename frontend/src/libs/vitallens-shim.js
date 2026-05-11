export class VitalLens {
  constructor(config = {}) {
    this.config = config;
    this.listeners = new Map();
    this.stream = null;
    this.interval = null;
  }

  addEventListener(eventName, callback) {
    if (typeof callback === "function") {
      this.listeners.set(eventName, callback);
    }
  }

  removeEventListener(eventName) {
    this.listeners.delete(eventName);
  }

  async setVideoStream(stream, element) {
    this.stream = stream;
    this.element = element;
    return Promise.resolve();
  }

  startVideoStream() {
    if (this.interval) return;

    const emitVitals = () => {
      const vitals = {
        heart_rate: { value: 72 },
        respiratory_rate: { value: 18 },
        hrv: { value: 65 },
      };
      const callback = this.listeners.get("vitals");
      if (callback) {
        callback(vitals);
      }
    };

    this.interval = window.setInterval(emitVitals, 2000);
    emitVitals();
  }

  stopVideoStream() {
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
  }

  async close() {
    this.stopVideoStream();
    this.listeners.clear();
    return Promise.resolve();
  }
}
