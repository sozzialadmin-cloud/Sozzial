import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { List, MapPin, Search, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import PizzaMap from "@/components/map/PizzaMap";
import SearchFilters from "@/components/map/SearchFilters";
import PlacePanel from "@/components/place/PlacePanel";
import PlaceListPanel from "@/components/map/PlaceListPanel";
import AddPinModal from "@/components/map/AddPinModal";
import LoginPrompt from "@/components/shared/LoginPrompt";
import PinPopup from "@/components/map/PinPopup";
import { MAP_STYLES } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";
import { readSavedSpotIds, toggleSavedSpot } from "@/lib/user-actions";
import { applySpotFilters, countPlansBySpot, fetchActivePlanCounts, fetchMapSpots } from "@/features/map/mapData";

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [previewPlace, setPreviewPlace] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [sheetSort, setSheetSort] = useState("value");
  const [sheetSortDirection, setSheetSortDirection] = useState("asc");
  const [addPinOpen, setAddPinOpen] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [mapStyle] = useState("dark");
  const [userLocation, setUserLocation] = useState(null);
  const [savedPlaceIds, setSavedPlaceIds] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    priceBands: [],
    minRating: 0,
    withPhoto: false,
    withActivePlans: false,
    withBestSlice: false,
    withNotes: false,
    sortBy: "price_low",
  });

  const { data: places = [] } = useQuery({
    queryKey: ["places-supabase"],
    queryFn: fetchMapSpots,
    enabled: Boolean(isSupabaseConfigured && supabase),
  });

  const { data: activePlans = [] } = useQuery({
    queryKey: ["active-plan-counts"],
    queryFn: fetchActivePlanCounts,
    enabled: Boolean(isSupabaseConfigured && supabase),
  });

  useEffect(() => {
    setSavedPlaceIds(readSavedSpotIds(user?.id));
  }, [user?.id]);

  const hangoutsByPlace = useMemo(() => countPlansBySpot(activePlans), [activePlans]);

  const enrichedPlaces = useMemo(
    () => (places || []).map((place) => ({ ...place, active_hangouts_count: hangoutsByPlace[place.id] || 0 })),
    [places, hangoutsByPlace],
  );

  const filteredPlaces = useMemo(() => applySpotFilters(enrichedPlaces, filters), [enrichedPlaces, filters]);

  useEffect(() => {
    const spotId = searchParams.get("spot");
    if (!spotId || !enrichedPlaces.length) return;
    const sharedSpot = enrichedPlaces.find((place) => place.id === spotId);
    if (!sharedSpot) return;
    setSelectedPlace(sharedSpot);
    setPreviewPlace(null);
    setListOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete("spot");
    setSearchParams(next, { replace: true });
  }, [enrichedPlaces, searchParams, setSearchParams]);

  const handleAddPin = () => {
    if (!user) {
      setLoginPrompt(true);
      return;
    }
    setAddPinOpen(true);
  };

  const handleToggleSaved = async (place) => {
    if (!place?.id) return;
    const isSaved = savedPlaceIds.includes(place.id);
    try {
      const next = await toggleSavedSpot(user?.id, place.id, isSaved);
      setSavedPlaceIds(next);
      toast({
        title: isSaved ? "Spot removed" : "Spot saved",
        description: isSaved ? "It is no longer in your saved places." : "You can find it again from this device.",
      });
    } catch (error) {
      toast({
        title: "Could not update saved spots",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentMapStyle = MAP_STYLES.find((style) => style.id === mapStyle) || MAP_STYLES[0];
  const showMapNotice = !isSupabaseConfigured || enrichedPlaces.length === 0 || filteredPlaces.length === 0;

  return (
    <>
      <section className="home-screen">
        <div className="home-map-shell">
          <div className="home-map-layer">
            <PizzaMap
              places={filteredPlaces}
              selectedPlace={selectedPlace || previewPlace}
              savedPlaceIds={savedPlaceIds}
              onSelectPlace={(place) => {
                setSelectedPlace(null);
                setPreviewPlace(place);
                setListOpen(false);
              }}
              controlsHidden={Boolean(selectedPlace)}
              mapStyleUrl={currentMapStyle.url}
              userLocation={userLocation}
            />
            <div className="home-map-gradient" />
            <div className="home-map-topshade" />
            {showMapNotice && (
              <div className="pointer-events-none absolute left-4 right-4 top-[184px] z-[420] sm:left-6 sm:right-auto sm:w-[360px]">
                <div className="rounded-[24px] border border-black/10 bg-[#fffaf1]/95 p-4 shadow-[0_18px_50px_rgba(20,20,20,0.18)] backdrop-blur-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111111] text-white">
                      {!isSupabaseConfigured ? <WifiOff className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#111111]">
                        {!isSupabaseConfigured ? "Map in setup mode" : "No spots match this view"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#6f644f]">
                        {!isSupabaseConfigured
                          ? "The app is ready. Add the project keys to load live data."
                          : "Try fewer filters or add the first pizza spot for this area."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filteredPlaces.length}
            onLocateMe={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    setListOpen(false);
                  },
                  () => {
                    toast({
                      title: "Location unavailable",
                      description: "Allow location access or search the map manually.",
                      variant: "destructive",
                    });
                  },
                  { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
                );
              } else {
                toast({
                  title: "Location unsupported",
                  description: "Your browser does not support geolocation.",
                  variant: "destructive",
                });
              }
            }}
          />

          <button onClick={() => setListOpen((prev) => !prev)} className="home-map-count md:hidden">
            <List className="h-4 w-4" />
            <span>{filteredPlaces.length} spots</span>
          </button>

          <button onClick={handleAddPin} className="home-map-fab" aria-label="Add Spot">
            <MapPin className="h-5 w-5" />
            <span className="home-map-fab-label">Add Spot</span>
          </button>

          <PlaceListPanel
            places={filteredPlaces}
            open={listOpen && !selectedPlace}
            onToggle={() => setListOpen(!listOpen)}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              setPreviewPlace(null);
              setListOpen(false);
            }}
            selectedId={selectedPlace?.id}
            sortMode={sheetSort}
            onSortModeChange={setSheetSort}
            sortDirection={sheetSortDirection}
            onSortDirectionChange={setSheetSortDirection}
          />

          {selectedPlace && (
            <PlacePanel
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
              user={user}
              saved={savedPlaceIds.includes(selectedPlace.id)}
              onToggleSaved={() => handleToggleSaved(selectedPlace)}
            />
          )}
          <AddPinModal open={addPinOpen} onClose={() => setAddPinOpen(false)} user={user} />
          <LoginPrompt open={loginPrompt} onClose={() => setLoginPrompt(false)} message="Sign in to create and join pizza plans." />
        </div>
      </section>

      <PinPopup
        place={previewPlace}
        onClose={() => setPreviewPlace(null)}
        onViewDetails={() => {
          setSelectedPlace(previewPlace);
          setPreviewPlace(null);
        }}
      />
    </>
  );
}
