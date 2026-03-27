"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpCircle, X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpStep {
  icon: string;
  text: string;
}

interface ContextualHelpProps {
  pageId: string;
  title: string;
  steps: HelpStep[];
  tip?: string;
}

export function ContextualHelp({ pageId, title, steps, tip }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);

  const storageKey = `contextual-help-dismissed:${pageId}`;

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        setShouldPulse(true);
      }
    } catch {
      // localStorage unavailable — no pulse
    }
  }, [storageKey]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setShouldPulse(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // localStorage unavailable — silent fail
    }
  }, [storageKey]);

  return (
    <>
      {/* Floating help button */}
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-20 right-6 z-40",
          "flex h-10 w-10 items-center justify-center",
          "rounded-full bg-card border border-border shadow-lg",
          "text-text-secondary hover:text-primary hover:border-primary/40",
          "transition-all duration-200 hover:shadow-xl",
          shouldPulse && "animate-help-pulse"
        )}
        aria-label="Page help"
      >
        <HelpCircle className="h-[18px] w-[18px]" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px] transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Slide-up panel */}
      <div
        className={cn(
          "fixed bottom-20 right-6 z-50 w-[min(380px,calc(100vw-3rem))]",
          "origin-bottom-right transition-all duration-300 ease-out",
          isOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-4 opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="rounded-xl bg-card border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Quick Guide
              </p>
              <h3 className="text-[13px] font-semibold text-text-primary mt-0.5">
                {title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                "text-text-tertiary hover:text-text-primary hover:bg-secondary",
                "transition-colors"
              )}
              aria-label="Close help"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-border" />

          {/* Steps */}
          <div className="px-5 py-3 space-y-2.5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[12px] leading-none">
                  {step.icon}
                </span>
                <p className="text-[12px] leading-[1.5] text-text-secondary pt-[2px]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          {/* Tip */}
          {tip && (
            <>
              <div className="mx-5 border-t border-border" />
              <div className="px-5 py-3 flex items-start gap-2.5">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-accent-teal mt-[1px]" />
                <p className="text-[11px] leading-[1.5] text-text-tertiary">
                  {tip}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
