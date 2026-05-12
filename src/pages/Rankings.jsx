import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChefHat, Crown, ExternalLink, MapPin, Star, Trophy, UserRound } from "lucide-react";
import { fetchRecipeRankings, fetchWeeklyRankings } from "@/lib/social-data";
import { getPublicUsername } from "@/lib/display-name";

const rankingTabs = [
  { id: "people", label: "People", icon: Trophy },
  { id: "spots", label: "Spots", icon: Star },
  { id: "recipes", label: "Recipes", icon: ChefHat },
];

function getScoreLabel(value, suffix = "pts") {
  if (value === undefined || value === null || value === "") return `0 ${suffix}`;
  return `${value} ${suffix}`;
}

function SummaryCard({ tab, title, subtitle, score, scoreSuffix = "pts", active, empty, itemTo }) {
  const Icon = tab.icon;
  const cardClass = `group block min-w-0 overflow-hidden rounded-[22px] border p-4 text-left transition duration-300 hover:-translate-y-0.5 ${active ? "border-[#efbf3a]/55 bg-[#efbf3a]/14 shadow-[0_18px_42px_rgba(239,191,58,0.12)]" : "border-white/10 bg-white/[0.04] hover:border-white/20"}`;
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? "bg-[#efbf3a] text-[#141414]" : "bg-white/[0.06] text-[#efbf3a]"}`}>
          <Icon className="h-5 w-5" />
        </div>
        {itemTo && !empty ? <ExternalLink className="h-4 w-4 text-stone-500 transition group-hover:text-white" /> : <ArrowRight className="h-4 w-4 text-stone-500" />}
      </div>
      <div className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">Top {tab.label}</div>
      <div className="mt-1 truncate text-lg font-black text-white">{empty ? "No entries yet" : title}</div>
      <div className="mt-1 truncate text-sm text-stone-500">{empty ? "Waiting for community activity" : subtitle}</div>
      <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[#141414]">{getScoreLabel(score, scoreSuffix)}</div>
    </>
  );

  return itemTo && !empty ? <Link to={itemTo} className={cardClass}>{body}</Link> : <div className={cardClass}>{body}</div>;
}

function RankingRow({ rank, icon: Icon, title, subtitle, score, to, scoreSuffix = "pts" }) {
  const content = (
    <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] p-2.5 transition hover:border-white/20 hover:bg-white/[0.06] sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${rank <= 3 ? "bg-[#efbf3a] text-[#141414]" : "bg-white/[0.06] text-stone-300"}`}>
        {rank <= 3 ? <Crown className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-white">{rank}. {title}</div>
        <div className="mt-0.5 truncate text-xs text-stone-500">{subtitle}</div>
      </div>
      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
        <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-black text-white">{getScoreLabel(score, scoreSuffix)}</span>
        {to ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-[#141414]">Open <ExternalLink className="h-3.5 w-3.5" /></span> : null}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block min-w-0">{content}</Link> : content;
}

function EmptyState({ children }) {
  return (
    <div className="rounded-[22px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}

export default function Rankings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = ["people", "spots", "recipes"].includes(searchParams.get("type")) ? searchParams.get("type") : "spots";
  const { data = { users: [], spots: [] }, isLoading } = useQuery({
    queryKey: ["weekly-rankings"],
    queryFn: fetchWeeklyRankings,
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipe-rankings"],
    queryFn: () => fetchRecipeRankings(),
  });

  const rankingLists = useMemo(() => ({
    people: data.users.slice(0, 10).map((item, index) => ({
      id: item.id,
      rank: index + 1,
      icon: UserRound,
      title: getPublicUsername(item.profile, "Sozzial user"),
      subtitle: "Check-ins, reviews and plans",
      score: item.score,
      to: `/profile/${item.id}`,
    })),
    spots: data.spots.slice(0, 10).map((item, index) => ({
      id: item.id,
      rank: index + 1,
      icon: MapPin,
      title: item.spot?.name || "Pizza spot",
      subtitle: item.source === "starter" ? item.spot?.address || "New spot to rate" : item.spot?.address || "Community activity",
      score: item.score,
      to: item.spot?.id ? `/home?spot=${item.spot.id}` : undefined,
    })),
    recipes: recipes.slice(0, 10).map((recipe, index) => ({
      id: recipe.id,
      rank: index + 1,
      icon: ChefHat,
      title: recipe.title,
      subtitle: recipe.profiles?.username ? `By @${recipe.profiles.username}` : recipe.dough_style || "Community recipe",
      score: recipe.likes_count || 0,
      to: recipe.id ? `/recipe/${recipe.id}` : undefined,
      scoreSuffix: "likes",
    })),
  }), [data.spots, data.users, recipes]);

  const activeList = rankingLists[activeType] || [];
  const topByType = {
    people: rankingLists.people[0],
    spots: rankingLists.spots[0],
    recipes: rankingLists.recipes[0],
  };
  const activeTab = rankingTabs.find((tab) => tab.id === activeType) || rankingTabs[1];
  const ActiveIcon = activeTab.icon;

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] overflow-x-hidden bg-[#060606] px-3 py-4 pb-[calc(var(--mobile-nav-height)+1rem)] text-white sm:px-5 sm:py-6 sm:pb-6">
      <div className="mx-auto w-full max-w-5xl overflow-hidden">
        <div className="mb-4">
          <div className="inline-flex rounded-full border border-[#efbf3a]/25 bg-[#efbf3a]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#efbf3a]">Rankings</div>
          <h1 className="mt-3 text-[clamp(1.9rem,7vw,3.5rem)] font-black leading-none">Top 10 pizza moves</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400">People, spots and home recipes ranked in compact lists. Tap a top card to open that item, or use the selector below to switch ranking lists.</p>
        </div>

        {isLoading ? <div className="rounded-[24px] border border-white/10 bg-[#101010] p-6 text-center text-stone-400">Loading rankings...</div> : null}

        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          {rankingTabs.map((tab) => {
            const top = topByType[tab.id];
            return (
              <SummaryCard
                key={tab.id}
                tab={tab}
                active={activeType === tab.id}
                empty={!top}
                title={top?.title}
                subtitle={top?.subtitle}
                score={top?.score}
                scoreSuffix={top?.scoreSuffix || "pts"}
                itemTo={top?.to}
              />
            );
          })}
        </div>

        <section className="mt-4 min-w-0 overflow-hidden rounded-[26px] border border-white/10 bg-[#101010] p-3 shadow-[0_18px_46px_rgba(0,0,0,0.25)] sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-black">Top {activeTab.label}</div>
                <div className="text-xs text-stone-500">Ordered list, best 10 first.</div>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/25 p-1 sm:w-auto">
              {rankingTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSearchParams({ type: tab.id })}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${activeType === tab.id ? "bg-white text-[#141414]" : "text-stone-400 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-2">
            {activeList.map((item) => (
              <RankingRow key={item.id} {...item} />
            ))}
            {!activeList.length ? (
              <EmptyState>
                {activeType === "recipes" ? "No home recipes ranked yet. Publish a recipe from your profile." : `No ${activeTab.label.toLowerCase()} ranked yet.`}
              </EmptyState>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
