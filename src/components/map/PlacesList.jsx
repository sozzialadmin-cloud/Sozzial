import React from "react";
import { Camera, MapPin, Pizza, Star, Users } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice, getValueLabel } from "@/lib/place-helpers";

function SkeletonCard({ index }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-white/10" style={{ animationDelay: `${index * 80}ms` }} />
        <div className="min-w-0 flex-1 space-y-2 py-1">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/10" />
          <div className="flex gap-2 pt-1">
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlacesList({ places, isLoading, onSelectPlace, selectedPlaceId }) {
  if (isLoading) {
    return (
      <div className="space-y-3 px-4 py-4">
        {[0, 1, 2, 3].map((item) => <SkeletonCard key={item} index={item} />)}
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="mx-4 my-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
          <Pizza className="h-7 w-7" />
        </div>
        <div className="mt-4 text-lg font-black text-white">No slices found</div>
        <p className="mt-2 text-sm leading-6 text-stone-500">Try fewer filters or add the first great spot in this area.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3">
      {places.map((place, idx) => {
        const selected = selectedPlaceId === place.id;
        const rating = Number(place.average_rating || 0);
        return (
          <motion.button
            key={place.id}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: Math.min(idx * 0.035, 0.22) }}
            onClick={() => onSelectPlace(place)}
            className={`w-full overflow-hidden rounded-[24px] border text-left transition-all ${
              selected
                ? "border-[#efbf3a]/55 bg-[#efbf3a]/10 shadow-[0_18px_40px_rgba(239,191,58,0.12)]"
                : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex gap-3 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#141414]">
                {place.photo_url ? (
                  <img src={place.photo_url} alt={place.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,rgba(239,191,58,0.18),transparent_55%),#111] text-stone-600">
                    <Camera className="h-6 w-6" />
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
                  {formatPrice(place.standard_slice_price)}
                </div>
              </div>
              <div className="min-w-0 flex-1 py-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">{place.name}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-stone-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {place.address || place.neighborhood || "NYC"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-stone-300">
                    {getValueLabel(place)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-bold text-stone-300">
                    <Star className="h-3.5 w-3.5 fill-[#efbf3a] text-[#efbf3a]" />
                    {rating ? rating.toFixed(1) : "New"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-bold text-stone-300">
                    <Users className="h-3.5 w-3.5" />
                    {place.active_hangouts_count || 0} plans
                  </span>
                  {place.best_known_slice ? (
                    <span className="max-w-full truncate rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-bold text-stone-300">
                      {place.best_known_slice}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}