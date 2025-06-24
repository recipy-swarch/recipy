"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchRecipe, fetchComments, fetchLikesCount, fetchHasLiked, likeRecipe, unlikeRecipe } from "@/lib/actions";
import { IRecipe, IComments, ILike } from "@/lib/types";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export default function RecipeDetailPage() {
  const router = useRouter();
  const path = usePathname();
  const recipeId = path?.split("/").pop();

  const [recipe, setRecipe] = useState<IRecipe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<IComments[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [loadingLikeAction, setLoadingLikeAction] = useState<boolean>(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // Cargar receta
  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);
    fetchRecipe(recipeId)
      .then((res) => {
        if (res.success) {
          setRecipe(res.recipes);
          setError(null);
        } else {
          console.error(res.error);
          setError("No se pudo cargar la receta.");
          setRecipe(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("No se pudo cargar la receta.");
        setRecipe(null);
      })
      .finally(() => setLoading(false));
  }, [recipeId]);

  // Cargar comentarios al tener receta
  useEffect(() => {
    if (!recipe) return;
    setLoadingComments(true);
    fetchComments(recipe.id)
      .then((res) => {
        if (res.success) {
          setComments(res.comments);
          setCommentsError(null);
        } else {
          console.error(res.error);
          setComments([]);
          setCommentsError("No se pudieron cargar los comentarios.");
        }
      })
      .catch((err) => {
        console.error(err);
        setComments([]);
        setCommentsError("Error inesperado cargando comentarios.");
      })
      .finally(() => setLoadingComments(false));
  }, [recipe]);
 // 3) Cargar likesCount y estado hasLiked
  useEffect(() => {
    if (!recipe) return;
    // Obtener token actual
    const token = getAuthToken();
    // 3a) count
    fetchLikesCount(recipe.id)
      .then(res => {
        if (res.success) {
          setLikesCount(res.count);
        } else {
          console.error(res.error);
          // podríamos dejar 0 o no modificar
        }
      })
      .catch(err => console.error(err));
    // 3b) estado “ya dio like?” (si implementaste endpoint)
    if (token) {
      fetchHasLiked(recipe.id, token)
        .then(res => {
          if (res.success) {
            setHasLiked(res.hasLiked);
          } else {
            console.error(res.error);
            // Dejar false por defecto
          }
        })
        .catch(err => {
          console.error(err);
          // dejar false
        });
    }
  }, [recipe]);

  // Handler para toggle like/unlike
  const handleToggleLike = async () => {
    if (!recipe) return;
    const token = getAuthToken();
    if (!token) {
      // Si no hay token, redirigir a login o mostrar mensaje
      setLikeError("Debes iniciar sesión para dar like.");
      return;
    }
    setLoadingLikeAction(true);
    setLikeError(null);
    if (!hasLiked) {
      // Dar like
      const res = await likeRecipe(recipe.id, token);
      if (res.success) {
        setHasLiked(true);
        setLikesCount(prev => prev + 1);
      } else {
        console.error(res.error);
        // Podría ser status 409 (ya liked) u otro error
        if (res.error?.message?.includes("409")) {
          setHasLiked(true);
        } else if (res.error?.message?.includes("401")) {
          setLikeError("Sesión inválida. Vuelve a iniciar sesión.");
        } else {
          setLikeError("No se pudo dar like. Intenta nuevamente.");
        }
      }
    } else {
      // Quitar like
      const res = await unlikeRecipe(recipe.id, token);
      if (res.success) {
        setHasLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        console.error(res.error);
        if (res.error?.message?.includes("404")) {
          // No existía: forzar estado a false
          setHasLiked(false);
        } else if (res.error?.message?.includes("401")) {
          setLikeError("Sesión inválida. Vuelve a iniciar sesión.");
        } else {
          setLikeError("No se pudo quitar el like. Intenta nuevamente.");
        }
      }
    }
    setLoadingLikeAction(false);
  };

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
    <div className="container mx-auto p-6 space-y-6">
      <button
        className="mb-6 text-sm text-blue-600 hover:underline"
        onClick={() => router.back()}
      >
        ← Volver
      </button>

      <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>

      {/* Imagen o video */}
      {recipe.images && recipe.images.length > 0 ? (
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

      {/* Descripción */}
      <section className="prose mb-8">
        <h2>Descripción</h2>
        <p>{recipe.description}</p>
      </section>

      {/* Pasos */}
      <section className="prose mb-8">
        <h2>Pasos</h2>
        <ol className="list-decimal list-inside">
          {(recipe.steps ?? []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
{/* Sección de Likes */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Likes</h2>
        <div className="flex items-center space-x-4">
          {/* Botón Toggle Like */}
          <button
            onClick={handleToggleLike}
            disabled={loadingLikeAction}
            className={
              "px-4 py-2 rounded-lg font-medium " +
              (hasLiked
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white")
            }
          >
            {loadingLikeAction
              ? (hasLiked ? "Quitando..." : "Dando like...")
              : hasLiked
              ? "Ya no me gusta"
              : "Me gusta"}
          </button>
          {/* Mostrar count */}
          <span className="text-gray-700 dark:text-gray-300">
            {likesCount} {likesCount === 1 ? "like" : "likes"}
          </span>
        </div>
        {likeError && (
          <p className="mt-2 text-red-500">{likeError}</p>
        )}
      </section>


      {/* Comentarios inline */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Comentarios</h2>
        {loadingComments ? (
          <p>Cargando comentarios…</p>
        ) : commentsError ? (
          <p className="text-red-500">{commentsError}</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-600">No hay comentarios aún.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="text-black border rounded-lg p-4 bg-white shadow-sm">
                <p className="text-black text-sm text-gray-500 mb-2">
                  Usuario: {c.user_id} •{' '}
                  <span className="text-black italic text-gray-400">
                    {new Date(c.created_at).toLocaleString('es-CO')}
                  </span>
                </p>
                <p className="text-base">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Botón para likes u otras acciones */}
      <div className="flex space-x-4">
      </div>
    </div>
  );
}
