"use server"

import { revalidatePath } from "next/cache"

export async function createRecipe(formData: FormData) {
  try {
    // Extraer datos del formulario
    const title = formData.get("title") as string
    const prep_time = formData.get("prep_time") as string
    const portions = Number.parseInt(formData.get("portions") as string)
    const description = formData.get("description") as string
    const ingredients = JSON.parse(formData.get("ingredients") as string)
    const steps = JSON.parse(formData.get("steps") as string)

    // Aquí normalmente procesarías las imágenes y las subirías a un servicio de almacenamiento
    // Por ahora, solo recopilaremos los nombres de archivo
    const imageFiles: File[] = []
    for (let i = 0; i < 5; i++) {
      const imageKey = `image_${i}`
      if (formData.has(imageKey)) {
        const file = formData.get(imageKey) as File
        if (file.size > 0) {
          imageFiles.push(file)
        }
      }
    }

    // Aquí construirías el objeto de receta y lo enviarías a tu API
    const recipe = {
      title,
      prep_time,
      portions,
      description,
      ingredients,
      steps,
      images: imageFiles.map((file) => file.name), // En un caso real, aquí irían las URLs de las imágenes subidas
    }

    console.log("Receta a crear:", recipe)

    // Simular una llamada a la API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // En un caso real, aquí harías una llamada fetch a tu API
    // const response = await fetch('/api/recipes', {
    //   method: 'POST',
    //   body: JSON.stringify(recipe),
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });

    // if (!response.ok) {
    //   throw new Error('Error al crear la receta');
    // }

    // Revalidar la ruta para actualizar los datos
    revalidatePath("/recipes")

    return { success: true }
  } catch (error) {
    console.error("Error al crear la receta:", error)
    return { success: false, error }
  }
}
