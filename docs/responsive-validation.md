# Comprobación responsive

`scripts/check-responsive.cjs` comprueba el frontend en Edge mediante Playwright.
Requiere Playwright disponible para Node y Edge instalado. No agrega dependencias
al frontend ni accede a datos reales: intercepta las peticiones del backend con
usuarios, reseñas, playlists, reportes e historiales de prueba.

1. Iniciar el frontend con `npm run start -- --host 127.0.0.1 --port 4300`.
2. Ejecutar `node scripts/check-responsive.cjs`.

Variables opcionales: `RESPONSIVE_URL`, `RESPONSIVE_OUTPUT` y
`RESPONSIVE_WIDTHS` (anchos separados por comas).

Cobertura: dashboard, perfil propio y público, edición de perfil, panel admin,
reseñas críticas, reportes menores, gestión de usuarios y formulario de sanción,
ventanas de reportes, creación y detalle de playlist, actividad, portada pública,
login y registro. Incluye nombres largos y listas con contenido.

Los anchos principales son 320, 375, 390, 430, 740, 768, 1024 y 1440 px;
740 px usa una altura de 360 px para comprobar orientación horizontal.
Verifica desbordamientos y cierre del menú al pulsar fuera, navegar o usar Escape.
Guarda capturas de 390 px en `jukeboxd-responsive` dentro del directorio temporal.

Las pruebas unitarias del menú están en `navbar.spec.ts`.
Esta verificación cubre presentación e interacción con datos simulados;
no reemplaza las pruebas del backend ni una prueba en dispositivos físicos.
