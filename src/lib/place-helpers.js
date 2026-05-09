export function formatPrice(price) {
  const value = Number(price || 0);
  return value ? `$${value.toFixed(2)}` : "-";
}

export function getValueLabel(place) {
  const price = Number(place?.standard_slice_price || 0);
  const rating = Number(place?.average_rating || 0);

  if (price && price <= 2.25) return "Steal";
  if (price && price <= 3.25 && rating >= 4.2) return "Best budget";
  if (rating >= 4.7 && price <= 5.5) return "Worth it";
  if (price >= 6 && rating < 4.5) return "Overpriced";
  if (price >= 6) return "Premium";
  return "Good value";
}

export function getValueTone(place) {
  const label = getValueLabel(place);
  if (["Steal", "Best budget", "Worth it"].includes(label)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (label === "Overpriced") {
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
  if (!dateString) return 'Unknown';
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return dateString;
  const diff = Math.max(0, Date.now() - target.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1 day ago';
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} ago`;
  return `Updated ${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} ago`;
}

export function getHangoutVibe(hangout) {
  if (hangout?.vibe) return hangout.vibe;
  const title = `${hangout?.titulo || ''} ${hangout?.descripcion || ''}`.toLowerCase();
  if (title.includes('late')) return 'Late-night';
  if (title.includes('crawl')) return 'Slice crawl';
  if (title.includes('premium')) return 'Premium try';
  if (title.includes('budget')) return 'Budget run';
  return 'Casual bite';
}

export function formatHangoutDate(dateString) {
  if (!dateString) return 'No date';
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
  if (state === true) return 'Open now';
  if (state === false) return 'Closed now';
  return 'Check hours';
}

export function getQuickTake(place) {
  const value = getValueLabel(place);
  const price = Number(place?.standard_slice_price || 0);
  const rating = Number(place?.average_rating || 0);

  if (value === 'Steal') return `A real low-price stop. At ${formatPrice(price)}, this is the kind of place you save for when price matters more than hype.`;
  if (value === 'Best budget') return `One of the strongest price-to-pleasure plays on the map. Cheap enough to feel easy, good enough to recommend.`;
  if (value === 'Worth it') return `Not the cheapest slice around, but quality is high enough that plenty of people still see it as money well spent.`;
  if (value === 'Premium') return `This is a premium stop. You are paying above the budget lane, so the question is whether the slice quality matches the hype.`;
  if (value === 'Overpriced') return `This spot sits in the expensive lane without delivering enough rating power to feel like an obvious win.`;
  if (rating >= 4.5) return `Solid all-rounder with enough quality to justify the stop, even if it is not the cheapest option nearby.`;
  return `A practical slice stop when you want something dependable without turning the decision into a big event.`;
}

export function getEditorialBullets(place) {
  const bullets = [];
  const value = getValueLabel(place);
  const price = Number(place?.standard_slice_price || 0);
  const rating = Number(place?.average_rating || 0);

  if (price && price <= 3.5) bullets.push('Works well for low-budget slice runs.');
  if (rating >= 4.7) bullets.push('Quality score is strong enough to justify a detour.');
  if (place?.best_known_slice) bullets.push(`Order ${place.best_known_slice} first.`);
  if (isOpenNow(place?.hours) === true) bullets.push('Useful right now because it is currently open.');
  if (value === 'Premium' || value === 'Overpriced') bullets.push('Better for a planned stop than a casual cheap-slice hunt.');

  return bullets.slice(0, 3);
}

export function getBestFor(place) {
  const results = [];
  const price = Number(place?.standard_slice_price || 0);
  const open = isOpenNow(place?.hours);
  const value = getValueLabel(place);

  if (price && price <= 3.5) results.push('Budget run');
  if (open === true && String(place?.hours || '').includes('AM')) results.push('Late night');
  if (value === 'Worth it' || value === 'Premium') results.push('One great slice');
  if (place?.borough === 'Brooklyn' || place?.borough === 'Manhattan') results.push('Quick meet-up');

  return results.slice(0, 3);
}

export function getQueueHint(place) {
  const value = getValueLabel(place);
  if (value === 'Premium') return 'Expect some wait at peak times.';
  if (value === 'Worth it') return 'Usually worth a short line.';
  if (value === 'Steal' || value === 'Best budget') return 'Fast choice when price matters.';
  return 'Good for a casual stop.';
}

export function getAtmosphereTags(place) {
  const tags = [];
  const category = String(place?.category || '').toLowerCase();
  const description = String(place?.description || '').toLowerCase();
  const value = getValueLabel(place);
  if (value === 'Premium') tags.push('Worth a detour');
  if (value === 'Overpriced') tags.push('Tourist-heavy');
  if (category.includes('budget')) tags.push('Fast cheap stop');
  if (category.includes('square')) tags.push('Signature slice');
  if (category.includes('gourmet') || category.includes('neapolitan')) tags.push('Planned visit');
  if (String(place?.hours || '').includes('AM')) tags.push('Late-night option');
  if (description.includes('queue') || value === 'Premium') tags.push('Possible line');
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
      const diffLabel = diff === 0 ? 'same price' : diff > 0 ? `${formatPrice(diff)} more` : `${formatPrice(Math.abs(diff))} less`;
      return {
        ...candidate,
        diffLabel,
      };
    });
}

