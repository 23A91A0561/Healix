const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface VitalReading {
  heartRate?: number;
  respiratoryRate?: number;
  hrv?: number;
}

export interface VitalsResponse {
  success: boolean;
  vitals: any;
  reading?: VitalReading;
}

/**
 * Initialize vitals monitoring for a consultation
 */
export async function initializeVitals(
  consultationId: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${consultationId}/initialize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to initialize vitals monitoring");
  }

  return response.json();
}

/**
 * Store a vital reading
 */
export async function storeVitalReading(
  consultationId: string,
  reading: VitalReading,
  token: string
): Promise<VitalsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${consultationId}/reading`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reading),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to store vital reading");
  }

  return response.json();
}

/**
 * Get current vitals for a consultation
 */
export async function getVitals(
  consultationId: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${consultationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get vitals");
  }

  return response.json();
}

/**
 * Get vitals summary
 */
export async function getVitalsSummary(
  consultationId: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${consultationId}/summary`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get vitals summary");
  }

  return response.json();
}

/**
 * Get vital readings history
 */
export async function getVitalReadingsHistory(
  consultationId: string,
  limit: number = 100,
  token: string
): Promise<any[]> {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${consultationId}/history?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get vital readings history");
  }

  return response.json();
}

/**
 * Stop vitals monitoring
 */
export async function stopVitalsMonitoring(
  consultationId: string,
  token: string
): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/vitals/${consultationId}/stop`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to stop vitals monitoring");
  }

  return response.json();
}
