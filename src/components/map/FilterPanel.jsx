import React from "react";
import { Camera, FileText, Pizza, Star, Tag, Users } from "lucide-react";
import { motion } from "framer-motion";
import { ZINDEX } from "@/lib/zindex";

const PRICE_BANDS = [
  { value: "budget", label: "Barato", desc: "Hasta $3", color: "bg-emerald-500" },
  { value: "mid", label: "Medio", desc: "$3 a $5", color: "bg-[#efbf3a]" },
  { value: "premium", label: "Premium", desc: "Mas de $5", color: "bg-[#df5b43]" },
];

const SORT_OPTIONS = [
  { value: "price_low", label: "Precio mas bajo" },
  { value: "price_high", label: "Precio mas alto" },
  { value: "rating", label: "Mejor valorados" },
  { value: "reviews", label: "Mas reseñas" },
  { value: "active_plans", label: "Mas planes" },
  { value: "name", label: "A-Z" },
];

const RATING_OPTIONS = [0, 3.5, 4, 4.5];

function FilterChip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
        active
          ? "border-[#f1df9c] bg-[#efbf3a] text-[#141414] shadow-sm"
          : "border-black/8 bg-white text-[#6d665b] hover:border-black/12 hover:text-[#141414]"
      }`}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </button>
  );
}

export default function FilterPanel({ filters, onFiltersChange, resultCount, onClose }) {
  const updateFilter = (key, value) => onFiltersChange({ ...filters, [key]: value });
  const toggleArrayFilter = (key, value) => {
    const arr = filters[key] || [];
    const newArr = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    updateFilter(key, newArr);
  };

  const activeFilterCount = [
    (filters.priceBands || []).length,
    Number(filters.minRating || 0) > 0 ? 1 : 0,
    filters.withPhoto ? 1 : 0,
    filters.withActivePlans ? 1 : 0,
    filters.withBestSlice ? 1 : 0,
    filters.withNotes ? 1 : 0,
    filters.sortBy ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAll = () => {
    onFiltersChange({
      search: filters.search || "",
      priceBands: [],
      minRating: 0,
      withPhoto: false,
      withActivePlans: false,
      withBestSlice: false,
      withNotes: false,
      sortBy: "price_low",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="relative mt-2 flex max-h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-[24px] border border-black/8 bg-[#fffaf2] shadow-[0_20px_50px_rgba(39,29,14,0.18)] sm:max-h-[68vh]"
      style={{ zIndex: ZINDEX.FILTER_EXPANDED }}
    >
      <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8e8578]">Filtros utiles</p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filters.withPhoto} onClick={() => updateFilter("withPhoto", !filters.withPhoto)} icon={Camera}>Con foto</FilterChip>
            <FilterChip active={filters.withActivePlans} onClick={() => updateFilter("withActivePlans", !filters.withActivePlans)} icon={Users}>Con planes</FilterChip>
            <FilterChip active={filters.withBestSlice} onClick={() => updateFilter("withBestSlice", !filters.withBestSlice)} icon={Pizza}>Mejor slice</FilterChip>
            <FilterChip active={filters.withNotes} onClick={() => updateFilter("withNotes", !filters.withNotes)} icon={FileText}>Con nota</FilterChip>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8e8578]">Precio</p>
          <div className="grid grid-cols-3 gap-2">
            {PRICE_BANDS.map((p) => {
              const active = (filters.priceBands || []).includes(p.value);
              return (
                <button
                  key={p.value}
                  onClick={() => toggleArrayFilter("priceBands", p.value)}
                  className={`flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-all ${
                    active ? "border-[#f1df9c] bg-[#fff6de] text-[#141414]" : "border-black/8 bg-white text-[#5f584e] hover:bg-[#fffdf8]"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${p.color}`}>
                    <Tag className="h-3 w-3 text-white" />
                  </div>
                  <span>{p.label}</span>
                  <span className="text-[10px] font-normal leading-tight text-[#8e8578]">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8e8578]">Valoracion minima</p>
          <div className="flex flex-wrap gap-1.5">
            {RATING_OPTIONS.map((value) => (
              <FilterChip
                key={String(value)}
                active={Number(filters.minRating || 0) === value}
                onClick={() => updateFilter("minRating", Number(filters.minRating || 0) === value ? 0 : value)}
                icon={Star}
              >
                {value === 0 ? "Todas" : `${value}+`}
              </FilterChip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8e8578]">Ordenar</p>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((s) => (
              <FilterChip key={s.value} active={filters.sortBy === s.value} onClick={() => updateFilter("sortBy", s.value)}>
                {s.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-black/8 bg-[#f6efe4] px-4 py-3">
        <span className="text-xs text-[#6d665b]">{resultCount} sitio{resultCount !== 1 ? "s" : ""}</span>
        <div className="flex shrink-0 gap-3">
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs font-medium text-[#8e8578] transition-colors hover:text-[#141414]">
              Limpiar
            </button>
          )}
          <button onClick={onClose} className="rounded-xl bg-[#efbf3a] px-3 py-2 text-xs font-semibold text-[#141414] transition-colors hover:bg-[#dbab23]">
            Ver resultados
          </button>
        </div>
      </div>
    </motion.div>
  );
}

