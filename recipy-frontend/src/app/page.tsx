"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { fetchAllRecipes } from "@/lib/actions";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getPublicProfile } from "@/lib/profileActions";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usernames, setUsernames] = useState({}); // { userId: username }

  // Fetch recipes
  useEffect(() => {
    const getRecipes = async () => {
      const result = await fetchAllRecipes();
      if (result.success) {
        setRecipes(result.recipes);
        await fetchUsernamesForRecipes(result.recipes);
      }
      setLoading(false);
    };
    getRecipes();
  }, []);

  // Fetch usernames for all unique user_ids in recipes
  const fetchUsernamesForRecipes = async (recipes) => {
    const uniqueUserIds = [...new Set(recipes.map((r) => r.user_id))];
    const usernamesMap: Record<number, string> = {};

    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        try {
          const result = await getPublicProfile(userId);
          // Protegemos de que result.profile sea null o username undefined:
          usernamesMap[userId] = result.profile?.username ?? "Desconocido";
        } catch (error) {
          console.error(`Error fetching username for user ${userId}:`, error);
          usernamesMap[userId] = "Desconocido";
        }
      })
    );

    setUsernames(usernamesMap);
  };



  if (loading) return <div>Cargando recetas...</div>;

  return (
    <div className="container mt-4">
      <h1 className="mb-4 fs-2 fw-bold">Recipes</h1>
      <div className="row">
        {recipes
          .slice()
          .reverse()
          .map((recipe) => (
            <div key={recipe.id} className="col-12 mb-4">
              <div className="card h-100 d-flex flex-row shadow-sm">
                {/* Image Section */}
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: "200px",
                    height: "200px",
                    overflow: "hidden",
                  }}
                >
                  {recipe.images && recipe.images.length > 0 ? (
                    <img
                      src={recipe.images[0]}
                      alt={recipe.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      className="bg-secondary text-white d-flex align-items-center justify-content-center"
                      style={{ width: "100%", height: "100%" }}
                    >
                      Sin imagen
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="card-body d-flex flex-column">
                  <Link
                    href={`/recipe/${recipe.id}`}
                    className="card-title fs-4 fw-bold"
                  >
                    {recipe.title}
                  </Link>
                  <div className="card-body mb-1 d-flex justify-content-between">
                    <p>
                      Publicado por:{" "}
                      <Link
                        style={{ color: "#DDBCE5" }}
                        href={`/profile/${recipe.user_id}`}
                      >
                        {usernames[recipe.user_id] || "Cargando..."}
                      </Link>
                    </p>
                    <p>
                      ⏱ {recipe.prep_time} | Porciones: {recipe.portions}
                    </p>
                  </div>
                  <p
                    className="card-body"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {recipe.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
