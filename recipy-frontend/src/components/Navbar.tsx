"use client";

import Link from "next/link";
import { useAuth } from "@/context/authContext";

export default function Navbar() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <nav className="navbar bg-body-transparent px-3">
      <a className="navbar-brand" href="/#">Navbar</a>
      <ul className="nav nav-pills">
        {!isLoggedIn ? (
          <>
            <li className="nav-item">
              <Link className="btn nav-link" href="/login">Login</Link>
            </li>
            <li className="nav-item">
              <Link className="btn special-btn nav-link" href="/register">Register</Link>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link className="btn nav-link" href="/create-recipe">Create Recipe</Link>
            </li>
            <li className="nav-item">
              <Link className="btn nav-link" href="/profile">My Profile</Link>
            </li>
            <li className="nav-item">
              <button className="btn special-btn" onClick={logout}>Logout</button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
