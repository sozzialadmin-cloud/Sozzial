import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, BadgeCheck, MessageSquare, Pizza, UserRound } from "lucide-react";
import { fetchActivityFeed } from "@/lib/social-data";
import { getPublicUsername } from "@/lib/display-name";

function eventCopy(item) {
  if (item.event_type === "check_in") return "checked in at a pizza spot";
  if (item.event_type === "review") return "left a new review";
  if (item.event_type === "plan_created") return "created a pizza plan";
  if (item.event_type === "badge_awarded") return "earned a badge";
  return "updated Sozzial";
}

function EventIcon({ type }) {
  if (type === "check_in") return <BadgeCheck className="h-5 w-5" />;
  if (type === "review") return <MessageSquare className="h-5 w-5" />;
  if (type === "plan_created") return <Pizza className="h-5 w-5" />;
  return <Activity className="h-5 w-5" />;
}

export default function ActivityFeed() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: fetchActivityFeed,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] bg-[#060606] px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <div className="inline-flex rounded-full border border-[#efbf3a]/25 bg-[#efbf3a]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#efbf3a]">Live feed</div>
          <h1 className="mt-3 text-[clamp(2rem,8vw,4rem)] font-black leading-none">The city is eating.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">A simple activity stream that makes Sozzial feel alive every time someone contributes.</p>
        </div>

        <section className="surface-card rounded-[28px] p-3 sm:p-5">
          {isLoading ? <div className="p-8 text-center text-sm text-stone-500">Loading activity...</div> : null}
          <div className="stagger-in grid gap-3">
            {items.map((item) => {
              const profile = item.profile || null;
              const title = getPublicUsername(profile, item.metadata?.username || "Someone");
              return (
                <div key={item.id || item.created_at} className="soft-list-item flex gap-3 rounded-[24px] p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
                    <EventIcon type={item.event_type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.user_id ? (
                        <Link to={`/profile/${item.user_id}`} className="font-black text-white hover:text-[#efbf3a]">{title}</Link>
                      ) : (
                        <span className="font-black text-white">{title}</span>
                      )}
                      <span className="text-sm text-stone-400">{eventCopy(item)}</span>
                    </div>
                    <div className="mt-1 text-xs text-stone-600">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</div>
                    {item.metadata?.note ? <p className="mt-2 text-sm leading-6 text-stone-400">{item.metadata.note}</p> : null}
                  </div>
                  <UserRound className="mt-1 hidden h-4 w-4 text-stone-700 sm:block" />
                </div>
              );
            })}
            {!isLoading && !items.length ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500">No public activity yet. First check-in will appear here.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
