import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Activity, ChevronRight, Flame, LogOut, Map, Menu, Pizza, PlusCircle, Shield, Trophy, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import NotificationCenter from '@/components/NotificationCenter';
import { useAuth } from '@/lib/AuthContext';

const publicNavItems = [
  { label: 'Map', page: 'Home', icon: Map },
  { label: 'Discover', page: 'Descubrir', icon: Flame },
  { label: 'Rankings', page: 'Rankings', icon: Trophy },
  { label: 'Feed', page: 'ActivityFeed', icon: Activity },
];

const privateNavItems = [
  { label: 'Passport', page: 'Passport', icon: Trophy },
  { label: 'Add plan', page: 'CrearQuedada', icon: PlusCircle, accent: true },
  { label: 'Groups', page: 'MisMatches', icon: Users },
  { label: 'Profile', page: 'Profile', icon: User },
];

const publicPages = new Set(['Landing', 'Home', 'Descubrir', 'Rankings', 'ActivityFeed']);
const viewportPages = new Set(['Landing']);

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="app-brand-mark">
        <Pizza className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className={compact ? 'text-2xl font-black' : 'app-brand-title'}>Sozzial</div>
        <div className={compact ? 'text-[11px] uppercase tracking-[0.18em] text-[#8a8174]' : 'app-brand-subtitle'}>
          {compact ? 'Pizza social app' : 'Real pizza, real plans'}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupChatOpen, setGroupChatOpen] = useState(false);
  const { user, role, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleChatState = (event) => setGroupChatOpen(Boolean(event?.detail?.open));
    window.addEventListener('pizzapolis:group-chat-state', handleChatState);
    return () => window.removeEventListener('pizzapolis:group-chat-state', handleChatState);
  }, []);

  useEffect(() => {
    if (currentPageName !== 'MisMatches') setGroupChatOpen(false);
  }, [currentPageName]);

  const navItems = [...publicNavItems, ...privateNavItems];
  const menuItems =
    role === 'admin' && isAuthenticated ? [...navItems, { label: 'Admin', page: 'Admin', icon: Shield }] : navItems;
  const hideHeader = currentPageName === 'Landing' || currentPageName === 'Descubrir';
  const hideBottomNav = currentPageName === 'Descubrir' || (currentPageName === 'MisMatches' && groupChatOpen);
  const navTarget = (page) =>
    publicPages.has(page) || isAuthenticated ? createPageUrl(page) : `/auth?next=${encodeURIComponent(createPageUrl(page))}`;
  const navClass = (active, accent = false) => {
    if (accent) return 'bg-[#de5a42] text-white shadow-[0_12px_32px_rgba(222,90,66,0.22)] hover:bg-[#c84b35]';
    return active
      ? 'bg-white text-[#141414] shadow-[0_12px_28px_rgba(20,20,20,0.08)]'
      : 'text-[#5e574d] hover:bg-white/80 hover:text-[#141414]';
  };

  return (
    <div className="app-shell">
      {!hideHeader && (
        <header className="app-header">
          <div className="app-header-inner">
            <Link to={createPageUrl('Landing')} className="app-brand no-tap-highlight">
              <Brand />
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={navTarget(item.page)}
                    className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${navClass(active, item.accent)}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {user ? <NotificationCenter user={user} /> : null}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl border border-black/10 bg-white/70 text-[#141414] hover:bg-white">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="z-[2500] w-[340px] border-black/10 bg-[#fffaf1] p-0 text-[#141414]">
                  <div className="p-6">
                    <div className="mb-8">
                      <Brand compact />
                    </div>
                    <div className="space-y-1">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.page}
                            to={navTarget(item.page)}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#292621] transition hover:bg-white hover:text-[#141414]"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                          </Link>
                        );
                      })}
                    </div>

                    <div className="mt-8 rounded-[28px] border border-black/8 bg-[#f4ede2] p-5">
                      <div className="text-base font-bold text-[#141414]">{isAuthenticated ? 'Your account' : 'Explore as a guest'}</div>
                      <div className="mt-2 text-sm leading-6 text-[#6d665b]">
                        {user?.username || user?.full_name || 'Browse the map without signing in. Create plans, join groups and manage your profile once you log in.'}
                      </div>
                      {isAuthenticated ? (
                        <Button onClick={logout} variant="outline" className="mt-4 h-12 w-full rounded-2xl border-black/10 bg-white text-[#141414] hover:bg-[#fffdf8]">
                          <LogOut className="mr-2 h-4 w-4" />
                          Log out
                        </Button>
                      ) : (
                        <Link
                          to="/auth"
                          onClick={() => setMenuOpen(false)}
                          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#df5b43] text-sm font-bold text-white hover:bg-[#c84b35]"
                        >
                          Login / Create account
                        </Link>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      )}

      <main className={`${hideHeader ? '' : `app-content ${viewportPages.has(currentPageName) ? 'app-content--viewport' : 'app-content--standard'} ${hideBottomNav ? 'app-content--flush' : ''}`}`}>
        {children}
      </main>

      {!hideHeader && !hideBottomNav && (
        <nav className="mobile-tabbar">
          <div className="mobile-tabbar-grid">
            {[
              publicNavItems[0],
              publicNavItems[1],
              privateNavItems[0],
              privateNavItems[1],
              privateNavItems[2],
              privateNavItems[3],
            ].map((item) => {
              const Icon = item.icon;
              const active = currentPageName === item.page;
              return (
                <Link key={item.page} to={navTarget(item.page)} className="flex flex-col items-center justify-center gap-1 text-center no-tap-highlight">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${item.accent ? 'bg-[#df5b43] text-white shadow-[0_12px_30px_rgba(223,91,67,0.22)]' : active ? 'bg-white text-[#141414] shadow-[0_12px_24px_rgba(20,20,20,0.08)]' : 'text-[#6f6555]'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] font-medium ${active || item.accent ? 'text-[#141414]' : 'text-[#6f6555]'}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

