'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  PUBLIC_HERO_BACKGROUND_COLORS,
  PUBLIC_HERO_BACKGROUND_DIRECTIONS,
  type PublicHeroBackgroundColor,
  type PublicHeroBackgroundDirection,
  type PublicHeroBackgroundMode,
  type PublicHeroSlideRow,
} from '@/lib/cabinet-branding';
import { cn } from '@/lib/utils';

type Props = {
  mode: PublicHeroBackgroundMode;
  gradientFrom: PublicHeroBackgroundColor;
  gradientTo: PublicHeroBackgroundColor;
  gradientDirection: PublicHeroBackgroundDirection;
  imageUrl: string | null;
  overlay: number;
  sliderIntervalMs: number;
  slides: PublicHeroSlideRow[];
};

const COLOR_VALUES: Record<PublicHeroBackgroundColor, string> = {
  'slate-900': '#0f172a',
  'blue-600': '#2563eb',
  'indigo-600': '#4f46e5',
  'sky-600': '#0284c7',
  'emerald-600': '#059669',
  'violet-600': '#7c3aed',
  'rose-600': '#e11d48',
};

const DIRECTION_VALUES: Record<PublicHeroBackgroundDirection, string> = {
  'to-r': 'to right',
  'to-br': 'to bottom right',
  'to-b': 'to bottom',
  'to-tr': 'to top right',
  'to-l': 'to left',
};

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

export function PublicHeroBackground({
  mode,
  gradientFrom,
  gradientTo,
  gradientDirection,
  imageUrl,
  overlay,
  sliderIntervalMs,
  slides,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const activeSlides = useMemo(() => slides.filter((slide) => slide.isActive), [slides]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (mode !== 'SLIDER' || reducedMotion || activeSlides.length < 2) {
      setCurrentSlide(0);
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentSlide((index) => (index + 1) % activeSlides.length);
    }, Math.min(Math.max(sliderIntervalMs, 4000), 12000));

    return () => window.clearInterval(interval);
  }, [activeSlides.length, mode, reducedMotion, sliderIntervalMs]);

  const overlayStyle = {
    opacity: Math.min(Math.max(overlay, 0), 0.8),
  };

  if (mode === 'IMAGE' && imageUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950" style={overlayStyle} />
      </div>
    );
  }

  if (mode === 'SLIDER' && activeSlides.length > 0) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {activeSlides.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt={slide.altText ?? ''}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out',
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            )}
          />
        ))}
        <div className="absolute inset-0 bg-slate-950" style={overlayStyle} />
      </div>
    );
  }

  if (mode === 'ANIMATED') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none [animation-delay:1.8s]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none [animation-delay:3s]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-white/15 to-white/55" />
      </div>
    );
  }

  const from = COLOR_VALUES[PUBLIC_HERO_BACKGROUND_COLORS.includes(gradientFrom) ? gradientFrom : 'blue-600'];
  const to = COLOR_VALUES[PUBLIC_HERO_BACKGROUND_COLORS.includes(gradientTo) ? gradientTo : 'indigo-600'];
  const direction = DIRECTION_VALUES[PUBLIC_HERO_BACKGROUND_DIRECTIONS.includes(gradientDirection) ? gradientDirection : 'to-br'];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(${direction}, ${from}, ${to})`,
      }}
    >
      <div className="absolute inset-0 bg-white/20" style={overlayStyle} />
    </div>
  );
}
