import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NYC_CENTER = [40.7328, -73.99];
const NYC_ZOOM = 12;
const FALLBACK_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function getMarkerTheme(price) {
  if (price <= 2.5) return { bg: "#2f8f46", shadow: "rgba(47,143,70,0.38)" };
  if (price <= 5) return { bg: "#d7a622", shadow: "rgba(215,166,34,0.34)" };
  return { bg: "#df5b43", shadow: "rgba(223,91,67,0.34)" };
}

function formatPrice(price) {
  const value = Number(price || 0);
  if (!value) return "?";
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function createPriceIcon(place, isActive, isSaved = false) {
  const price = Number(place.standard_slice_price || 0);
  const rating = Number(place.average_rating || 0);
  const plans = Number(place.active_hangouts_count || 0);
  const { bg, shadow } = getMarkerTheme(price);
  const label = formatPrice(price);
  const size = isActive ? 62 : plans > 0 ? 52 : 46;
  const fontSize = label.length > 4 ? "10px" : "11px";
  const ring = isActive ? `${bg}33` : isSaved ? "rgba(20,20,20,0.08)" : "transparent";
  const badge = rating > 0 ? `${rating.toFixed(1)} star` : plans > 0 ? `${plans} plan${plans === 1 ? "" : "s"}` : "new";

  return L.divIcon({
    className: "pizza-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          min-width: ${size}px;
          height: ${size - 8}px;
          padding: 0 12px;
          background: ${bg};
          border-radius: 999px;
          border: ${isActive ? "3px" : "2px"} solid rgba(255,255,255,0.96);
          box-shadow: 0 12px 28px ${shadow}, 0 0 0 ${isActive ? "7px" : "4px"} ${ring};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          transform: ${isActive ? "translateY(-2px) scale(1.08)" : "scale(1)"};
          animation: ${isActive ? "sozzialMarkerPop 1.6s ease-in-out infinite" : "none"};
          animation: ${isActive ? "sozzialMarkerPop 1.6s ease-in-out infinite" : "none"};
        ">
          <span style="
            color: white;
            font-weight: 900;
            font-size: ${fontSize};
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            letter-spacing: -0.25px;
            line-height: 1;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            white-space: nowrap;
          ">${label}</span>
        </div>
        <div style="
          margin-top: -6px;
          min-width: ${Math.max(34, size - 12)}px;
          max-width: 76px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.92);
          background: rgba(17,17,17,0.92);
          color: #fff7ea;
          border-radius: 999px;
          padding: 3px 7px;
          font-weight: 900;
          font-size: 9px;
          line-height: 1;
          box-shadow: 0 8px 18px rgba(0,0,0,0.28);
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">${badge}</div>
        <div style="
          margin-top: -6px;
          min-width: ${Math.max(34, size - 12)}px;
          max-width: 76px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.92);
          background: rgba(17,17,17,0.92);
          color: #fff7ea;
          border-radius: 999px;
          padding: 3px 7px;
          font-weight: 900;
          font-size: 9px;
          line-height: 1;
          box-shadow: 0 8px 18px rgba(0,0,0,0.28);
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">${badge}</div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 9px solid ${bg};
          margin-top: -2px;
          filter: drop-shadow(0 2px 2px ${shadow});
        "></div>
        ${plans > 0 ? `<div style="
          position:absolute;
          right: 0;
          top: -3px;
          width: 13px;
          height: 13px;
          border-radius: 999px;
          border: 2px solid white;
          background: #efbf3a;
          box-shadow: 0 0 0 4px rgba(239,191,58,0.18);
        "></div>` : ""}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 4],
    popupAnchor: [0, -(size - 8)],
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

