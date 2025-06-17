import { IRecipe} from '@/interfaces/IRecipe'

class RecipeService {
    private apiUrl : string

    constructor() {
        // NEXT_PUBLIC_API_GATEWAY_URL ya está expuesta al bundle cliente
        this.apiUrl = process.env.API_GATEWAY_URL || ''
        console.log("API (cliente) apuntando a:", this.apiUrl)
        if (!this.apiUrl) {
            throw new Error('NEXT_PUBLIC_API_GATEWAY_URL no está definido')
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
            console.error('Error creating recipe:', data.error);
            throw new Error(`Error ${data.error}`);
        }

        return data as IRecipe[];
    };

    fetchUserRecipes = async (): Promise<IRecipe[]> => {
        const response = await fetch(`${this.apiUrl}/recipe/graphql/get_recipebyuser`, {
            method: "GET",
            headers: {
            "Authorization": "Bearer token",
            "Content-Type": "application/json",
            },
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Error creating recipe:', data.error);
            throw new Error(`Error ${data.error}`);
        }

        return data as IRecipe[];
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

const recipeService = new RecipeService()
export default recipeService