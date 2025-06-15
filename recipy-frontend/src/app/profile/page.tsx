"use client";

import { useAuth } from "@/context/authContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <p>Redirigiendo a login...</p>; // mientras redirige
  }

  return (
    <div className="container py-5 h-100">
      <div className="row d-flex justify-content-center">
        <div className="col col-lg-11 col-xl-11">
          <div className="card">
            <div className="p-4 d-flex justify-content-between">
              <div
                className="d-flex flex-column"
              >
                <div className="user">
                  <h5>Andy Hsssssssssssssssssorwitz</h5>
                  <p>New York</p>
              </div>
                <button
                  type="button"
                  data-mdb-button-init
                  data-mdb-ripple-init
                  className="btn w-auto align-self-start"
                  data-mdb-ripple-color="dark"
                  style={{ zIndex: 1 }}
                >
                  Edit profile
                </button>
              </div>
              <div className="d-flex justify-content-end text-center py-1 text-body">
                <div>
                  <p className="mb-1 h5">253</p>
                  <p className="small text-muted mb-0">Photos</p>
                </div>
                <div className="px-3">
                  <p className="mb-1 h5">1026</p>
                  <p className="small text-muted mb-0">Followers</p>
                </div>
                <div>
                  <p className="mb-1 h5">478</p>
                  <p className="small text-muted mb-0">Following</p>
                </div>
              </div>
            </div>
            <div className="card-body p-4 text-black">
              <div className="mb-5 text-body">
                <p className="lead fw-normal mb-1">About</p>
                <div className="p-4 bg-body-tertiary">
                  <p className="font-italic mb-1">Web Developer</p>
                  <p className="font-italic mb-1">Lives in New York</p>
                  <p className="font-italic mb-0">Photographer</p>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4 text-body">
                <p className="lead fw-normal mb-0">Recent photos</p>
                <p className="mb-0">
                  <a href="#!" className="text-muted">
                    Show all
                  </a>
                </p>
              </div>
              <div className="row g-2">
                <div className="col mb-2">
                  <img
                    src="https://mdbcdn.b-cdn.net/img/Photos/Lightbox/Original/img%20(112).webp"
                    alt="image 1"
                    className="w-100 rounded-3"
                  />
                </div>
                <div className="col mb-2">
                  <img
                    src="https://mdbcdn.b-cdn.net/img/Photos/Lightbox/Original/img%20(107).webp"
                    alt="image 1"
                    className="w-100 rounded-3"
                  />
                </div>
              </div>
              <div className="row g-2">
                <div className="col">
                  <img
                    src="https://mdbcdn.b-cdn.net/img/Photos/Lightbox/Original/img%20(108).webp"
                    alt="image 1"
                    className="w-100 rounded-3"
                  />
                </div>
                <div className="col">
                  <img
                    src="https://mdbcdn.b-cdn.net/img/Photos/Lightbox/Original/img%20(114).webp"
                    alt="image 1"
                    className="w-100 rounded-3"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
