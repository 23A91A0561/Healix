import React, { useState, useRef, useEffect } from "react";

export const RemoteVitals = ({ remoteVitals }) => {
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 300 }); // Default initial approx position
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize position precisely to bottom-left on mount
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: 16,
        y: window.innerHeight - rect.height - 16
      });
      isInitializedRef.current = true;
    }
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Keep within window bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const entries = Object.entries(remoteVitals || {});

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        touchAction: 'none' // Prevent scrolling when dragging on touch devices
      }}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden w-64 flex flex-col">
        {/* Drag Handle */}
        <div 
          className="drag-handle bg-slate-50 hover:bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center cursor-move transition-colors"
          onMouseDown={handleMouseDown}
          title="Drag to move"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <h4 className="text-sm font-semibold text-slate-900">Patient Vitals</h4>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 max-h-96 overflow-auto">
          {entries.length === 0 ? (
            <div className="py-2 text-center">
              <div className="animate-pulse flex space-x-4 justify-center items-center mb-2">
                <div className="h-2 w-2 bg-slate-300 rounded-full"></div>
                <div className="h-2 w-2 bg-slate-300 rounded-full"></div>
                <div className="h-2 w-2 bg-slate-300 rounded-full"></div>
              </div>
              <p className="text-xs text-slate-500">Waiting for patient data...</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {entries.map(([socketId, reading]) => (
                <li key={socketId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Live Reading</span>
                    <span className="text-xs font-mono text-slate-400">{new Date(reading?.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm font-medium text-slate-700">Heart Rate</span>
                      <span className="text-sm font-bold text-green-600">{reading?.heartRate ? Math.round(reading.heartRate) + ' bpm' : '--'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm font-medium text-slate-700">Resp. Rate</span>
                      <span className="text-sm font-bold text-blue-600">{reading?.respiratoryRate ? Math.round(reading.respiratoryRate) + ' /min' : '--'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm font-medium text-slate-700">HRV</span>
                      <span className="text-sm font-bold text-orange-600">{reading?.hrv ? Math.round(reading.hrv) + ' ms' : '--'}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
