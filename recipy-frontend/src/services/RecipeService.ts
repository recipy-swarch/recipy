import { IRecipe } from "@/interfaces/IRecipe";
import { IComments } from "@/interfaces/IComments";
import { ILike  } from "@/interfaces/ILike";
class RecipeService {
  private apiUrl: string;

  constructor() {
    // NEXT_PUBLIC_API_GATEWAY_URL ya está expuesta al bundle cliente
    this.apiUrl = process.env.API_GATEWAY_URL || "";
    console.log("API (cliente) apuntando a:", this.apiUrl);
    if (!this.apiUrl) {
      throw new Error("NEXT_PUBLIC_API_GATEWAY_URL no está definido");
    }
  }
  fetchAllRecipes = async (): Promise<IRecipe[]> => {
    const url = `${this.apiUrl}/recipe/graphql/get_recipes`;
    console.log("Fetching all recipes from:", url);

    const response = await fetch(url, {
      method: "GET",
      // No necesitas headers de auth si devuelves todo
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error fetching recipes:", text);
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error("Error creating recipe:", data.error);
      throw new Error(`Error ${data.error}`);
    }

    return data as IRecipe[];
  };

  fetchRecipe = async (recipe_id: string): Promise<IRecipe> => {
    const url = `${this.apiUrl}/recipe/graphql/recipes/${recipe_id}`;
      console.log("Fetching one recipe from:", url);
      const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          const err = await response.text();
          console.error("Error fetching recipe:", err);
          throw new Error(`Error ${response.status}`);
        }
      const data = (await response.json()) as IRecipe;
    return data;
  };

  fetchComments = async (recipe_id: string): Promise<IComments[]> => {
    const url = `${this.apiUrl}/recipe/graphql/recipes/${recipe_id}/comments`;
    console.log("Fetching comments from:", url);
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("Error fetching comments:", text);
      throw new Error(`Error ${response.status}`);
    }
    const data = await response.json();
    // Esperamos un array con shape IComments[]
    return data as IComments[];
  }
  createComment = async(
    recipeId: string,
    content: string,
    parentId?: string,
    token?: string
  ): Promise<IComments> => {
    const url = `${this.apiUrl}/recipe/graphql/comments_recipes`;
    const payload: any = { recipe_id: recipeId, content };
    if (parentId) payload.parent_id = parentId;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log("CommentService.createComment -> URL:", url, "headers:", headers, "payload:", payload);

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Error createComment:", text);
      throw new Error(`Error ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    return data as IComments;
  }

  fetchUserRecipes = async (userId: string): Promise<IRecipe[]> => {
    const response = await fetch(
      `${this.apiUrl}/graphql/get_recipebyuserNA/${userId}`, // <-- Usando el endpoint correcto sin auth
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const data = await response.json();

    if (data.error) {
      console.error("Error fetching user recipes:", data.error);
      throw new Error(`Error ${data.error}`);
    }

    return data as IRecipe[];
  };

  fetchUserRecipesNA = async (userId: string): Promise<IRecipe[]> => {
    const url = `${
      this.apiUrl
    }/recipe/graphql/get_recipebyuserNA?user_id=${encodeURIComponent(userId)}`;
    console.log("→ Calling GET", url);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error response:", text);
      throw new Error(`Error fetching recipes: ${response.status}`);
    }

    return (await response.json()) as IRecipe[];
  };

  createRecipe = async (
    formData: FormData,
    token: string
  ): Promise<IRecipe> => {
    const res = await fetch(`${this.apiUrl}/recipe/graphql/create_recipe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData, // el navegador añade multipart/form-data con boundary
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error creating recipe:", text);
      throw new Error(`Error ${res.status}`);
    }

    const data_r = await res.json();
    if (data_r.error) {
      console.error("Error creating recipe:", data_r.error);
      throw new Error(`Error ${data_r.error}`);
    }

    return data_r as IRecipe;
  };
    // 1) POST: dar like
  likeRecipe = async(recipeId: string, token?: string): Promise<ILike> => {
    const url = `${this.apiUrl}/recipe/graphql/like_recipe?recipe_id=${recipeId}`;
    const headers: Record<string,string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const resp = await fetch(url, {
      method: "POST",
      headers,
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Error likeRecipe:", text);
      throw new Error(`Error ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    // data debe cumplir shape de ILike
    return data as ILike;
  }

  // 2) DELETE: quitar like
  unlikeRecipe = async (recipeId: string, token?: string): Promise<void> => {
    const url = `${this.apiUrl}/recipe/graphql/unlike_recipe?recipe_id=${recipeId}`;
    const headers: Record<string,string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const resp = await fetch(url, {
      method: "DELETE",
      headers,
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Error unlikeRecipe:", text);
      throw new Error(`Error ${resp.status}: ${text}`);
    }
    // 204 No Content: no devolvemos body
  }

  // 3) GET: número de likes
  getLikesCount = async (recipeId: string): Promise<number> =>{
    const url = `${this.apiUrl}/recipe/graphql/likes_count?recipe_id=${recipeId}`;
    const resp = await fetch(url, {
      method: "GET",
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Error getLikesCount:", text);
      throw new Error(`Error ${resp.status}: ${text}`);
    }
    // El response_model es int, así que JSON.parse resp.json() devolaría un número
    const data = await resp.json();
    // data es un número: 
    return data as number;
  }

  // 4) GET: saber si ya dio like (opcional, si implementaste el endpoint)
    hasLiked = async(recipeId: string, token?: string): Promise<boolean> =>{
    const url = `${this.apiUrl}/recipe/graphql/has_liked?recipe_id=${recipeId}`;
    const headers: Record<string,string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(url, {
      method: "GET",
      headers,
    });
    if (resp.status === 404) {
      // Receta no existe o endpoint devuelve Not Found: tratamos como "no liked"
      console.warn(`hasLiked: receta ${recipeId} no encontrada (404). Devolviendo false.`);
      return false;
    }
    if (!resp.ok) {
      // Otros errores (401, 500, etc): los dejamos lanzar para manejar en la acción
      const text = await resp.text();
      console.error("Error hasLiked:", text);
      throw new Error(`Error ${resp.status}: ${text}`);
    }
    // 200 OK: parseamos boolean
    const data = await resp.json();
    return data as boolean;
  }
}

const recipeService = new RecipeService();
export default recipeService;
