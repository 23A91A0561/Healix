import vitalsService from '../services/vitals.service.js';
import Consultation from '../models/Consultation.js';

/**
 * Initialize vital signs monitoring for a consultation
 */
const initializeVitals = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await vitalsService.initializeVitals(consultationId);

    res.status(200).json({
      message: "Vitals monitoring initialized",
      consultation,
    });
  } catch (error) {
    console.error("Error initializing vitals:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Store a vital reading
 */
const storeVitalReading = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { heartRate, respiratoryRate, hrv } = req.body;

    if (!heartRate && !respiratoryRate && !hrv) {
      return res.status(400).json({
        error: "At least one vital sign value is required",
      });
    }

    const result = await vitalsService.storeVitalReading(consultationId, {
      heartRate,
      respiratoryRate,
      hrv,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error storing vital reading:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Get current vitals for a consultation
 */
const getVitals = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const vitals = await vitalsService.getVitals(consultationId);

    res.status(200).json(vitals);
  } catch (error) {
    console.error("Error getting vitals:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Get vital readings history
 */
const getVitalReadingsHistory = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { limit = 100 } = req.query;

    const readings = await vitalsService.getVitalReadingsHistory(
      consultationId,
      parseInt(limit)
    );

    res.status(200).json(readings);
  } catch (error) {
    console.error("Error getting vital readings history:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Get vitals summary
 */
const getVitalsSummary = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const summary = await vitalsService.getVitalsSummary(consultationId);

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error getting vitals summary:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Stop vitals monitoring
 */
const stopVitalsMonitoring = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await vitalsService.stopVitalsMonitoring(
      consultationId
    );

    res.status(200).json({
      message: "Vitals monitoring stopped",
      consultation,
    });
  } catch (error) {
    console.error("Error stopping vitals monitoring:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

export default {
  initializeVitals,
  storeVitalReading,
  getVitals,
  getVitalReadingsHistory,
  getVitalsSummary,
  stopVitalsMonitoring,
};
