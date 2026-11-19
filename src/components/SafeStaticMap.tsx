"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface SafeStaticMapProps {
  coordinates: [number, number];
}

export default function SafeStaticMap({ coordinates }: SafeStaticMapProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!coordinates) return;

    const lat = coordinates[0].toFixed(5);
    const lng = coordinates[1].toFixed(5);

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/map?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (active && data.dataUrl) {
          setDataUrl(data.dataUrl);
        }
      } catch (err) {
        console.error("Failed to load map proxy", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [coordinates[0], coordinates[1]]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#e2e8f0' }}>
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-200" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#e2e8f0' }}>
        <span className="text-xs text-gray-500" style={{ fontSize: '0.75rem', color: '#64748b' }}>Gagal memuat peta</span>
      </div>
    );
  }

  return (
    <img 
      src={dataUrl} 
      alt="Peta Lokasi" 
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
