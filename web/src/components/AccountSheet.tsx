"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, LogOut, ArrowUpRight } from "lucide-react";
import { explorerUrl, shortAddr } from "@/lib/contracts";
import { useLang } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

export function AccountSheet({
  open,
  onClose,
  address,
  onDisconnect,
}: {
  open: boolean;
  onClose: () => void;
  address: `0x${string}`;
  onDisconnect: () => void;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0b0b0b] p-6 pb-8 shadow-2xl sm:rounded-3xl sm:pb-6"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.2, ease: EASE } }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {/* 손잡이 바 */}
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              {t("연결된 지갑", "Connected wallet")}
            </p>

            <div className="mt-4 flex items-center gap-4">
              <span
                className="h-12 w-12 shrink-0 rounded-full ring-1 ring-white/10"
                style={{
                  background: `conic-gradient(from 140deg, #f5c451, #b07c2b, #f5c451, #d9a441)`,
                }}
              />
              <div className="min-w-0">
                <p className="truncate font-mono text-lg text-white">{shortAddr(address)}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  GIWA Sepolia
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={copy}
                className="pressable flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm text-white/80 transition-colors hover:border-white/20"
              >
                <span className="flex items-center gap-3">
                  {copied ? (
                    <Check size={16} className="text-emerald-300" />
                  ) : (
                    <Copy size={16} className="text-white/40" />
                  )}
                  {copied ? t("복사됨", "Copied") : t("주소 복사", "Copy address")}
                </span>
                <span className="font-mono text-xs text-white/30">{shortAddr(address)}</span>
              </button>

              <a
                href={explorerUrl(`address/${address}`)}
                target="_blank"
                rel="noreferrer"
                className="pressable flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm text-white/80 transition-colors hover:border-white/20"
              >
                <span className="flex items-center gap-3">
                  <ArrowUpRight size={16} className="text-white/40" />
                  {t("익스플로러에서 보기", "View on explorer")}
                </span>
              </a>

              <button
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="pressable mt-1 flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10"
              >
                <LogOut size={16} />
                {t("연결 해제", "Disconnect")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
