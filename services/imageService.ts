// Service d'upload et d'optimisation d'images pour Valthera TCG

import apiService from './apiService';

const STORAGE_BUCKETS = {
  CARD_IMAGES: 'card-images',
  AVATARS: 'avatars',
  SERIES_COVERS: 'series-covers',
};

interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface ImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
}

const DEFAULT_OPTIONS: ImageOptions = {
  maxWidth: 800,
  maxHeight: 1120, // Ratio carte 2.5:3.5
  quality: 0.85,
  format: 'webp',
};

class ImageService {
  /**
   * Compresse et optimise une image
   */
  async compressImage(file: File, options: ImageOptions = {}): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions en préservant le ratio
        let { width, height } = img;
        const maxW = opts.maxWidth || width;
        const maxH = opts.maxHeight || height;
        
        if (width > maxW) {
          height = (height * maxW) / width;
          width = maxW;
        }
        if (height > maxH) {
          width = (width * maxH) / height;
          height = maxH;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en blob
        const mimeType = opts.format === 'png' 
          ? 'image/png' 
          : opts.format === 'jpeg' 
            ? 'image/jpeg' 
            : 'image/webp';
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Échec de la compression'));
            }
          },
          mimeType,
          opts.quality
        );
      };
      
      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Génère un nom de fichier unique
   */
  generateFileName(originalName: string, prefix: string = ''): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'webp';
    const baseName = originalName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_');
    return `${prefix}${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Upload une image de carte
   */
  async uploadCardImage(file: File, cardId: string): Promise<ImageUploadResult> {
    try {
      // Compresser l'image
      const compressedBlob = await this.compressImage(file, {
        maxWidth: 400,
        maxHeight: 560,
        quality: 0.9,
        format: 'webp',
      });
      
      const fileName = `${cardId}.webp`;
      const path = `cards/${fileName}`;

      const uploadFile = new File([compressedBlob], fileName, { type: 'image/webp' });
      const url = await apiService.uploadImage(STORAGE_BUCKETS.CARD_IMAGES, path, uploadFile);
      if (!url) {
        throw new Error('Upload échoué');
      }

      return { success: true, url };
      
    } catch (error) {
      console.error('Error uploading card image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur d\'upload' 
      };
    }
  }

  /**
   * Upload un avatar utilisateur
   */
  async uploadAvatar(file: File, userId: string): Promise<ImageUploadResult> {
    try {
      // Compresser l'image en carré
      const compressedBlob = await this.compressImage(file, {
        maxWidth: 200,
        maxHeight: 200,
        quality: 0.85,
        format: 'webp',
      });
      
      const fileName = `${userId}.webp`;
      const path = `avatars/${fileName}`;

      const uploadFile = new File([compressedBlob], fileName, { type: 'image/webp' });
      const url = await apiService.uploadImage(STORAGE_BUCKETS.AVATARS, path, uploadFile);
      if (!url) {
        throw new Error('Upload échoué');
      }

      return { success: true, url };
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur d\'upload' 
      };
    }
  }

  /**
   * Upload une image de couverture de série/campagne
   */
  async uploadSeriesCover(file: File, seriesId: string): Promise<ImageUploadResult> {
    try {
      const compressedBlob = await this.compressImage(file, {
        maxWidth: 1200,
        maxHeight: 600,
        quality: 0.85,
        format: 'webp',
      });
      
      const fileName = `${seriesId}.webp`;
      const path = `covers/${fileName}`;

      const uploadFile = new File([compressedBlob], fileName, { type: 'image/webp' });
      const url = await apiService.uploadImage(STORAGE_BUCKETS.SERIES_COVERS, path, uploadFile);
      if (!url) {
        throw new Error('Upload échoué');
      }

      return { success: true, url };
      
    } catch (error) {
      console.error('Error uploading series cover:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur d\'upload' 
      };
    }
  }

  /**
   * Supprime une image
   */
  async deleteImage(bucket: string, path: string): Promise<boolean> {
    try {
      return await apiService.deleteImage(bucket, path);
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Génère l'URL publique d'une image
   */
  getPublicUrl(bucket: string, path: string): string {
    return apiService.getImageUrl(bucket, `/uploads/${bucket}/${path}`);
  }

  /**
   * Génère une URL avec transformation (si activé dans Supabase)
   */
  getTransformedUrl(bucket: string, path: string, width: number, height?: number): string {
    const imageUrl = this.getPublicUrl(bucket, path);
    const params = new URLSearchParams({
      width: width.toString(),
      ...(height ? { height: height.toString() } : {}),
    });
    return `${imageUrl}?${params}`;
  }

  /**
   * Valide un fichier image
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!file) {
      return { valid: false, error: 'Aucun fichier sélectionné' };
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.' };
    }
    
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Fichier trop volumineux. Maximum 10MB.' };
    }
    
    return { valid: true };
  }

  /**
   * Crée une preview d'une image (Data URL)
   */
  async createPreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
      reader.readAsDataURL(file);
    });
  }
}

export const imageService = new ImageService();
export default imageService;
