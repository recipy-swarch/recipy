"use client"

import React, { useState } from "react";
import "./login.css";
import loginHero from '../components/login-hero.jpg';
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/userActions";  // Nuevo import

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const result = await loginUser({ username, password });
        if (result.success) {
            if (result.token) {
                router.push("/");  // Ajusta la ruta de destino según tu flujo
                localStorage.setItem("token",result.token);
            }
            
        } else {
            setError(result.error as string || "Error de inicio de sesión");
        }
    };

    return (
        <div className="container-fluid h-100 p-0">
            <div className="row d-flex g-0" style={{ height: '100vh' }}>
                <div className="col-md-4 col-lg-4 col-xl-4 h-100">
                    <div className="d-flex w-100 align-items-center justify-content-end h-100 overflow-hidden">
                        <img
                            src="/images/login-hero.jpg"
                            className="h-100 w-100 login-image"
                            style={{ objectFit: 'cover' }}
                            alt="Sample image"
                        />
                    </div>
                </div>
                <div className="d-flex  col-md-8 col-lg-8 col-xl-8 align-items-center justify-content-center h-100 form-section">
                    <form className="container col-10 col-md-8 col-xl-6 login-container" onSubmit={handleLogin}>
                        <div className="form-outline mb-2">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                id="form3Example3"
                                className="form-control form-control-lg"
                                placeholder="Enter a valid email address"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />

                        </div>

                        {/* Password input */}
                        <div className="form-outline mb-2">
                            <label className="form-label" htmlFor="form3Example4">Password</label>
                            <input
                                type="password"
                                id="form3Example4"
                                className="form-control form-control-lg"
                                placeholder="Enter password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />

                        </div>

                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                            {/* Checkbox */}
                            <div className="form-check mb-0">
                                <input
                                    className="form-check-input me-2"
                                    type="checkbox"
                                    id="form2Example3"
                                />
                                <label className="form-check-label" htmlFor="form2Example3">
                                    Remember me
                                </label>
                            </div>
                            <a href="#!" className="link-btn">Forgot password?</a>
                        </div>
                        {error && (
                            <div className="alert alert-danger mt-2" role="alert">
                                {error}
                            </div>
                        )}
                        <div className="text-center text-lg-center mt-2 pt-2 ">
                            <button
                                type="submit"
                                className="btn btn-lg w-100 special-btn"
                            >
                                Iniciar Sesion
                            </button>
                            <p className="small fw-bold mt-2 pt-1 mb-0">
                                Don't have an account?{" "}
                                <a href="/register" className="special-link-btn">Register</a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
