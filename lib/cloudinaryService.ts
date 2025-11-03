const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'nutriscan_label'

export interface UploadResult {
  url: string
  publicId: string
  secureUrl: string
}

class CloudinaryService {
  /**
   * Upload image to Cloudinary using unsigned upload preset
   * @param imageUri - Local URI of the image
   * @param folder - Folder path in Cloudinary (e.g., 'nutriscan/labels')
   * @param publicId - Optional public ID for the image
   * @returns Upload result with URLs
   */
  async uploadImage(
    imageUri: string,
    folder: string = 'nutriscan',
    publicId?: string
  ): Promise<UploadResult> {
    if (!CLOUD_NAME) {
      throw new Error('Cloudinary cloud name not configured')
    }

    try {
      // Create form data for React Native
      // Use the file URI directly for React Native FormData
      const formData = new FormData()
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'label.jpg'
      } as any)
      formData.append('upload_preset', UPLOAD_PRESET)
      formData.append('folder', folder)
      formData.append('format', 'jpg')
      formData.append('quality', 'auto')
      
      if (publicId) {
        formData.append('public_id', publicId)
      }

      // Upload to Cloudinary
      // Note: Don't set Content-Type header - React Native will set it with boundary
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        throw new Error(`Cloudinary upload failed: ${errorText}`)
      }

      const result = await uploadResponse.json()

      return {
        url: result.url,
        publicId: result.public_id,
        secureUrl: result.secure_url
      }
    } catch (error: any) {
      console.error('Cloudinary upload error:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }
  }

  /**
   * Upload label image
   */
  async uploadLabelImage(imageUri: string, scanId: string): Promise<UploadResult> {
    return this.uploadImage(imageUri, 'nutriscan/labels', `label_${scanId}`)
  }

  /**
   * Upload result card image
   */
  async uploadResultImage(imageUri: string, scanId: string): Promise<UploadResult> {
    return this.uploadImage(imageUri, 'nutriscan/results', `result_${scanId}`)
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        } else {
          reject(new Error('Failed to convert blob to base64'))
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Get shareable link for uploaded image
   */
  getShareableLink(publicId: string): string {
    if (!CLOUD_NAME) {
      return ''
    }
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}.jpg`
  }
}

export const cloudinaryService = new CloudinaryService()

