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
  <h1 className="mb-4 fs-2 fw-bold">Recipes</h1>
  <div className="row">
    {recipes.slice().reverse().map((recipe) => (
      <div key={recipe.id} className="col-12 mb-4">
        <div className="card h-100 d-flex flex-row shadow-sm">
          {/* Image Section */}
          <div className="d-flex align-items-center justify-content-center" style={{ width: '200px', height: '200px', overflow: 'hidden' }}>
            {recipe.images && recipe.images.length > 0 ? (
              <img
                src={recipe.images[0]}
                alt={recipe.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="bg-secondary text-white d-flex align-items-center justify-content-center" style={{ width: '100%', height: '100%' }}>
                Sin imagen
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="card-body d-flex flex-column">
            <h5 className="card-title fs-4 fw-bold">{recipe.title}</h5>
            <p className=".card-body mb-1">⏱ {recipe.prep_time} | Porciones: {recipe.portions}</p>
            <p className=".card-body" style={{
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {recipe.description}
            </p>
            <Link href={`/recipe/${recipe.id}`} className="mt-auto btn btn-primary align-self-start">Ver receta</Link>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
    );
}

