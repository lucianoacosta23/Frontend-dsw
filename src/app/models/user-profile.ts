export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  createdAt: string;
}

export interface UserProfileResponse {
  message: string;
  data: UserProfile;
}