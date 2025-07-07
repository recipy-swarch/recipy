"use client";

import { Suspense, useEffect } from "react";
import RecipeForm from "@/components/recipe-form";
import styles from "./page.module.css";

import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";

export default function CreateRecipePage() {
  const { isLoggedIn, loading } = useAuth(); // 👈 asegúrate de tener loading
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login");
    }
  }, [loading, isLoggedIn, router]);

  if (loading) {
    return <p className="text-center mt-4">Cargando autenticación...</p>; // Espera a verificar token
  }

  if (!isLoggedIn) {
    return <p>Redirigiendo a login...</p>; // Fallback breve
  }

  return (
    <div className={styles.container}>
      <h1 className="title d-flex justify-content-center">
        Crear Nueva Receta
      </h1>
      <Suspense fallback={<div className={styles.loading}>Cargando...</div>}>
        <RecipeForm />
      </Suspense>
    </div>
  );
}
