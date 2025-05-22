"use client"

import { useState, useRef, type FormEvent } from "react"
import { createRecipe } from "@/lib/actions"
import ImageUploader from "./image-uploader"
import DynamicList from "./dynamic-list"
import styles from "./recipe-form.module.css"

export default function RecipeForm() {
  const [title, setTitle] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [portions, setPortions] = useState(1)
  const [description, setDescription] = useState("")
  const [ingredients, setIngredients] = useState<string[]>([""])
  const [steps, setSteps] = useState<string[]>([""])
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) newErrors.title = "El título es obligatorio"
    if (!prepTime.trim()) newErrors.prepTime = "El tiempo de preparación es obligatorio"
    if (portions < 1) newErrors.portions = "Las porciones deben ser al menos 1"
    if (!description.trim()) newErrors.description = "La descripción es obligatoria"

    if (ingredients.length === 0 || ingredients.every((i) => !i.trim())) {
      newErrors.ingredients = "Debes agregar al menos un ingrediente"
    }

    if (steps.length === 0 || steps.every((s) => !s.trim())) {
      newErrors.steps = "Debes agregar al menos un paso"
    }

    

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Filter out empty ingredients and steps
      const filteredIngredients = ingredients.filter((i) => i.trim())
      const filteredSteps = steps.filter((s) => s.trim())

      const formData = new FormData()
      formData.append("title", title)
      formData.append("prep_time", prepTime)
      formData.append("portions", portions.toString())
      formData.append("steps", JSON.stringify(filteredSteps))

      // Append images
      images.forEach((image, index) => {
        formData.append(`image_${index}`, image)
      })

      await createRecipe(formData)

      // Reset form after successful submission
      

      alert("¡Receta creada con éxito!")
    } catch (error) {
      console.error("Error al crear la receta:", error)
      alert("Ocurrió un error al crear la receta. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label htmlFor="title" className={styles.label}>
          Título <span className={styles.required}>*</span>
        </label>
        <input
          id="title"
          type="text"
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Pasta Carbonara"
        />
        {errors.title && <p className={styles.error}>{errors.title}</p>}
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="prepTime" className={styles.label}>
            Tiempo de preparación <span className={styles.required}>*</span>
          </label>
          <input
            id="prepTime"
            type="text"
            className={styles.input}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="Ej: 30 min"
          />
          {errors.prepTime && <p className={styles.error}>{errors.prepTime}</p>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="portions" className={styles.label}>
            Porciones <span className={styles.required}>*</span>
          </label>
          <input
            id="portions"
            type="number"
            min="1"
            className={styles.input}
            value={portions}
            onChange={(e) => setPortions(Number.parseInt(e.target.value) || 1)}
          />
          {errors.portions && <p className={styles.error}>{errors.portions}</p>}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description" className={styles.label}>
          Descripción <span className={styles.required}>*</span>
        </label>
        <textarea
          id="description"
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu receta brevemente..."
          rows={3}
        />
        {errors.description && <p className={styles.error}>{errors.description}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Ingredientes <span className={styles.required}>*</span>
        </label>
        <DynamicList
          items={ingredients}
          setItems={setIngredients}
          placeholder="Ej: 200g de harina"
          buttonText="Agregar ingrediente"
        />
        {errors.ingredients && <p className={styles.error}>{errors.ingredients}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Pasos <span className={styles.required}>*</span>
        </label>
        <DynamicList
          items={steps}
          setItems={setSteps}
          placeholder="Describe un paso de la preparación..."
          buttonText="Agregar paso"
          isTextarea
        />
        {errors.steps && <p className={styles.error}>{errors.steps}</p>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Imágenes (1-5) <span className={styles.required}>*</span>
        </label>
        <ImageUploader
          images={images}
          setImages={setImages}
          previews={previews}
          setPreviews={setPreviews}
          maxImages={5}
        />
        {errors.images && <p className={styles.error}>{errors.images}</p>}
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear Receta"}
        </button>
      </div>
    </form>
  )
}
