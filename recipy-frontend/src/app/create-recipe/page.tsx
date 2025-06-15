"use client";

import { Suspense } from "react"
import RecipeForm from "@/components/recipe-form"
import styles from "./page.module.css"


import { useAuth } from "@/context/authContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateRecipePage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <p>Redirigiendo a login...</p>; // mientras redirige
  }
  return (
    <div className={styles.container}>
      <h1 className="title d-flex justify-content-center">Crear Nueva Receta</h1>
      <Suspense fallback={<div className={styles.loading}>Cargando...</div>}>
        <RecipeForm />
      </Suspense>
    </div>
  )
}
