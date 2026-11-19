"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  Type,
  Search,
  Loader2,
  Navigation,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Plus,
  Minus,
  Layers,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CopyCheck,
  Images,
} from "lucide-react";

// Dynamically import MapPicker with SSR disabled to prevent Leaflet window errors
const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

export interface EditorState {
  locationText: string;
  date: string;
  time: string;
  coordinates: [number, number];
  mapOpacity?: number;
}

interface TimestampEditorProps {
  state: EditorState;
  onChange: (newState: EditorState) => void;
  photoIndex?: number;
  totalPhotos?: number;
  photoName?: string;
  onNextPhoto?: () => void;
  onPrevPhoto?: () => void;
  onApplyToAll?: () => void;
}

export default function TimestampEditor({
  state,
  onChange,
  photoIndex,
  totalPhotos,
  photoName,
  onNextPhoto,
  onPrevPhoto,
  onApplyToAll,
}: TimestampEditorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Parse time into HH, MM, SS
  const timeParts = (state.time || "12:00:00").split(":");
  const currentHour = parseInt(timeParts[0] || "12", 10);
  const currentMinute = parseInt(timeParts[1] || "0", 10);
  const currentSecond = parseInt(timeParts[2] || "0", 10);

  // Map opacity
  const currentOpacity = typeof state.mapOpacity === "number" ? state.mapOpacity : 0.85;

  const setOpacity = (val: number) => {
    const safeVal = Math.max(0, Math.min(1, Math.round(val * 100) / 100));
    onChange({ ...state, mapOpacity: safeVal });
  };

  const adjustOpacity = (delta: number) => {
    setOpacity(currentOpacity + delta);
  };

  const opacityPresets = [
    { label: "100%", sub: "Solid", value: 1.0 },
    { label: "85%", sub: "Bawaan", value: 0.85 },
    { label: "60%", sub: "Sedang", value: 0.60 },
    { label: "35%", sub: "Tipis", value: 0.35 },
    { label: "0%", sub: "Sembunyi", value: 0 },
  ];

  const showStatus = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const updateTime = (h: number, m: number, s: number) => {
    const safeH = Math.max(0, Math.min(23, isNaN(h) ? 0 : h));
    const safeM = Math.max(0, Math.min(59, isNaN(m) ? 0 : m));
    const safeS = Math.max(0, Math.min(59, isNaN(s) ? 0 : s));
    const newTime = `${String(safeH).padStart(2, "0")}:${String(safeM).padStart(2, "0")}:${String(safeS).padStart(2, "0")}`;
    onChange({ ...state, time: newTime });
  };

  const adjustSeconds = (delta: number) => {
    let totalSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond + delta;
    totalSeconds = ((totalSeconds % 86400) + 86400) % 86400; // wrap within 24h
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    updateTime(h, m, s);
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    updateTime(h, m, s);
    showStatus("Waktu berhasil disesuaikan ke detik ini", "success");
  };

  const handleSetToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    onChange({ ...state, date: `${yyyy}-${mm}-${dd}` });
    showStatus("Tanggal disetel ke hari ini", "success");
  };

  const formatAddressFromNominatim = (item: any): string => {
    const addr = item.address || {};
    const lines: string[] = [];

    if (item.name) lines.push(item.name);

    const village = addr.village || addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet;
    if (village && village !== item.name) lines.push(village);

    const kecamatan = addr.city_district || addr.county || addr.subdistrict;
    if (kecamatan) lines.push(`Kecamatan ${kecamatan.replace(/Kecamatan/i, "").trim()}`);

    const kabupaten = addr.city || addr.town || addr.municipality || addr.regency;
    if (kabupaten) lines.push(`Kabupaten ${kabupaten.replace(/Kabupaten|Kota/i, "").trim()}`);

    if (addr.state) lines.push(addr.state);
    if (addr.country) lines.push(addr.country);

    return lines.length > 0 ? lines.join("\n") : (item.display_name || "");
  };

  const handleMapChange = (lat: number, lng: number) => {
    onChange({ ...state, coordinates: [lat, lng] });
  };

  const handleLatChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange({ ...state, coordinates: [num, state.coordinates[1]] });
    }
  };

  const handleLngChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange({ ...state, coordinates: [state.coordinates[0], num] });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=1`,
        {
          headers: { "User-Agent": "TimestampGenApp/1.0" },
        }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const newText = formatAddressFromNominatim(item);

        onChange({
          ...state,
          coordinates: [lat, lon],
          locationText: newText,
        });

        setSearchQuery("");
        showStatus("Lokasi ditemukan dan berhasil diperbarui", "success");
      } else {
        showStatus("Lokasi tidak ditemukan. Coba kata kunci yang lebih umum.", "error");
      }
    } catch (err) {
      console.error(err);
      showStatus("Gagal mencari lokasi. Periksa koneksi internet.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  // GPS Current Location
  const handleGetDeviceLocation = () => {
    if (!("geolocation" in navigator)) {
      showStatus("Browser Anda tidak mendukung geolokasi GPS.", "error");
      return;
    }

    setIsLocating(true);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          // Reverse geocode to get address
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { "User-Agent": "TimestampGenApp/1.0" } }
          );
          const data = await res.json();
          const addressText = data ? formatAddressFromNominatim(data) : state.locationText;

          onChange({
            ...state,
            coordinates: [lat, lng],
            locationText: addressText || state.locationText,
          });

          showStatus("Berhasil mendapatkan lokasi GPS saat ini", "success");
        } catch (e) {
          onChange({
            ...state,
            coordinates: [lat, lng],
          });
          showStatus("Koordinat GPS didapatkan", "success");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        showStatus("Izin GPS ditolak atau tidak tersedia.", "error");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Reverse geocode from current pin on map
  const handleReverseGeocodePin = async () => {
    setIsReverseGeocoding(true);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${state.coordinates[0]}&lon=${state.coordinates[1]}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "TimestampGenApp/1.0" } }
      );
      const data = await res.json();
      if (data) {
        const newText = formatAddressFromNominatim(data);
        onChange({
          ...state,
          locationText: newText,
        });
        showStatus("Alamat berhasil disinkronkan dari titik peta", "success");
      } else {
        showStatus("Tidak dapat menemukan nama alamat untuk koordinat ini", "error");
      }
    } catch (e) {
      console.error(e);
      showStatus("Gagal mengambil alamat dari peta", "error");
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleCopyCoords = () => {
    const text = `${state.coordinates[0].toFixed(6)}, ${state.coordinates[1].toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <div className="panel editor-panel">
      {/* Multi-Photo Switcher Bar if more than 1 photo */}
      {totalPhotos && totalPhotos > 1 && (
        <div className="editor-photo-switcher">
          <div className="photo-switcher-info">
            <span className="photo-switcher-badge">
              <Images size={14} />
              <span>Foto {(photoIndex ?? 0) + 1} dari {totalPhotos}</span>
            </span>
            <span className="photo-switcher-name" title={photoName}>
              {photoName || `Foto ${(photoIndex ?? 0) + 1}`}
            </span>
          </div>

          <div className="photo-switcher-controls">
            <button
              type="button"
              className="btn-switcher-step"
              onClick={onPrevPhoto}
              disabled={photoIndex === 0}
              title="Foto Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="btn-switcher-step"
              onClick={onNextPhoto}
              disabled={photoIndex === totalPhotos - 1}
              title="Foto Selanjutnya"
            >
              <ChevronRight size={16} />
            </button>
            {onApplyToAll && (
              <button
                type="button"
                className="btn-apply-all"
                onClick={onApplyToAll}
                title="Terapkan lokasi & peta foto ini ke semua foto lainnya"
              >
                <CopyCheck size={14} />
                <span>Salin ke Semua</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="editor-header">
        <h2 className="section-title" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <MapPin size={22} className="text-accent" /> Detail Lokasi & Waktu
        </h2>
        <button
          type="button"
          onClick={handleGetDeviceLocation}
          className="btn btn-secondary gps-btn"
          disabled={isLocating}
          title="Gunakan GPS Perangkat Saat Ini"
        >
          {isLocating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Navigation size={16} className="text-accent" />
          )}
          <span>{isLocating ? "Mencari GPS..." : "GPS Saya"}</span>
        </button>
      </div>

      {statusMessage && (
        <div className={`status-banner ${statusMessage.type}`}>
          {statusMessage.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Auto Search */}
      <div className="form-group search-box-wrapper">
        <label className="field-label">Cari Alamat / Tempat</label>
        <div className="search-input-group">
          <input
            type="text"
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cth: Monas Jakarta, Alun-Alun Jember..."
          />
          <button
            type="button"
            className="btn btn-primary search-btn"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </div>
      </div>

      {/* Date & Time Section */}
      <div className="datetime-grid">
        {/* Date Field */}
        <div className="form-group">
          <div className="label-with-action">
            <label className="field-label">Tanggal</label>
            <button type="button" onClick={handleSetToday} className="btn-inline-action">
              Hari Ini
            </button>
          </div>
          <div className="input-icon-wrapper">
            <Calendar size={18} className="field-icon" />
            <input
              type="date"
              className="form-control with-icon"
              value={state.date}
              onChange={(e) => onChange({ ...state, date: e.target.value })}
            />
          </div>
        </div>

        {/* Time Field */}
        <div className="form-group">
          <div className="label-with-action">
            <label className="field-label">Waktu (Jam : Menit : Detik)</label>
            <button type="button" onClick={handleSetCurrentTime} className="btn-inline-action">
              Sekarang
            </button>
          </div>
          <div className="input-icon-wrapper">
            <Clock size={18} className="field-icon" />
            <input
              type="time"
              step="1"
              className="form-control with-icon"
              value={state.time}
              onChange={(e) => onChange({ ...state, time: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Second & Time Stepper for Mobile Friendly Precision */}
      <div className="time-stepper-container">
        <span className="time-stepper-title">Pengatur Detik Presisi:</span>
        <div className="time-parts-row">
          <div className="time-part-box">
            <span className="part-label">Jam</span>
            <input
              type="number"
              min="0"
              max="23"
              className="part-input"
              value={String(currentHour).padStart(2, "0")}
              onChange={(e) => updateTime(parseInt(e.target.value, 10), currentMinute, currentSecond)}
            />
          </div>
          <span className="part-sep">:</span>
          <div className="time-part-box">
            <span className="part-label">Menit</span>
            <input
              type="number"
              min="0"
              max="59"
              className="part-input"
              value={String(currentMinute).padStart(2, "0")}
              onChange={(e) => updateTime(currentHour, parseInt(e.target.value, 10), currentSecond)}
            />
          </div>
          <span className="part-sep">:</span>
          <div className="time-part-box active-second">
            <span className="part-label">Detik</span>
            <input
              type="number"
              min="0"
              max="59"
              className="part-input"
              value={String(currentSecond).padStart(2, "0")}
              onChange={(e) => updateTime(currentHour, currentMinute, parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <div className="second-quick-actions">
          <button type="button" className="btn-sec-adjust" onClick={() => adjustSeconds(-10)}>
            -10s
          </button>
          <button type="button" className="btn-sec-adjust" onClick={() => adjustSeconds(-1)}>
            -1s
          </button>
          <button type="button" className="btn-sec-adjust" onClick={() => adjustSeconds(1)}>
            +1s
          </button>
          <button type="button" className="btn-sec-adjust" onClick={() => adjustSeconds(10)}>
            +10s
          </button>
        </div>
      </div>

      {/* Location Text */}
      <div className="form-group">
        <div className="label-with-action">
          <label className="field-label">Detail Lokasi (Bisa beberapa baris)</label>
          <button
            type="button"
            onClick={handleReverseGeocodePin}
            className="btn-inline-action"
            disabled={isReverseGeocoding}
            title="Ambil nama alamat dari posisi pin saat ini"
          >
            {isReverseGeocoding ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            <span>Isi dari Peta</span>
          </button>
        </div>
        <div className="input-icon-wrapper" style={{ alignItems: "flex-start" }}>
          <Type size={18} className="field-icon textarea-icon" />
          <textarea
            className="form-control with-icon"
            style={{ minHeight: "110px", lineHeight: "1.5", resize: "vertical" }}
            value={state.locationText}
            onChange={(e) => onChange({ ...state, locationText: e.target.value })}
            placeholder="Baris 1: Nama Tempat / Jalan&#10;Baris 2: Kelurahan / Desa&#10;Baris 3: Kecamatan / Kota"
          />
        </div>
        <span className="field-hint">
          Setiap baris teks baru akan tampil di bawah baris sebelumnya pada foto.
        </span>
      </div>

      {/* Map Picker */}
      <div className="form-group">
        <div className="label-with-action">
          <label className="field-label">Pilih Posisi Pin pada Peta</label>
          <button type="button" onClick={handleCopyCoords} className="btn-inline-action">
            {copiedCoords ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copiedCoords ? "Tersalin!" : "Salin Koordinat"}</span>
          </button>
        </div>

        <div className="map-picker">
          <MapPicker position={state.coordinates} onChange={handleMapChange} />
        </div>
        <span className="field-hint">
          Geser atau ketuk peta untuk memindahkan pin lokasi overlay.
        </span>

        {/* Manual Coordinates Input */}
        <div className="coords-row">
          <div className="coord-input-wrap">
            <span className="coord-label">Latitude:</span>
            <input
              type="number"
              step="any"
              className="coord-input"
              value={state.coordinates[0]}
              onChange={(e) => handleLatChange(e.target.value)}
            />
          </div>
          <div className="coord-input-wrap">
            <span className="coord-label">Longitude:</span>
            <input
              type="number"
              step="any"
              className="coord-input"
              value={state.coordinates[1]}
              onChange={(e) => handleLngChange(e.target.value)}
            />
          </div>
        </div>

        {/* Transparansi Peta Overlay Controls */}
        <div className="map-opacity-card">
          <div className="map-opacity-header">
            <div className="map-opacity-title">
              <Layers size={16} className="text-accent" />
              <span>Transparansi Peta Overlay</span>
            </div>
            <span className="map-opacity-badge">{Math.round(currentOpacity * 100)}%</span>
          </div>

          <div className="map-opacity-slider-row">
            <button
              type="button"
              className="btn-opacity-step"
              onClick={() => adjustOpacity(-0.05)}
              disabled={currentOpacity <= 0}
              title="Kurangi Opasitas (-5%)"
            >
              <Minus size={14} />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(currentOpacity * 100)}
              onChange={(e) => setOpacity(parseInt(e.target.value, 10) / 100)}
              className="opacity-range-slider"
            />
            <button
              type="button"
              className="btn-opacity-step"
              onClick={() => adjustOpacity(0.05)}
              disabled={currentOpacity >= 1}
              title="Tambah Opasitas (+5%)"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="map-opacity-presets">
            {opacityPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`btn-opacity-preset ${Math.round(currentOpacity * 100) === Math.round(preset.value * 100) ? "active" : ""}`}
                onClick={() => setOpacity(preset.value)}
              >
                <span className="preset-val">{preset.label}</span>
                <span className="preset-sub">{preset.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
