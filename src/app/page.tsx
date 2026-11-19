"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  Trash2,
  Camera,
  Share2,
  Sliders,
  Eye,
  Sparkles,
  Layers,
  Images,
  X,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toJpeg } from "html-to-image";
import PhotoUploader, { UploadedPhoto } from "../components/PhotoUploader";
import TimestampEditor, { EditorState } from "../components/TimestampEditor";
import CanvasPreview from "../components/CanvasPreview";

export interface PhotoItem {
  id: string;
  url: string;
  name: string;
  state: EditorState;
}

export default function Home() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "editor">("preview");
  const [canShare, setCanShare] = useState(false);
  const initialCoordsRef = useRef<[number, number]>([-6.200000, 106.816666]);

  const previewRef = useRef<HTMLDivElement>(null);

  // Check if Web Share API is supported
  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  // Try to get GPS default coordinates on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          initialCoordsRef.current = [position.coords.latitude, position.coords.longitude];
        },
        () => {
          console.warn("Geolocation denied or unavailable on mount.");
        },
        { timeout: 8000 }
      );
    }
  }, []);

  const createDefaultEditorState = (existingState?: EditorState): EditorState => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    if (existingState) {
      return {
        ...existingState,
        time: `${hh}:${min}:${ss}`,
      };
    }

    return {
      locationText: "",
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}:${ss}`,
      coordinates: [...initialCoordsRef.current],
      mapOpacity: 0.85,
    };
  };

  const activeIndex = Math.max(0, photos.findIndex((p) => p.id === activePhotoId));
  const activePhoto = photos.length > 0 ? (photos[activeIndex] || photos[0]) : null;

  // Handle uploading single or multiple photos
  const handlePhotosUploaded = (uploaded: UploadedPhoto[]) => {
    const lastState = activePhoto ? activePhoto.state : undefined;

    const newItems: PhotoItem[] = uploaded.map((item, idx) => ({
      id: `photo-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      url: item.url,
      name: item.name || `Foto ${photos.length + idx + 1}`,
      state: createDefaultEditorState(lastState),
    }));

    setPhotos((prev) => [...prev, ...newItems]);
    if (!activePhotoId && newItems.length > 0) {
      setActivePhotoId(newItems[0].id);
    }
    setActiveTab("preview");
  };

  const handleActiveStateChange = (newState: EditorState) => {
    if (!activePhoto) return;
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhoto.id ? { ...p, state: newState } : p))
    );
  };

  const handleDeletePhoto = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activePhotoId === id) {
        setActivePhotoId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const handleResetAll = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua foto?")) {
      setPhotos([]);
      setActivePhotoId(null);
    }
  };

  const handleNextPhoto = () => {
    if (activeIndex < photos.length - 1) {
      setActivePhotoId(photos[activeIndex + 1].id);
    }
  };

  const handlePrevPhoto = () => {
    if (activeIndex > 0) {
      setActivePhotoId(photos[activeIndex - 1].id);
    }
  };

  // Copy current photo's location and map settings to all other photos
  const handleApplyToAll = () => {
    if (!activePhoto) return;
    const { locationText, coordinates, mapOpacity } = activePhoto.state;
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        state: {
          ...p.state,
          locationText,
          coordinates: [...coordinates],
          mapOpacity,
        },
      }))
    );
    alert("Lokasi dan pengaturan peta berhasil disalin ke semua foto!");
  };

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!previewRef.current) return null;
    const dataUrl = await toJpeg(previewRef.current, {
      quality: 0.95,
      backgroundColor: "#000",
      pixelRatio: 2, // High res export
      filter: () => true,
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleDownloadActive = async () => {
    if (!previewRef.current || !activePhoto) return;
    try {
      setIsProcessing(true);
      const blob = await generateImageBlob();
      if (!blob) throw new Error("Gagal membuat gambar");

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = activePhoto.name ? activePhoto.name.replace(/\.[^/.]+$/, "") : `foto-${activeIndex + 1}`;
      link.download = `timestamp-${safeName}-${Date.now()}.jpg`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error("Gagal mendownload gambar", err);
      alert("Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch download all photos sequentially
  const handleDownloadAll = async () => {
    if (photos.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: photos.length });

    try {
      const originalActiveId = activePhotoId;

      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        setBatchProgress({ current: i + 1, total: photos.length });
        setActivePhotoId(item.id);

        // Wait for state render & map proxy fetch
        await new Promise((r) => setTimeout(r, 450));

        if (previewRef.current) {
          const dataUrl = await toJpeg(previewRef.current, {
            quality: 0.95,
            backgroundColor: "#000",
            pixelRatio: 2,
            filter: () => true,
          });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const safeName = item.name ? item.name.replace(/\.[^/.]+$/, "") : `foto-${i + 1}`;
          link.download = `timestamp-${safeName}-${Date.now()}.jpg`;
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        }

        // Slight delay between files
        await new Promise((r) => setTimeout(r, 350));
      }

      if (originalActiveId) {
        setActivePhotoId(originalActiveId);
      }
    } catch (err) {
      console.error("Gagal mendownload semua foto", err);
      alert("Terjadi kendala saat mengunduh beberapa foto.");
    } finally {
      setIsProcessing(false);
      setBatchProgress(null);
    }
  };

  const handleShare = async () => {
    if (!previewRef.current || !activePhoto) return;
    try {
      setIsProcessing(true);
      const blob = await generateImageBlob();
      if (!blob) throw new Error("Gagal membuat gambar");

      const safeName = activePhoto.name ? activePhoto.name.replace(/\.[^/.]+$/, "") : `foto-${activeIndex + 1}`;
      const file = new File([blob], `timestamp-${safeName}-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Foto Timestamp",
          text: "Dibuat dengan Photo Timestamp Generator",
        });
      } else {
        handleDownloadActive();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Gagal membagikan gambar", err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-badge">
          <Sparkles size={14} /> Timestamp Camera Generator (Multi-Photo)
        </div>
        <h1>Photo Timestamp Generator</h1>
        <p>Tambahkan informasi lokasi, peta, tanggal, dan waktu detik presisi ke beberapa foto sekaligus.</p>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="mobile-tabs-container">
        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          <Eye size={18} />
          <span>Foto & Pratinjau ({photos.length})</span>
          {photos.length > 0 && <span className="tab-indicator-dot" />}
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${activeTab === "editor" ? "active" : ""}`}
          onClick={() => setActiveTab("editor")}
          disabled={photos.length === 0}
        >
          <Sliders size={18} />
          <span>Atur Lokasi & Waktu</span>
        </button>
      </div>

      <main className="main-content">
        {/* Left Column: Photo & Preview */}
        <div
          className={`section-left ${activeTab === "preview" ? "mobile-tab-active" : "mobile-tab-hidden"}`}
        >
          <div className="panel preview-panel-wrapper">
            <div className="panel-top-row">
              <h2 className="section-title">
                <Camera size={20} className="text-accent" /> Foto & Pratinjau
              </h2>
              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="btn btn-secondary btn-sm text-danger"
                  title="Hapus Semua Foto"
                >
                  <Trash2 size={14} /> Hapus Semua
                </button>
              )}
            </div>

            {/* Thumbnail Strip if photos exist */}
            {photos.length > 0 && (
              <div className="photo-gallery-strip-container">
                <div className="gallery-strip-header">
                  <span className="gallery-strip-title">
                    <Images size={14} className="text-accent" />
                    <span>Daftar Foto ({photos.length})</span>
                  </span>
                  <span className="gallery-strip-hint">Pilih foto untuk melihat/mengatur data</span>
                </div>

                <div className="thumbnail-scroll-strip">
                  {photos.map((p, idx) => {
                    const isActive = p.id === activePhoto?.id;
                    return (
                      <div
                        key={p.id}
                        className={`thumbnail-card ${isActive ? "active" : ""}`}
                        onClick={() => setActivePhotoId(p.id)}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} className="thumbnail-img" />
                        <span className="thumbnail-badge">{idx + 1}</span>
                        <button
                          type="button"
                          className="thumbnail-del-btn"
                          onClick={(e) => handleDeletePhoto(p.id, e)}
                          title="Hapus foto ini"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Compact add photo tile */}
                  <PhotoUploader onPhotosUploaded={handlePhotosUploaded} compact />
                </div>
              </div>
            )}

            {photos.length === 0 ? (
              <PhotoUploader onPhotosUploaded={handlePhotosUploaded} />
            ) : (
              activePhoto && (
                <>
                  <div className="active-photo-bar">
                    <div className="active-photo-info">
                      <span className="badge-active-num">Foto {activeIndex + 1} dari {photos.length}</span>
                      <span className="active-photo-name" title={activePhoto.name}>
                        {activePhoto.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => handleDeletePhoto(activePhoto.id, e)}
                      title="Hapus Foto Ini"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>

                  <CanvasPreview ref={previewRef} photoUrl={activePhoto.url} state={activePhoto.state} />

                  {/* Quick Opacity buttons for the active photo */}
                  <div className="preview-map-opacity-row">
                    <span className="preview-opacity-label">
                      <Layers size={14} className="text-accent" />
                      <span>Transparansi Peta:</span>
                    </span>
                    <div className="preview-opacity-buttons">
                      {[
                        { label: "100%", val: 1.0 },
                        { label: "85%", val: 0.85 },
                        { label: "60%", val: 0.60 },
                        { label: "35%", val: 0.35 },
                        { label: "Off", val: 0 },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          className={`btn-preview-opacity ${Math.round((activePhoto.state.mapOpacity ?? 0.85) * 100) === Math.round(item.val * 100) ? "active" : ""}`}
                          onClick={() =>
                            handleActiveStateChange({
                              ...activePhoto.state,
                              mapOpacity: item.val,
                            })
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons: Download active or all */}
                  <div className="preview-action-row">
                    <button
                      className="btn btn-primary btn-action-main"
                      onClick={handleDownloadActive}
                      disabled={isProcessing}
                    >
                      {isProcessing && !batchProgress ? (
                        "Memproses..."
                      ) : (
                        <>
                          <Download size={18} /> Unduh Foto Ini
                        </>
                      )}
                    </button>

                    {photos.length > 1 && (
                      <button
                        className="btn btn-secondary btn-action-batch"
                        onClick={handleDownloadAll}
                        disabled={isProcessing}
                        title="Unduh Semua Foto Berurutan"
                      >
                        {batchProgress ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{batchProgress.current}/{batchProgress.total}</span>
                          </>
                        ) : (
                          <>
                            <Download size={18} /> Unduh Semua ({photos.length})
                          </>
                        )}
                      </button>
                    )}

                    {canShare && (
                      <button
                        className="btn btn-secondary btn-action-share"
                        onClick={handleShare}
                        disabled={isProcessing}
                        title="Bagikan Foto"
                      >
                        <Share2 size={18} />
                      </button>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>

        {/* Right Column: Location & Time Editor */}
        <div
          className={`section-right ${activeTab === "editor" ? "mobile-tab-active" : "mobile-tab-hidden"}`}
        >
          {activePhoto ? (
            <TimestampEditor
              state={activePhoto.state}
              onChange={handleActiveStateChange}
              photoIndex={activeIndex}
              totalPhotos={photos.length}
              photoName={activePhoto.name}
              onNextPhoto={handleNextPhoto}
              onPrevPhoto={handlePrevPhoto}
              onApplyToAll={photos.length > 1 ? handleApplyToAll : undefined}
            />
          ) : (
            <div className="panel empty-editor-panel">
              <Images size={48} className="text-muted" style={{ opacity: 0.5 }} />
              <h3 style={{ marginTop: "1rem" }}>Belum Ada Foto Dipilih</h3>
              <p className="upload-subtext">
                Silakan unggah satu atau beberapa foto terlebih dahulu untuk mulai mengatur data timestamp.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Bar */}
      {activePhoto && (
        <div className="mobile-floating-bar">
          <button
            type="button"
            className="mobile-floating-btn secondary"
            onClick={() => setActiveTab(activeTab === "preview" ? "editor" : "preview")}
          >
            {activeTab === "preview" ? (
              <>
                <Sliders size={18} />
                <span>Atur Data Foto ({activeIndex + 1})</span>
              </>
            ) : (
              <>
                <Eye size={18} />
                <span>Lihat Pratinjau</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="mobile-floating-btn primary"
            onClick={handleDownloadActive}
            disabled={isProcessing}
          >
            <Download size={18} />
            <span>{isProcessing ? "Memproses..." : "Unduh Foto"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
