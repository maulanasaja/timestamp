"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet's default icon path issues with Next.js
// By passing a valid data URL or an external CDN URL
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapPickerProps {
  position: [number, number] | null;
  onChange?: (lat: number, lng: number) => void;
  staticMode?: boolean;
}

function LocationMarker({ position, onChange, staticMode }: MapPickerProps) {
  useMapEvents({
    click(e) {
      if (!staticMode && onChange) {
        onChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  
  const map = useMap();
  
  // Try to set view if position changes
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} icon={defaultIcon} />
  );
}

export default function MapPicker({ position, onChange, staticMode = false }: MapPickerProps) {
  const defaultPosition: [number, number] = [-6.200000, 106.816666]; // Jakarta
  
  return (
    <div 
      className={staticMode ? "static-map-wrapper pointer-events-none" : ""} 
      style={{ width: "100%", height: "100%" }}
    >
      <MapContainer 
        center={position || defaultPosition} 
        zoom={13} 
        scrollWheelZoom={!staticMode}
        zoomControl={!staticMode}
        dragging={!staticMode}
        doubleClickZoom={!staticMode}
        touchZoom={!staticMode}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onChange={onChange} staticMode={staticMode} />
      </MapContainer>
    </div>
  );
}
