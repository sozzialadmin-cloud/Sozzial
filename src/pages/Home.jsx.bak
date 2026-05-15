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
const DEFAULT_RADIUS_MILES = 3;

function distanceMiles(center, place) {
  const lat1 = Number(center?.lat);
  const lng1 = Number(center?.lng);
  const lat2 = Number(place?.lat);
  const lng2 = Number(place?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shortAreaLabel(result, fallback) {
  const label = result?.display_name || fallback;
  return String(label || fallback).split(',').slice(0, 2).join(',').trim();
}

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
  const [searchTarget, setSearchTarget] = useState(null);
  const [radiusCenter, setRadiusCenter] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS_MILES);
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

  useEffect(() => {
    const closeMapPanels = () => {
      setSelectedPlace(null);
      setPreviewPlace(null);
      setListOpen(false);
    };
    window.addEventListener('sozzial:close-map-panels', closeMapPanels);
    return () => window.removeEventListener('sozzial:close-map-panels', closeMapPanels);
  }, []);

  const hangoutsByPlace = useMemo(() => countPlansBySpot(activePlans), [activePlans]);

  const enrichedPlaces = useMemo(
    () => (places || []).map((place) => ({ ...place, active_hangouts_count: hangoutsByPlace[place.id] || 0 })),
    [places, hangoutsByPlace],
  );

  const filteredPlaces = useMemo(() => {
    const base = applySpotFilters(enrichedPlaces, filters);
    if (!radiusCenter || !radiusMiles) return base;
    return base.filter((place) => distanceMiles(radiusCenter, { lat: place.latitude, lng: place.longitude }) <= Number(radiusMiles));
  }, [enrichedPlaces, filters, radiusCenter, radiusMiles]);

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


  const handleSearchArea = async (query) => {
    const terms = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const localMatch = enrichedPlaces.find((place) => {
      const haystack = [place.name, place.address, place.neighborhood, place.borough, place.best_known_slice, place.best_slice].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    if (localMatch?.latitude && localMatch?.longitude) {
      const center = { lat: Number(localMatch.latitude), lng: Number(localMatch.longitude), label: localMatch.name || query };
      setFilters((current) => ({ ...current, search: query }));
      setRadiusCenter(center);
      setRadiusMiles((current) => current || DEFAULT_RADIUS_MILES);
      setSearchTarget({ ...center, zoom: 15 });
      setPreviewPlace(localMatch);
      setListOpen(false);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`);
      const [result] = await response.json();
      if (result?.lat && result?.lon) {
        const center = { lat: Number(result.lat), lng: Number(result.lon), label: shortAreaLabel(result, query) };
        setFilters((current) => ({ ...current, search: '' }));
        setRadiusCenter(center);
        setRadiusMiles((current) => current || DEFAULT_RADIUS_MILES);
        setSearchTarget({ ...center, zoom: 14 });
        setPreviewPlace(null);
        setListOpen(false);
      } else {
        toast({ title: "Area not found", description: "Try a street, neighborhood or city name.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Search unavailable", description: "Check the area name or try again.", variant: "destructive" });
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
              searchTarget={searchTarget}
              radiusCenter={radiusCenter}
              radiusMiles={radiusMiles}
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
            onSearchArea={handleSearchArea}
            radiusMiles={radiusMiles}
            radiusCenterLabel={radiusCenter?.label || ''}
            onRadiusChange={setRadiusMiles}
            onClearRadius={() => {
              setRadiusCenter(null);
              setSearchTarget(null);
              setFilters((current) => ({ ...current, search: '' }));
            }}
            onLocateMe={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    const center = { lat: latitude, lng: longitude, label: 'your location' };
                    setUserLocation(center);
                    setRadiusCenter(center);
                    setRadiusMiles((current) => current || DEFAULT_RADIUS_MILES);
                    setSearchTarget({ ...center, zoom: 14 });
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
