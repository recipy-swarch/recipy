"use client";

import Link from "next/link";
import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { isLoggedIn, logout } = useAuth();

  const router = useRouter();
  const goToProfile = () => {
    router.push("/my-profile"); // Página que crearás
  };

  return (
    <nav className="navbar bg-body-transparent px-3">
      <a className="navbar-brand" href="/#">
        Navbar
      </a>
      <ul className="nav nav-pills">
        {!isLoggedIn ? (
          <>
            <li className="nav-item">
              <Link className="btn nav-link" href="/login">
                Login
              </Link>
            </li>
            <li className="nav-item">
              <Link className="btn special-btn nav-link" href="/register">
                Register
              </Link>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link className="btn nav-link" href="/create-recipe">
                Create Recipe
              </Link>
            </li>
            <li className="nav-item">
              <button className="btn" onClick={goToProfile}>
                my Profile
              </button>
            </li>
            <li className="nav-item">
              <button className="btn special-btn" onClick={logout}>
                Logout
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
