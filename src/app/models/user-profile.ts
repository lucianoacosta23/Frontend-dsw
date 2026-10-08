export interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  createdAt: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  favoriteReleases: FavoriteRelease[];
  favoriteTracks: FavoriteTrack[];

  // Contadores del perfil.
  followersCount: number;
  followingCount: number;

  // Relaciones respecto del usuario que está viendo el perfil.
  isFollowing: boolean;
  followsMe: boolean;
  isOwnProfile: boolean;
}

export interface FavoriteRelease {
  id: number;
  name: string;
  type: 'ALBUM' | 'EP' | 'SINGLE' | 'MIXTAPE' | 'COMPILATION';
  imageUrl: string | null;
  artists: Array<{ id: number; name: string }>;
}

export interface FavoriteTrack {
  id: number;
  name: string;
  durationMs: number;
  artists: Array<{ id: number; name: string }>;
  release: { id: number; name: string; imageUrl: string | null };
}

export interface ProfilePatch {
  avatarImageId?: number | null;
  coverImageId?: number | null;
  favoriteReleaseIds?: number[];
  favoriteTrackIds?: number[];
}

export type ImagePurpose = 'avatar' | 'cover';
export interface ProfileImageResponse {
  message: string;
  data: { imageId: number; url: string; purpose: ImagePurpose };
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
