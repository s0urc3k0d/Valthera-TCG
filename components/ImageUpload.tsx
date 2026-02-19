import React, { useState, useRef, useCallback } from 'react';
import apiService from '../services/apiService';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  aspectRatio?: 'card' | 'cover' | 'square';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  className = '',
  aspectRatio = 'card'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClass = {
    card: 'aspect-[3/4]',
    cover: 'aspect-[16/9]',
    square: 'aspect-square'
  }[aspectRatio];

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const resolveStorageTarget = (mode: 'card' | 'cover' | 'square') => {
    if (mode === 'cover') {
      return { bucket: 'series-covers', prefix: 'covers' };
    }

    if (mode === 'square') {
      return { bucket: 'avatars', prefix: 'avatars' };
    }

    return { bucket: 'card-images', prefix: 'cards' };
  };

  const getFileExtension = (file: File): string => {
    const fromName = file.name.split('.').pop()?.toLowerCase();
    if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
      return fromName;
    }

    const mime = file.type.toLowerCase();
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('png')) return 'png';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    return 'bin';
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { bucket, prefix } = resolveStorageTarget(aspectRatio);
      const extension = getFileExtension(file);
      const uniqueId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const objectPath = `${prefix}/${uniqueId}.${extension}`;

      const uploadedUrl = await apiService.uploadImage(bucket, objectPath, file);

      if (!uploadedUrl) {
        throw new Error('Échec de l\'upload');
      }

      onChange(uploadedUrl);
      setIsLoading(false);
    } catch (err) {
      setError('Erreur lors de l\'upload de l\'image');
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    onChange(e.target.value);
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('url')}
          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
            inputMode === 'url'
              ? 'bg-valthera-600 text-valthera-100'
              : 'bg-valthera-800 text-valthera-400 hover:bg-valthera-700'
          }`}
        >
          🔗 URL
        </button>
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
            inputMode === 'upload'
              ? 'bg-valthera-600 text-valthera-100'
              : 'bg-valthera-800 text-valthera-400 hover:bg-valthera-700'
          }`}
        >
          📁 Upload
        </button>
      </div>

      {inputMode === 'url' ? (
        <input
          type="text"
          value={value.startsWith('data:') ? '' : value}
          onChange={handleUrlChange}
          placeholder="https://..."
          className="w-full bg-valthera-900 border border-valthera-600 rounded-lg px-4 py-3 text-valthera-100 focus:ring-2 focus:ring-valthera-400 outline-none placeholder-valthera-600"
        />
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragging
              ? 'border-valthera-400 bg-valthera-700/30'
              : 'border-valthera-600 hover:border-valthera-500 bg-valthera-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="p-6 text-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-valthera-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-valthera-400 text-sm">Chargement...</span>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-2">📷</div>
                <p className="text-valthera-300 text-sm">
                  Glissez une image ici ou <span className="text-valthera-400 underline">cliquez pour parcourir</span>
                </p>
                <p className="text-valthera-500 text-xs mt-1">
                  PNG, JPG, WebP • Max 5 Mo
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-blood-400 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Preview */}
      {value && (
        <div className="relative">
          <div className={`${aspectRatioClass} w-full max-w-xs rounded-lg overflow-hidden border border-valthera-600 bg-valthera-900`}>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setError('Impossible de charger l\'image')}
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-blood-600 hover:bg-blood-500 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
