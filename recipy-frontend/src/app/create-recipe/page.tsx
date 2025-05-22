import { Suspense } from "react"
import RecipeForm from "@/components/recipe-form"
import styles from "./page.module.css"

export default function CreateRecipePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Crear Nueva Receta</h1>
      <Suspense fallback={<div className={styles.loading}>Cargando...</div>}>
        <RecipeForm />
      </Suspense>
    </div>
  )
}
