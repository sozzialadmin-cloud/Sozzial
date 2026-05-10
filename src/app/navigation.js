import { Activity, Flame, Map, PlusCircle, Shield, Trophy, User, Users } from 'lucide-react';

export const PUBLIC_PAGE_NAMES = new Set(['Landing', 'Home', 'Descubrir', 'Rankings', 'ActivityFeed']);
export const VIEWPORT_PAGE_NAMES = new Set(['Landing']);

export const publicNavItems = [
  { label: 'Mapa', page: 'Home', icon: Map },
  { label: 'Descubrir', page: 'Descubrir', icon: Flame },
  { label: 'Rankings', page: 'Rankings', icon: Trophy },
  { label: 'Actividad', page: 'ActivityFeed', icon: Activity },
];

export const privateNavItems = [
  { label: 'Passport', page: 'Passport', icon: Trophy },
  { label: 'Crear', page: 'CrearQuedada', icon: PlusCircle, accent: true },
  { label: 'Grupos', page: 'MisMatches', icon: Users },
  { label: 'Perfil', page: 'Profile', icon: User },
];

export const adminNavItem = { label: 'Admin', page: 'Admin', icon: Shield };

export const desktopNavItems = [...publicNavItems, ...privateNavItems];
export const mobileNavItems = [
  publicNavItems[0],
  publicNavItems[1],
  privateNavItems[1],
  privateNavItems[2],
  privateNavItems[3],
];
