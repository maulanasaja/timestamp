"use client";

import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Camera, Loader2, Plus } from "lucide-react";

export interface UploadedPhoto {
  url: string;
  name: string;
}

interface PhotoUploaderProps {
  onPhotosUploaded: (photos: UploadedPhoto[]) => void;
  compact?: boolean;
}

export default function PhotoUploader({ onPhotosUploaded, compact = false }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const readFileAsDataUrl = (file: File): Promise<UploadedPhoto | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === "string") {
          resolve({
            url: e.target.result,
            name: file.name,
          });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      alert("Silakan pilih file gambar (JPG, PNG, atau WEBP)");
      return;
    }

    setIsReading(true);
    try {
      const results = await Promise.all(fileList.map((f) => readFileAsDataUrl(f)));
      const validPhotos = results.filter((p): p is UploadedPhoto => p !== null);
      if (validPhotos.length > 0) {
        onPhotosUploaded(validPhotos);
      }
    } catch (err) {
      console.error("Gagal membaca file gambar", err);
    } finally {
      setIsReading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ""; // reset for re-selecting same files
    }
  };

  if (compact) {
    return (
      <div className="compact-uploader">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="image/png, image/jpeg, image/webp, image/jpg"
          multiple
          style={{ display: "none" }}
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileInput}
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
        />
        <button
          type="button"
          className="btn-add-photo-thumb"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReading}
          title="Tambah Foto Lagi"
        >
          {isReading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
          <span>Tambah</span>
        </button>
      </div>
    );
  }

  return (
    <div className="upload-wrapper">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/png, image/jpeg, image/webp, image/jpg"
        multiple
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileInput}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
      />

      <div
        className={`upload-area ${isDragging ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isReading && fileInputRef.current?.click()}
      >
        {isReading ? (
          <div className="upload-reading-state">
            <Loader2 size={44} className="animate-spin text-accent" />
            <div className="upload-text" style={{ marginTop: "0.75rem" }}>
              Memproses gambar...
            </div>
          </div>
        ) : (
          <>
            <UploadCloud size={44} className="upload-icon" />
            <div className="upload-text">Pilih atau Tarik Foto ke Sini</div>
            <div className="upload-subtext">Bisa pilih lebih dari 1 foto sekaligus (JPG, PNG, WEBP)</div>
          </>
        )}
      </div>

      <div className="upload-action-buttons">
        <button
          type="button"
          className="btn btn-secondary upload-quick-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReading}
        >
          <ImageIcon size={18} /> Pilih Banyak Foto
        </button>
        <button
          type="button"
          className="btn btn-secondary upload-quick-btn"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isReading}
        >
          <Camera size={18} /> Ambil Kamera
        </button>
      </div>
    </div>
  );
}
