export interface IRecipe {
    id: string;
    title: string;
    prep_time: string;
    images?: string[];
    video?: string;
    portions: number;
    steps: string[];
    description: string;
}



// I moved the QUERY to the service; I think it's better to have it there and not in the interface