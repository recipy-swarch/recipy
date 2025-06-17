"use server";

import { revalidatePath } from "next/cache";
import RecipeService from "@/services/RecipeService";

export async function createRecipe(formData: FormData, token: string) {
  try {
    console.log("Creando receta con los siguientes datos:", formData);
    // Puedes validar o transformar datos aquí si lo necesitas

    // Llama a la función del servicio para crear la receta
    await RecipeService.createRecipe(formData, token);

    // Revalida la ruta para actualizar los datos
    revalidatePath("/recipes");

    return { success: true };
  } catch (error) {
    console.error("Error al crear la receta:", error);
    return { success: false, error };
  }
}
export async function fetchAllRecipes() {
  try {
    console.log("Fetching all recipes");
    const recipes = await RecipeService.fetchAllRecipes();
    return { success: true, recipes };
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return { success: false, error };
  }
}

export async function fetchUserRecipes(userId: string) {
  try {
    console.log("Fetching user recipes for userId:", userId);
    const recipes = await RecipeService.fetchUserRecipesNA(userId);
    return { success: true, recipes };
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return { success: false, error };
  }
}
