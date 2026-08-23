import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

export function Loading() {
  const { progress } = useProgress();
  const shownProgress = Math.min(99, Math.round(progress));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        background: "#1c2431",
        color: "#e8e2d8",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "1rem",
          textShadow: "0 0 20px rgba(255,90,30,0.35)",
        }}
      >
        LOADING SCENE {shownProgress}%
      </div>
      <div
        style={{
          width: "min(280px, 62vw)",
          height: "1px",
          background: "rgba(232,226,216,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${shownProgress}%`,
            height: "100%",
            background: "#e8e2d8",
            boxShadow: "0 0 16px rgba(255,90,30,0.55)",
            transition: "width 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}

export function RestartButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      const t = max > 0 ? window.scrollY / max : 0;
      setVisible(t > 0.92);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: "fixed",
        bottom: "8%",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.6s ease",
        background: "transparent",
        border: "1px solid rgba(232,226,216,0.5)",
        color: "#e8e2d8",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        fontSize: "0.9rem",
        padding: "0.9em 2em",
        cursor: "pointer",
        borderRadius: "2px",
        backdropFilter: "blur(4px)",
        zIndex: 10,
      }}
    >
      Restart
    </button>
  );
}

export function CTAText() {
  const ref = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const el = ref.current;
    gsap.fromTo(
      el,
      { opacity: 1 },
      {
        opacity: 0,
        scrollTrigger: {
          trigger: document.body,
          start: 0,
          end: "20% top",
          scrub: true,
        },
      },
    );
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e8e2d8",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        fontSize: "2rem",
        pointerEvents: "none",
        textShadow: "0 0 20px rgba(255,90,30,0.4)",
      }}
    >
      Scroll
    </div>
  );
}
