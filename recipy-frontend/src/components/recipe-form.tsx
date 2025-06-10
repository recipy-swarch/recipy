"use client"

import { useState, useRef, type FormEvent } from "react"
import { createRecipe } from "@/lib/actions"
import ImageUploader from "./image-uploader"
import DynamicList from "./dynamic-list"

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
      const filteredIngredients = ingredients.filter((i) => i.trim())
      const filteredSteps = steps.filter((s) => s.trim())

      const formData = new FormData()
      formData.append("title", title)
      formData.append("prep_time", prepTime)
      formData.append("portions", portions.toString())
      formData.append("steps", JSON.stringify(filteredSteps))

      images.forEach((image, index) => {
        formData.append(`image_${index}`, image)
      })

      const token = localStorage.getItem("token")
      if (token) {
        await createRecipe(formData, token)
      }

      alert("¡Receta creada con éxito!")
    } catch (error) {
      console.error("Error al crear la receta:", error)
      alert("Ocurrió un error al crear la receta. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="title" className="form-label">
          Título <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          type="text"
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Pasta Carbonara"
        />
        {errors.title && <div className="text-danger">{errors.title}</div>}
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="prepTime" className="form-label">
            Tiempo de preparación <span className="text-danger">*</span>
          </label>
          <input
            id="prepTime"
            type="text"
            className="form-control"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="Ej: 30 min"
          />
          {errors.prepTime && <div className="text-danger">{errors.prepTime}</div>}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="portions" className="form-label">
            Porciones <span className="text-danger">*</span>
          </label>
          <input
            id="portions"
            type="number"
            min="1"
            className="form-control"
            value={portions}
            onChange={(e) => setPortions(Number.parseInt(e.target.value) || 1)}
          />
          {errors.portions && <div className="text-danger">{errors.portions}</div>}
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="description" className="form-label">
          Descripción <span className="text-danger">*</span>
        </label>
        <textarea
          id="description"
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe tu receta brevemente..."
          rows={3}
        />
        {errors.description && <div className="text-danger">{errors.description}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">
          Ingredientes <span className="text-danger">*</span>
        </label>
        <DynamicList
          items={ingredients}
          setItems={setIngredients}
          placeholder="Ej: 200g de harina"
          buttonText="Agregar ingrediente"
        />
        {errors.ingredients && <div className="text-danger">{errors.ingredients}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">
          Pasos <span className="text-danger">*</span>
        </label>
        <DynamicList
          items={steps}
          setItems={setSteps}
          placeholder="Describe un paso de la preparación..."
          buttonText="Agregar paso"
          isTextarea
        />
        {errors.steps && <div className="text-danger">{errors.steps}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">
          Imágenes (1-5) <span className="text-danger">*</span>
        </label>
        <ImageUploader
          images={images}
          setImages={setImages}
          previews={previews}
          setPreviews={setPreviews}
          maxImages={5}
        />
        {errors.images && <div className="text-danger">{errors.images}</div>}
      </div>

      <div className="mb-3 text-end">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear Receta"}
        </button>
      </div>
    </form>
  )
}
  