export interface IRecipe {
    id: string;
    title: string;
    prepTime: string;
    images?: string[];
    video?: string;
    portions: number;
    steps: string[];
}

// I moved the QUERY to the service; I think it's better to have it there and not in the interface