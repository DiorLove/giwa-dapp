"use client";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

export function AboutSection() {
  const { t } = useLang();

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-black px-6 pt-32 pb-10 md:pt-44 md:pb-14"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-8 text-sm uppercase tracking-widest text-white/40"
        >
          {t("이음은", "IEUM is")}
        </motion.p>
        <motion.h2
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          initial={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          className="text-4xl leading-[1.15] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          {t("전세금도, 곗돈도 — 돈이 ", "Deposits and savings circles — ")}
          <span className="font-display italic text-white/60">
            {t("사람 손", "escrow")}
          </span>
          {t("을", " where money")}
          <br className="hidden md:block" />{" "}
          {t("거치지 않는 ", "never passes through ")}
          <span className="font-display italic text-white/60">
            {t("한국형 에스크로", "human hands")}
          </span>
          {t("입니다.", ".")}
        </motion.h2>
      </div>
    </section>
  );
}
