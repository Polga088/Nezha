'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  showControls?: boolean;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSlideTransitionClass(active: boolean, reducedMotion: boolean) {
  if (reducedMotion) {
    return active ? 'opacity-100' : 'opacity-0';
  }
  return cn(
    'opacity-0 scale-[1.03]',
    active ? 'opacity-100 scale-100' : 'pointer-events-none'
  );
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
  showControls = false,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const activeSlides = useMemo(() => slides.filter((slide) => slide.isActive), [slides]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (mode !== 'SLIDER' || reducedMotion || activeSlides.length < 2 || isPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentSlide((index) => (index + 1) % activeSlides.length);
    }, clamp(sliderIntervalMs, 4000, 12000));

    return () => window.clearInterval(interval);
  }, [activeSlides.length, isPaused, mode, reducedMotion, sliderIntervalMs]);

  useEffect(() => {
    if (currentSlide >= activeSlides.length) {
      setCurrentSlide(0);
    }
  }, [activeSlides.length, currentSlide]);

  const overlayStyle = {
    opacity: clamp(overlay, 0, 0.72),
  };

  const prevSlide = () => {
    if (activeSlides.length < 2) return;
    setCurrentSlide((index) => (index - 1 + activeSlides.length) % activeSlides.length);
  };

  const nextSlide = () => {
    if (activeSlides.length < 2) return;
    setCurrentSlide((index) => (index + 1) % activeSlides.length);
  };

  if (mode === 'IMAGE' && imageUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- média configurable */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-slate-950" style={overlayStyle} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_38%)]" />
      </div>
    );
  }

  if (mode === 'SLIDER' && activeSlides.length > 0) {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={() => setIsPaused(false)}
        aria-live="polite"
      >
        {activeSlides.map((slide, index) => {
          const active = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={cn(
                'absolute inset-0 transition-[opacity,transform] duration-1000 ease-out',
                getSlideTransitionClass(active, reducedMotion)
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- média configurable */}
              <img
                src={slide.imageUrl}
                alt={slide.altText ?? ''}
                className="h-full w-full object-cover object-center"
              />
            </div>
          );
        })}
        <div className="absolute inset-0 bg-slate-950" style={overlayStyle} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_38%)]" />

        {showControls && activeSlides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/30 px-3 py-2 backdrop-blur-md">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Image précédente"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <div className="flex items-center gap-1.5">
                {activeSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Voir l’image ${index + 1}`}
                    aria-current={index === currentSlide}
                    onClick={() => setCurrentSlide(index)}
                    className={cn(
                      'h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      index === currentSlide ? 'w-7 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Image suivante"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="hidden rounded-full border border-white/20 bg-slate-950/30 px-3 py-2 text-[11px] font-medium tracking-[0.18em] text-white/85 backdrop-blur-md md:inline-flex">
              Support visuel premium
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === 'ANIMATED') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-200/55 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-cyan-200/45 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none [animation-delay:1.6s]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/45 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none [animation-delay:3s]" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/25 to-white/70" />
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
      <div className="absolute inset-0 bg-white/18" style={overlayStyle} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.26),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_34%)]" />
    </div>
  );
}
