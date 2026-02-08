import { useState, useRef } from 'react';
import { DragDropZone } from './DragdropZone';
import { ImageGrid } from './ImageGrid';
import { useAddGalleryImage } from '@/lib/state/meal-store';

interface GalleryManagerProps {
  imageIds: string[];
  maxImages?: number;
  onAdd: (imageId: string) => void;
  onRemove: (index: number) => void;
}

export function GalleryManager({
  imageIds,
  maxImages = 5,
  onAdd,
  onRemove,
}: GalleryManagerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addGalleryImage = useAddGalleryImage();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }
      
      const imageId = await addGalleryImage(file);
      onAdd(imageId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  return (
    <div className="space-y-4">
      {imageIds.length < maxImages && (
        <div className="relative">
          <DragDropZone
            active={dragActive}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            currentCount={imageIds.length}
            maxCount={maxImages}
          />
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <p className="text-sm">Uploading...</p>
            </div>
          )}
          {uploadError && (
            <p className="text-destructive text-sm mt-2">{uploadError}</p>
          )}
        </div>
      )}

      {imageIds.length > 0 && (
        <ImageGrid 
          imageIds={imageIds} 
          onRemove={onRemove}
        />
      )}

      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}