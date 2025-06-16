class UserServiceClient {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "";
    if (!this.apiUrl) {
      throw new Error("NEXT_PUBLIC_API_GATEWAY_URL no está definido");
    }
  }

  getPublicProfile = async (userId: number): Promise<any> => {
    try {
      const response = await fetch(`${this.apiUrl}/user/profile/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Error fetching public profile:", text);
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      console.log("datos recupreados con getPublicProfile: ", data);
      return data;
    } catch (error) {
      console.error("Error in getPublicProfile:", error);
      this.error = (error as Error).message;
      return null;
    }
  };

  getMyProfile = async (token: string): Promise<any> => {
    try {
      const response = await fetch(`${this.apiUrl}/user/my-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Error fetching my profile:", text);
        throw new Error(`Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error in getMyProfile:", error);
      this.error = (error as Error).message;
      return null;
    }
  };

  updateMyProfile = async (token: string, formData: any): Promise<boolean> => {
    try {
      const response = await fetch(`${this.apiUrl}/user/my-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Error updating profile:", text);
        throw new Error(`Error ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("Error in updateMyProfile:", error);
      this.error = (error as Error).message;
      return false;
    }
  };
}

const userServiceClient = new UserServiceClient();
export default userServiceClient;
