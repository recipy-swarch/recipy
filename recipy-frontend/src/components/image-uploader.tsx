"use client"

import { useState, useRef, type ChangeEvent } from "react"
import { X } from "lucide-react"
import styles from "./image-uploader.module.css"

interface ImageUploaderProps {
  images: File[]
  setImages: (images: File[]) => void
  previews: string[]
  setPreviews: (previews: string[]) => void
  maxImages?: number
}

export default function ImageUploader({ images, setImages, previews, setPreviews, maxImages = 5 }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Validate number of files
    if (images.length + files.length > maxImages) {
      setError(`Solo puedes subir un máximo de ${maxImages} imágenes`)
      return
    }

    const newImages: File[] = []
    const newPreviews: string[] = []
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const maxSize = 5 * 1024 * 1024 // 5MB

    // Validate each file
    Array.from(files).forEach((file) => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        setError("Solo se permiten imágenes en formato JPG, PNG, WebP o GIF")
        return
      }

      // Check file size
      if (file.size > maxSize) {
        setError("El tamaño máximo por imagen es de 5MB")
        return
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file)
      newImages.push(file)
      newPreviews.push(previewUrl)
    })

    // Update state
    setImages([...images, ...newImages])
    setPreviews([...previews, ...newPreviews])
    setError(null)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    const newPreviews = [...previews]

    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index])

    newImages.splice(index, 1)
    newPreviews.splice(index, 1)

    setImages(newImages)
    setPreviews(newPreviews)
  }

  return (
    <div className={styles.container}>
      <div className={styles.dropzone}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className={styles.fileInput}
          multiple
          id="recipe-images"
        />
        <label htmlFor="recipe-images" className={styles.uploadLabel}>
          <div className={styles.uploadIcon}>+</div>
          <div>
            <p className={styles.uploadText}>Arrastra imágenes o haz clic para seleccionar</p>
            <p className={styles.uploadHint}>JPG, PNG, WebP o GIF (máx. 5MB)</p>
          </div>
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {previews.length > 0 && (
        <div className={styles.previewContainer}>
          {previews.map((preview, index) => (
            <div key={index} className={styles.previewItem}>
              <img src={preview || "/placeholder.svg"} alt={`Preview ${index + 1}`} className={styles.previewImage} />
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeImage(index)}
                aria-label="Eliminar imagen"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.counter}>
        {images.length} de {maxImages} imágenes
      </div>
    </div>
  )
}
