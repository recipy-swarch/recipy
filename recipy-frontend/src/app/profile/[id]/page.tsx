"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import userService from "@/services/UserService";
import { useAuth } from "@/context/authContext";
import Link from "next/link";

import { fetchUserRecipes } from "@/lib/actions";

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getPublicProfile(Number(id));
        console.log("Perfil recibido:", data);
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id]);

  useEffect(() => {
    const getRecipes = async () => {
      if (id) {
        const result = await fetchUserRecipes(Number(id));
        console.log(id);
        if (result.success) {
          setRecipes(result.recipes);
        }
        setLoading(false);
      }
    };
    getRecipes();
  }, [id]);

  if (loading) return <div>Cargando...</div>;

  if (!profile) return <p>No se pudo cargar el perfil.</p>;

  return (
    <div className="container py-5 h-100">
      <div className="row d-flex justify-content-center">
        <div className="col col-lg-11 col-xl-10">
          <div className="card">
            <div
              className="rounded-top text-white d-flex flex-row justify-content-between"
              style={{ backgroundColor: "#201A1D", height: "200px" }}
            >
              <div className="d-flex">
                <div className="d-flex flex-column" style={{ width: "200px" }}>
                  {/* Image Section */}
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: "200px",
                      height: "200px",
                    }}
                  >
                    {profile.profile_picture &&
                    profile.profile_picture.length > 0 ? (
                      <img
                        src={profile.profile_picture[0]}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        className="bg-secondary text-white d-flex align-items-center justify-content-center"
                        style={{
                          width: "200px",
                          height: "200px",
                        }}
                      >
                        Sin imagen
                      </div>
                    )}
                  </div>
                </div>
                <div className="ms-3 mt-3 d-flex flex-column ">
                  <h5 className="card-title">{profile.username}</h5>
                  <p className="opacity-50">
                    Lives in {profile.location || "N/A"}
                  </p>
                </div>
              </div>

              <div className="p-4 card-body d-flex justify-content-end align-items-end">
                <div className="d-flex justify-content-end text-center py-1">
                  <div>
                    <p className="mb-1 h5">{profile.recipesCount ?? 0}</p>
                    <p className="small  mb-0">Recipes</p>
                  </div>
                  <div className="px-3">
                    <p className="mb-1 h5">{profile.followers ?? 0}</p>
                    <p className="small mb-0">Followers</p>
                  </div>
                  <div>
                    <p className="mb-1 h5">{profile.following ?? 0}</p>
                    <p className="small mb-0">Following</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Texto y botón fuera del área negra */}
            {/* <div
              className="ms-4 mt-2 d-flex flex-column"
              style={{ width: "200px" }}
            >
              <button
                type="button"
                className="btn btn-outline-dark text-body"
                style={{ zIndex: 1 }}
              >
                Edit profile
              </button>
            </div> */}

            <div className="card-body p-4 text-black">
              <div className="mb-5 text-body">
                <p className="lead card-title mb-1">About</p>
                <div className="p-4 card-body">
                  {profile.biography || "Sin descripción"}
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex flex-column pt-5">
            <div className="d-flex justify-content-between align-items-center mb-4 text-body">
              <h4 className="card-title">Your recipes</h4>
            </div>

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
                        <div className=".card-body mb-1 d-flex justify-content-between">
                          <p>
                            Publicado por:{" "}
                            <Link
                              style={{ color: "#DDBCE5" }}
                              href={`/profile/${recipe.user_id}`}
                            >
                              {recipe.user_id}
                            </Link>
                          </p>
                          <p>
                            ⏱ {recipe.prep_time} | Porciones: {recipe.portions}
                          </p>
                        </div>
                        <p
                          className=".card-body"
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
        </div>
      </div>
    </div>
  );
}
