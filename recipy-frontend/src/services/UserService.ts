import { IUserRegister } from "@/interfaces/IUser";

class UserService {
  private apiUrl: string;
  public error: string | null = null;
  public user: string | null = null;

  // Constructor de la clase
  // Inicializa la URL de la API desde las variables de entorno
  // Lanza un error si la URL no está definida

  constructor() {
    this.apiUrl = process.env.API_GATEWAY_URL || "";
    if (!this.apiUrl) {
      throw new Error("API_GATEWAY_URL no está definido");
    }
  }

  registerUser = async (userData: IUserRegister): Promise<boolean> => {
    const response = await fetch(`${this.apiUrl}/user/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    console.log(response);

    if (!response.ok) {
      const text = await response.text();
      console.error("Error fetching recipes:", text);
      throw new Error(`Error ${response.status}`);
    }
    const data = await response.json();

    if (data.error) {
      console.error("Error creating recipe:", data.error);
      this.error = data.error;
      return false;
    }

    if (data.message) {
      console.log("User created successfully:", data.message);
      return true;
    }
    this.error = "Unknown error";
    return false;
  };

  loginUser = async (userData: {
    username: string;
    password: string;
  }): Promise<boolean> => {
    const response = await fetch(`${this.apiUrl}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error fetching recipes:", text);
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error("Error creating recipe:", data.error);
      this.error = data.error;
      return false;
    }
    if (data.token) {
      console.log("User logged in successfully:", data.token);
      this.user = data.token;
    }
    return true;
  };
}

const userService = new UserService();
export default userService;
