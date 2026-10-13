# Navbar, búsqueda y sugerencias

Actualizado el 2026-10-12. Implementación local en `E:\z-jukeboxd\front`.

## Flujo implementado

- La navbar mantiene la identidad del home y queda fija en todas las pantallas. Reserva su altura real para no tapar el contenido.
- La barra permite escribir en la pantalla actual. A partir de dos caracteres espera 250ms y consulta los servicios existentes, con sesión iniciada.
- Cada cambio cancela inmediatamente la espera o consulta anterior. No se muestran respuestas de un texto anterior.
- El desplegable muestra hasta cinco coincidencias con imagen, nombre y tipo. Se priorizan coincidencias exactas, comienzos del nombre y coincidencias del texto, conservando el orden de las fuentes ante empates.
- No hay una opción seleccionada por defecto. Flechas arriba/abajo seleccionan, Enter abre la opción elegida y Escape cierra conservando el texto. Tab y clic fuera también cierran. Sin selección, Enter y “Ver todos los resultados” abren `/search?q=texto`.
- Las sugerencias no importan registros. Al seleccionar un resultado externo se utiliza el proceso real de importación y después se abre el detalle con su ID local.
- Sin sesión no se consultan APIs protegidas: el desplegable informa que hace falta ingresar y el envío lleva al login conservando la consulta. El backend actual exige autenticación para `GET /search`; no se modificaron permisos.
- Hover y foco ensanchan ligeramente el campo, sin mover los controles vecinos ni el desplegable. Movimiento reducido desactiva la transformación y transición.

Referencias: [W3C, combobox con selección manual](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/) y [NN/g, sugerencias de búsqueda](https://www.nngroup.com/articles/site-search-suggestions/).

## Pantalla /search

La búsqueda usa fondo, ancho centrado de 1200px, fuentes locales DM Sans/Manrope, colores crema y acentos dorados del home.

La navbar es la entrada principal: se retiró la segunda barra grande. Debajo aparecen el texto consultado, filtros por tipo y una sección por categoría:

- Artistas: tarjetas con imagen circular.
- Canciones: filas con portada, nombre y artista, con acceso al detalle.
- Lanzamientos: grilla de portadas.
- Playlists y Personas: tarjetas que usan los datos disponibles y sus rutas reales.

Los resultados locales y externos se presentan juntos dentro de cada sección. Se eliminan duplicados de música por Spotify ID y se prefiere el destino local. No se unen registros solo porque tienen el mismo nombre. El origen se conserva internamente para resolver navegación e importación, sin dividir la interfaz.

Se conservan estados inicial, carga, vacío, error con reintento y fallo parcial de Spotify. Si Spotify falla, permanecen los resultados locales y un aviso con reintento. El contador muestra las coincidencias recibidas, sin inventar un total paginado.

## Mapa para ajustar

Las rutas de la tabla son relativas a `E:\z-jukeboxd\front`.

| Elemento | Archivo y selector |
| --- | --- |
| Ancho y espaciado de navbar | `src/app/shared/components/navbar/navbar-home.scss`: `.navbar`, `.nav-search` |
| Posición fija | mismo archivo: `.site-header`; `navbar.ts`: `headerHeight` |
| Campo, lupa y expansión | `src/app/shared/components/search-box/search-box.scss`: `.search-field`, `.search-submit`, hover/foco y media queries |
| Desplegable | mismo archivo: `.suggestion-panel`, `.suggestion-copy`, `.suggestion-cover`, `.all-results` |
| Límite y espera | `search-box.ts`: `timer(250)`, límite de dos caracteres; `models/search-view.ts`: `topSuggestions` |
| Teclado y cierre | `search-box.ts`: `keydown`, `focusOut`, `outsideClick` |
| Envío y retorno de login | `src/app/shared/components/navbar/navbar.ts`: `submitSearch` |
| Fondo y ancho de /search | `src/app/features/search/pages/search/search.scss`: `:host`, `.search-page` |
| Encabezado y filtros | mismo archivo: `.search-heading`, `.eyebrow`, `.query-summary`, `.filters` |
| Secciones y grillas | mismo archivo: `.result-section`, `.section-heading`, `.result-grid`, `.track-list` |
| Tarjetas y filas | `src/app/features/search/components/search-result/search-result.scss`: `.result`, `.row`, `.artwork`, `.result-copy` |
| Orden visual | `search.html`: secciones; `src/app/models/search-view.ts`: `searchCategories` |
| Combinación y ranking | `src/app/models/search-view.ts`: `combineSearchResults`, `relevance` |
| Consultas e importación | `src/app/core/services/search-discovery.service.ts`: reutiliza `SearchService` sin cambiar endpoints ni contratos |
| Footer global, incluido /search | `src/app/shared/components/footer/footer.scss`: `.site-footer`, `.footer-brand`; logo y contenido en `footer.html`. Se monta una sola vez en `src/app/app.html` |

El fondo de búsqueda respeta `--jb-search-background` cuando se define; de lo contrario usa `--jb-home-background` o la imagen `public/backgrounds/home-aprobado.jpg`. La imagen se mantiene separada del color `--jb-bg`, sin repetición.

## Archivos de esta integración

- Página: `src/app/features/search/pages/search/search.ts`, `search.html`, `search.scss`, `search.spec.ts`.
- Componente nuevo de resultados: `src/app/features/search/components/search-result/search-result.ts`, `search-result.html`, `search-result.scss`.
- Componente nuevo de sugerencias: `src/app/shared/components/search-box/search-box.ts`, `search-box.html`, `search-box.scss`, `search-box.spec.ts`.
- Modelo de presentación nuevo: `src/app/models/search-view.ts`, `search-view.spec.ts`.
- Coordinador nuevo: `src/app/core/services/search-discovery.service.ts`, `search-discovery.service.spec.ts`.
- Navbar existente: `navbar.ts`, `navbar.html`, `navbar-home.scss`, `navbar.spec.ts`.
- `src/styles/_backgrounds.scss`: fondo base de búsqueda para evitar pintar dos imágenes.
- Este documento.

Los cambios locales de la etapa anterior —incluida la navbar en login/registro/registro Spotify— se conservaron. No hubo commit, push, cambios del backend o modificaciones de `front pruebas`.

## Validación y límites

### Footer compartido

El footer se renderiza una sola vez desde `src/app/app.html`, después del contenido de la ruta. Sus archivos son `src/app/shared/components/footer/footer.ts`, `footer.html` y `footer.scss`. Utiliza el logo `/jukeboxd-logo.svg` y la composición del home en todas las pantallas. Se retiraron las copias locales de home, búsqueda y perfil, incluidos sus estilos. La navegación de marca conserva el destino público o dashboard según la sesión.

Esta adaptación se comprobó con build correcto y 23 pruebas de aplicación, home y búsqueda. La prueba de aplicación verifica que el mismo footer persista, sin duplicarse, al cambiar de ruta. Logs y captura en `tmp/shared-footer/`.

- Build de producción correcto, sin errores. Paquete inicial 917.12kB; continúan las advertencias de presupuesto ya conocidas. No hay nuevas advertencias de estilos en los componentes de búsqueda.
- 37 pruebas aprobadas en seis archivos: mezcla y deduplicación, relevancia, no importación al escribir, aperturas reales, fallo parcial, filtros, carga/reintento, recepción de URL, cancelación de consultas, teclado, clic, cierre y regresiones del home.
- Navegador: desplegable de visitante, Escape y presentación móvil sin desbordamiento. El navegador de pruebas todavía no tenía sesión, por lo que quedaron pendientes la comprobación visual de /search poblado y de sugerencias reales autenticadas. Se solicitó iniciar sesión; no se usaron credenciales ni se sustituyeron los servicios de la aplicación por ejemplos.
- Los datos de prueba existen únicamente en tests. No se agregaron previews, interceptores de demostración ni rutas que salteen autenticación.
- El listado de playlists no incluye portadas: las tarjetas muestran el placeholder del componente de portada. El listado de personas tampoco incluye avatar: se utilizan iniciales.
- Logs y capturas en `tmp/search-integration/`, dentro del proyecto y fuera del seguimiento de Git.

Para verlo, abrir `http://127.0.0.1:4200`, iniciar sesión y escribir en la navbar. Para levantarlo manualmente se mantiene el comando `npx.cmd ng serve --host 127.0.0.1 --port 4200`, con los temporales y la caché configurados en E: como en la etapa anterior.
