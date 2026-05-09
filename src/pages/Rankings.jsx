import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crown, MapPin, Star, Trophy, UserRound } from "lucide-react";
import { fetchWeeklyRankings } from "@/lib/social-data";
import { getPublicUsername } from "@/lib/display-name";

function Row({ rank, icon: Icon, title, subtitle, score, to }) {
  const content = (
    <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.07]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
        {rank <= 3 ? <Crown className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-black text-white">{rank}. {title}</div>
        <div className="mt-0.5 truncate text-sm text-stone-500">{subtitle}</div>
      </div>
      <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm font-black text-white">{score}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Rankings() {
  const { data = { users: [], spots: [] }, isLoading } = useQuery({
    queryKey: ["weekly-rankings"],
    queryFn: fetchWeeklyRankings,
  });

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] bg-[#060606] px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <div className="inline-flex rounded-full border border-[#efbf3a]/25 bg-[#efbf3a]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#efbf3a]">Weekly rankings</div>
          <h1 className="mt-3 text-[clamp(2rem,8vw,4rem)] font-black leading-none">Who moved Sozzial this week?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">Check-ins and reviews push users and pizza spots up the board.</p>
        </div>

        {isLoading ? <div className="rounded-[28px] border border-white/10 bg-[#101010] p-8 text-center text-stone-400">Loading rankings...</div> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-[#101010] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-xl font-black"><Trophy className="h-5 w-5 text-[#efbf3a]" />Top people</div>
            <div className="grid gap-3">
              {data.users.map((item, index) => (
                <Row key={item.id} rank={index + 1} icon={UserRound} title={getPublicUsername(item.profile, "Sozzial user")} subtitle="Check-ins and reviews" score={item.score} to={`/profile/${item.id}`} />
              ))}
              {!data.users.length ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">No weekly user activity yet.</div> : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#101010] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-xl font-black"><Star className="h-5 w-5 text-[#efbf3a]" />Top spots</div>
            <div className="grid gap-3">
              {data.spots.map((item, index) => (
                <Row key={item.id} rank={index + 1} icon={MapPin} title={item.spot?.name || "Pizza spot"} subtitle={item.spot?.address || "Community activity"} score={item.score} />
              ))}
              {!data.spots.length ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">No weekly spot activity yet.</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
