# Sozzial

Este repositorio contiene la versión completa de la web-app Sozzial, replicando la app anterior pero con el proyecto nuevo, marca nueva, PWA y SQL organizado.

## GitHub

```powershell
cd "$env:USERPROFILE\Desktop\sozzial-clean-rebuild"
git add .
git commit -m "Restore full Sozzial app experience"
git push
```

## Vercel

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase

Ejecuta en este orden:

```text
1. SUPABASE_AUTH_PROFILES_SETUP.sql
2. SUPABASE_PROFILE_EXTENSIONS.sql
3. SUPABASE_PRODUCT_CORE_SETUP.sql
4. SUPABASE_SOCIAL_PLUS_SETUP.sql
```
