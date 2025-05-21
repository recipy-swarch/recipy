import { IRecipe} from '@/interfaces/IRecipe'

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
    createrecipe = async (formData: FormData): Promise<void> => {
        try {
            const response = await fetch(`${this.apiUrl}/recipe/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `
                        mutation AddRecipe($title: String!,$prepTime: String!,$portions: Int!, $steps: [String!]!){
                            addRecipe(
                                recipe: {
                                title: $title
                                prepTime: $prepTime
                                portions: $portions
                                steps: $steps
                                }
                            ) {
                                id
                                title
                                prepTime
                                portions
                                steps
                            }
                        }

                    `,
                    variables: {
                       
                        title: formData.get('title'),
                        prepTime: formData.get('prep_time'),
                        portions: Number(formData.get('portions')),
                        steps: JSON.parse(formData.get('steps') as string),
                        
                    },
                }),
            })

            if (!response.ok) {
                const text = await response.text()
                console.error('Error response:', text)
                throw new Error('Error creating recipe')
            }

            const result = await response.json()
            if (result.errors) {
                console.error('GraphQL errors:', result.errors)
                throw new Error(result.errors[0]?.message || 'Error creating recipe')
            }
        } catch (error) {
            console.error('Error creating recipe:', error)
            throw error
        }
    }
    
}

const recipeService = new RecipeService()
export default recipeService