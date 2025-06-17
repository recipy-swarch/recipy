"use server";

import userServiceClient from "@/services/UserServiceClient";

export async function getPublicProfile(userId: number) {
  try {
    const profile = await userServiceClient.getPublicProfile(userId);
    return { success: true, profile };
  } catch (error) {
    console.error("Error en getPublicProfile (lib):", error);
    return { success: false, error };
  }
}

export async function getMyProfile(token: string) {
  try {
    const me = await userServiceClient.getMyProfile(token);
    return { success: true, me };
  } catch (error) {
    console.error("Error en getMyProfile (lib):", error);
    return { success: false, error };
  }
}

export async function updateMyProfile(token: string, formData: any) {
  try {
    const ok = await userServiceClient.updateMyProfile(token, formData);
    return { success: ok };
  } catch (error) {
    console.error("Error en updateMyProfile (lib):", error);
    return { success: false, error };
  }
}