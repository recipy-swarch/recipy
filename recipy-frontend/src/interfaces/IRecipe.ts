export interface IRecipe {
    id: string;
    title: string;
    prepTime: string;
    images?: string[];
    video?: string;
    portions: number;
    steps: string[];
}

// Moví el QUERY al servicio, creo que es mejor tenerlo ahí y no en la interfaz