# Jukeboxd — Frontend

Frontend de Jukeboxd, una aplicación para descubrir música y compartir reseñas. 

Desarrollado con Angular y TypeScript. Consume la API REST del backend de Jukeboxd, que administra los datos, la autenticación, los permisos y la integración con Spotify.

## Tecnologías

| Tecnología             | Uso                                          |
| ---------------------- | -------------------------------------------- |
| Angular 22             | Componentes, navegación y formularios        |
| TypeScript             | Tipado y lógica de la aplicación             |
| Angular Signals        | Estado reactivo de las pantallas             |
| RxJS                   | Peticiones HTTP y composición de operaciones |
| Angular Material y CDK | Herramientas y componentes de interfaz       |
| SCSS                   | Estilos globales y de componentes            |
| Vitest y jsdom         | Pruebas unitarias                            |

Las versiones de dependencias se declaran en `package.json`. El archivo `package-lock.json` registra las versiones resueltas para reproducir la instalación.

## Requisitos

Antes de comenzar, instalar:

- **Git**.
- **Node.js** compatible con las dependencias de Angular del proyecto.
- **npm**.
- Un editor de código, como **VS Code**.
- El backend de Jukeboxd y su base de datos configurados para utilizar las funciones conectadas.

La versión instalada de Angular declara compatibilidad con Node:

```text
^22.22.3 o mayores
```

El proyecto registra **npm 10.9.9** en el campo `packageManager`.

Comprobar las herramientas desde PowerShell:

```powershell
node --version
npm.cmd --version
git --version
```

## Instalación

### 1. Obtener el proyecto

Si todavía no se tiene el repositorio:

```powershell
git clone https://github.com/lucianoacosta23/Frontend-dsw.git
cd Frontend-dsw
```

Si ya está clonado, abrir una terminal dentro de `Frontend-dsw`. No es necesario volver a clonarlo.

El frontend y el backend se mantienen en repositorios separados:

```text
Dsw_juke_boxd/
├── backend-dsw/
└── Frontend-dsw/
```

### 2. Instalar las dependencias

Desde `Frontend-dsw`:

```powershell
npm.cmd ci
```

Este comando instala las dependencias registradas en `package-lock.json`.

Ejecutarlo al preparar una PC o después de incorporar cambios que actualicen las dependencias. No instalar Angular CLI de forma global: los scripts utilizan la versión local del proyecto.

### 3. Configurar la conexión con el backend

La dirección de la API está definida en:

```text
src/environments/environments.ts
```

Configuración local actual:

```typescript
export const environment = {
  apiBaseUrl: 'http://127.0.0.1:3000',
};
```

Si el backend utiliza otra dirección o puerto, actualizar este valor y revisar la configuración CORS del backend.

La configuración actual del backend permite solicitudes desde:

```text
http://127.0.0.1:4200
```

Usar **127.0.0.1 en ambos proyectos** durante el desarrollo local. Alternar entre `localhost` y `127.0.0.1` puede provocar problemas de cookies y CORS.

### 4. Iniciar el backend

En otra terminal, seguir el README de `backend-dsw` para:

1. Instalar sus dependencias.
2. Configurar las variables de entorno.
3. Preparar PostgreSQL.
4. Aplicar las migraciones pendientes.
5. Iniciar el servidor.

La dirección local esperada es:

```text
http://127.0.0.1:3000
```

Se puede comprobar que responde con:

```powershell
curl.exe -i http://127.0.0.1:3000/health
```

Las credenciales de PostgreSQL, los secretos de sesión y las credenciales de Spotify corresponden al backend. **No deben agregarse al código del frontend**, porque su contenido se entrega al navegador.

### 5. Iniciar el frontend

Desde `Frontend-dsw`:

```powershell
npm.cmd start -- --host 127.0.0.1
```

Abrir en el navegador:

```text
http://127.0.0.1:4200
```

El servidor de desarrollo recompila la aplicación al guardar cambios. Para detenerlo, presionar `Ctrl + C` en la terminal.

## Comandos disponibles

Ejecutar desde `Frontend-dsw`:

| Comando                             | Descripción                                                           |
| ----------------------------------- | --------------------------------------------------------------------- |
| `npm.cmd start -- --host 127.0.0.1` | Inicia el servidor de desarrollo con el host esperado por el backend  |
| `npm.cmd run build`                 | Genera la compilación de producción                                   |
| `npm.cmd run watch`                 | Compila en modo desarrollo y observa cambios                          |
| `npm.cmd test`                      | Ejecuta las pruebas con el comportamiento predeterminado del ejecutor |
| `npm.cmd test -- --watch=false`     | Ejecuta las pruebas una vez                                           |
| `npm.cmd run ng -- version`         | Muestra las versiones de Angular y sus herramientas                   |

La compilación se genera dentro de `dist/`. Revisar la salida del comando para identificar la carpeta final de archivos publicables.

## Estructura del proyecto

```text
Frontend-dsw/
├── docs/                     # Documentación de diseño
├── public/                   # Recursos estáticos y fuentes
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/       # Control de acceso a rutas
│   │   │   └── services/     # Comunicación con la API
│   │   ├── features/         # Funcionalidades y pantallas
│   │   │   ├── activity/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── catalog/
│   │   │   ├── dashboard/
│   │   │   ├── playlists/
│   │   │   ├── reviews/
│   │   │   ├── search/
│   │   │   └── users/
│   │   ├── models/           # Tipos y contratos de datos
│   │   ├── shared/           # Componentes compartidos
│   │   ├── app.config.ts     # Proveedores de la aplicación
│   │   └── app.routes.ts     # Rutas
│   ├── environments/         # Configuración de la API
│   ├── styles/               # Estilos compartidos
│   ├── styles.scss           # Estilos globales
│   └── main.ts               # Entrada de la aplicación
├── angular.json              # Configuración de Angular
├── package.json              # Scripts y dependencias
├── package-lock.json         # Versiones resueltas
└── tsconfig.json             # Configuración de TypeScript
```

### Criterios de organización

- **`features/`**: pantallas y componentes propios de cada funcionalidad.
- **`core/services/`**: solicitudes HTTP y operaciones compartidas con la API.
- **`core/guards/`**: comprobaciones de sesión y rol antes de navegar.
- **`models/`**: interfaces y tipos de solicitudes y respuestas.
- **`shared/`**: componentes reutilizados en distintas funcionalidades.

Mantener las peticiones HTTP en servicios facilita reutilizar operaciones y evita repetir direcciones y contratos de API en las pantallas.

## Navegación y permisos

Las rutas se definen en `src/app/app.routes.ts`.

| Ruta                      | Pantalla                  | Guard configurado |
| ------------------------- | ------------------------- | ----------------- |
| `/`                       | Portada                   | Sin guard         |
| `/login`                  | Inicio de sesión          | Invitado          |
| `/register`               | Registro local            | Sin guard         |
| `/register/spotify`       | Registro mediante Spotify | Sin guard         |
| `/dashboard`              | Inicio de la cuenta       | Sesión            |
| `/search`                 | Búsqueda                  | Sesión            |
| `/releases/:id`           | Detalle de lanzamiento    | Sin guard         |
| `/tracks/:id`             | Detalle de canción        | Sin guard         |
| `/artists/:id`            | Perfil de artista         | Sin guard         |
| `/users/:username`        | Perfil de usuario         | Sin guard         |
| `/profile`                | Perfil propio             | Sesión            |
| `/profile/edit`           | Edición del perfil        | Sesión            |
| `/activity`               | Actividad                 | Sesión            |
| `/playlists/new`          | Crear playlist            | Sesión            |
| `/playlists/:id`          | Detalle de playlist       | Sesión            |
| `/reviews/:id`            | Detalle de reseña         | Sesión            |
| `/admin`                  | Administración            | Administrador     |
| `/admin/critical-reviews` | Reseñas críticas          | Administrador     |
| `/admin/reports/minor`    | Reportes menores          | Administrador     |

“Sin guard” describe la navegación del frontend. Los datos y las acciones disponibles en cada pantalla siguen sujetos a los permisos de la API.

Los guards mejoran la navegación, pero **el backend debe validar la autorización de cada operación**.

## Autenticación y comunicación con la API

La aplicación utiliza sesiones mediante cookies.

Las peticiones que requieren sesión envían:

```typescript
{ withCredentials: true }
```

Las operaciones que lo requieren también incluyen la cabecera:

```text
X-Jukeboxd-Request: 1
```

Al crear o modificar un servicio:

- Utilizar `environment.apiBaseUrl`.
- Definir los tipos de solicitud y respuesta.
- Enviar credenciales cuando el endpoint requiera sesión.
- Respetar las cabeceras exigidas por el backend.
- Mostrar estados de carga, error y ausencia de resultados.
- Distinguir una sesión vencida de un error de conexión.

La integración con Spotify depende de la configuración del backend y de la disponibilidad del servicio externo.

## Desarrollo de nuevas funcionalidades

Para incorporar una funcionalidad:

1. Definir el comportamiento esperado y los permisos.
2. Acordar con el backend los endpoints y sus respuestas.
3. Crear o actualizar los modelos de datos.
4. Implementar las operaciones en un servicio.
5. Crear los componentes dentro de la funcionalidad correspondiente.
6. Registrar la ruta y el guard, si corresponde.
7. Contemplar carga, errores, resultados vacíos y acciones pendientes.
8. Agregar pruebas de los comportamientos relevantes.
9. Comprobar la compilación y probar el flujo conectado al backend.

Reutilizar los componentes y estilos existentes cuando corresponda. Evitar incluir lógica de acceso a datos directamente en las plantillas.

## Verificaciones antes de compartir cambios

Ejecutar:

```powershell
npm.cmd run build
npm.cmd test -- --watch=false
```

Comprobar también el flujo modificado en el navegador:

- Resultado correcto de la operación.
- Datos vacíos o identificadores inexistentes.
- Errores de validación y conexión.
- Acceso sin sesión o con permisos insuficientes.
- Persistencia de los cambios después de recargar.
- Visualización en distintos tamaños de pantalla.

La compilación valida la construcción de la aplicación; las pruebas unitarias no reemplazan la comprobación de integración con el backend.

## Trabajo en equipo

Antes de actualizar el repositorio:

```powershell
git status
```

Revisar y guardar los cambios propios antes de incorporar trabajo de otros integrantes.

Desde la rama base acordada y con el árbol de trabajo preparado:

```powershell
git pull --ff-only
```

Si cambiaron las dependencias:

```powershell
npm.cmd ci
```

Crear una rama para cada funcionalidad o corrección:

```powershell
git switch -c feat/nombre-de-la-funcionalidad
```

Antes de abrir un Pull Request:

- Revisar el diff y retirar archivos ajenos al cambio.
- Ejecutar las verificaciones correspondientes.
- Describir el comportamiento implementado y cómo se probó.
- Indicar si requiere cambios del backend o migraciones.
- Actualizar la documentación cuando cambie la configuración o el uso.
- Incluir `package.json` y `package-lock.json` si se modificaron dependencias.

No subir `node_modules/`, `dist/`, `.angular/` ni credenciales.

Como frontend y backend están en repositorios separados, vincular los Pull Requests cuando una funcionalidad necesite cambios en ambos.

## Problemas frecuentes

| Problema                                       | Qué revisar                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| PowerShell bloquea `npm.ps1`                   | Utilizar `npm.cmd`                                                                 |
| No se encuentra `ng` o una dependencia         | Ejecutar `npm.cmd ci` dentro de `Frontend-dsw`                                     |
| El frontend abre, pero no carga datos          | Comprobar que el backend esté iniciado y revisar `apiBaseUrl`                      |
| Aparece un error CORS                          | Usar `http://127.0.0.1:4200` y comprobar el origen permitido en el backend         |
| La sesión no se conserva                       | Revisar el host, el envío de credenciales y la configuración de cookies            |
| La API devuelve `401`                          | Iniciar sesión nuevamente                                                          |
| La API devuelve `403`                          | Comprobar los permisos de la cuenta                                                |
| Spotify no responde o no permite ingresar      | Revisar la configuración y los errores del backend, incluida la URL de redirección |
| Una pantalla queda vacía                       | Revisar la consola del navegador y la pestaña Network                              |
| Falla la compilación por tamaños de archivos   | Revisar los presupuestos definidos en `angular.json` y los archivos señalados      |
| Después de actualizar faltan tablas o columnas | Aplicar las migraciones correspondientes desde el backend                          |
| El puerto `4200` está ocupado                  | Detener el proceso que lo utiliza; cambiar el puerto también requiere revisar CORS |

Evitar borrar `package-lock.json` o aplicar actualizaciones forzadas como primera solución. Revisar el error antes de cambiar dependencias.



