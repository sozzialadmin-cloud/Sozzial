import React, { useState } from "react";
import { Circle, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";

const RADIUS_OPTIONS = [1, 2, 3, 5, 10]; // miles

export default function RadiusControl({ selectedPlace }) {
  const map = useMap();
  const [radiusActive, setRadiusActive] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  // Convert miles to meters (1 mile = 1609.34 meters)
  const mileToMeter = (miles) => miles * 1609.34;

  // Toggle radius on/off
  const handleToggleRadius = () => {
    if (radiusActive) {
      setRadiusActive(false);
      setSelectedRadius(null);
      setShowMenu(false);
    } else {
      setRadiusActive(true);
      setShowMenu(true);
      setSelectedRadius(RADIUS_OPTIONS[0]); // Default to 1 mile
    }
  };

  const handleSelectRadius = (miles) => {
    setSelectedRadius(miles);
    setShowMenu(false);
  };

  return (
    <>
      {/* Control button */}
      <div
        className="fixed bottom-24 right-4 z-[1100]"
      >
        <motion.button
          onClick={handleToggleRadius}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all shadow-2xl shadow-black/60 border ${
            radiusActive
              ? "bg-red-600 border-red-500 text-white"
              : "bg-[#1a1a1a] border-white/30 text-stone-200 hover:text-white hover:bg-[#232323] hover:border-white/40"
          }`}
          title="Radius search"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          </svg>
        </motion.button>

        {/* Radius menu */}
        <AnimatePresence>
          {showMenu && radiusActive && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-14 right-0 bg-[#1a1a1a] border border-white/30 rounded-xl p-2 shadow-2xl shadow-black/60 w-40 z-[1101]"
            >
              <div className="space-y-1">
                {RADIUS_OPTIONS.map((miles) => (
                  <button
                    key={miles}
                    onClick={() => handleSelectRadius(miles)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedRadius === miles
                        ? "bg-red-600 text-white font-semibold"
                        : "text-stone-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {miles} mi
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Circle overlay on map */}
      {radiusActive && selectedPlace && selectedRadius && (
        <Circle
          center={[selectedPlace.latitude, selectedPlace.longitude]}
          radius={mileToMeter(selectedRadius)}
          pathOptions={{
            color: "#dc2626",
            weight: 2,
            opacity: 0.3,
            fillColor: "#dc2626",
            fillOpacity: 0.05,
          }}
        />
      )}
    </>
  );
}
