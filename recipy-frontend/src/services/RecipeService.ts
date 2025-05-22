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

        const data = (await response.json()) as IRecipe[];
        return data;
    };

    fetchUserRecipes = async (): Promise<IRecipe[]> => {
        const response = await fetch(`${this.apiUrl}/recipe/graphql/get_recipebyuser`, {
            method: "GET",
            headers: {
            "Authorization": "usuario123",
            "Content-Type": "application/json",
            },
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data: IRecipe[] = await response.json();
        return data;
        };

    createRecipe = async (data: {
        title: string;
        prep_time: string;
        portions: number;
        steps: string[];
        images?: string[];
        video?: string;
    }): Promise<IRecipe> => {
        const response = await fetch(
        `${this.apiUrl}/recipe/graphql/create_recipe`,
        {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('userId')!  // ó Authorization: Bearer …
            },
            body: JSON.stringify(data),
        }
        );

        if (!response.ok) {
        const text = await response.text();
        console.error('Error creating recipe:', text);
        throw new Error(`Error ${response.status}`);
        }

        return (await response.json()) as IRecipe;
    };

    
}

const recipeService = new RecipeService()
export default recipeService