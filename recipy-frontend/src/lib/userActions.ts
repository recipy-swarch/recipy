"use server"

import { revalidatePath } from "next/cache"
import userService from "@/services/UserService.ts"
import IUserRegister from "@/interfaces/Iuser.ts"

export async function createUser(userData:IUserRegister) {
  try {


    console.log("Receta a crear:", userData)

    // Simular una llamada a la API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // En un caso real, aquí harías una llamada fetch a tu API
    // const response = await fetch('/api/recipes', {
    //   method: 'POST',
    //   body: JSON.stringify(recipe),
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });

    // if (!response.ok) {
    //   throw new Error('Error al crear la receta');
    // }

    // Revalidar la ruta para actualizar los datos


    userService.registerUser(userData)
    return { success: true }
  } catch (error) {
    console.error("Error al crear el usuario:", error)
    return { success: false, error }
  }
}
