import "./login.css";
import loginHero from '../components/login-hero.jpg';

export default function LoginPage() {
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
                    <form className="container col-10 col-md-8 col-xl-6 login-container">
                        <div className="form-outline mb-2">
                            <label className="form-label" >Email address</label>
                            <input
                                type="email"
                                id="form3Example3"
                                className="form-control form-control-lg"
                                placeholder="Enter a valid email address"
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

                        <div className="text-center text-lg-center mt-2 pt-2 ">
                            <button
                                type="button"
                                className="btn btn-lg w-100 special-btn"
                            >
                                Login
                            </button>
                            <p className="small fw-bold mt-2 pt-1 mb-0">
                                Don't have an account?{" "}
                                <a href="/register" className="special-link-btn">Register</a>
                            </p>
                        </div>
                        {/* <div className="divider d-flex align-items-center my-4">
                            <p className="text-center fw-bold mx-3 mb-0">Or</p>
                        </div>
                        <div className="d-flex flex-row align-items-center justify-content-center justify-content-lg-start">
                            <p className="lead fw-normal mb-0 me-3">Sign in with</p>
                            <button type="button" className="btn btn-primary btn-floating mx-1">
                                <i className="fab fa-facebook-f"></i>
                            </button>

                        </div> */}
                    </form>
                </div>
            </div>
        </div>
    );
}
