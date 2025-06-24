"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchRecipe } from "@/lib/actions";

export default function RecipeDetailPage() {
  const router = useRouter();
  const path = usePathname();
  const recipeId = path.split("/").pop()!;

  const [recipe, setRecipe] = useState<IRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId) return;

    setLoading(true);
    fetchRecipe(recipeId)
      .then((result) => {
        if (result.success) {
          setRecipe(result.recipes); // 👈 Aquí sí seteamos sólo la receta (IRecipe)
          setError(null);
        } else {
          setError("No se pudo cargar la receta.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("No se pudo cargar la receta.");
      })
      .finally(() => setLoading(false));
  }, [recipeId]);

  if (loading) {
    return <div className="p-4">Cargando receta…</div>;
  }

  if (error || !recipe) {
    return (
      <div className="p-4">
        <p className="text-red-500 mb-4">{error || "Receta no encontrada."}</p>
        <button
          className="px-4 py-2 bg-gray-200 rounded"
          onClick={() => router.back()}
        >
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <button
        className="mb-6 text-sm text-blue-600 hover:underline"
        onClick={() => router.back()}
      >
        ← Volver
      </button>

      <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>

      {/* Image / Video */}
      {recipe.images?.length > 0 ? (
        <div className="w-full h-[400px] relative mb-6">
          <Image
            src={recipe.images[0]}
            alt={recipe.title}
            fill
            className="object-cover rounded-lg shadow"
          />
        </div>
      ) : recipe.video ? (
        <video
          src={recipe.video}
          controls
          className="w-full h-[400px] mb-6 rounded-lg shadow"
        />
      ) : (
        <div className="w-full h-[200px] bg-gray-200 flex items-center justify-center rounded-lg mb-6">
          <span className="text-gray-500">Sin imagen ni video</span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between mb-6">
        <p>⏱ Tiempo: {recipe.prep_time} min</p>
        <p>🍽 Porciones: {recipe.portions}</p>
      </div>

      {/* Description */}
      <section className="prose mb-8">
        <h2>Descripción</h2>
        <p>{recipe.description}</p>
      </section>

      {/* Steps */}
      <section className="prose mb-8">
        <h2>Pasos</h2>
        <ol className="list-decimal list-inside">
          {(recipe.steps ?? []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="flex space-x-4">
        <Link
          href={`/recipe/${recipe.id}/comments`}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Ver comentarios
        </Link>
        <Link
          href={`/recipe/${recipe.id}/likes`}
          className="px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
        >
          Ver likes
        </Link>
      </div>
    </div>
  );
}
