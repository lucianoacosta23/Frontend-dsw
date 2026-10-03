// Una reseña apunta a un álbum o a una pista.
export type ReviewTarget =
  | { type: 'release'; id: number }
  | { type: 'track'; id: number };

// El request incluye el ID del elemento y una puntuación de 0.5 a 5.
export type CreateReviewRequest = {
  rating: number;
  text: string;
} & ({ releaseId: number; trackId?: never } | { trackId: number; releaseId?: never });

export interface ReviewApiResponse {
  message: string;
  data: unknown;
}