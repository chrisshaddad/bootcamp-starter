'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Crosshair, ImagePlus, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import {
  PROFILE_PICTURE_ALLOWED_MIME_TYPES,
  PROFILE_PICTURE_MAX_SIZE_BYTES,
} from '@repo/contracts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PREVIEW_SIZE = 320;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.05;

interface Position {
  x: number;
  y: number;
}

export interface ProfilePictureCrop {
  zoom: number;
  x: number;
  y: number;
}

interface ProfilePictureEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl?: string;
  currentOriginalImageUrl?: string;
  currentCrop?: ProfilePictureCrop;
  fallback: string;
  isSaving: boolean;
  onSave: (
    file: File,
    originalFile: File,
    crop: ProfilePictureCrop,
  ) => Promise<boolean>;
}

function getCoverScale(image: HTMLImageElement) {
  return Math.max(
    PREVIEW_SIZE / image.naturalWidth,
    PREVIEW_SIZE / image.naturalHeight,
  );
}

function clampPosition(
  position: Position,
  image: HTMLImageElement,
  zoom: number,
): Position {
  const scale = getCoverScale(image) * zoom;
  const maxX = Math.max(0, (image.naturalWidth * scale - PREVIEW_SIZE) / 2);
  const maxY = Math.max(0, (image.naturalHeight * scale - PREVIEW_SIZE) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, position.x)),
    y: Math.min(maxY, Math.max(-maxY, position.y)),
  };
}

export function ProfilePictureEditorDialog({
  open,
  onOpenChange,
  currentImageUrl,
  currentOriginalImageUrl,
  currentCrop,
  fallback,
  isSaving,
  onSave,
}: ProfilePictureEditorDialogProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [showAlignmentGuide, setShowAlignmentGuide] = useState(true);
  const [isLoadingCurrentImage, setIsLoadingCurrentImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    position: Position;
  } | null>(null);

  const resetEditor = useCallback(() => {
    setSourceFile(null);
    setSourceImage(null);
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    setShowAlignmentGuide(true);
    setIsLoadingCurrentImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (!sourceFile) return;

    const objectUrl = URL.createObjectURL(sourceFile);
    const image = new window.Image();
    image.onload = () => setSourceImage(image);
    image.onerror = () => {
      toast.error('Unable to read this image');
      resetEditor();
    };
    image.src = objectUrl;

    return () => URL.revokeObjectURL(objectUrl);
  }, [resetEditor, sourceFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const scale = getCoverScale(sourceImage) * zoom;
    const width = sourceImage.naturalWidth * scale;
    const height = sourceImage.naturalHeight * scale;

    context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    context.drawImage(
      sourceImage,
      PREVIEW_SIZE / 2 + position.x - width / 2,
      PREVIEW_SIZE / 2 + position.y - height / 2,
      width,
      height,
    );
  }, [position, sourceImage, zoom]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isSaving || isLoadingCurrentImage)) return;
    if (!nextOpen) resetEditor();
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !(PROFILE_PICTURE_ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.type,
      )
    ) {
      toast.error('Only JPEG, PNG, WEBP, or GIF images are allowed');
      event.target.value = '';
      return;
    }

    if (file.size > PROFILE_PICTURE_MAX_SIZE_BYTES) {
      toast.error('Image must be smaller than 5MB');
      event.target.value = '';
      return;
    }

    setSourceImage(null);
    setSourceFile(file);
    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    setShowAlignmentGuide(true);
  };

  const openFilePicker = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const editCurrentImage = async () => {
    if (!currentOriginalImageUrl) return;

    setIsLoadingCurrentImage(true);
    try {
      const response = await fetch(currentOriginalImageUrl, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to load current image');

      const blob = await response.blob();
      if (
        !(PROFILE_PICTURE_ALLOWED_MIME_TYPES as readonly string[]).includes(
          blob.type,
        )
      ) {
        throw new Error('Unsupported current image type');
      }

      const filename =
        new URL(currentOriginalImageUrl, window.location.href).pathname
          .split('/')
          .pop() || 'profile-photo.jpg';
      setSourceFile(new File([blob], filename, { type: blob.type }));
      setSourceImage(null);
      setZoom(currentCrop?.zoom ?? MIN_ZOOM);
      setPosition({ x: currentCrop?.x ?? 0, y: currentCrop?.y ?? 0 });
      setShowAlignmentGuide(true);
    } catch {
      toast.error('Unable to load the current photo for editing');
    } finally {
      setIsLoadingCurrentImage(false);
    }
  };

  const updateZoom = (nextZoom: number) => {
    if (!sourceImage) return;
    const boundedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(boundedZoom);
    setPosition((current) => clampPosition(current, sourceImage, boundedZoom));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!sourceImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      position,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!sourceImage || !dragStartRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const previewRatio = PREVIEW_SIZE / rect.width;
    const nextPosition = {
      x:
        dragStartRef.current.position.x +
        (event.clientX - dragStartRef.current.pointerX) * previewRatio,
      y:
        dragStartRef.current.position.y +
        (event.clientY - dragStartRef.current.pointerY) * previewRatio,
    };
    setPosition(clampPosition(nextPosition, sourceImage, zoom));
  };

  const stopDragging = () => {
    dragStartRef.current = null;
  };

  const createCroppedFile = async () => {
    if (!sourceFile || !sourceImage) return null;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not supported');

    // JPEG has no transparency, so transparent source images should get a
    // predictable background instead of rendering black in some browsers.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const scale = getCoverScale(sourceImage) * zoom;
    const sourceSize = PREVIEW_SIZE / scale;
    const sourceX =
      sourceImage.naturalWidth / 2 - (PREVIEW_SIZE / 2 + position.x) / scale;
    const sourceY =
      sourceImage.naturalHeight / 2 - (PREVIEW_SIZE / 2 + position.y) / scale;

    context.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) throw new Error('Unable to crop image');

    const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'profile-photo';
    return new File([blob], `${baseName}-cropped.jpg`, {
      type: 'image/jpeg',
    });
  };

  const handleSave = async () => {
    try {
      const croppedFile = await createCroppedFile();
      if (!croppedFile || !sourceFile) return;
      const didSave = await onSave(croppedFile, sourceFile, {
        zoom,
        x: position.x,
        y: position.y,
      });
      if (!didSave) return;
      resetEditor();
      onOpenChange(false);
    } catch {
      toast.error('Unable to prepare this image');
    }
  };

  const isBusy = isSaving || isLoadingCurrentImage;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isBusy}
        onPointerDownOutside={(event) => isBusy && event.preventDefault()}
        onEscapeKeyDown={(event) => isBusy && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit profile photo</DialogTitle>
          <DialogDescription>
            Upload a photo, then drag and zoom to choose how it appears.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          {sourceFile && !sourceImage ? (
            <div className="flex size-64 items-center justify-center rounded-full bg-muted sm:size-80">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : sourceImage ? (
            <div className="flex w-full flex-col items-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={showAlignmentGuide}
                onClick={() => setShowAlignmentGuide((current) => !current)}
                disabled={isBusy}
              >
                <Crosshair />
                {showAlignmentGuide ? 'Hide guide' : 'Show guide'}
              </Button>
              <div className="relative mx-auto aspect-square w-full max-w-80">
                <canvas
                  ref={canvasRef}
                  width={PREVIEW_SIZE}
                  height={PREVIEW_SIZE}
                  role="img"
                  aria-label="Profile photo crop preview"
                  className="aspect-square w-full touch-none cursor-grab rounded-full bg-muted shadow-inner ring-2 ring-border active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopDragging}
                  onPointerCancel={stopDragging}
                />
                {showAlignmentGuide && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                  >
                    <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/70 shadow-[0_0_3px_rgba(0,0,0,0.8)]" />
                    <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-white/70 shadow-[0_0_3px_rgba(0,0,0,0.8)]" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Avatar className="size-64 ring-2 ring-border sm:size-80">
              <AvatarImage src={currentImageUrl} />
              <AvatarFallback className="bg-primary-base text-6xl font-semibold text-white">
                {fallback}
              </AvatarFallback>
            </Avatar>
          )}

          {sourceImage && (
            <div className="flex w-full items-center gap-3" aria-label="Zoom">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={zoom}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
                aria-label="Photo zoom"
              />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={PROFILE_PICTURE_ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {!sourceFile && currentOriginalImageUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={editCurrentImage}
                disabled={isBusy}
              >
                {isLoadingCurrentImage ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Crosshair />
                )}
                Edit current photo
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={openFilePicker}
              disabled={isBusy}
            >
              <ImagePlus />
              {sourceFile ? 'Choose another photo' : 'Upload new photo'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!sourceImage || isBusy}
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" />
                Saving photo...
              </>
            ) : (
              'Save photo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
