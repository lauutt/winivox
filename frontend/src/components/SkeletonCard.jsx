import { memo } from 'react';

/**
 * SkeletonCard - Placeholder visual mientras se cargan las historias del feed
 * Mejora la percepción de rendimiento mostrando la estructura de las cards
 * Memoizado porque no recibe props y nunca necesita re-renderizar
 */
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-sand/70 bg-white p-4 shadow-lift animate-pulse">
      <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
        {/* Cover art placeholder */}
        <div className="h-28 w-full sm:h-24 sm:w-24 rounded-2xl bg-sand/50" />

        <div className="space-y-3">
          {/* Title placeholder */}
          <div className="h-4 w-3/4 bg-sand/50 rounded" />

          {/* Summary placeholders */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-sand/50 rounded" />
            <div className="h-3 w-5/6 bg-sand/50 rounded" />
          </div>

          {/* Tags placeholders */}
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-sand/50 rounded-full" />
            <div className="h-6 w-20 bg-sand/50 rounded-full" />
            <div className="h-6 w-14 bg-sand/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* Buttons placeholders */}
      <div className="flex gap-2">
        <div className="h-9 w-24 bg-sand/50 rounded-full" />
        <div className="h-9 w-28 bg-sand/50 rounded-full" />
        <div className="h-9 w-28 bg-sand/50 rounded-full" />
      </div>
    </article>
  );
});

export default SkeletonCard;
