export interface IRecipe {
    id: string;
    title: string;
    prepTime: string;
    images?: string[];
    video?: string;
    portions: number;
    steps: string[];
}

export const GET_RECIPES_QUERY = `
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