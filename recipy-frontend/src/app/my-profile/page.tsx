"use client";
import { useState, useEffect } from "react";
import userServiceClient from "@/services/UserServiceClient";
import { fetchUserRecipes } from "@/lib/actions";

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    biography: "",
    location: "",
    profile_picture: [],
    birth_date: "", // <-- agregar birth_date desde el inicio
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      console.log("Token usado en fetchMyProfile:", token);
      if (!token) return console.error("No hay token disponible.");

      const data = await userServiceClient.getMyProfile(token);
      if (data) {
        setUser(data);
        setFormData({
          biography: data.biography || "",
          location: data.location || "",
          profile_picture: data.profile_picture || [],
          birth_date: data.birth_date || "",
        });

        const result = await fetchUserRecipes(data.id);
        if (result.success) setRecipes(result.recipes);
      } else {
        console.error("No se pudo obtener el perfil:", userServiceClient.error);
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = {
      biography: formData.biography,
      location: formData.location,
      birth_date: formData.birth_date,
      // profile_picture: formData.profile_picture,
    };

    console.log("Enviando a updateMyProfile:", payload);

    const success = await userServiceClient.updateMyProfile(token, payload);
    if (success) {
      setUser((prev) => ({ ...prev, ...payload }));
      setIsEditing(false);
    } else {
      alert("Error al actualizar el perfil.");
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!user) return <p>No se pudo cargar el perfil.</p>;

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
                    {user.profile_picture && user.profile_picture.length > 0 ? (
                      <img
                        src={user.profile_picture[0]}
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
                <div className="ms-3 mt-3 d-flex flex-column">
                  <h5 className="card-title">{user.username}</h5>
                  <p className="opacity-50">
                    Lives in {user.location || "N/A"}
                  </p>
                  <p className="opacity-50">
                    Birth Date: {user.birth_date || "No especificada"}
                  </p>
                </div>
              </div>

              <div className="p-4 card-body d-flex justify-content-end align-items-end">
                <div className="d-flex justify-content-end text-center py-1">
                  <div>
                    <p className="mb-1 h5">{user.recipesCount ?? 0}</p>
                    <p className="small mb-0">Recipes</p>
                  </div>
                  <div className="px-3">
                    <p className="mb-1 h5">{user.followers ?? 0}</p>
                    <p className="small mb-0">Followers</p>
                  </div>
                  <div>
                    <p className="mb-1 h5">{user.following ?? 0}</p>
                    <p className="small mb-0">Following</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body p-4 text-black">
              <div className="text-body">
                <p className="lead card-title mb-1">About Me</p>
                <div className="p-4 card-body">
                  <p>{user.biography || "Sin descripción"}</p>
                  {isEditing ? (
                    <>
                      <textarea
                        name="biography"
                        value={formData.biography}
                        onChange={handleInputChange}
                        className="form-control mb-2"
                        placeholder="Biografía"
                      />
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="form-control mb-2"
                        placeholder="Ubicación"
                      />
                      <input
                        type="date"
                        name="birth_date"
                        value={formData.birth_date}
                        onChange={handleInputChange}
                        className="form-control mb-2"
                        placeholder="Fecha de nacimiento"
                      />
                      {/* Aquí podrías agregar un input para imagen si deseas */}
                      <button
                        className="btn btn-success me-2"
                        onClick={handleSave}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <div className="d-flex flex-column justify-content-end align-items-end">
                      <button
                        className="btn d-flex flex-column justify-content-end align-items-end"
                        onClick={() => setIsEditing(true)}
                      >
                        Editar Perfil
                      </button>
                    </div>
                  )}
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
                        <a
                          href={`/recipe/${recipe.id}`}
                          className="card-title fs-4 fw-bold"
                        >
                          {recipe.title}
                        </a>
                        <div className="mb-1 d-flex justify-content-between">
                          <p>Publicado por: Ti</p>
                          <p>
                            ⏱ {recipe.prep_time} | Porciones: {recipe.portions}
                          </p>
                        </div>
                        <p
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
