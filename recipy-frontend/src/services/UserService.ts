import { IUser } from "@/interfaces/Iuser";


class UserService {
  private apiUrl: string;

  constructor() {
        this.apiUrl = process.env.API_GATEWAY_URL || '' 
        console.log("este es mi ", this.apiUrl);
        if (this.apiUrl === '') {
            throw new Error('API URL is not defined')
        }
    }

  registerUser = async (userData: IUserRegister) => {
    const response = await fetch(`${this.apiUrl}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    console.log(response);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error registering user');
    }

    return await response.json();
  };
}

const userService = new UserService();
export default userService;

