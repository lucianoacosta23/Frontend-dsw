# Jukeboxd — Frontend

Frontend de Jukeboxd, una aplicación para descubrir música y compartir reseñas. Está desarrollado con Angular y se conecta al backend mediante una API REST.

## Requisitos

- Git.
- Node.js compatible con Angular 22. Para trabajar todos con la misma versión, recomendamos Node **22.22.3 o superior dentro de la línea 22**.
- npm. El proyecto registra la versión usada en `package.json`.

Podés comprobar las versiones instaladas con:

```powershell
node --version
npm.cmd --version
La versión de Node debe ser compatible con Angular 22. Consultá la tabla oficial de compatibilidad de Angular.
Clonar los repositorios
El frontend y el backend están en repositorios separados. Desde la carpeta donde quieras guardar el proyecto, ejecutá:
git clone https://github.com/lucianoacosta23/Frontend-dsw.git
git clone https://github.com/lucianoacosta23/backend-dsw.git
Vas a tener dos carpetas, una para cada repositorio:
tp-dsw-2026/
├── Frontend-dsw/
└── backend-dsw/
Instalar y ejecutar el frontend
En Windows PowerShell, usá npm.cmd para evitar errores de permisos al ejecutar scripts de npm:
cd .\Frontend-dsw
npm.cmd ci
npm.cmd start -- --host 127.0.0.1
Abrí en el navegador:
http://127.0.0.1:4200
Para detener el servidor, presioná Ctrl + C en la terminal.
Ejecutar el backend
El frontend necesita que el backend esté funcionando. Abrí otra terminal y seguí las instrucciones del README del repositorio backend-dsw para:
1. Instalar las dependencias.
2. Configurar PostgreSQL y crear el archivo .env local.
3. Aplicar las migraciones.
4. Iniciar el servidor.
El backend debe quedar disponible en:
http://127.0.0.1:3000
No compartas ni subas tu .env: contiene credenciales propias de tu entorno.
Conexión entre frontend y backend
La URL de la API se configura en src/environments/environments.ts. En el entorno local debe apuntar a:
http://127.0.0.1:3000
El backend debe permitir solicitudes desde http://127.0.0.1:4200 y aceptar credenciales para mantener la sesión. Si cambiás 127.0.0.1 por localhost, usá el mismo host en ambos proyectos.
Comandos útiles
Desde la carpeta Frontend-dsw:
npm.cmd start
npm.cmd run build
npm.cmd test
- start: inicia el servidor de desarrollo.
- run build: compila la aplicación.
- test: ejecuta las pruebas configuradas en el proyecto.
Estado actual
El proyecto ya tiene la estructura inicial de Angular y la pantalla de inicio de sesión con email y contraseña conectada al backend. El registro de usuarios, el inicio de sesión con Spotify y otras pantallas de la aplicación todavía están pendientes de desarrollo.
Trabajo en equipo
Antes de empezar a trabajar, actualizá tu rama:
git pull origin main
Para mantener ordenados los cambios, trabajá en una rama propia y abrí un Pull Request antes de integrar funcionalidades a main.

La versión recomendada de Node corresponde a la compatibilidad publicada para Angular 22. [Documentación
