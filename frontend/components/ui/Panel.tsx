import React from "react";
import { clsx } from "clsx";

interface PanelProps {
  id?: string;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
}

export function Panel({
  id,
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
  contentClassName,
  headerClassName,
}: PanelProps) {
  const hasHeader = title || subtitle || badge || actions;

  return (
    <section
      id={id}
      className={clsx(
        "relative rounded-xl bg-surface/70 backdrop-blur-md border border-surface-border transition-colors flex flex-col overflow-hidden shadow-lg scroll-mt-6",
        className
      )}
    >
      {hasHeader && (
        <header
          className={clsx(
            "flex items-center justify-between px-5 py-3.5 border-b border-surface-border/80 bg-slate-950/30 select-none",
            headerClassName
          )}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              {title && (
                <h2 className="text-sm font-semibold font-sans tracking-wide uppercase text-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {title}
                </h2>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-text-secondary font-sans font-normal pl-4">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className={clsx("p-5 flex-1", contentClassName)}>{children}</div>
    </section>
  );
}
