"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

const EASE = [0.23, 1, 0.32, 1] as const;

export type DropdownOption = { label: string; value: number; hint?: string };

export function Dropdown({
  value,
  options,
  onChange,
}: {
  value: number;
  options: DropdownOption[];
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`pressable flex h-12 w-full items-center justify-between rounded-xl border bg-white/[0.03] px-4 text-sm text-white transition-colors ${
          open ? "border-white/30" : "border-white/10 hover:border-white/20"
        }`}
      >
        <span>{selected?.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="text-white/35"
        >
          <ChevronDown size={15} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: EASE }}
            style={{ transformOrigin: "top" }}
            className="absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <motion.li
                  key={opt.value}
                  initial={{ opacity: 0, y: -3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: 0.02 + i * 0.025, ease: EASE }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-white/[0.07] text-white"
                        : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>
                      {opt.label}
                      {opt.hint && (
                        <span className="ml-2 text-xs text-white/30">{opt.hint}</span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="text-white/70" />}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
