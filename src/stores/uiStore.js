import { create } from 'zustand'

export const useUIStore = create((set) => ({
  discoverFiltersOpen: false,
  activeDiscoverDecision: null,
  compareSheetOpen: false,
  selectedSpotId: null,
  setDiscoverFiltersOpen: (open) => set({ discoverFiltersOpen: open }),
  setActiveDiscoverDecision: (decision) => set({ activeDiscoverDecision: decision }),
  setCompareSheetOpen: (open) => set({ compareSheetOpen: open }),
  setSelectedSpotId: (spotId) => set({ selectedSpotId: spotId }),
  resetTransientUI: () =>
    set({
      discoverFiltersOpen: false,
      activeDiscoverDecision: null,
      compareSheetOpen: false,
      selectedSpotId: null,
    }),
}))

