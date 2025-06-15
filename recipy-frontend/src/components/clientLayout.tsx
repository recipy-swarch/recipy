"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSidebar = pathname !== "/login" && pathname !== "/register";

  return (
    <div className="container-fluid fullContainer">
      {showSidebar ? (
        <div className="row flex-nowrap">
          <div className="navbar d-flex col-auto col-md-3 col-xl-2 px-sm-2 px-0">
            <div className="side-bar flex-column justify-content-start px-3 pt-2 text-white h-100">
              <a href="/" className="d-flex align-items-center pb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <span className="fs-5 d-none d-sm-inline">Menu</span>
              </a>
              <ul className="nav nav-pills flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start" id="menu">
                {/* Aquí va el contenido del sidebar */}
                <li className="nav-item">
                  <a href="#" className="nav-link align-middle px-0">
                    <i className="fs-4 bi-house"></i> <span className="ms-1 d-none d-sm-inline">Mis Listas</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="#" className="nav-link align-middle px-0">
                    <i className="fs-4 bi-house"></i> <span className="ms-1 d-none d-sm-inline">Mis Recetas</span>
                  </a>
                </li>
                {/* Agrega el resto de los ítems... */}
              </ul>
            </div>
          </div>
          <div className="col py-3">{children}</div>
        </div>
      ) : (
        <main className="container-fluid">{children}</main>
      )}
    </div>
  );
}