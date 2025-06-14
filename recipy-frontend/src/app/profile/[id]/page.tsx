"use client";

import { useAuth } from "@/context/authContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import userService from "@/services/UserService";

export default function ProfilePage() {
  const { isLoggedIn, userId } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      router.push("/login");
      return;
    }
    const fetchProfile = async () => {
      try {
        const data = await userService.getPublicProfile(userId);
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isLoggedIn, userId, router]);

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
                <button
                  type="button"
                  className="btn w-auto align-self-start"
                  style={{ zIndex: 1 }}
                  onClick={() => router.push('/edit-profile')}
                >
                  Edit profile
                </button>
              </div>
              <div className="d-flex justify-content-end text-center py-1 text-body">
                <div>
                  <p className="mb-1 h5">{profile.photosCount ?? 0}</p>
                  <p className="small text-muted mb-0">Photos</p>
                </div>
                <div className="px-3">
                  <p className="mb-1 h5">{profile.followers ?? 0}</p>
                  <p className="small text-muted mb-0">Followers</p>
                </div>
                <div>
                  <p className="mb-1 h5">{profile.following ?? 0}</p>
                  <p className="small text-muted mb-0">Following</p>
                </div>
              </div>
            </div>
            <div className="card-body p-4 text-black">
              <div className="mb-5 text-body">
                <p className="lead fw-normal mb-1">About</p>
                <div className="p-4 bg-body-tertiary">
                  <p className="font-italic mb-1">{profile.bio || "Sin descripción"}</p>
                  <p className="font-italic mb-1">Lives in {profile.location || "N/A"}</p>
                  <p className="font-italic mb-0">{profile.occupation || "Sin ocupación"}</p>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4 text-body">
                <p className="lead fw-normal mb-0">Recent photos</p>
                <p className="mb-0">
                  <a href="#!" className="text-muted">Show all</a>
                </p>
              </div>
              <div className="row g-2">
                {Array.isArray(profile.photos) && profile.photos.length > 0 ? (
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
