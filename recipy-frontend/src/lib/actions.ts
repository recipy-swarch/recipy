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
export async function fetchRecipe(recipeId:string) {
  try {
    console.log("Fetching one recipe");
    const recipes = await RecipeService.fetchRecipe(recipeId);
    return { success: true, recipes };
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return { success: false, error };
  }
}

export async function fetchComments(recipeId: string): Promise<{ success: true; comments: IComments[] } | { success: false; error: any }> {
  try {
    console.log("Fetching comments for recipe", recipeId);
    const comments = await RecipeService.fetchComments(recipeId);
    return { success: true, comments };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return { success: false, error };
  }
}

export async function createComment(
  recipeId: string,
  content: string,
  parentId?: string,
  token?: string
): Promise<{ success: true; comment: IComments } | { success: false; error: any }> {
  try {
    // Pasa token al service, igual que haces en likeRecipe:
    const comment = await RecipeService.createComment(recipeId, content, parentId, token);
    return { success: true, comment };
  } catch (error) {
    console.error("Action createComment error:", error);
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
/**
 * Dar like: devuelve { success: true; like: ILike } o { success: false; error }
 */
export async function likeRecipe(recipeId: string, token?: string): Promise<{ success: true; like: ILike } | { success: false; error: any }> {
  try {
    const like = await RecipeService.likeRecipe(recipeId, token);
    return { success: true, like };
  } catch (error) {
    console.error("Action likeRecipe error:", error);
    return { success: false, error };
  }
}
/**
 * Quitar like: devuelve { success: true } o { success: false; error }
 */
export async function unlikeRecipe(recipeId: string, token?: string): Promise<{ success: true } | { success: false; error: any }> {
  try {
    await RecipeService.unlikeRecipe(recipeId, token);
    return { success: true };
  } catch (error) {
    console.error("Action unlikeRecipe error:", error);
    return { success: false, error };
  }
}

/**
 * Obtener cantidad de likes: devuelve { success: true; count: number } o { success: false; error }
 */
export async function fetchLikesCount(recipeId: string): Promise<{ success: true; count: number } | { success: false; error: any }> {
  try {
    const count = await RecipeService.getLikesCount(recipeId);
    return { success: true, count };
  } catch (error) {
    console.error("Action fetchLikesCount error:", error);
    return { success: false, error };
  }
}

/**
 *   Verificar si ya dio like: devuelve { success: true; hasLiked: boolean } o { success: false; error }
 */
export async function fetchHasLiked(
  recipeId: string,
  token?: string
): Promise<{ success: true; hasLiked: boolean } | { success: false; error: any }> {
  try {
    const hasLiked = await RecipeService.hasLiked(recipeId, token);
    return { success: true, hasLiked };
  } catch (error) {
    console.error("Action fetchHasLiked error:", error);
    // Opcional: podrías devolver success: true con hasLiked=false en ciertos errores,
    // pero aquí devolvemos success:false para errores inesperados (p.ej. 401, 500).
    return { success: false, error };
  }
}