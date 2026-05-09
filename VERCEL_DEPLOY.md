Vercel settings

Framework Preset: Vite
Install Command: npm install --no-audit --no-fund
Build Command: npm run build
Output Directory: dist
Node.js Version: 20.x

Environment Variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY if legacy code still expects it)
- VITE_APP_URL=https://pizzapolisv2.vercel.app
- VITE_BUYMEACOFFEE_URL=https://buymeacoffee.com/<your-page>

Supabase:
Site URL: https://pizzapolisv2.vercel.app
Redirect URLs:
- https://pizzapolisv2.vercel.app/**
- http://localhost:5173/**
