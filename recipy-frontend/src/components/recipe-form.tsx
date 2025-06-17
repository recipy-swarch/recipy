"use client"

  import { useState, useRef, type FormEvent } from "react"
  import { createRecipe } from "@/lib/actions"
  import ImageUploader from "./image-uploader"
  import DynamicList from "./dynamic-list"

export default function RecipeForm() {
  const [title, setTitle] = useState("");
  const [prep_time, setPrepTime] = useState("");
  const [portions, setPortions] = useState(1);
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = "El título es obligatorio";
    if (!prep_time.trim())
      newErrors.prepTime = "El tiempo de preparación es obligatorio";
    if (portions < 1) newErrors.portions = "Las porciones deben ser al menos 1";
    if (!description.trim())
      newErrors.description = "La descripción es obligatoria";

    if (ingredients.length === 0 || ingredients.every((i) => !i.trim())) {
      newErrors.ingredients = "Debes agregar al menos un ingrediente";
    }

    if (steps.length === 0 || steps.every((s) => !s.trim())) {
      newErrors.steps = "Debes agregar al menos un paso";
    }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    // 1) Función utilitaria para recortar a cuadrado, redimensionar y convertir a WebP
    const processAndConvert = (file: File): Promise<File> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const size = 700
          // Determinar lado de la región cuadrada a recortar
          const side = Math.min(img.width, img.height)
          const sx = (img.width - side) / 2
          const sy = (img.height - side) / 2

          const canvas = document.createElement("canvas")
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext("2d")!

          // Dibujar sólo la región central cuadrada escalada a 700×700
          ctx.drawImage(
            img,
            sx, sy, side, side,   // fuente: recorte cuadrado
            0, 0, size, size      // destino: lienzo completo
          )

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject("Error al convertir imagen")
              const webpFile = new File(
                [blob],
                file.name.replace(/\.\w+$/, ".webp"),
                { type: "image/webp" }
              )
              resolve(webpFile)
              URL.revokeObjectURL(url)
            },
            "image/webp",
            0.8
          )
        }
        img.onerror = (e) => {
          URL.revokeObjectURL(url)
          reject("Error cargando imagen")
        }
        img.src = url
      })
    }

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()
      if (!validateForm()) return
      setIsSubmitting(true)

      try {
        // 2) Procesamos todas las imágenes
        const processedImages = await Promise.all(images.map(f => processAndConvert(f)))

        const formData = new FormData()
        formData.append("title", title)
        formData.append("prep_time", prep_time)
        formData.append("portions", portions.toString())
        formData.append("description", description)
        formData.append("steps", JSON.stringify(steps.filter(s => s.trim())))

        // 3) Añadimos los WebP redimensionados
        processedImages.forEach(img => formData.append("images", img))

        const token = localStorage.getItem("token")
        if (token) await createRecipe(formData, token)
        alert("¡Receta creada con éxito!")
      } catch (error) {
        console.error("Error al crear la receta:", error)
        alert("Ocurrió un error al crear la receta.")
      } finally {
        setIsSubmitting(false)
      }
    }
  };

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
            value={prep_time}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="Ej: 30 min"
          />
          {errors.prepTime && (
            <div className="text-danger">{errors.prepTime}</div>
          )}
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
          {errors.portions && (
            <div className="text-danger">{errors.portions}</div>
          )}
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
        {errors.description && (
          <div className="text-danger">{errors.description}</div>
        )}
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
        {errors.ingredients && (
          <div className="text-danger">{errors.ingredients}</div>
        )}
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
        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear Receta"}
        </button>
      </div>
    </form>
  );
}
