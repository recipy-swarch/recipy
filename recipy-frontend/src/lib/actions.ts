"use server"

import { revalidatePath } from "next/cache"
import RecipeService from "@/services/RecipeService"

export async function createRecipe(formData: FormData) {
  try {
    console.log("Creando receta con los siguientes datos:", formData)
    // Puedes validar o transformar datos aquí si lo necesitas

    // Llama a la función del servicio para crear la receta
    await RecipeService.createrecipe(formData)

    // Revalida la ruta para actualizar los datos
    revalidatePath("/recipes")

    return { success: true }
  } catch (error) {
    console.error("Error al crear la receta:", error)
    return { success: false, error }
  }
}