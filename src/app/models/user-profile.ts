export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  createdAt: string;

  // Contadores del perfil.
  followersCount: number;
  followingCount: number;

  // Relaciones respecto del usuario que está viendo el perfil.
  isFollowing: boolean;
  followsMe: boolean;
  isOwnProfile: boolean;
}

export interface UserProfileResponse {
  message: string;
  data: UserProfile;
}

// Respuesta del endpoint de seguimiento que ya existe.
export interface FollowUserResponse {
  message: string;
  data: {
    followerId: number;
    followedId: number;
    createdAt: string;
  };
}