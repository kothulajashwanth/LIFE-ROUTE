"use client";

import React, { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
  backendConnected: boolean;
  backendHealthStatus?: string;
  loading?: boolean;
  onRetry?: () => void;
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
  onLaunchJuryDemo?: () => void;
  onOpenHelp?: () => void;
  juryMode?: boolean;
  onToggleJuryMode?: () => void;
}

export function AppShell({
  children,
  backendConnected,
  backendHealthStatus,
  loading = false,
  onRetry,
  activeNavId = "overview",
  onNavSelect,
  onLaunchJuryDemo,
  onOpenHelp,
  juryMode = true,
  onToggleJuryMode,
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen h-[100dvh] bg-background text-slate-100 flex flex-col bg-grid relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-cyan-950/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-blue-950/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Header */}
      <Header
        backendConnected={backendConnected}
        backendHealthStatus={backendHealthStatus}
        loading={loading}
        onRetry={onRetry}
        onMenuToggle={() => setMobileSidebarOpen((prev) => !prev)}
        onLaunchJuryDemo={onLaunchJuryDemo}
        onOpenHelp={onOpenHelp}
        juryMode={juryMode}
        onToggleJuryMode={onToggleJuryMode}
      />

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeId={activeNavId}
          onSelect={onNavSelect}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <main
          id="main-scroll-container"
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 space-y-6 max-w-[1600px] mx-auto w-full scroll-smooth"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
