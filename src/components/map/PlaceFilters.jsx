import React from "react";
import { SearchFilters } from "@/components/map/SearchFilters";

export default function PlaceFilters({ onFilterChange, resultCount }) {
  return (
    <div className="w-full">
      <SearchFilters onFilterChange={onFilterChange} />
      {resultCount === 0 && (
        <div className="px-4 py-3 text-xs text-stone-500 bg-white/[0.02] border-t border-white/5">
          No se encontraron pizzerÃ­as con esos filtros
        </div>
      )}
    </div>
  );
}
