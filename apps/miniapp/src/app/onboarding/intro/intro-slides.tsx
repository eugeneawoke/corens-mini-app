"use client";

import { Compass, Sparkle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SLIDE_DURATION = 4000;

const SLIDES = [
  {
    icon: "compass" as const,
    title: "Живой контакт",
    text: "Corens — это живой контакт с людьми рядом, без ленты и алгоритмов",
  },
  {
    icon: "sparkle" as const,
    title: "Умный поиск",
    text: "Мы подбираем людей по состоянию, намерению и ключам доверия — автоматически",
  },
  {
    icon: "beacon" as const,
    title: "Маяк",
    text: "Включите маяк, когда хочется познакомиться прямо сейчас. Люди с похожим состоянием рядом увидят вас первыми",
  },
] as const;

function SlideIcon({ kind }: { kind: string }) {
  if (kind === "compass") {
    return (
      <div className="corens-intro-icon-anim corens-intro-icon-compass">
        <Compass size={44} />
      </div>
    );
  }
  if (kind === "sparkle") {
    return (
      <div className="corens-intro-icon-anim corens-intro-icon-sparkle">
        <Sparkle size={44} />
      </div>
    );
  }
  return (
    <div className="corens-intro-icon-anim corens-intro-icon-beacon">
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 21h14" />
        <path d="M8 21v-2h8v2" />
        <path d="M9 19l-1-8h8l-1 8" />
        <path d="M8.6 14.5h6.8" />
        <rect x="7" y="7" width="10" height="4" rx="0.5" />
        <path d="M7.5 7 Q12 4 16.5 7" />
      </svg>
    </div>
  );
}

export function IntroSlides() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const pressStartRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isLast = current === SLIDES.length - 1;

  useEffect(() => {
    if (isLast || isPaused) return;
    const timer = setTimeout(() => setCurrent((c) => c + 1), SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [current, isLast, isPaused, timerKey]);

  // Root-level pointer handlers — the root div is min-height:100dvh
  // so it always has a proper hit area (unlike the empty slides-wrap without a background).
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary pointer (first finger / left mouse)
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture may fail in some WebViews — continue anyway
    }
    pressStartRef.current = Date.now();
    setIsPaused(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    if (pressStartRef.current === null) return;

    const held = Date.now() - pressStartRef.current;
    pressStartRef.current = null;
    setIsPaused(false);

    if (held < 250) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeft = e.clientX < rect.left + rect.width / 2;
      if (isLeft) {
        if (current > 0) setCurrent((c) => c - 1);
      } else {
        if (isLast) router.push("/onboarding");
        else setCurrent((c) => c + 1);
      }
    } else {
      // Long hold — reset animation and timer on resume
      setTimerKey((k) => k + 1);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    pressStartRef.current = null;
    setIsPaused(false);
    setTimerKey((k) => k + 1);
  };

  return (
    <div
      ref={rootRef}
      className="corens-intro"
      data-paused={String(isPaused)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="corens-intro-slides-wrap">
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="corens-intro-slide"
            data-active={String(i === current)}
          >
            <SlideIcon kind={slide.icon} />
            <h1 className="corens-hero-title">{slide.title}</h1>
            <p className="corens-copy corens-copy-muted">{slide.text}</p>
          </div>
        ))}
      </div>

      <div className="corens-intro-footer">
        <div className="corens-intro-footer-row">
          {current > 0 && (
            <button
              type="button"
              className="corens-intro-back"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => {
                e.stopPropagation();
                setCurrent((c) => c - 1);
              }}
            >
              ← Назад
            </button>
          )}

          <div
            key={`${current}-${timerKey}`}
            className="corens-intro-indicator"
            aria-hidden="true"
          >
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className="corens-intro-dot"
                data-active={String(i === current)}
              />
            ))}
          </div>

          {isLast && (
            <button
              type="button"
              className="corens-intro-cta"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => {
                e.stopPropagation();
                router.push("/onboarding");
              }}
            >
              Настроить{" "}
              <span className="corens-intro-cta-arrow" aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
