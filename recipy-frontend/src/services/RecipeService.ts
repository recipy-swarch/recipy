
import { IRecipe} from '@/interfaces/IRecipe'

class RecipeService {
    private apiUrl : string

    constructor() {
        this.apiUrl = process.env.API_GATEWAY_URL || '' 
        if (this.apiUrl === '') {
            throw new Error('API URL is not defined')
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

    createRecipe = async (data: {
        title: string;
        prep_time: string;
        portions: number;
        steps: string[];
        images?: string[];
        video?: string;
    }, token: string): Promise<IRecipe> => {
        
        console.log("Creating recipe with data:", this.apiUrl, data);
        const response = await fetch(
            `${this.apiUrl}/recipe/graphql/create_recipe`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            }
        );

        if (!response.ok) {
            const text = await response.text();
            console.error('Error creating recipe:', text);
            throw new Error(`Error ${response.status}`);
        }

        const data_r = await response.json();

        if (data_r.error) {
            console.error('Error creating recipe:', data_r.error);
            throw new Error(`Error ${data_r.error}`);
        }

        return (await response.json()) as IRecipe;
    };

    
}

const recipeService = new RecipeService()
export default recipeService