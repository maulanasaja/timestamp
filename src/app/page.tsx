"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Trash2, Camera } from "lucide-react";
import { toJpeg } from "html-to-image";
import PhotoUploader from "../components/PhotoUploader";
import TimestampEditor, { EditorState } from "../components/TimestampEditor";
import CanvasPreview from "../components/CanvasPreview";

export default function Home() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Default State
  const [editorState, setEditorState] = useState<EditorState>({
    locationText: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }),
    coordinates: [-6.200000, 106.816666], // Default Jakarta
  });

  const previewRef = useRef<HTMLDivElement>(null);

  // Set default coordinates using Geolocation if available
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setEditorState((prev) => ({
            ...prev,
            coordinates: [position.coords.latitude, position.coords.longitude]
          }));
        },
        () => {
          console.warn("Geolocation denied or unavailable.");
        }
      );
    }
  }, []);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      setIsProcessing(true);
      // html-to-image parameters to help with Leaflet / map tiles
      const dataUrl = await toJpeg(previewRef.current, { 
        quality: 0.95,
        backgroundColor: '#000',
        pixelRatio: 2, // High res download
        filter: (node) => {
          // Leaflet's control panels might mess up screenshot sometimes, we hid them via CSS
          return true;
        }
      });
      
      const link = document.createElement("a");
      link.download = `timestamp-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Gagal mendownload gambar", err);
      alert("Terjadi kesalahan saat membuat gambar. Pastikan browser mendukung Canvas API.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPhoto = () => {
    setPhotoUrl(null);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Photo Timestamp Generator</h1>
        <p>Tambahkan informasi lokasi, tanggal, peta, dan waktu dengan elegan ke dalam foto Anda.</p>
      </header>

      <main className="main-content">
        <div className="section-left" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="panel">
            <h2 className="section-title">
              <Camera size={20} className="text-accent" /> Pilih Foto Utama
            </h2>
            {!photoUrl ? (
              <PhotoUploader onPhotoUploaded={setPhotoUrl} />
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="text-muted">✓ Foto berhasil diunggah</span>
                <button onClick={resetPhoto} className="btn btn-secondary" style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                  <Trash2 size={16} /> Ganti Foto
                </button>
              </div>
            )}
            
            <CanvasPreview ref={previewRef} photoUrl={photoUrl} state={editorState} />
            
            {photoUrl && (
              <button 
                className="btn btn-primary" 
                onClick={handleDownload}
                disabled={isProcessing}
                style={{ marginTop: "1rem" }}
              >
                {isProcessing ? "Memproses..." : <><Download size={20} /> Unduh Hasil</>}
              </button>
            )}
          </div>
        </div>

        <div className="section-right">
          <TimestampEditor state={editorState} onChange={setEditorState} />
        </div>
      </main>
    </div>
  );
}
