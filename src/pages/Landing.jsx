import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Map, Pizza, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const slides = [
  {
    eyebrow: 'Mapa publico',
    title: 'Buenos slices, mas rapido.',
    text: 'Abre el mapa, compara precio, valoracion y mejor slice, y encuentra sitios que merecen la pena.',
    icon: Map,
    tone: 'from-[#111111] via-[#181818] to-[#2b2b28]',
    accent: 'text-[#f3be35]',
    summary: 'Precio + mapa',
  },
  {
    eyebrow: 'Descubre planes',
    title: 'Apuntarte debe ser facil.',
    text: 'Unete a planes reales de pizza en segundos con una experiencia rapida, clara y social.',
    icon: Flame,
    tone: 'from-[#2a140f] via-[#571d16] to-[#8f2c21]',
    accent: 'text-[#ffd6c9]',
    summary: 'Planes sociales',
  },
  {
    eyebrow: 'Tu cuenta',
    title: 'Crea planes y grupos.',
    text: 'Publica sitios, guarda planes, entra en grupos y organiza la parte social desde una sola cuenta.',
    icon: Users,
    tone: 'from-[#173322] via-[#255334] to-[#3f744c]',
    accent: 'text-[#f4f0d7]',
    summary: 'Cuenta + grupos',
  },
];

export default function Landing() {
  const [index, setIndex] = useState(0);
  const slide = useMemo(() => slides[index], [index]);
  const Icon = slide.icon;

  const goTo = (next) => {
    if (next < 0 || next >= slides.length) return;
    setIndex(next);
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#f5f0e7] text-[#111111]">
      <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden px-4 pb-3 pt-4">
        <div className="shrink-0 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#f0bf39] text-[#111111] shadow-[0_16px_32px_rgba(240,191,57,0.22)]">
              <Pizza className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[clamp(1.95rem,7vw,2.45rem)] font-black leading-none tracking-tight">Sozzial</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a8174]">sitios, planes y passport</div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center pb-4">
          <div className="rounded-[28px] border border-black/10 bg-[#fffaf1] p-3 shadow-[0_24px_60px_rgba(34,25,11,0.12)]">
            <motion.div
              key={slide.eyebrow}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={(_, info) => {
                if (info.offset.x <= -80) goTo(index + 1);
                if (info.offset.x >= 80) goTo(index - 1);
              }}
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className={`relative flex min-h-[438px] flex-col overflow-hidden rounded-[24px] bg-gradient-to-br ${slide.tone} p-5 text-white`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                    {slide.eyebrow}
                  </div>
                  <h1 className="mt-4 max-w-[14rem] text-[clamp(2rem,8.5vw,2.9rem)] font-black leading-[0.94] tracking-tight">
                    {slide.title}
                  </h1>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/12 backdrop-blur-sm">
                  <Icon className={`h-6 w-6 ${slide.accent}`} />
                </div>
              </div>

              <p className="mt-5 max-w-[17rem] text-[15px] leading-7 text-white/82">{slide.text}</p>

              <div className="mt-auto space-y-4 pt-5">
                <div className="grid grid-cols-3 gap-2">
                  {slides.map((item, i) => (
                    <button
                      key={item.eyebrow}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        i === index ? 'border-white/22 bg-white/14 text-white' : 'border-white/10 bg-black/10 text-white/72'
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.18em]">0{i + 1}</div>
                      <div className="mt-1 text-xs leading-5">{item.summary}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <div className="flex items-center justify-center gap-2" aria-label="Slide indicators">
                    {slides.map((item, i) => (
                      <button
                        key={`${item.eyebrow}-dot`}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={`h-2.5 rounded-full transition-all duration-200 ${
                          i === index ? 'w-7 bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.08)]' : 'w-2.5 bg-white/35 hover:bg-white/60'
                        }`}
                        aria-label={`Ir a la diapositiva ${i + 1}`}
                        aria-pressed={i === index}
                      />
                    ))}
                  </div>

                  <div className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Desliza para ver mas</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="shrink-0 space-y-3">
          <Link to={createPageUrl('Home')}>
            <Button className="h-14 w-full rounded-[18px] border-0 bg-[#f0bf39] px-5 text-base font-black text-[#111111] shadow-[0_18px_36px_rgba(240,191,57,0.22)] hover:bg-[#d9a826]">
              Ir al mapa
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" className="h-14 w-full rounded-[18px] border-black/10 bg-[#fffaf1] text-base font-semibold text-[#141414] hover:bg-white">
              Ir a mi cuenta
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

