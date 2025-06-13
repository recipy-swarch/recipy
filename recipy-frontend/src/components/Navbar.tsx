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
            <button className="btn">
              <Link className="nav-link" href="/login">Login</Link>
            </button>
          </li>
          <li className="nav-item">
            <button className="btn special-btn">
              <Link className="nav-link" href="/register">Register</Link>
            </button>
          </li>
        </>
      ) : (
        <>
          <li className="nav-item">
            <button className="btn">
              <Link className="nav-link" href="/create-recipe">Create Recipe</Link>
            </button>
          </li>
          <li className="nav-item">
            <button className="btn">
              <Link className="nav-link" href="/profile">My Profile</Link>
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



{/* <nav className="navbar bg-body-transparent px-3">
          <a className="navbar-brand" href="/#">Navbar</a>
          <ul className="nav nav-pills">
            <li className="nav-item">
              <button className="btn">
                <a className="nav-link" href="/create-recipe">create recipe</a>
              </button>
            </li>
            <li className="nav-item">
              <button className="btn">
                <a className="nav-link" href="/profile">My profile</a>
              </button>
            </li>
            <li className="nav-item">
              <button className="btn">
                <a className="nav-link" href="/login">login</a>
              </button>
            </li>
            <li className="nav-item">
              <button className="btn special-btn">
                <a className="nav-link" href="/register">Register</a>
              </button>
            </li>
          </ul>
        </nav> */}