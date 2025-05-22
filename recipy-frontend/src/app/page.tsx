
import recipeService from '@/services/RecipeService'
import styles from "./page.module.css";
import Link from "next/link";
        
export default async function RecipesPage() {
    const recipes = await recipeService.fetchUserRecipes()

    return (
        <div className="container mt-4">
            <h1 className="mb-4">Recipes</h1>
            <div className="row">
                {recipes.map((recipe) => (
                    <div key={recipe.id} className="col-12 mb-4">
                        <div className="card h-100">
                            <div className="card-body">
                                <h5 className="card-title">{recipe.title}</h5>
                                <p className="card-text">Time: {recipe.prepTime}</p>
                                <p className="card-text">Steps: {recipe.steps}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

