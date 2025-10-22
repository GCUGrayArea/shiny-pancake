/**
 * Image Service
 * Handles image compression, upload, download, and thumbnail generation
 * Max 75 lines per function
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytesResumable, getDownloadURL, getMetadata } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';
import { IMAGE_CONSTANTS, ERROR_CODES } from '@/constants';
import { ImageUploadResult } from '@/types';

const storage = getFirebaseStorage();

/**
 * Compresses an image to meet size requirements
 * @param uri - Local image URI
 * @param maxSize - Maximum file size in bytes (default: 2MB)
 * @returns Promise<{ uri, width, height, size }>
 */
export async function compressImage(
  uri: string,
  maxSize: number = IMAGE_CONSTANTS.MAX_SIZE
): Promise<{ uri: string; width: number; height: number; size: number }> {
  try {
    console.log('🖼️ ImageService: Starting compression for:', uri);

    // Get original image info
    const originalInfo = await ImageManipulator.manipulateAsync(
      uri,
      [], // No operations
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    let compressedUri = uri;
    let currentSize = 0;

    // Get file size by fetching the blob
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      currentSize = blob.size;
    } catch (sizeError) {
      console.warn('⚠️ ImageService: Could not determine file size:', sizeError);
      currentSize = 0;
    }

    console.log(`📏 ImageService: Original size: ${currentSize} bytes (${currentSize / 1024 / 1024} MB)`);

    // If already under limit, return as-is
    if (currentSize <= maxSize) {
      console.log('✅ ImageService: Image already under size limit');
      return {
        uri: compressedUri,
        width: originalInfo.width,
        height: originalInfo.height,
        size: currentSize
      };
    }

    // Progressive compression until under size limit
    let quality = IMAGE_CONSTANTS.COMPRESSION_QUALITY;

    while (currentSize > maxSize && quality > 0.1) {
      console.log(`🔄 ImageService: Compressing with quality ${quality}`);

      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      compressedUri = compressed.uri;

      // Get new file size
      try {
        const response = await fetch(compressed.uri);
        const blob = await response.blob();
        currentSize = blob.size;
      } catch (sizeError) {
        console.warn('⚠️ ImageService: Could not determine compressed file size:', sizeError);
        currentSize = maxSize + 1; // Force resize attempt
      }

      if (currentSize <= maxSize) {
        console.log(`✅ ImageService: Successfully compressed to ${currentSize} bytes`);
        break;
      }

      // Reduce quality for next attempt
      quality -= 0.1;
    }

    // If still too large, resize dimensions
    if (currentSize > maxSize) {
      console.log('🔄 ImageService: Resizing dimensions');

      const resizeFactor = Math.sqrt(maxSize / currentSize);
      const newWidth = Math.floor(originalInfo.width * resizeFactor);
      const newHeight = Math.floor(originalInfo.height * resizeFactor);

      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: newWidth, height: newHeight } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      compressedUri = resized.uri;

      // Get final file size
      try {
        const response = await fetch(resized.uri);
        const blob = await response.blob();
        currentSize = blob.size;
      } catch (sizeError) {
        console.warn('⚠️ ImageService: Could not determine resized file size:', sizeError);
        currentSize = maxSize + 1;
      }

      console.log(`✅ ImageService: Resized and compressed to ${currentSize} bytes`);
    }

    return {
      uri: compressedUri,
      width: originalInfo.width,
      height: originalInfo.height,
      size: currentSize
    };
  } catch (error) {
    console.error('❌ ImageService: Compression failed:', error);
    throw new Error(ERROR_CODES.IMAGE_UPLOAD_FAILED);
  }
}

/**
 * Uploads an image to Firebase Storage
 * @param uri - Local image URI
 * @param path - Storage path (e.g., 'images/chatId/messageId.jpg')
 * @param onProgress - Optional progress callback (0-1)
 * @returns Promise<ImageUploadResult>
 */
export async function uploadImage(
  uri: string,
  path: string,
  onProgress?: (progress: number) => void
): Promise<ImageUploadResult> {
  try {
    console.log('⬆️ ImageService: Starting upload to:', path);

    // Ensure user is authenticated before uploading
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.error('❌ ImageService: No authenticated user found');
      throw new Error('User must be authenticated to upload images');
    }

    console.log('🔐 ImageService: User authenticated:', {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified
    });

    // Fetch the image file
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create storage reference
    const storageRef = ref(storage, path);

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      console.log('🔄 ImageService: Starting upload task...');

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          console.log(`📈 ImageService: Upload progress: ${Math.round(progress * 100)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
          onProgress?.(progress);
        },
        (error) => {
          console.error('❌ ImageService: Upload failed with error:', {
            code: error.code,
            message: error.message,
            name: error.name
          });
          reject(new Error(`${ERROR_CODES.IMAGE_UPLOAD_FAILED}: ${error.message}`));
        },
        async () => {
          try {
            console.log('🔄 ImageService: Upload completed, getting download URL...');

            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('🔗 ImageService: Got download URL:', downloadURL);

            // Get metadata for dimensions and size
            const metadata = await getMetadata(uploadTask.snapshot.ref);
            console.log('📋 ImageService: Got metadata:', metadata);

            console.log('✅ ImageService: Upload fully completed');

            resolve({
              url: downloadURL,
              width: parseInt(metadata.customMetadata?.width || '0'),
              height: parseInt(metadata.customMetadata?.height || '0'),
              size: parseInt(metadata.size?.toString() || '0')
            });
          } catch (urlError) {
            console.error('❌ ImageService: Failed to get download URL:', {
              error: urlError,
              message: urlError instanceof Error ? urlError.message : String(urlError)
            });
            reject(new Error(`${ERROR_CODES.IMAGE_UPLOAD_FAILED}: Failed to get download URL`));
          }
        }
      );
    });
  } catch (error) {
    console.error('❌ ImageService: Upload preparation failed:', error);
    throw new Error(ERROR_CODES.IMAGE_UPLOAD_FAILED);
  }
}

/**
 * Downloads an image from URL to local cache
 * @param url - Image URL to download
 * @returns Promise<string> - Local URI for the downloaded image
 */
export async function downloadImage(url: string): Promise<string> {
  try {
    console.log('⬇️ ImageService: Downloading image from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Create a local URI for the blob
    const localUri = URL.createObjectURL(blob);

    console.log('✅ ImageService: Image downloaded to:', localUri);

    return localUri;
  } catch (error) {
    console.error('❌ ImageService: Download failed:', error);
    throw new Error(ERROR_CODES.IMAGE_UPLOAD_FAILED);
  }
}

/**
 * Generates a thumbnail from an image URI
 * @param uri - Source image URI
 * @param maxDimension - Maximum width or height for thumbnail (default: 200)
 * @returns Promise<string> - URI of the generated thumbnail
 */
export async function generateThumbnail(
  uri: string,
  maxDimension: number = 200
): Promise<string> {
  try {
    console.log('🖼️ ImageService: Generating thumbnail for:', uri);

    // Get original dimensions
    const originalInfo = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Calculate thumbnail dimensions (maintain aspect ratio)
    const aspectRatio = originalInfo.width / originalInfo.height;
    let thumbnailWidth, thumbnailHeight;

    if (originalInfo.width > originalInfo.height) {
      thumbnailWidth = maxDimension;
      thumbnailHeight = maxDimension / aspectRatio;
    } else {
      thumbnailHeight = maxDimension;
      thumbnailWidth = maxDimension * aspectRatio;
    }

    // Generate thumbnail
    const thumbnail = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: Math.floor(thumbnailWidth),
            height: Math.floor(thumbnailHeight)
          }
        }
      ],
      {
        compress: 0.7, // Higher compression for thumbnail
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    console.log('✅ ImageService: Thumbnail generated:', thumbnail.uri);

    return thumbnail.uri;
  } catch (error) {
    console.error('❌ ImageService: Thumbnail generation failed:', error);
    throw new Error(ERROR_CODES.IMAGE_UPLOAD_FAILED);
  }
}

/**
 * Validates if an image file meets requirements
 * @param file - File object or URI
 * @returns Promise<boolean>
 */
export async function validateImage(file: any): Promise<boolean> {
  try {
    // For URI validation, we need to check the file
    if (typeof file === 'string') {
      const response = await fetch(file);
      const contentType = response.headers.get('content-type');

      if (!contentType || !(IMAGE_CONSTANTS.SUPPORTED_FORMATS as readonly string[]).includes(contentType)) {
        console.error('❌ ImageService: Unsupported format:', contentType);
        return false;
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > IMAGE_CONSTANTS.MAX_SIZE) {
        console.error('❌ ImageService: File too large:', contentLength);
        return false;
      }

      return true;
    }

    // For File objects (from ImagePicker)
    if (file.type) {
      // Accept generic "image" type from ImagePicker, or check specific MIME types
      const isGenericImage = file.type === 'image';
      const isSpecificFormat = (IMAGE_CONSTANTS.SUPPORTED_FORMATS as readonly string[]).includes(file.type);

      console.log('🔍 ImageService: Validating image type:', {
        type: file.type,
        isGenericImage,
        isSpecificFormat,
        supportedFormats: IMAGE_CONSTANTS.SUPPORTED_FORMATS
      });

      if (!isGenericImage && !isSpecificFormat) {
        console.error('❌ ImageService: Unsupported format:', file.type);
        return false;
      }
    }

    // Check both size and fileSize properties (ImagePicker uses fileSize)
    const fileSize = (file as any).fileSize || file.size;
    if (fileSize && fileSize > IMAGE_CONSTANTS.MAX_SIZE) {
      console.error('❌ ImageService: File too large:', fileSize);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ ImageService: Validation failed:', error);
    return false;
  }
}
