import { IRecipe } from '@/interfaces/IRecipe'

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
            console.log("ehis is the urlk",this.apiUrl)
            const response = await fetch(`${this.apiUrl}/recipe/graphql`, {
                next: { revalidate:5 }, // Cache just after 5 seconds
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: `
                    query {
                        recipes {
                            id
                            title
                            prepTime
                            images
                            video
                            portions
                            steps
                        }
                    }
                `
                }),
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