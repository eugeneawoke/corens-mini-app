"use client";

import { Compass, Sparkle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SLIDES = [
  {
    icon: "compass",
    title: "Живой контакт",
    text: "Corens — это живой контакт с людьми рядом, без ленты и алгоритмов",
  },
  {
    icon: "sparkle",
    title: "Умный поиск",
    text: "Мы подбираем людей по состоянию, намерению и ключам доверия — автоматически",
  },
  {
    icon: "beacon",
    title: "Маяк",
    text: "Включите маяк, когда хочется познакомиться прямо сейчас. Люди с похожим состоянием рядом увидят вас первыми",
  },
] as const;

function SlideIcon({ kind }: { kind: string }) {
  if (kind === "compass") return <Compass size={32} />;
  if (kind === "sparkle") return <Sparkle size={32} />;
  return (
    <svg
      width="32"
      height="32"
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
  );
}

export function IntroSlides() {
  const [current, setCurrent] = useState(0);
  const router = useRouter();
  const isLast = current === SLIDES.length - 1;

  useEffect(() => {
    if (isLast) return;
    const timer = setTimeout(() => setCurrent((c) => c + 1), 4000);
    return () => clearTimeout(timer);
  }, [current, isLast]);

  const advance = () => {
    if (isLast) {
      router.push("/onboarding");
    } else {
      setCurrent((c) => c + 1);
    }
  };

  return (
    <div className="corens-intro">
      <div
        className="corens-intro-slides-wrap"
        onClick={advance}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && advance()}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="corens-intro-slide"
            data-active={String(i === current)}
          >
            <div className="corens-intro-icon">
              <SlideIcon kind={slide.icon} />
            </div>
            <h1 className="corens-hero-title">{slide.title}</h1>
            <p className="corens-copy corens-copy-muted">{slide.text}</p>
          </div>
        ))}
      </div>

      <div className="corens-intro-footer">
        <div className="corens-intro-indicator" aria-hidden="true">
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
            className="corens-button corens-button-primary"
            onClick={(e) => {
              e.stopPropagation();
              router.push("/onboarding");
            }}
          >
            Настроить профиль
          </button>
        )}
      </div>
    </div>
  );
}
