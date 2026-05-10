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
  resultCount = 0,
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

  const handleSearch = (val) => {
    setSearchText(val);
    onFiltersChange({ ...filters, search: val });
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8578]" />
            <Input
              placeholder="Search spots, address or slice"
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-11 rounded-[18px] border-black/10 bg-white pl-10 pr-10 text-sm font-medium text-[#141414] placeholder:text-[#9c9385] shadow-none focus-visible:ring-[#efbf3a]"
            />
            {searchText && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#8e8578] transition-colors hover:text-[#141414]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button onClick={() => setExpanded(!expanded)} className={buttonClass(expanded)} aria-label="Open filters">
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          <button onClick={onLocateMe} className={buttonClass(false)} aria-label="Locate me">
            <Compass className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && <div className="pointer-events-auto"><FilterPanel filters={filters} onFiltersChange={onFiltersChange} resultCount={resultCount} onClose={() => setExpanded(false)} /></div>}
      </AnimatePresence>
    </div>
  );
}

