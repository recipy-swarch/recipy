"use client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState } from "react";

export default function RegisterPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");

    const passwordMatch = password && repeatPassword && password === repeatPassword;

    const isLengthValid = password.length >= 8;
    const hasUpperAndNumber = /[A-Z]/.test(password) && /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);


    return (
        <div className="container py-5 h-100">
            <div className="row justify-content-center align-items-center h-100">
                <div className="col-12 col-lg-9 col-xl-7">
                    <div className="card card-registration" style={{ borderRadius: '15px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h3 className="mb-4 pb-2 pb-md-0 mb-md-5 card-title">Registration Form</h3>
                            <form>
                                <div className="row">
                                    <div className="col-md-6 mb-2">

                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" >Full Name</label>
                                            <input type="text" id="firstName" className="form-control form-control-lg" />
                                        </div>

                                    </div>
                                    <div className="col-md-6 mb-2">

                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" >user name</label>
                                            <input type="text" id="lastName" className="form-control form-control-lg" />
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-md-6 d-flex pb-2 align-items-center">

                                        <div data-mdb-input-init className="form-outline w-100">
                                            <label htmlFor="birthdayDate" className="form-label">location</label>
                                            <input type="text" className="form-control form-control-lg" id="birthdayDate" />

                                        </div>

                                    </div>

                                    <div className="col-md-6 pb-2 d-flex align-items-center">
                                        <div data-mdb-input-init className="form-outline w-100">
                                            <label className="form-label">Date</label>
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


                                </div>

                                <div className="row">
                                    <div className="col-md-12 pb-2">

                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" htmlFor="emailAddress">Email</label>
                                            <input type="email" id="emailAddress" className="form-control form-control-lg" />
                                        </div>

                                    </div>

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
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-6 pb-2">
                                        <div data-mdb-input-init className="form-outline">
                                            <label className="form-label" htmlFor="repeatPassword">Repeat your Password</label>
                                            <input
                                                type="password"
                                                id="repeatPassword"
                                                className="form-control form-control-lg"
                                                value={repeatPassword}
                                                onChange={(e) => setRepeatPassword(e.target.value)}
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
                                </div>

                                <div className="col-md-6 d-flex align-items-center justify-content-center pt-2 mx-auto">
                                    <button
                                        type="button"
                                        className="btn btn-lg w-100 special-btn"
                                    >
                                        <a className="nav-link" href="/">Register</a>
                                    </button>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            </div >
        </div >

    );
}