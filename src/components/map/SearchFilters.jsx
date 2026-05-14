import React, { useState, useRef, useEffect } from 'react';
import { Compass, Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AnimatePresence } from 'framer-motion';
import { ZINDEX } from '@/lib/zindex';
import FilterPanel from './FilterPanel';

export default function SearchFilters({
  filters,
  onFiltersChange,
  onLocateMe,
  onSearchArea,
  resultCount = 0,
  radiusMiles = 3,
  radiusCenterLabel = '',
  onRadiusChange,
  onClearRadius,
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchText, setSearchText] = useState(filters.search || '');
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setExpanded(false);
    };
    if (expanded) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  useEffect(() => {
    setSearchText(filters.search || '');
  }, [filters.search]);

  const handleSearch = (val) => {
    setSearchText(val);
  };

  const clearSearch = () => {
    setSearchText('');
    onFiltersChange({ ...filters, search: '' });
    onClearRadius?.();
  };

  const submitSearch = (event) => {
    event?.preventDefault?.();
    const query = searchText.trim();
    if (query) onSearchArea?.(query);
  };

  const buttonClass = (active = false) =>
    `flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
      active
        ? 'border-[#f1df9c] bg-[#efbf3a] text-[#141414]'
        : 'border-black/10 bg-[#fffaf2]/95 text-[#141414] hover:bg-white'
    }`;

  return (
    <div ref={panelRef} className="pointer-events-none absolute left-4 right-4 top-3 sm:right-auto sm:w-[390px]" style={{ zIndex: expanded ? ZINDEX.FILTER_EXPANDED : ZINDEX.MAP_CONTROLS }}>
      <div className="pointer-events-auto rounded-[24px] border border-black/8 bg-[#fffaf2]/94 p-2 backdrop-blur-xl shadow-[0_18px_44px_rgba(39,29,14,0.16)]">
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8578]" />
            <Input
              placeholder="Search area, street or slice"
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-11 rounded-[18px] border-black/10 bg-white pl-10 pr-10 text-sm font-medium text-[#141414] placeholder:text-[#9c9385] shadow-none focus-visible:ring-[#efbf3a]"
            />
            {searchText && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8e8578] transition-colors hover:text-[#141414]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button type="button" onClick={() => setExpanded(!expanded)} className={buttonClass(expanded)} aria-label="Open filters">
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <button type="button" onClick={onLocateMe} className={buttonClass(false)} aria-label="Locate me">
            <Compass className="h-4 w-4" />
          </button>
          <button type="submit" className={buttonClass(false)} aria-label="Search area">
            <Search className="h-4 w-4" />
          </button>
        </form>

        {radiusCenterLabel ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[18px] border border-[#efbf3a]/20 bg-[#efbf3a]/10 px-3 py-2 text-xs font-black text-[#3f3210]">
            <span className="min-w-0 flex-1 truncate">Showing within</span>
            <select
              value={radiusMiles}
              onChange={(event) => onRadiusChange?.(Number(event.target.value))}
              className="h-8 rounded-full border border-black/10 bg-white px-2 text-xs font-black text-[#141414] outline-none"
              aria-label="Search radius"
            >
              {[1, 2, 3, 5, 10, 15, 25].map((miles) => <option key={miles} value={miles}>{miles} mi</option>)}
            </select>
            <span className="max-w-[145px] truncate text-[#6f644f]">{radiusCenterLabel}</span>
            <button type="button" onClick={onClearRadius} className="rounded-full bg-white px-2 py-1 text-[11px] text-[#141414]">Clear</button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {expanded && <div className="pointer-events-auto"><FilterPanel filters={filters} onFiltersChange={onFiltersChange} resultCount={resultCount} onClose={() => setExpanded(false)} /></div>}
      </AnimatePresence>
    </div>
  );
}