"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { fetchAllRecipes } from "@/lib/actions";

import { useEffect, useState } from "react";

export default function RecipesPage() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getRecipes = async () => {
            const result = await fetchAllRecipes();
            if (result.success) {
                setRecipes(result.recipes);
            }
            setLoading(false);
        };
        getRecipes();
    }, []);

    if (loading) return <div>Cargando recetas...</div>;

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
    );
}

