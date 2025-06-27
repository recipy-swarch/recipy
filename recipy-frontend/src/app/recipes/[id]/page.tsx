"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import Image from "next/image";
import {
  fetchRecipe,
  fetchComments,
  createComment,
  fetchLikesCount,
  fetchHasLiked,
  likeRecipe,
  unlikeRecipe,
} from "@/lib/actions";
import { IRecipe, IComments } from "@/lib/types";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function RecipeDetailPage() {
  const router = useRouter();
  const path = usePathname();
  const recipeId = path?.split("/").pop();

  const [recipe, setRecipe] = useState<IRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<IComments[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [newCommentContent, setNewCommentContent] = useState("");
  const [loadingCreatingComment, setLoadingCreatingComment] = useState(false);
  const [createCommentError, setCreateCommentError] = useState<string | null>(
    null
  );

  const [replyToId, setReplyToId] = useState<string | null>(null);

  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [loadingLikeAction, setLoadingLikeAction] = useState<boolean>(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  const parseSteps = (stepsData: any): string[] => {
    if (Array.isArray(stepsData)) return stepsData;
    if (typeof stepsData === "string") {
      try {
        const parsed = JSON.parse(stepsData);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    if (!recipeId) return;
    setLoading(true);
    fetchRecipe(recipeId)
      .then((res) => {
        if (res.success) {
          setRecipe(res.recipes);
          setError(null);
        } else {
          setError("No se pudo cargar la receta.");
          setRecipe(null);
        }
      })
      .catch(() => {
        setError("No se pudo cargar la receta.");
        setRecipe(null);
      })
      .finally(() => setLoading(false));
  }, [recipeId]);

  useEffect(() => {
    if (!recipe) return;
    setLoadingComments(true);
    fetchComments(recipe.id)
      .then((res) => {
        if (res.success) {
          setComments(res.comments);
          setCommentsError(null);
        } else {
          setComments([]);
          setCommentsError("No se pudieron cargar los comentarios.");
        }
      })
      .catch(() => {
        setComments([]);
        setCommentsError("Error inesperado cargando comentarios.");
      })
      .finally(() => setLoadingComments(false));
  }, [recipe]);

  useEffect(() => {
    if (!recipe) return;
    const token = getAuthToken();

    fetchLikesCount(recipe.id)
      .then((res) => res.success && setLikesCount(res.count))
      .catch(console.error);

    if (token) {
      fetchHasLiked(recipe.id, token).then((res) => {
        if (res.success) setHasLiked(res.hasLiked);
      });
    }
  }, [recipe]);

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipe) return;

    const content = newCommentContent.trim();
    if (!content) {
      setCreateCommentError("El comentario no puede estar vacío.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setCreateCommentError("Debes iniciar sesión para comentar.");
      router.push("/login");
      return;
    }

    setLoadingCreatingComment(true);
    const res = await createComment(
      recipe.id,
      content,
      replyToId ?? undefined,
      token
    );
    if (res.success) {
      setNewCommentContent("");
      setReplyToId(null);
      try {
        const fres = await fetchComments(recipe.id);
        if (fres.success) setComments(fres.comments);
      } catch {
        setComments((prev) => [res.comment, ...prev]);
      }
    } else {
      const msg = (res.error as any)?.message || String(res.error);
      if (msg.includes("401")) {
        setCreateCommentError("Sesión inválida. Inicia sesión nuevamente.");
        localStorage.removeItem("token");
        router.push("/login");
      } else if (msg.includes("400")) {
        setCreateCommentError("Datos inválidos para el comentario.");
      } else {
        setCreateCommentError("Error al comentar. Intenta nuevamente.");
      }
    }
    setLoadingCreatingComment(false);
  };

  const handleToggleLike = async () => {
    if (!recipe) return;
    const token = getAuthToken();
    if (!token) {
      setLikeError("Debes iniciar sesión para dar like.");
      return;
    }

    setLoadingLikeAction(true);
    setLikeError(null);

    const res = hasLiked
      ? await unlikeRecipe(recipe.id, token)
      : await likeRecipe(recipe.id, token);

    if (res.success) {
      setHasLiked(!hasLiked);
      setLikesCount((prev) => prev + (hasLiked ? -1 : 1));
    } else {
      const msg = res.error?.message || "";
      if (msg.includes("401")) {
        setLikeError("Sesión inválida. Inicia sesión nuevamente.");
      } else {
        setLikeError("No se pudo actualizar el like.");
      }
    }

    setLoadingLikeAction(false);
  };

  if (loading) return <div className="container py-5">Cargando receta…</div>;
  if (error || !recipe)
    return (
      <div className="container py-5">
        <p className="text-danger mb-3">{error || "Receta no encontrada."}</p>
      </div>
    );

  const parsedSteps = parseSteps(recipe.steps);

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between">
        <h1 className="h2 fw-bold mb-4 card-title">{recipe.title}</h1>
        <div className="mb-5">
          <div className="d-flex align-items-center gap-3">
            {likeError && <p className="text-danger mt-2">{likeError}</p>}
            <span className="card-title">
              {likesCount} {likesCount === 1 ? "like" : "likes"}
            </span>
            <button
              onClick={handleToggleLike}
              disabled={loadingLikeAction}
              className={`btn ${hasLiked ? "btn" : "btn"}`}
            >
              {loadingLikeAction
                ? hasLiked
                  ? "Quitando..."
                  : "Dando like..."
                : hasLiked
                ? "Ya no me gusta"
                : "Me gusta"}
            </button>
          </div>
        </div>
      </div>

      {recipe.images?.length ? (
        <div
          className="mb-4 text-center"
          style={{ height: "300px", overflow: "hidden" }}
        >
          <Image
            src={recipe.images[0]}
            alt={recipe.title}
            width={800}
            height={400}
            className="img-fluid rounded shadow mx-auto d-block"
            style={{ objectFit: "cover", height: "100%", width: "100%" }}
          />
        </div>
      ) : recipe.video ? (
        <div className="mb-4">
          <video
            src={recipe.video}
            controls
            className="w-100 rounded shadow"
            style={{ maxHeight: "400px" }}
          />
        </div>
      ) : (
        <div
          className=" d-flex align-items-center justify-content-center rounded mb-4"
          style={{ height: "200px" }}
        >
          <span className="card-title">Sin imagen ni video</span>
        </div>
      )}

      <div className="d-flex justify-content-between mb-4 card-title">
        <p>⏱ Tiempo: {recipe.prep_time} min</p>
        <p>🍽 Porciones: {recipe.portions}</p>
      </div>

      <div className="mb-5 card">
        <div className="card-body">
          <h2 className="h4 mb-3 card-title">Descripción</h2>
          <p>{recipe.description}</p>
        </div>
      </div>

      <div className="mb-5 card">
        <div className="card-body">
          <h2 className="h4 mb-3 card-title">Pasos</h2>
          <ol className="list-group list-group-numbered gap-2">
            {parsedSteps.map((step, i) => (
              <li key={i} className="list-group-item">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mb-5">
        <h2 className="h4 mb-3 card-title">Comentarios</h2>
        <form onSubmit={handleSubmitComment} className="mb-4">
          {replyToId && (
            <div className="mb-2">
              <span className="text-muted small me-2">
                Respondiendo al comentario {replyToId.slice(-4)}...
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => setReplyToId(null)}
              >
                Cancelar
              </button>
            </div>
          )}
          <div className="mb-2">
            <textarea
              className="form-control"
              rows={3}
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="Escribe tu comentario..."
              disabled={loadingCreatingComment}
            />
          </div>
          {createCommentError && (
            <p className="text-danger small">{createCommentError}</p>
          )}
          <button
            type="submit"
            className="btn"
            disabled={loadingCreatingComment}
          >
            {loadingCreatingComment ? "Enviando..." : "Enviar comentario"}
          </button>
        </form>

        {loadingComments ? (
          <p>Cargando comentarios…</p>
        ) : commentsError ? (
          <p className="text-danger">{commentsError}</p>
        ) : comments.length === 0 ? (
          <p className="text-muted">No hay comentarios aún.</p>
        ) : (
          <ul className="list-unstyled">
            {comments.map((c) => (
              <li key={c.id} className="comment-card mb-3 p-3">
                <p className="small comment-text mb-1">
                  Usuario: {c.user_id} •{" "}
                  <span className="fst-italic">
                    {new Date(c.created_at).toLocaleString("es-CO")}
                  </span>
                </p>
                <p>{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
