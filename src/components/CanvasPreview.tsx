"use client";

import { forwardRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Calendar, Compass } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import SafeStaticMap from "./SafeStaticMap";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface CanvasPreviewProps {
  photoUrl: string | null;
  state: {
    locationText: string;
    date: string;
    time: string;
    coordinates: [number, number];
    mapOpacity?: number;
  };
}

const CanvasPreview = forwardRef<HTMLDivElement, CanvasPreviewProps>(
  ({ photoUrl, state }, ref) => {
    // Format date nicely: 14 Mar 2026
    let formattedDate = state.date;
    try {
      if (state.date) {
        const parts = state.date.split("-");
        if (parts.length === 3) {
          const d = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
          formattedDate = format(d, "dd MMM yyyy", { locale: id });
        } else {
          const d = new Date(state.date);
          formattedDate = format(d, "dd MMM yyyy", { locale: id });
        }
      }
    } catch (e) {
      // fallback
    }

    // Format time: HH.mm.ss with user-chosen seconds
    let timeFormatted = "";
    if (state.time) {
      const parts = state.time.split(":");
      if (parts.length >= 3) {
        timeFormatted = `${parts[0].padStart(2, "0")}.${parts[1].padStart(2, "0")}.${parts[2].padStart(2, "0")}`;
      } else if (parts.length === 2) {
        timeFormatted = `${parts[0].padStart(2, "0")}.${parts[1].padStart(2, "0")}.00`;
      } else {
        timeFormatted = state.time.replace(/:/g, ".");
      }
    }

    // Format coordinates
    const lat = state.coordinates?.[0] ?? -6.2;
    const lng = state.coordinates?.[1] ?? 106.816666;
    const latStr = Math.abs(lat).toFixed(5) + "° " + (lat >= 0 ? "N" : "S");
    const lngStr = Math.abs(lng).toFixed(5) + "° " + (lng >= 0 ? "E" : "W");
    const coordinateString = `${latStr}, ${lngStr}`;

    // Split location into lines
    const locationLines = state.locationText ? state.locationText.split('\n') : ["Lokasi Belum Diisi"];

    const mapOpacity = typeof state.mapOpacity === "number" ? state.mapOpacity : 0.85;

    if (!photoUrl) {
      return (
        <div className="preview-container" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="upload-subtext" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <Compass size={48} style={{ opacity: 0.5 }} />
            <span>Pratinjau foto akan muncul di sini.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="preview-container">
        {/* Set containerType so fonts and map scale based on this wrapper's width */}
        <div className="canvas-wrapper" ref={ref} style={{position: 'relative', display: 'inline-block', lineHeight: 0, containerType: 'inline-size', width: '100%'}}>
          {/* Base Image */}
          <img src={photoUrl} alt="Base" className="canvas-image" crossOrigin="anonymous" style={{display: 'block', maxWidth: '100%', width: '100%', height: 'auto'}} />
          
          {/* Overlay Container matching exact image bounds */}
          <div className="overlay-container absolute top-0 left-0 w-full h-full pointer-events-none">
            
            {/* Map on Bottom Left */}
            {mapOpacity > 0 && (
              <div style={{
                position: 'absolute',
                left: '3cqw',
                bottom: '3cqw',
                width: '25cqw',
                height: '25cqw',
                padding: '0',
                pointerEvents: 'auto',
                overflow: 'hidden',
                opacity: mapOpacity,
                borderRadius: '0.5cqw',
                border: `2px solid rgba(255,255,255,${Math.min(1, Math.max(0.15, mapOpacity))})`
              }}>
                 <SafeStaticMap coordinates={state.coordinates} />
              </div>
            )}

            {/* Text on Bottom Right */}
            <div style={{
              position: 'absolute', right: '3cqw', bottom: '3cqw', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right',
              color: 'white',
              textShadow: '0.2cqw 0.2cqw 0.4cqw rgba(0,0,0,0.8), -0.1cqw -0.1cqw 0.4cqw rgba(0,0,0,0.8), 0 0 1cqw rgba(0,0,0,0.6)',
              fontFamily: 'sans-serif'
            }}>
              <div style={{ fontSize: '3.5cqw', fontWeight: 600, lineHeight: 1.2, marginBottom: '0.2cqw' }}>
                {formattedDate} {timeFormatted}
              </div>
              <div style={{ fontSize: '2.5cqw', fontWeight: 400, opacity: 0.9, marginBottom: '0.5cqw' }}>
                {coordinateString}
              </div>
              {locationLines.map((line, idx) => (
                <div key={idx} style={{ fontSize: '3cqw', fontWeight: 500, lineHeight: 1.25 }}>
                  {line}
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    );
  }
);

CanvasPreview.displayName = "CanvasPreview";

export default CanvasPreview;
