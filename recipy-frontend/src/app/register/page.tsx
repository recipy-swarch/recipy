"use client";
import { useState } from "react";

export default function RegisterPage() {


    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== repeatPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    username,
                    password,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess("¡Registro exitoso! Ahora puedes iniciar sesión.");
                setName("");
                setEmail("");
                setUsername("");
                setPassword("");
                setRepeatPassword("");
            } else {
                setError(data.error || "Error al registrar usuario");
            }
        } catch (err) {
            setError("Error de red o servidor");
        }
    };

    return (
        <div className="container py-5 h-100">
            <div className="row justify-content-center align-items-center h-100">
                <div className="col-12 col-lg-8 col-xl-6">
                    <div className="card card-registration" style={{ borderRadius: '15px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h3 className="mb-4 pb-2 pb-md-0 mb-md-5 card-title">Registration Form</h3>
                            <form>
                                <div className="row">
                                    <div className="col-md-6 mb-2">

                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" >Full Name</label>
                                            <input
                                                type="text"
                                                id="firstName" 
                                                className="form-control form-control-lg"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Full Name"
                                            />
                                        </div>

                                    </div>
                                    <div className="col-md-6 mb-2">

                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" >user name</label>
                                            <input
                                                type="text"
                                                value={username}
                                                id="lastName" 
                                                className="form-control form-control-lg"
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="User Name"
                                            />
                                        </div>
                                    </div>
                            <h3 className="mb-4 pb-2 pb-md-0 mb-md-5 card-title">Registro</h3>
                            <form onSubmit={handleRegister}>
                                <div className="mb-3">
                                    <label className="form-label">Nombre completo</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="row">
                                    <div className="col-md-6 d-flex pb-2 align-items-center">

                                        <div data-mdb-input-init className="form-outline w-100">
                                            <label htmlFor="birthdayDate" className="form-label">location</label>
                                                  <input
                                                    type="text"
                                                    value={location}
                                                    className="form-control form-control-lg" 
                                                    id="birthdayDate"
                                                    onChange={(e) => setLocation(e.target.value)}
                                                    placeholder="Location"
                                                />

                                        </div>

                                    </div>

                                    <div className="col-md-6 pb-2 d-flex align-items-center">
                                        <div data-mdb-input-init className="form-outline w-100">
                                            <label className="form-label">Birth date</label>
                                            <DatePicker 
                                                selected={selectedDate} 
                                                onChange={(date: Date | null) => {
                                                    if (date) setSelectedDate(date);
                                                }} 
                                                isClearable={false}
                                                className="form-control form-control-lg"
                                            />
                                        </div>
                                    </div>
                                <div className="mb-3">
                                    <label className="form-label">Correo electrónico</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="row">
                                    <div className="col-md-12 pb-2">

                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" htmlFor="emailAddress">Email</label>
                                                  <input
                                                        type="email"
                                                        value={email}
                                                        id="emailAddress" 
                                                        className="form-control form-control-lg"
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="Email"
                                                    />
                                        </div>

                                    </div>

                                <div className="mb-3">
                                    <label className="form-label">Nombre de usuario</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="row">
                                    <div className="col-md-6 pb-2">
                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" htmlFor="password">Password</label>
                                            <input
                                                type="password"
                                                id="password"
                                                className="form-control form-control-lg"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Password"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-6 pb-2">
                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" htmlFor="repeatPassword">Repeat your Password</label>

                                            <input
                                                type="password"
                                                value={repeatPassword}
                                                id="repeatPassword"
                                                className="form-control form-control-lg"
                                                onChange={(e) => setRepeatPassword(e.target.value)}
                                                placeholder="Repeat Password"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <p className={passwordMatch ? "text-success" : "text-danger"}>
                                            {password && repeatPassword
                                                ? passwordMatch
                                                    ? "Las contraseñas coinciden."
                                                    : "Las contraseñas no coinciden."
                                                : ""}
                                        </p>

                                        <ul>
                                            <li className={isLengthValid ? "text-success" : "text-danger"}>
                                                Debe tener al menos 8 caracteres
                                            </li>
                                            <li className={hasUpperAndNumber ? "text-success" : "text-danger"}>
                                                Debe tener al menos una mayúscula y un número
                                            </li>
                                            <li className={hasSpecialChar ? "text-success" : "text-danger"}>
                                                Debe tener al menos un carácter especial (#, @, !, etc)
                                            </li>
                                        </ul>
                                    </div>
                                <div className="mb-3">
                                    <label className="form-label">Contraseña</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Repite la contraseña</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={repeatPassword}
                                        onChange={e => setRepeatPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-md-6 d-flex align-items-center justify-content-center pt-2 mx-auto">

                                    <button 
                                    type="button" 
                                    className="btn btn-lg w-100 special-btn"
                                    onClick={handleRegister}>
                                        Register
                                    </button>
                                </div>
                                {error && <div className="alert alert-danger">{error}</div>}
                                {success && <div className="alert alert-success">{success}</div>}
                                <button type="submit" className="btn btn-primary w-100">
                                    Registrarse
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}