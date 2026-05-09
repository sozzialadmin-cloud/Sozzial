# Sozzial nuevo proyecto

## GitHub

Cuando crees el repositorio nuevo, usa estos comandos desde PowerShell. Cambia la URL por la del repo nuevo.

```powershell
cd "$env:USERPROFILE\Desktop\sozzial-clean-rebuild"

git init
git add .
git commit -m "Initial clean Sozzial rebuild"

git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Usa `--force` solo si quieres sobrescribir un repo remoto que ya tiene contenido.

## Vercel

1. Importa el repo nuevo en Vercel.
2. Framework: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Añade variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase

En un proyecto nuevo de Supabase, ejecuta:

```text
SUPABASE_SCHEMA_SOZZIAL.sql
```
