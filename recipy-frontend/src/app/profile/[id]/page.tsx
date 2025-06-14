"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import userService from "@/services/UserService";
import { useAuth } from "@/context/authContext";

export default function ProfilePage() {
  const { userId: loggedInUserId } = useAuth(); // el userId del usuario autenticado
  const params = useParams(); // Obtiene los params dinámicos de la ruta

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  

  // El id del perfil que se quiere ver (propio o de otro user)
  const viewedUserId = params?.id ? parseInt(params.id as string) : loggedInUserId;


  const fetchProfile = async () => {
  try {
    const data = await userService.getPublicProfile(viewedUserId);
    console.log("Respuesta de getPublicProfile:", data);
    setProfile(data);
  } catch (error) {
    console.error("Error fetching profile:", error);
  } finally {
    setLoading(false);
  }

  console.log("params.id:", params.id);
  console.log("loggedInUserId:", loggedInUserId);
  console.log("viewedUserId:", viewedUserId);
};

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getPublicProfile(viewedUserId);
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [viewedUserId]);

  if (loading) return <p>Cargando perfil...</p>;
  if (!profile) return <p>No se pudo cargar el perfil.</p>;

  return (
    <div className="container py-5 h-100">
      <div className="row d-flex justify-content-center">
        <div className="col col-lg-11 col-xl-11">
          <div className="card">
            <div className="p-4 d-flex justify-content-between">
              <div className="d-flex flex-column">
                <div className="user">
                  <h5>{profile.username}</h5>
                  <p>{profile.location || "Sin ubicación"}</p>
                </div>
                {/* Solo muestra "Editar perfil" si es el usuario logueado */}
                {viewedUserId === loggedInUserId && (
                  <button
                    type="button"
                    className="btn w-auto align-self-start"
                    style={{ zIndex: 1 }}
                  >
                    Editar perfil
                  </button>
                )}
              </div>
              <div className="d-flex justify-content-end text-center py-1 text-body">
                <div>
                  <p className="mb-1 h5">{profile.photosCount || 0}</p>
                  <p className="small text-muted mb-0">Fotos</p>
                </div>
                <div className="px-3">
                  <p className="mb-1 h5">{profile.followers || 0}</p>
                  <p className="small text-muted mb-0">Seguidores</p>
                </div>
                <div>
                  <p className="mb-1 h5">{profile.following || 0}</p>
                  <p className="small text-muted mb-0">Siguiendo</p>
                </div>
              </div>
            </div>
            <div className="card-body p-4 text-black">
              <div className="mb-5 text-body">
                <p className="lead fw-normal mb-1">Acerca de</p>
                <div className="p-4 bg-body-tertiary">
                  <p className="font-italic mb-1">{profile.bio || "Sin descripción"}</p>
                  <p className="font-italic mb-1">Vive en {profile.location || "N/A"}</p>
                  <p className="font-italic mb-0">{profile.occupation || "Sin ocupación"}</p>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4 text-body">
                <p className="lead fw-normal mb-0">Fotos recientes</p>
                <p className="mb-0">
                  <a href="#!" className="text-muted">Ver todas</a>
                </p>
              </div>
              <div className="row g-2">
                {profile.photos && profile.photos.length > 0 ? (
                  profile.photos.map((photo: string, idx: number) => (
                    <div className="col mb-2" key={idx}>
                      <img
                        src={photo}
                        alt={`Photo ${idx}`}
                        className="w-100 rounded-3"
                      />
                    </div>
                  ))
                ) : (
                  <p>No hay fotos recientes.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
