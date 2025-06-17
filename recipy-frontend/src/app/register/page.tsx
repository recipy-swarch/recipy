"use client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState } from "react";

import { createUser } from "@/lib/userActions";

export default function RegisterPage() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const passwordMatch =
    password && repeatPassword && password === repeatPassword;

  const isLengthValid = password.length >= 8;
  const hasUpperAndNumber = /[A-Z]/.test(password) && /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleRegister = async () => {
    if (password !== repeatPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      const userData = {
        name,
        username,
        email,
        location,
        birth_date: selectedDate?.toISOString().split("T")[0] || "", // yyyy-mm-dd
        password,
      };
      console.log("Datos a enviar al backend:", userData);
      const response = await createUser(userData);
      if (response.success) {
        alert("Usuario registrado con éxito");
        // Aquí puedes redirigir o limpiar formulario
      } else {
        alert("Error al registrar usuario: " + response.error);
        // Aquí puedes manejar el error
      }
      // Aquí puedes redirigir o limpiar formulario
    } catch (error: any) {
      alert("Error al registrar usuario: " + error.message);
    }
  };

  return (
    <div className="container py-5 h-100">
      <div className="row justify-content-center align-items-center h-100">
        <div className="col-12 col-lg-9 col-xl-7">
          <div
            className="card card-registration"
            style={{ borderRadius: "15px" }}
          >
            <div className="card-body p-4 p-md-5">
              <h3 className="mb-4 pb-2 pb-md-0 mb-md-5 card-title">
                Registration Form
              </h3>
              <form>
                <div className="row">
                  <div className="col-md-6 mb-2">
                    <div data-mdb-input-init className="form-outline">
                      <label className="form-label">Full Name</label>
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
                      <label className="form-label">user name</label>
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
                </div>

                {/* <div className="row">
                  <div className="col-md-6 d-flex pb-2 align-items-center">
                    <div data-mdb-input-init className="form-outline w-100">
                      <label htmlFor="birthdayDate" className="form-label">
                        location
                      </label>
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
                </div> */}

                <div className="row">
                  <div className="col-md-12 pb-2">
                    <div data-mdb-input-init className="form-outline">
                      <label className="form-label" htmlFor="emailAddress">
                        Email
                      </label>
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
                </div>
                <div className="row">
                  <div className="col-md-6 pb-2">
                    <div data-mdb-input-init className="form-outline">
                      <label className="form-label" htmlFor="password">
                        Password
                      </label>
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
                      <label className="form-label" htmlFor="repeatPassword">
                        Repeat your Password
                      </label>

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
                    <p
                      className={passwordMatch ? "text-success" : "text-danger"}
                    >
                      {password && repeatPassword
                        ? passwordMatch
                          ? "Las contraseñas coinciden."
                          : "Las contraseñas no coinciden."
                        : ""}
                    </p>

                    <ul>
                      <li
                        className={
                          isLengthValid ? "text-success" : "text-danger"
                        }
                      >
                        Debe tener al menos 8 caracteres
                      </li>
                      <li
                        className={
                          hasUpperAndNumber ? "text-success" : "text-danger"
                        }
                      >
                        Debe tener al menos una mayúscula y un número
                      </li>
                      <li
                        className={
                          hasSpecialChar ? "text-success" : "text-danger"
                        }
                      >
                        Debe tener al menos un carácter especial (#, @, !, etc)
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="col-md-6 d-flex align-items-center justify-content-center pt-2 mx-auto">
                  <button
                    type="button"
                    className="btn btn-lg w-100 special-btn"
                    onClick={handleRegister}
                  >
                    Register
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
