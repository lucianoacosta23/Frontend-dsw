# Home: mapa visual y verificación del traspaso

Implementación en `E:\z-jukeboxd\front`. Referencia: los archivos actuales de `E:\z-jukeboxd\front pruebas`, incluidos sus cambios manuales. La referencia no fue modificada.

## Ajustes elemento por elemento

Las rutas de la tabla son relativas a `E:\z-jukeboxd\front`.

| Elemento | Archivo | Selectores o punto de ajuste |
| --- | --- | --- |
| Fondo exclusivo del home | `src/app/features/catalog/pages/home/home.scss` | `:host`, `background`; imagen `public/backgrounds/home-aprobado.jpg` |
| Colores del home | mismo archivo | `:host`: `--jb-bg` es color; `--jb-gold`, `--jb-glass`, `--jb-surface`, `--jb-border` |
| Ancho y márgenes laterales | mismo archivo | `.home-page`: máximo 1200px; márgenes 32px, 16px en móvil |
| Títulos y separación de secciones | mismo archivo | `.section-title`, `.section-heading`, `.popular` |
| Navbar | `src/app/shared/components/navbar/navbar-home.scss` | `:host(.home-nav)`, `.navbar`, `.brand`, `.section-links`, `.nav-search`, `.nav-actions`, `.dropdown` |
| Accesos de navbar | `src/app/shared/components/navbar/navbar.html` | rama `@if (home)`; los demás usos conservan la variante anterior |
| Composición del destacado | `src/app/features/catalog/pages/home/home-hero.scss` | `.hero`, `.disc-layout`, `.featured-art`, `.featured-info` |
| Nombre y artista | mismo archivo | `.featured-info h2`, `.featured-artists`, `.featured-meta` |
| Estadísticas | mismo archivo | `.featured-stats`, `.average`, `.review-count` |
| Reseñas a la derecha | mismo archivo | `.featured-reviews` |
| Tarjeta compacta de reseña | `src/app/features/reviews/components/review-card/review-card-compact.scss` | `.compact-review`, `.compact-heading`, `.compact-author`, `.compact-rating`, `.compact-excerpt`, `.compact-actions`, `.compact-cover` |
| Activar variante compacta | `src/app/features/reviews/components/review-card/review-card.html` y `.ts` | input `[compact]="true"`; `[targetCover]` y `[targetName]` para reseñas populares |
| Carrusel de álbumes | `src/app/features/catalog/components/popular-carousel/popular-carousel.scss` | `.rail`, `.track`, `.group`, `.item`, `.rank`, `.art` |
| Velocidad del carrusel | `src/app/features/catalog/components/popular-carousel/popular-carousel.ts` | multiplicador `0.018` píxeles/ms (18px/s); pausa por hover, foco, documento oculto y movimiento reducido |
| Canciones | `src/app/features/catalog/pages/home/home.scss` | `.song-list`, `.song-row`, `.song-rank`, `.song-cover`, `.song-info`, `.song-actions`, `.song-review-count` |
| Playlists | `src/app/features/catalog/pages/home/home-social.scss` | `.playlist-grid`, `.playlist-card`, `.cover-stack`, `.empty-cover`, `.playlist-bottom` |
| Reseñas populares | `src/app/features/catalog/pages/home/home.scss` | `.popular-reviews-grid` |
| Footer | `src/app/features/catalog/pages/home/home-social.scss` | `.home-footer`, `.footer-brand` |
| Orden y contenido de la página | `src/app/features/catalog/pages/home/home.html` | secciones semánticas, bloques Angular de carga/error/vacío y reintento |
| Fondo general y otras pantallas | `src/styles/_backgrounds.scss` | `--jb-background`, variables por sección; `body:has(app-home)` evita pintar dos fondos sobre el home |
| Logo e iconos | `public/jukeboxd-logo.svg`, `public/icons.svg` | símbolos `fire`, `bolt`, `heart`, `comment`, `playlist`, `search`, `arrow` |

Para cambiar solamente el fondo del home también se puede definir `--jb-home-background: url('/backgrounds/otra-imagen.jpg')` en `src/styles/_backgrounds.scss`. No colocar imágenes en `--jb-bg`: se utiliza como color en bordes y degradados. El fondo del home usa `cover`, centrado arriba, sin repetición.

Las fuentes locales DM Sans y Manrope ya estaban incorporadas en el original y se reutilizan con sus licencias. No se copiaron resets ni configuración de pruebas.

## Comportamiento conservado

- No se modificaron guards, rutas, servicios, autenticación, sesión, permisos ni contratos de backend. `canAccess` y `privateHome` mantienen sus reglas. Playlists y reseñas populares siguen restringidas al dashboard, como antes.
- Se mantiene el primer álbum del ranking como destacado, los diez álbumes y diez canciones, las seis playlists y las cuatro reseñas populares solicitadas por los servicios originales.
- La búsqueda de navbar lleva a la búsqueda real, con acceso por login cuando corresponde. Spotify conserva el endpoint y el retorno a `/dashboard`.
- Las tarjetas compactas no montan formularios ni solicitan comentarios, incluso si reciben `openCommentsOnLoad`. Los enlaces abren `/reviews/:id`. La variante completa conserva edición, comentarios, respuestas y reportes.
- Likes de reseñas utilizan el servicio existente. En compactas se deshabilitan para visitantes y para la propia reseña, respetando la restricción del backend.
- Las acciones de like y agregar a playlist de canciones permanecen deshabilitadas. No se agregaron endpoints.
- Las portadas apiladas se obtienen de `PlaylistService.getDetail`, mediante las canciones reales de cada playlist. Hasta tres portadas distintas, estáticas, con dos consultas concurrentes como máximo. Sin canciones, imágenes o acceso al detalle, o ante un fallo, se muestra un placeholder. La caída de una consulta de portadas no elimina el ranking.
- Los avatares de reseñas muestran iniciales porque el contrato del listado no incluye imagen de avatar. No se inventan cantidades de comentarios.

## Archivos cambiados

- `src/app/features/catalog/pages/home/`: `home.html`, `home.ts`, `home.scss`, `home-hero.scss`, `home-social.scss`, `home.spec.ts`.
- `src/app/features/catalog/components/popular-carousel/`: `popular-carousel.html`, `popular-carousel.ts`, `popular-carousel.scss`, `popular-carousel.spec.ts`.
- `src/app/features/reviews/components/review-card/`: `review-card.html`, `review-card.ts`, `review-card.spec.ts`; nuevo `review-card-compact.scss`. La hoja de estilos de la variante completa no cambió.
- `src/app/shared/components/navbar/`: `navbar.html`, `navbar.ts`; nuevo `navbar-home.scss`. La hoja de estilos anterior permanece intacta.
- `src/styles/_backgrounds.scss`: excepción de fondo limitada al home.
- Recursos nuevos: `public/backgrounds/home-aprobado.jpg`, `public/icons.svg`, `public/jukeboxd-logo.svg`.
- Este documento: `docs/home-visual-map.md`.

El archivo local preexistente `public/backgrounds/prueba7.jpg` se conservó sin modificar. No se hizo commit, push ni ningún cambio del backend.

## Verificación y límites

- `npx.cmd ng build`: correcto, sin errores. Bundle inicial 910.17 kB; continúan las advertencias de presupuesto del paquete y de SCSS de pantallas ajenas a este cambio. No se aumentaron los presupuestos para ocultarlas.
- Pruebas de home: 12 aprobadas. Cubren selección del destacado, fallos independientes, reintentos, cancelación de respuestas anteriores, rankings privados, portadas reales con fallback y diez canciones con acciones deshabilitadas.
- Pruebas de carrusel y reseñas: 10 aprobadas. Verifican pausa/reanudación, movimiento reducido, visibilidad, enlaces accesibles, variante compacta sin consultas de comentarios y conservación de la completa. Total final: 22 pruebas aprobadas.
- La primera ejecución conjunta aprobó 20 pruebas. Tras añadir dos pruebas, otra ejecución conjunta se interrumpió por falta de memoria del entorno; se verificaron los grupos por separado.
- Se comparó el marco visual con una copia temporal de los archivos actuales de pruebas, sin modificar esa carpeta ni introducir sus datos en el original. La copia y los artefactos están en `tmp/home-transfer`, ignorado por Git.
- Navegador: home público con backend fuera de línea, presentación de escritorio y móvil sin desbordamiento horizontal; menú de login abierto mediante Enter, accesos de email/Spotify/registro y reintentos visibles. Se conservaron los estilos de foco y movimiento reducido del original.
- No había backend escuchando en `127.0.0.1:3000`. Quedan sin verificación de extremo a extremo el dashboard autenticado, OAuth, likes, comentarios/respuestas/reportes y la comparación visual del original poblado con datos reales. Se comprobaron los comportamientos pertinentes con tests, sin sustituir servicios de la aplicación por datos ficticios.
- Capturas reales: `tmp/home-transfer/home-desktop.png` y `tmp/home-transfer/home-mobile.png`. Muestran los estados de error al estar el backend detenido.

## Levantar el original

```powershell
cd E:\z-jukeboxd\front
$env:TEMP = 'E:\z-jukeboxd\front\tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = 'E:\z-jukeboxd\.npm-cache'
$env:NG_CLI_ANALYTICS = 'false'
$env:NG_BUILD_SASS_EMBEDDED = 'false'
npx.cmd ng serve --host 127.0.0.1 --port 4200
```

Abrir `http://127.0.0.1:4200`. Para ver el contenido real, iniciar también el backend mediante su procedimiento habitual. No es necesario instalar dependencias nuevamente.
