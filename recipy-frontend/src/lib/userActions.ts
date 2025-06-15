"use server";

import userService from "@/services/UserService";
import { IUserRegister } from "@/interfaces/IUser";

import userServiceClient from "@/services/UserServiceClient";

export async function createUser(userData: IUserRegister) {
  try {
    console.log("Registrar usuario:", userData);
    if (await userService.registerUser(userData)) {
      console.log("Usuario creado con éxito");
      return { success: true };
    }
    return { success: false, error: userService.error };
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    return { success: false, error };
  }
}

export async function loginUser(userData: {
  username: string;
  password: string;
}) {
  try {
    console.log("Iniciar sesión:", userData);
    if (await userService.loginUser(userData)) {
      console.log("Inicio de sesión exitoso");
      return { success: true, token: userService.user };
    }
    console.log("Error en el inicio de sesión:", userService.error);
    return { success: false, error: userService.error };
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { success: false, error };
  }
}
