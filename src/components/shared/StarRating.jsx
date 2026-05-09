import React, { useMemo, useState } from "react";

function StarSvg({ fill = 0, className = "" }) {
  const clamped = Math.max(0, Math.min(1, fill));
  const clipId = useMemo(() => `star-fill-${Math.random().toString(36).slice(2, 10)}`, []);

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="none"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * clamped} height="24" />
        </clipPath>
      </defs>

      <path
        d="M12 2.5l2.93 5.94 6.55.95-4.74 4.62 1.12 6.52L12 17.44 6.14 20.53l1.12-6.52L2.52 9.39l6.55-.95L12 2.5z"
        fill="#262626"
        stroke="#57534e"
        strokeWidth="1.2"
      />

      {clamped > 0 ? (
        <path
          d="M12 2.5l2.93 5.94 6.55.95-4.74 4.62 1.12 6.52L12 17.44 6.14 20.53l1.12-6.52L2.52 9.39l6.55-.95L12 2.5z"
          fill="#ef4444"
          stroke="#ef4444"
          strokeWidth="1.2"
          clipPath={`url(#${clipId})`}
        />
      ) : null}
    </svg>
  );
}

export default function StarRating({
  rating = 0,
  onRate,
  size = "md",
  interactive = false,
  step = 1,
  showValue = false,
}) {
  const [hoverRating, setHoverRating] = useState(null);
  const sizeMap = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };
  const iconSize = sizeMap[size] || sizeMap.md;
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const displayedRating = hoverRating ?? safeRating;

  const stars = [1, 2, 3, 4, 5];

  const getValueFromPointer = (star, event) => {
    if (step !== 0.5) return star;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return x < rect.width / 2 ? star - 0.5 : star;
  };

  const commit = (value) => {
    const normalized = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
    onRate?.(normalized);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {stars.map((star) => {
          const fill = Math.max(0, Math.min(1, displayedRating - (star - 1)));

          if (!interactive) {
            return <StarSvg key={star} fill={fill} className={iconSize} />;
          }

          return (
            <button
              key={star}
              type="button"
              onMouseMove={(event) => setHoverRating(getValueFromPointer(star, event))}
              onMouseLeave={() => setHoverRating(null)}
              onClick={(event) => commit(getValueFromPointer(star, event))}
              aria-label={`Rate ${star} stars`}
              className={`relative rounded-md p-0.5 transition-transform hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-red-500/60 ${iconSize}`}
            >
              <StarSvg fill={fill} className="h-full w-full" />
            </button>
          );
        })}
      </div>

      {showValue ? (
        <span className="min-w-[2.5rem] text-sm font-semibold tabular-nums text-stone-200">
          {displayedRating.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}

