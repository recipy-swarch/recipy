// app/layout.tsx o donde tengas tu layout principal
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "./navbar.css";
import ClientLayout from "@/components/clientLayout";

import { AuthProvider } from "@/context/authContext";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Recipy",
  description: "Red social para compartir recetas de cocina",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <Navbar/>
          <ClientLayout>{children}</ClientLayout>

        <div className="container-fluid footer">
          <footer className="p-5">
            <div className="row g-0">
              {[1, 2, 3].map((_) => (
                <div key={_} className="col-4 col-md-2 mb-3">
                  <h5>Section</h5>
                  <ul className="nav flex-column">
                    {["Home", "Features", "Pricing", "FAQs", "About"].map((item) => (
                      <li key={item} className="nav-item mb-2">
                        <a href="#" className="nav-link p-0">{item}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="col-12 col-md-5 offset-md-1 mb-1">
                <img src="/Logotipo.png" alt="Logo Recipy" style={{ maxWidth: "200px", height: "auto" }} />
              </div>
            </div>
          </footer>
        </div>
        </AuthProvider>
        
      </body>
    </html>
  );
}
