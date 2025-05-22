export interface IUserRegister {
  name: string;
  username: string;
  email: string;
  location?: string;
  birth_date: string; // formato ISO string
  password: string;
}
