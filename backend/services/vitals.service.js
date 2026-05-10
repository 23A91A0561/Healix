import Consultation from '../models/Consultation.js';

class VitalsService {
  /**
   * Initialize vital signs monitoring for a consultation
   */
  async initializeVitals(consultationId) {
    try {
      const consultation = await Consultation.findByIdAndUpdate(
        consultationId,
        {
          $set: {
            "vitals.isMonitoring": true,
            "vitals.lastUpdated": new Date(),
            "vitals.heartRate.samples": [],
            "vitals.respiratoryRate.samples": [],
          },
        },
        { new: true }
      );
      return consultation;
    } catch (error) {
      console.error("Error initializing vitals:", error);
      throw error;
    }
  }

  /**
   * Store vital signs reading
   */
  async storeVitalReading(consultationId, reading) {
    try {
      const { heartRate, respiratoryRate, hrv } = reading;

      const consultation = await Consultation.findById(consultationId);

      if (!consultation) {
        throw new Error("Consultation not found");
      }

      // Initialize vitals object if not exists
      if (!consultation.vitals) {
        consultation.vitals = {
          heartRate: {},
          respiratoryRate: {},
          isMonitoring: true,
        };
      }

      // Update heart rate
      if (heartRate !== undefined && heartRate !== null) {
        const hrSamples = consultation.vitals.heartRate.samples || [];
        hrSamples.push(heartRate);

        // Keep only last 100 samples for memory efficiency
        if (hrSamples.length > 100) {
          hrSamples.shift();
        }

        const hrAvg =
          hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length;

        consultation.vitals.heartRate = {
          current: heartRate,
          min: Math.min(...hrSamples),
          max: Math.max(...hrSamples),
          average: Math.round(hrAvg),
          samples: hrSamples,
        };
      }

      // Update respiratory rate
      if (respiratoryRate !== undefined && respiratoryRate !== null) {
        const rrSamples = consultation.vitals.respiratoryRate.samples || [];
        rrSamples.push(respiratoryRate);

        // Keep only last 100 samples
        if (rrSamples.length > 100) {
          rrSamples.shift();
        }

        const rrAvg =
          rrSamples.reduce((a, b) => a + b, 0) / rrSamples.length;

        consultation.vitals.respiratoryRate = {
          current: respiratoryRate,
          min: Math.min(...rrSamples),
          max: Math.max(...rrSamples),
          average: Math.round(rrAvg),
          samples: rrSamples,
        };
      }

      // Update HRV if provided
      if (hrv !== undefined && hrv !== null) {
        consultation.vitals.hrv = {
          value: hrv,
          timestamp: new Date(),
        };
      }

      consultation.vitals.lastUpdated = new Date();

      // Add to readings history
      if (!consultation.vitalReadings) {
        consultation.vitalReadings = [];
      }

      consultation.vitalReadings.push({
        timestamp: new Date(),
        heartRate: heartRate || null,
        respiratoryRate: respiratoryRate || null,
        hrv: hrv || null,
      });

      // Keep only last 500 readings
      if (consultation.vitalReadings.length > 500) {
        consultation.vitalReadings.shift();
      }

      await consultation.save();

      return {
        success: true,
        vitals: consultation.vitals,
        reading: consultation.vitalReadings[
          consultation.vitalReadings.length - 1
        ],
      };
    } catch (error) {
      console.error("Error storing vital reading:", error);
      throw error;
    }
  }

  /**
   * Get current vital signs for a consultation
   */
  async getVitals(consultationId) {
    try {
      const consultation = await Consultation.findById(consultationId).select(
        "vitals vitalReadings"
      );

      if (!consultation) {
        throw new Error("Consultation not found");
      }

      return consultation.vitals || {};
    } catch (error) {
      console.error("Error getting vitals:", error);
      throw error;
    }
  }

  /**
   * Get vital readings history
   */
  async getVitalReadingsHistory(consultationId, limit = 100) {
    try {
      const consultation = await Consultation.findById(consultationId).select(
        "vitalReadings"
      );

      if (!consultation) {
        throw new Error("Consultation not found");
      }

      const readings = consultation.vitalReadings || [];
      return readings.slice(-limit);
    } catch (error) {
      console.error("Error getting vital readings history:", error);
      throw error;
    }
  }

  /**
   * Stop vital signs monitoring
   */
  async stopVitalsMonitoring(consultationId) {
    try {
      const consultation = await Consultation.findByIdAndUpdate(
        consultationId,
        {
          $set: {
            "vitals.isMonitoring": false,
          },
        },
        { new: true }
      );

      return consultation;
    } catch (error) {
      console.error("Error stopping vitals monitoring:", error);
      throw error;
    }
  }

  /**
   * Get vital statistics summary
   */
  async getVitalsSummary(consultationId) {
    try {
      const consultation = await Consultation.findById(consultationId).select(
        "vitals vitalReadings"
      );

      if (!consultation) {
        throw new Error("Consultation not found");
      }

      const vitals = consultation.vitals || {};
      const readings = consultation.vitalReadings || [];

      return {
        currentHeartRate: vitals.heartRate?.current || null,
        averageHeartRate: vitals.heartRate?.average || null,
        heartRateRange: {
          min: vitals.heartRate?.min || null,
          max: vitals.heartRate?.max || null,
        },
        currentRespiratoryRate: vitals.respiratoryRate?.current || null,
        averageRespiratoryRate: vitals.respiratoryRate?.average || null,
        respiratoryRateRange: {
          min: vitals.respiratoryRate?.min || null,
          max: vitals.respiratoryRate?.max || null,
        },
        hrv: vitals.hrv?.value || null,
        isMonitoring: vitals.isMonitoring || false,
        lastUpdated: vitals.lastUpdated || null,
        readingsCount: readings.length,
      };
    } catch (error) {
      console.error("Error getting vitals summary:", error);
      throw error;
    }
  }
}

export default new VitalsService();
