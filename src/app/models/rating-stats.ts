// Una barra del gráfico: puntuación y cantidad de reseñas con ese valor.
export interface RatingDistributionItem {
  rating: number;
  count: number;
}

// Estadísticas de todas las reseñas activas de un álbum o canción.
export interface RatingStatsData {
  targetType: 'release' | 'track';
  targetId: number;

  // Es null cuando todavía no hay puntuaciones.
  averageRating: number | null;
  totalRatings: number;
  distribution: RatingDistributionItem[];
}

// Estructura de la respuesta del backend.
export interface RatingStatsResponse {
  message: string;
  data: RatingStatsData;
}