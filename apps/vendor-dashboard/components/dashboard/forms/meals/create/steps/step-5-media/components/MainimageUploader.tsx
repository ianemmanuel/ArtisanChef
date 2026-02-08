import { useRef, useState } from 'react';
import { ImageUploadCard } from './ImageuploadCard';
import { ImagePreview } from './ImagePreview';
import { Camera, Loader2 } from 'lucide-react';
import { useAddMainImage, useRemoveImage } from '@/lib/state/meal-store'
import { useImageUrl } from '@/hooks/use-image-url'
import { Input } from '@repo/ui/components/input'; // Added shadcn Input

interface MainImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
}
 
export function MainImageUploader({ value, onChange }: MainImageUploaderProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const addMainImage = useAddMainImage();
  const removeImage = useRemoveImage();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { imageUrl, loading, error } = useImageUrl(value);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    
    try {
      const imageId = await addMainImage(file);
      onChange(imageId);
    } catch (err) {
      setUploadError('Failed to upload image');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        await removeImage(value);
        onChange('');
      } catch (err) {
        console.error('Error removing image:', err);
      }
    } else {
      onChange('');
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }
    
    handleUpload(file);
  };

  return (
    <>
      {!value ? (
        <div className="relative">
          <ImageUploadCard 
            title="Upload Main Image"
            description="Drag and drop or click to select your best food photo"
            icon={uploading ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Camera className="h-8 w-8 text-primary" />}
            onUploadClick={() => imageInputRef.current?.click()}
            className={uploading ? 'opacity-50' : ''}
          />
          {uploadError && (
            <p className="text-destructive text-sm mt-2">{uploadError}</p>
          )}
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center rounded-lg">
              <p className="text-destructive text-sm">Failed to load image</p>
            </div>
          )}
          <ImagePreview 
            src={imageUrl}
            onRemove={handleRemove}
            badgeLabel="Main Image"
          />
        </div>
      )}
      
      {/* Using shadcn Input component */}
      <Input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null; // Fix: Convert undefined to null
          handleFileSelect(file);
          e.target.value = '';
        }}
      />
    </>
  );
}