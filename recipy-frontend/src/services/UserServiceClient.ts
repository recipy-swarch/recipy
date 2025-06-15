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
      return data;
    } catch (error) {
      console.error("Error in getPublicProfile:", error);
      this.error = (error as Error).message;
      return null;
    }
  };
}

const userServiceClient = new UserServiceClient();
export default userServiceClient;
