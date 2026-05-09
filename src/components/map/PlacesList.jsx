import React from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PlacesList({ places, isLoading, onSelectPlace, selectedPlaceId }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-stone-500 text-sm">
        No hay resultados
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3">
      {places.map((place, idx) => (
        <motion.button
          key={place.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => onSelectPlace(place)}
          className={`w-full p-3 rounded-lg border transition-all text-left ${
            selectedPlaceId === place.id
              ? "border-red-500/50 bg-red-600/10"
              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }`}
        >
          <p className="font-medium text-sm text-white truncate">{place.name}</p>
          <p className="text-xs text-stone-500 mt-0.5">{place.neighborhood}</p>
        </motion.button>
      ))}
    </div>
  );
}
