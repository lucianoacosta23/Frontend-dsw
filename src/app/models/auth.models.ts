export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  category: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  username: string;
  fullName: string;
}