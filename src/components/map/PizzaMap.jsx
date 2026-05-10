import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NYC_CENTER = [40.7328, -73.99];
const NYC_ZOOM = 12;
const FALLBACK_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function getMarkerTheme(price) {
  if (price <= 2.5) return { bg: "#2f8f46", shadow: "rgba(47,143,70,0.34)" };
  if (price <= 5) return { bg: "#d7a622", shadow: "rgba(215,166,34,0.32)" };
  return { bg: "#df5b43", shadow: "rgba(223,91,67,0.32)" };
}

function formatPrice(price) {
  const value = Number(price || 0);
  if (!value) return "?";
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function createPriceIcon(place, isActive, isSaved = false) {
  const price = Number(place.standard_slice_price || 0);
  const { bg, shadow } = getMarkerTheme(price);
  const label = formatPrice(price);
  const stateClass = isActive ? "is-active" : isSaved ? "is-saved" : "";

  return L.divIcon({
    className: "pizza-marker",
    html: `
      <div class="sozzial-price-bubble ${stateClass}" style="--marker-bg:${bg}; --marker-shadow:${shadow};">
        <div class="sozzial-price-bubble__body">
          <span class="sozzial-price-bubble__price">${label}</span>
        </div>
        <span class="sozzial-price-bubble__tail"></span>
      </div>
    `,
    iconSize: [58, 54],
    iconAnchor: [29, 50],
    popupAnchor: [0, -48],
  });
}
function MapEvents({ onBoundsChange, onMapMove }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      onBoundsChange?.(map.getBounds());
      onMapMove?.();
    };
    handler();
    map.on("moveend", handler);
    return () => map.off("moveend", handler);
  }, [map, onBoundsChange, onMapMove]);
  return null;
}

function FlyToPlace({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place?.latitude && place?.longitude) {
      map.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 15), { duration: 0.65 });
    }
  }, [place, map]);
  return null;
}

function FlyToUser({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.lat && location?.lng) map.flyTo([location.lat, location.lng], 15, { duration: 0.75 });
  }, [location, map]);
  return null;
}

function MapInitializer({ onMapReady }) {
  const map = useMap();
  useEffect(() => {
    onMapReady?.(map);
    const resize = () => map.invalidateSize({ animate: false });
    resize();
    const t1 = window.setTimeout(resize, 80);
    const t2 = window.setTimeout(resize, 220);
    const t3 = window.setTimeout(resize, 480);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [map, onMapReady]);
  return null;
}

export default function PizzaMap({
  places,
  selectedPlace,
  savedPlaceIds = [],
  onSelectPlace,
  onBoundsChange,
  onMapMove,
  onMapReady,
  controlsHidden = false,
  mapStyleUrl,
  userLocation,
}) {
  const [tileUrl, setTileUrl] = useState(mapStyleUrl || FALLBACK_TILE_URL);

  useEffect(() => {
    setTileUrl(mapStyleUrl || FALLBACK_TILE_URL);
  }, [mapStyleUrl]);

  const validPlaces = useMemo(
    () => places.filter((place) => Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude))),
    [places],
  );

  return (
    <MapContainer
      center={NYC_CENTER}
      zoom={NYC_ZOOM}
      className={`h-full w-full map-canvas ${controlsHidden ? "map-ui-hidden" : ""}`}
      zoomControl={false}
      attributionControl={false}
      preferCanvas={false}
    >
      <TileLayer
        key={tileUrl}
        url={tileUrl}
        attribution=""
        eventHandlers={{
          tileerror: () => {
            if (tileUrl !== FALLBACK_TILE_URL) setTileUrl(FALLBACK_TILE_URL);
          },
        }}
      />
      <MapEvents onBoundsChange={onBoundsChange} onMapMove={onMapMove} />
      <MapInitializer onMapReady={onMapReady} />
      {selectedPlace && <FlyToPlace place={selectedPlace} />}
      {userLocation && (
        <>
          <FlyToUser location={userLocation} />
          <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2f8f46", fillOpacity: 1 }} />
        </>
      )}
      {validPlaces.map((place) => (
        <React.Fragment key={place.id}>
          <CircleMarker
            center={[place.latitude, place.longitude]}
            radius={18}
            pathOptions={{ color: 'transparent', fillColor: 'transparent', fillOpacity: 0.01, weight: 18, opacity: 0.01 }}
            eventHandlers={{ click: () => onSelectPlace(place), mousedown: () => onSelectPlace(place), mouseup: () => onSelectPlace(place), touchstart: () => onSelectPlace(place) }}
          />
          <Marker
            position={[place.latitude, place.longitude]}
            icon={createPriceIcon(place, selectedPlace?.id === place.id, savedPlaceIds.includes(place.id))}
            eventHandlers={{ click: () => onSelectPlace(place), mousedown: () => onSelectPlace(place), mouseup: () => onSelectPlace(place), touchstart: () => onSelectPlace(place) }}
          />
        </React.Fragment>
      ))}
    </MapContainer>
  );
}

