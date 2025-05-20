import { IRecipe, GET_RECIPES_QUERY } from '@/interfaces/IRecipe'

class RecipeService {
    private apiUrl : string

    constructor() {
        this.apiUrl = process.env.API_GATEWAY_URL || '' 
        if (this.apiUrl === '') {
            throw new Error('API URL is not defined')
        }
    }

    fetchRecipes = async (): Promise<IRecipe[]> => {
        try {
            const response = await fetch(`${this.apiUrl}/graphql`, {
                cache: 'force-cache',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: GET_RECIPES_QUERY }),
            })

            const result = await response.json()
            if (result.errors) {
                console.error('GraphQL errors:', result.errors)
                throw new Error('Error fetching recipes')
            }

            return result.data.recipes as IRecipe[]
        } catch (error) {
            console.error('Error fetching recipes:', error)
            throw error
        }
    }
}

const recipeService = new RecipeService()
export default recipeService