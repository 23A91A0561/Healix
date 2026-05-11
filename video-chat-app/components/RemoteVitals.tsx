import React from "react";

interface RemoteVitalsProps {
  remoteVitals: Record<string, any>;
}

export const RemoteVitals: React.FC<RemoteVitalsProps> = ({ remoteVitals }) => {
  const entries = Object.entries(remoteVitals || {});

  if (entries.length === 0) {
    return (
      <div className="fixed left-4 bottom-4 z-40">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-3 w-64">
          <p className="text-sm text-slate-600">No remote vitals yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-4 bottom-4 z-40">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-3 w-64 max-h-96 overflow-auto">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Remote Vitals</h4>
        <ul className="space-y-3">
          {entries.map(([socketId, reading]: [string, any]) => (
            <li key={socketId} className="border-b pb-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Guest {socketId.slice(0,6)}</span>
                <span className="text-xs text-slate-400">{new Date(reading?.timestamp || Date.now()).toLocaleTimeString()}</span>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">HR</span>
                  <span className="text-sm font-bold">{reading?.heartRate ? Math.round(reading.heartRate) : '--'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">RR</span>
                  <span className="text-sm font-bold">{reading?.respiratoryRate ? Math.round(reading.respiratoryRate) : '--'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">HRV</span>
                  <span className="text-sm font-bold">{reading?.hrv ? Math.round(reading.hrv) : '--'}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
