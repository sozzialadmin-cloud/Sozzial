import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, MapPin, Pizza, Send, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { createCheckIn, fetchPassportBundle, PASSPORT_TASKS, progressForTask } from "@/lib/social-data";

async function fetchSpotChoices() {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from("spots").select("id,name,address,slice_price").order("name", { ascending: true }).limit(200);
  if (error) return [];
  return data || [];
}

function Mission({ task, value }) {
  const complete = value >= task.target;
  const pct = Math.min(100, Math.round((value / task.target) * 100));
  return (
    <div className="soft-list-item rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-black text-white">
            {complete ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Trophy className="h-4 w-4 text-[#efbf3a]" />}
            {task.label}
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-400">{task.description}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm font-black text-white">
          {value}/{task.target}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#efbf3a]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Passport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [spotId, setSpotId] = useState("");
  const [slicePrice, setSlicePrice] = useState("");
  const [note, setNote] = useState("");

  const { data: spots = [] } = useQuery({ queryKey: ["passport-spots"], queryFn: fetchSpotChoices });
  const { data: bundle = { checkins: [], comments: [], plans: [], uniqueSpots: 0 }, isLoading } = useQuery({
    queryKey: ["passport-bundle", user?.id],
    queryFn: () => fetchPassportBundle(user?.id),
  });

  const selectedSpot = useMemo(() => spots.find((spot) => spot.id === spotId), [spots, spotId]);
  const totalProgress = PASSPORT_TASKS.reduce((sum, task) => sum + progressForTask(task, bundle), 0);
  const totalTarget = PASSPORT_TASKS.reduce((sum, task) => sum + task.target, 0);

  const checkIn = useMutation({
    mutationFn: () => createCheckIn({ userId: user?.id, spotId, slicePrice, note }),
    onSuccess: async (result) => {
      setNote("");
      setSlicePrice("");
      toast.success(result.persisted ? "Check-in guardado" : "Check-in guardado en este dispositivo");
      await queryClient.invalidateQueries({ queryKey: ["passport-bundle", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["weekly-rankings"] });
    },
    onError: (error) => toast.error(error?.message || "No se pudo guardar el check-in."),
  });

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] bg-[#060606] px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <div className="inline-flex rounded-full border border-[#efbf3a]/25 bg-[#efbf3a]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#efbf3a]">Sozzial Passport</div>
          <h1 className="mt-3 text-[clamp(2rem,8vw,4rem)] font-black leading-none">Colecciona momentos reales.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-400">Haz check-in, confirma precios, completa misiones y haz que tu perfil merezca la visita.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
          <section className="surface-card rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black">Check-in rapido</div>
                <div className="mt-1 text-sm text-stone-500">Confirma que ese slice existe hoy.</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
                <MapPin className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <select value={spotId} onChange={(event) => setSpotId(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-[#171717] px-4 text-sm text-white outline-none">
                <option value="">Elige un sitio</option>
                {spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name}</option>)}
              </select>
              <Input value={slicePrice} onChange={(event) => setSlicePrice(event.target.value)} inputMode="decimal" placeholder={selectedSpot?.slice_price ? `Precio actual: $${selectedSpot.slice_price}` : "Precio del slice, ej. 3.25"} className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota corta: fresco, lleno, cambio de precio..." className="min-h-24 rounded-2xl border-white/10 bg-white/[0.04] text-white" />
              <Button disabled={!spotId || checkIn.isPending} onClick={() => checkIn.mutate()} className="h-12 w-full rounded-2xl bg-[#df5b43] font-black text-white hover:bg-[#c84b35]">
                <Send className="mr-2 h-4 w-4" />{checkIn.isPending ? "Guardando..." : "Hacer check-in"}
              </Button>
            </div>
          </section>

          <section className="surface-card rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black">Progreso semanal</div>
                <div className="mt-1 text-sm text-stone-500">Misiones que hacen mejor el mapa.</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white">
                {totalProgress}/{totalTarget}
              </div>
            </div>
            <div className="stagger-in mt-5 grid gap-3">
              {PASSPORT_TASKS.map((task) => <Mission key={task.id} task={task} value={progressForTask(task, bundle)} />)}
            </div>
          </section>
        </div>

        <section className="surface-card mt-4 rounded-[28px] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-xl font-black"><BadgeCheck className="h-5 w-5 text-[#efbf3a]" />Check-ins recientes</div>
          {isLoading ? <div className="text-sm text-stone-500">Cargando...</div> : null}
          <div className="stagger-in grid gap-3 md:grid-cols-2">
            {(bundle.checkins || []).slice(0, 8).map((row, index) => (
              <div key={row.id || `${row.spot_id}-${index}`} className="soft-list-item rounded-[22px] p-4">
                <div className="flex items-center gap-2 font-black text-white"><Pizza className="h-4 w-4 text-[#efbf3a]" />{row.spots?.name || row.spot_name || "Sitio de pizza"}</div>
                <div className="mt-1 text-xs text-stone-500">{new Date(row.created_at).toLocaleString()}</div>
                {row.slice_price ? <div className="mt-2 text-sm text-stone-300">Slice verificado: ${Number(row.slice_price).toFixed(2)}</div> : null}
                {row.note ? <div className="mt-2 text-sm leading-6 text-stone-400">{row.note}</div> : null}
              </div>
            ))}
            {!isLoading && !(bundle.checkins || []).length ? <div className="rounded-[22px] border border-dashed border-white/10 p-8 text-center text-sm text-stone-500 md:col-span-2">Todavia no hay check-ins.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
