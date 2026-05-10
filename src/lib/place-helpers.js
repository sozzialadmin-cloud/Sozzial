export function formatPrice(price) {
  const value = Number(price || 0);
  return value ? `$${value.toFixed(2)}` : "-";
}

export function getValueLabel(place) {
  const price = Number(place?.standard_slice_price || 0);
  const rating = Number(place?.average_rating || 0);

  if (price && price <= 2.25) return "Chollo";
  if (price && price <= 3.25 && rating >= 4.2) return "Buen precio";
  if (rating >= 4.7 && price <= 5.5) return "Merece la pena";
  if (price >= 6 && rating < 4.5) return "Caro";
  if (price >= 6) return "Premium";
  return "Buen valor";
}

export function getValueTone(place) {
  const label = getValueLabel(place);
  if (["Chollo", "Buen precio", "Merece la pena"].includes(label)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (label === "Caro") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }
  if (label === "Premium") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }
  return "border-white/10 bg-white/[0.05] text-stone-300";
}

export function isOpenNow(hours) {
  if (!hours || typeof hours !== 'string') return null;
  const match = hours.match(/(\d{1,2}:\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (time, period) => {
    const [rawHour, rawMinute] = time.split(':').map(Number);
    let hour = rawHour % 12;
    if (period.toUpperCase() === 'PM') hour += 12;
    return hour * 60 + rawMinute;
  };

  let start = toMinutes(match[1], match[2]);
  let end = toMinutes(match[3], match[4]);

  if (end <= start) return current >= start || current <= end;
  return current >= start && current <= end;
}

export function formatUpdateRecency(dateString) {
  if (!dateString) return 'Sin fecha';
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return dateString;
  const diff = Math.max(0, Date.now() - target.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Actualizado hoy';
  if (days === 1) return 'Actualizado hace 1 dia';
  if (days < 7) return `Actualizado hace ${days} dias`;
  if (days < 30) return `Actualizado hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) === 1 ? '' : 's'}`;
  return `Actualizado hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) === 1 ? '' : 'es'}`;
}

export function getHangoutVibe(hangout) {
  if (hangout?.vibe) return hangout.vibe;
  const title = `${hangout?.titulo || ''} ${hangout?.descripcion || ''}`.toLowerCase();
  if (title.includes('late')) return 'Noche';
  if (title.includes('crawl')) return 'Ruta de slices';
  if (title.includes('premium')) return 'Plan premium';
  if (title.includes('budget')) return 'Plan barato';
  return 'Plan casual';
}

export function formatHangoutDate(dateString) {
  if (!dateString) return 'Sin fecha';
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function getOpenStatusLabel(place) {
  const state = isOpenNow(place?.hours);
  if (state === true) return 'Abierto ahora';
  if (state === false) return 'Cerrado ahora';
  return 'Revisar horario';
}

export function getQuickTake(place) {
  const value = getValueLabel(place);
  const price = Number(place?.standard_slice_price || 0);
  const rating = Number(place?.average_rating || 0);

  if (value === 'Chollo') return `Parada barata de verdad. Por ${formatPrice(price)}, es un sitio para guardar cuando el precio importa mas que el hype.`;
  if (value === 'Buen precio') return `Muy buena relacion precio-disfrute. Barato para repetir y suficientemente bueno para recomendar.`;
  if (value === 'Merece la pena') return `No es el slice mas barato, pero la calidad justifica pagar un poco mas.`;
  if (value === 'Premium') return `Parada premium. Pagas mas que en la zona barata, asi que la clave es si la calidad acompana.`;
  if (value === 'Caro') return `Esta en zona cara sin suficiente fuerza en valoraciones como para parecer una apuesta clara.`;
  if (rating >= 4.5) return `Sitio solido, con calidad suficiente para justificar la parada aunque no sea el mas barato.`;
  return `Parada practica cuando quieres algo fiable sin complicarte demasiado.`;
}

export function getEditorialBullets(place) {
  const bullets = [];
  const value = getValueLabel(place);
  const price = Number(place?.standard_slice_price || 0);
  const rating = Number(place?.average_rating || 0);

  if (price && price <= 3.5) bullets.push('Funciona bien para comer barato.');
  if (rating >= 4.7) bullets.push('La valoracion justifica desviarse un poco.');
  if (place?.best_known_slice) bullets.push(`Pide primero ${place.best_known_slice}.`);
  if (isOpenNow(place?.hours) === true) bullets.push('Ahora mismo es util porque esta abierto.');
  if (value === 'Premium' || value === 'Caro') bullets.push('Mejor para parada planeada que para cazar slices baratos.');

  return bullets.slice(0, 3);
}

export function getBestFor(place) {
  const results = [];
  const price = Number(place?.standard_slice_price || 0);
  const open = isOpenNow(place?.hours);
  const value = getValueLabel(place);

  if (price && price <= 3.5) results.push('Plan barato');
  if (open === true && String(place?.hours || '').includes('AM')) results.push('Noche');
  if (value === 'Merece la pena' || value === 'Premium') results.push('Un gran slice');
  if (place?.borough === 'Brooklyn' || place?.borough === 'Manhattan') results.push('Quedada rapida');

  return results.slice(0, 3);
}

export function getQueueHint(place) {
  const value = getValueLabel(place);
  if (value === 'Premium') return 'Puede haber espera en horas punta.';
  if (value === 'Merece la pena') return 'Suele compensar una cola corta.';
  if (value === 'Chollo' || value === 'Buen precio') return 'Buena opcion rapida si importa el precio.';
  return 'Bueno para una parada casual.';
}

export function getAtmosphereTags(place) {
  const tags = [];
  const category = String(place?.category || '').toLowerCase();
  const description = String(place?.description || '').toLowerCase();
  const value = getValueLabel(place);
  if (value === 'Premium') tags.push('Merece desvio');
  if (value === 'Caro') tags.push('Zona turistica');
  if (category.includes('budget')) tags.push('Barato y rapido');
  if (category.includes('square')) tags.push('Slice especial');
  if (category.includes('gourmet') || category.includes('neapolitan')) tags.push('Visita planeada');
  if (String(place?.hours || '').includes('AM')) tags.push('Opcion nocturna');
  if (description.includes('queue') || value === 'Premium') tags.push('Posible cola');
  return Array.from(new Set(tags)).slice(0, 3);
}

export function getGoogleMapsUrl(place) {
  const address = [place?.name, place?.address, place?.borough].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function getNearbyComparisons(place, places = []) {
  if (!place || !Array.isArray(places)) return [];
  return places
    .filter((candidate) => candidate?.id !== place.id && candidate?.borough === place.borough)
    .sort((a, b) => Math.abs(Number(a.standard_slice_price || 0) - Number(place.standard_slice_price || 0)) - Math.abs(Number(b.standard_slice_price || 0) - Number(place.standard_slice_price || 0)))
    .slice(0, 3)
    .map((candidate) => {
      const diff = Number(candidate.standard_slice_price || 0) - Number(place.standard_slice_price || 0);
      const diffLabel = diff === 0 ? 'mismo precio' : diff > 0 ? `${formatPrice(diff)} mas` : `${formatPrice(Math.abs(diff))} menos`;
      return {
        ...candidate,
        diffLabel,
      };
    });
}

