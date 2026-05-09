import React, { useMemo, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Activity, BadgeCheck, Flame, Map, Menu, Plus, Search, Shield, Trophy, UserRound, Users, X } from "lucide-react";
import { activity, missions, rankings, spots } from "./lib/mock-data";
import { isSupabaseConfigured } from "./lib/supabase";

const nav = [
  { to: "/", label: "Map", icon: Map },
  { to: "/discover", label: "Discover", icon: Flame },
  { to: "/passport", label: "Passport", icon: BadgeCheck },
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/feed", label: "Feed", icon: Activity },
  { to: "/profile", label: "Profile", icon: UserRound },
];

function Shell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const compact = location.pathname === "/discover";

  return (
    <div className="app">
      {!compact && (
        <header className="topbar">
          <NavLink to="/" className="brand" aria-label="Sozzial home">
            <span className="brand-mark">S</span>
            <span>
              <strong>Sozzial</strong>
              <small>Pizza map and real plans</small>
            </span>
          </NavLink>
          <nav className="desktop-nav">
            {nav.slice(0, 5).map((item) => <NavItem key={item.to} {...item} />)}
          </nav>
          <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        </header>
      )}

      <main className={compact ? "main main-full" : "main"}>{children}</main>

      {!compact && (
        <nav className="mobile-nav">
          {nav.map((item) => <NavItem key={item.to} {...item} compact />)}
        </nav>
      )}

      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div className="brand"><span className="brand-mark">S</span><strong>Sozzial</strong></div>
              <button className="icon-button" onClick={() => setMenuOpen(false)}><X size={18} /></button>
            </div>
            <div className="drawer-list">
              {nav.map((item) => <NavItem key={item.to} {...item} onClick={() => setMenuOpen(false)} />)}
              <NavItem to="/admin" label="Admin" icon={Shield} onClick={() => setMenuOpen(false)} />
            </div>
            <div className="drawer-card">
              <strong>{isSupabaseConfigured ? "Supabase connected" : "Demo mode"}</strong>
              <p>{isSupabaseConfigured ? "Ready for live users." : "Add env vars in Vercel to use real data."}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, label, icon: Icon, compact = false, onClick }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${compact ? "compact" : ""}`}>
      <Icon size={compact ? 20 : 18} />
      <span>{label}</span>
    </NavLink>
  );
}

function HeroCard() {
  return (
    <section className="hero-card">
      <div>
        <span className="eyebrow">Verified slice city</span>
        <h1>Find pizza worth leaving the house for.</h1>
        <p>Compare slice prices, check-ins, plans and real community activity without fighting a messy interface.</p>
      </div>
      <div className="hero-stats">
        <Stat value="$3.25" label="fresh verified price" />
        <Stat value="4.7" label="community rating" />
        <Stat value="3" label="active plans nearby" />
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function Home() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => spots.filter((spot) => `${spot.name} ${spot.area}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <div className="page">
      <HeroCard />
      <section className="toolbar">
        <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search spots, areas, slices..." /></div>
        <button className="primary-button"><Plus size={18} /> Add spot</button>
      </section>
      <section className="spot-grid">
        {filtered.map((spot) => <SpotCard key={spot.id} spot={spot} />)}
      </section>
    </div>
  );
}

function SpotCard({ spot }) {
  return (
    <article className="spot-card">
      <div className="spot-media"><span>${spot.price.toFixed(2)}</span></div>
      <div className="spot-body">
        <div className="row">
          <h3>{spot.name}</h3>
          <strong>{spot.rating.toFixed(1)}</strong>
        </div>
        <p>{spot.area}</p>
        <div className="chip-row">
          <span>{spot.badge}</span>
          <span>{spot.plans} plans</span>
          <span>Verified {spot.verified}</span>
        </div>
      </div>
    </article>
  );
}

function Discover() {
  const [index, setIndex] = useState(0);
  const spot = spots[index % spots.length];
  return (
    <div className="discover-screen">
      <div className="discover-card">
        <button className="back-link" onClick={() => history.back()}>Back</button>
        <div className="discover-photo"><span>{spot.badge}</span></div>
        <h1>{spot.name}</h1>
        <p>{spot.area} · ${spot.price.toFixed(2)} slice · {spot.rating.toFixed(1)} rating</p>
        <div className="discover-actions">
          <button onClick={() => setIndex((value) => value + 1)} className="ghost-button">Skip</button>
          <button onClick={() => setIndex((value) => value + 1)} className="primary-button">Join plan</button>
        </div>
      </div>
    </div>
  );
}

function Passport() {
  return (
    <div className="page">
      <PageHeader eyebrow="Passport" title="Turn pizza into progress." text="Check in, verify slice prices and complete weekly missions." />
      <section className="mission-grid">
        {missions.map((mission) => <Mission key={mission.id} mission={mission} />)}
      </section>
    </div>
  );
}

function Mission({ mission }) {
  const pct = Math.round((mission.progress / mission.total) * 100);
  return (
    <article className="panel">
      <div className="row"><h3>{mission.title}</h3><span>{mission.progress}/{mission.total}</span></div>
      <p>{mission.detail}</p>
      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
    </article>
  );
}

function Rankings() {
  return (
    <div className="page">
      <PageHeader eyebrow="Weekly rankings" title="Make contribution visible." text="Rankings reward useful check-ins, reviews and hosted plans." />
      <section className="panel-list">
        {rankings.map((item, index) => <article className="rank-row" key={item.id}><b>{index + 1}</b><div><strong>{item.name}</strong><span>{item.label}</span></div><em>{item.score}</em></article>)}
      </section>
    </div>
  );
}

function Feed() {
  return (
    <div className="page narrow">
      <PageHeader eyebrow="Live feed" title="The app should feel alive." text="Every useful action becomes social proof." />
      <section className="panel-list">
        {activity.map((item) => <article className="feed-row" key={item.id}><Activity size={18} /><div><strong>{item.user}</strong> {item.text}<p>{item.place} · {item.time}</p></div></article>)}
      </section>
    </div>
  );
}

function Profile() {
  return (
    <div className="page">
      <PageHeader eyebrow="Social profile" title="A profile people want to open." text="Badges, check-ins, favorite slice and public reputation in one clean place." />
      <section className="profile-grid">
        <article className="profile-card">
          <div className="avatar">S</div>
          <h2>Sozzial user</h2>
          <p>Slice hunter · loves verified prices and easy plans.</p>
        </article>
        <article className="panel"><h3>Favorite slice</h3><p>Classic cheese, under $4.</p></article>
        <article className="panel"><h3>Badges</h3><p>First check-in · Reviewer · Host energy</p></article>
      </section>
    </div>
  );
}

function Admin() {
  return <div className="page"><PageHeader eyebrow="Admin" title="Operations without clutter." text="Review users, reports, spots, activity and data quality from a clear dashboard." /><section className="mission-grid"><Stat value="1,204" label="users" /><Stat value="318" label="spots" /><Stat value="47" label="reports" /></section></div>;
}

function PageHeader({ eyebrow, title, text }) {
  return <header className="page-header"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></header>;
}

function NotFound() {
  return <div className="page"><PageHeader eyebrow="404" title="Page not found." text="This route does not exist yet." /></div>;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/passport" element={<Passport />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}
