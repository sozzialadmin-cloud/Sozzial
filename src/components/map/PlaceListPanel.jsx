import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, MapPin, ChevronUp, Coins, Users, ArrowUpDown } from "lucide-react";
import { ZINDEX } from "@/lib/zindex";
import { formatPrice, getValueLabel, getValueTone } from "@/lib/place-helpers";

function SortChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition-all whitespace-nowrap ${
        active
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-black/8 bg-white text-[#605747] hover:border-black/12 hover:text-[#111111]"
      }`}
    >
      {children}
    </button>
  );
}

export default function PlaceListPanel({
  places,
  open,
  onToggle,
  onSelectPlace,
  selectedId,
  sortMode = "value",
  onSortModeChange,
  sortDirection = "asc",
  onSortDirectionChange,
}) {
  const sortedPlaces = useMemo(() => {
    const copy = [...places];
    const directionFactor = sortDirection === "desc" ? -1 : 1;
    if (sortMode === "price") copy.sort((a, b) => (Number(a.standard_slice_price || 0) - Number(b.standard_slice_price || 0)) * directionFactor);
    else if (sortMode === "rating") copy.sort((a, b) => (Number(a.average_rating || 0) - Number(b.average_rating || 0)) * -directionFactor);
    else if (sortMode === "hangouts") copy.sort((a, b) => (Number(a.active_hangouts_count || 0) - Number(b.active_hangouts_count || 0)) * -directionFactor);
    else {
      const order = ["Chollo", "Buen precio", "Merece la pena", "Buen valor", "Premium", "Caro"];
      copy.sort((a, b) => {
        const av = order.indexOf(getValueLabel(a));
        const bv = order.indexOf(getValueLabel(b));
        return (av - bv || Number(a.standard_slice_price || 0) - Number(b.standard_slice_price || 0)) * directionFactor;
      });
    }
    return copy;
  }, [places, sortMode, sortDirection]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 260 }}
          className="fixed inset-x-0 bottom-0 top-14 sm:top-14 sm:left-auto sm:right-auto sm:w-[390px] sm:h-[calc(100vh-72px)] overflow-hidden rounded-t-[28px] border-t border-black/8 bg-[#fffaf1] sm:rounded-none sm:border-r sm:border-t-0"
          style={{ zIndex: ZINDEX.MAP_CONTROLS }}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-black/8 bg-[#fffaf1] px-4 pb-3 pt-3">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-black/10 sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-black text-[#111111]">Comparar spots</p>
                  <p className="mt-1 text-xs text-[#605747]">Precio, valor y planes activos sin salir del mapa.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSortDirectionChange?.(sortDirection === "asc" ? "desc" : "asc")}
                    className="rounded-full border border-black/8 bg-white p-2 text-[#605747] hover:text-[#111111]"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                  <button onClick={onToggle} className="rounded-full border border-black/8 bg-white p-2 text-[#605747] hover:text-[#111111]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <SortChip active={sortMode === "value"} onClick={() => onSortModeChange?.("value")}>Valor</SortChip>
                <SortChip active={sortMode === "price"} onClick={() => onSortModeChange?.("price")}>Mas baratos</SortChip>
                <SortChip active={sortMode === "rating"} onClick={() => onSortModeChange?.("rating")}>Mejor valorados</SortChip>
                <SortChip active={sortMode === "hangouts"} onClick={() => onSortModeChange?.("hangouts")}>Planes</SortChip>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {sortedPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => onSelectPlace(place)}
                  className={`w-full rounded-[20px] border px-3 py-3 text-left transition ${
                    selectedId === place.id ? "border-[#df5b43]/30 bg-[#fff0ea]" : "border-black/8 bg-white hover:bg-[#fffdf9]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-[#111111]">{place.name}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${getValueTone(place)}`}>
                          {getValueLabel(place)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#605747]">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{place.neighborhood || place.borough}</span>
                        {Number(place.active_hangouts_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#216b33]"><Users className="h-3 w-3" />{place.active_hangouts_count} planes</span>
                        ) : null}
                      </div>
                      <div className="mt-2 line-clamp-1 text-xs text-[#7a6f5c]">{place.best_known_slice || "Cheese slice"}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="inline-flex items-center gap-1 rounded-xl border border-black/8 bg-[#f6f0e4] px-2 py-1">
                        <Coins className="h-3 w-3 text-[#d6a11e]" />
                        <span className="text-sm font-black text-[#111111]">{formatPrice(place.standard_slice_price)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1 text-xs">
                        <Star className="h-3 w-3 fill-[#df5b43] text-[#df5b43]" />
                        <span className="font-medium text-[#b54834]">{Number(place.average_rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

