import { IRecipe } from "@/interfaces/IRecipe";

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

  private async readFileAsBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  }

  private async formDataToJson(formData: FormData) {
    const obj: any = {};
    const images: string[] = [];
    for (const [key, val] of formData.entries()) {
      if (val instanceof File) {
        images.push(await this.readFileAsBase64(val));
      } else {
        obj[key] = val;
      }
    }
    // El Gateway espera un campo `images: string[]`
    if (images.length) obj.images = images;
    // parsea steps si viene como JSON string
    if (typeof obj.steps === "string") {
      try {
        obj.steps = JSON.parse(obj.steps);
      } catch {}
    }
    return obj;
  }

  createRecipe = async (
    formData: FormData,
    token: string
  ): Promise<IRecipe> => {
    const dataObj = await this.formDataToJson(formData);
    console.log("Body JSON listo:", dataObj);
    const res = await fetch(`${this.apiUrl}/recipe/graphql/create_recipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dataObj),
    });

    console.log("Response:", res);

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
}

const recipeService = new RecipeService();
export default recipeService;
