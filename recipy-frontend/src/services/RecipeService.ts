import { IRecipe } from "@/interfaces/IRecipe";

class RecipeService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.WAF_URL || "";
    console.log("API (cliente) apuntando a:", this.apiUrl);
    if (!this.apiUrl) {
      throw new Error("WAF_URL no está definido");
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

  createRecipe = async (formData: FormData, token: string): Promise<IRecipe> => {
    const res = await fetch(`${this.apiUrl}/recipe/graphql/create_recipe`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData, // el navegador añade multipart/form-data con boundary
    });
    
    if (!res.ok) {
        const text = await res.text();
        console.error('Error creating recipe:', text);
        throw new Error(`Error ${res.status}`);
    }
    
    const data_r = await res.json();
    if (data_r.error) {
        console.error('Error creating recipe:', data_r.error);
        throw new Error(`Error ${data_r.error}`);
    }
    
    return data_r as IRecipe;
  };
}

const recipeService = new RecipeService();
export default recipeService;
