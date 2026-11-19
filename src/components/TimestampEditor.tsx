"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin, Calendar, Clock, Type, Search, Loader2 } from "lucide-react";

// Dynamically import MapPicker with SSR disabled to prevent Leaflet window errors
const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

export interface EditorState {
  locationText: string;
  date: string;
  time: string;
  coordinates: [number, number];
}

interface TimestampEditorProps {
  state: EditorState;
  onChange: (newState: EditorState) => void;
}

export default function TimestampEditor({ state, onChange }: TimestampEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleMapChange = (lat: number, lng: number) => {
    onChange({ ...state, coordinates: [lat, lng] });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=1`, {
        headers: { "User-Agent": "TimestampGenApp/1.0" }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        
        const addr = item.address || {};
        
        // Construct the location lines
        // For example: Name, Village, Kecamatan, Kabupaten, Province, Country
        const lines = [];
        
        if (item.name) lines.push(item.name);
        
        const village = addr.village || addr.neighbourhood || addr.suburb || addr.quarter;
        if (village && village !== item.name) lines.push(village);
        
        const kecamatan = addr.city_district || addr.county;
        if (kecamatan) lines.push(`Kecamatan ${kecamatan.replace(/Kecamatan/i, '').trim()}`);
        
        const kabupaten = addr.city || addr.town || addr.municipality;
        if (kabupaten) lines.push(`Kabupaten ${kabupaten.replace(/Kabupaten|Kota/i, '').trim()}`);
        
        if (addr.state) lines.push(addr.state);
        if (addr.country) lines.push(addr.country);

        const newText = lines.join('\n');

        onChange({
          ...state,
          coordinates: [lat, lon],
          locationText: newText
        });
        
        setSearchQuery(""); // clear on success
      } else {
        alert("Lokasi tidak ditemukan. Coba gunakan kata kunci yang lebih umum.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan pencarian.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="panel">
      <h2 className="section-title">
        <MapPin size={20} className="text-accent" /> Detail Lokasi & Waktu
      </h2>

      <div className="form-group" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px' }}>
        <label style={{ fontWeight: 600, color: 'white' }}>Pencarian Otomatis</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          <input
            type="text"
            className="form-control"
            style={{ flexGrow: 1, minWidth: 0 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ketik lokasi, cth: alun-alun jember"
          />
          <button 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0 1rem' }}
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </div>
        <p className="upload-subtext" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
          Mencari otomatis akan mengisi detail lokasi & pin peta di bawah.
        </p>
      </div>

      <div className="form-group">
        <label>Detail Lokasi (Bisa beberapa baris)</label>
        <div style={{ position: 'relative' }}>
          <Type size={18} className="text-muted" style={{ position: 'absolute', left: '0.75rem', top: '0.75rem' }} />
          <textarea
            className="form-control"
            style={{ paddingLeft: "2.5rem", minHeight: "100px", zIndex: 1, position: 'relative', width: '100%' }}
            value={state.locationText}
            onChange={(e) => onChange({ ...state, locationText: e.target.value })}
            placeholder="Baris 1&#10;Baris 2&#10;Baris 3..."
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="form-group">
          <label>Tanggal</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} className="text-muted" style={{ position: 'absolute', left: '0.75rem', top: '0.75rem' }} />
            <input
              type="date"
              className="form-control"
              style={{ paddingLeft: "2.5rem", width: '100%' }}
              value={state.date}
              onChange={(e) => onChange({ ...state, date: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Waktu</label>
          <div style={{ position: 'relative' }}>
            <Clock size={18} className="text-muted" style={{ position: 'absolute', left: '0.75rem', top: '0.75rem' }} />
            <input
              type="time"
              className="form-control"
              style={{ paddingLeft: "2.5rem", width: '100%' }}
              value={state.time}
              onChange={(e) => onChange({ ...state, time: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Pilih Lokasi pada Peta (untuk overlay foto)</label>
        <div className="map-picker">
          <MapPicker position={state.coordinates} onChange={handleMapChange} />
        </div>
        <p className="upload-subtext" style={{ marginTop: "-0.5rem" }}>
          Geser peta dan klik untuk mengganti posisi pin yang akan tampil.
        </p>
      </div>
    </div>
  );
}
