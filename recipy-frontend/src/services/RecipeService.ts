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

    // Helper que lee un File y devuelve sólo el payload Base64
    private readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // reader.result = "data:<mime>;base64,<BASE64…>"
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
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
        if (typeof obj.steps === 'string') {
            try { obj.steps = JSON.parse(obj.steps); } catch {}
        }
        return obj;
    }

    createRecipe = async (formData: FormData, token: string): Promise<IRecipe> => {
        const dataObj = await this.formDataToJson(formData);
        console.log("Body JSON listo:", dataObj);
        const res = await fetch(`${this.apiUrl}/recipe/graphql/create_recipe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dataObj),
        });

        console.log("Response:", res);

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