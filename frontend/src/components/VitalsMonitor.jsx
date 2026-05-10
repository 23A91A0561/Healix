import React, { useState } from "react";

export const VitalsMonitor = ({
  isMonitoring,
  heartRate,
  respiratoryRate,
  hrv,
  onStart,
  onStop,
  error,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const getHeartRateColor = (hr) => {
    if (!hr) return "text-slate-400";
    if (hr < 60) return "text-blue-500";
    if (hr > 100) return "text-red-500";
    return "text-green-500";
  };

  const getRespiratoryRateColor = (rr) => {
    if (!rr) return "text-slate-400";
    if (rr < 12) return "text-blue-500";
    if (rr > 20) return "text-red-500";
    return "text-green-500";
  };

  const getHRVColor = (h) => {
    if (!h) return "text-slate-400";
    if (h < 50) return "text-orange-500";
    return "text-green-500";
  };

  return (
    <div className="fixed right-4 bottom-4 z-[1000]">
      {isVisible && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 w-80 max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Vital Signs Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Heart Rate */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-600">
                  Heart Rate
                </label>
                {heartRate !== null && (
                  <span className={`text-2xl font-bold ${getHeartRateColor(heartRate)}`}>
                    {Math.round(heartRate)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {heartRate !== null ? "bpm" : "Measuring..."}
              </p>
              <div className="w-full h-1 bg-slate-100 rounded mt-2">
                <div
                  className="h-1 bg-green-500 rounded"
                  style={{
                    width: heartRate
                      ? `${Math.min(100, (heartRate / 120) * 100)}%`
                      : "0%",
                  }}
                ></div>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-600">
                  Respiratory Rate
                </label>
                {respiratoryRate !== null && (
                  <span className={`text-2xl font-bold ${getRespiratoryRateColor(respiratoryRate)}`}>
                    {Math.round(respiratoryRate)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {respiratoryRate !== null ? "breaths/min" : "Measuring..."}
              </p>
              <div className="w-full h-1 bg-slate-100 rounded mt-2">
                <div
                  className="h-1 bg-blue-500 rounded"
                  style={{
                    width: respiratoryRate
                      ? `${Math.min(100, (respiratoryRate / 30) * 100)}%`
                      : "0%",
                  }}
                ></div>
              </div>
            </div>

            {/* HRV */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-600">
                  Heart Rate Variability
                </label>
                {hrv !== null && (
                  <span className={`text-2xl font-bold ${getHRVColor(hrv)}`}>
                    {Math.round(hrv)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {hrv !== null ? "ms" : "Calculating..."}
              </p>
            </div>

            {/* Status and Controls */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isMonitoring ? "bg-green-500" : "bg-slate-300"
                  }`}
                ></div>
                <span className="text-sm text-slate-600">
                  {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
                </span>
              </div>

              <div className="flex gap-2">
                {!isMonitoring ? (
                  <button
                    onClick={onStart}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    Start Monitoring
                  </button>
                ) : (
                  <button
                    onClick={onStop}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    Stop Monitoring
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-full p-3 shadow-lg transition"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
