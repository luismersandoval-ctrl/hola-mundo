# OdontoSpace

Sistema de gestión para clínica odontológica con una API en FastAPI y una interfaz en React/Vite.

## Configuración local

1. Copia `.env.example` como `.env` y reemplaza los valores de ejemplo.
2. Exporta las variables antes de iniciar el backend:

   ```bash
   set -a
   source .env
   set +a
   ```

3. Inicia el backend desde `backend` y el frontend desde `frontend`.

La base de datos SQLite, los entornos virtuales y los secretos locales no se incluyen en Git.
