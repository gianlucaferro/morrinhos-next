"use client";

import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = containerRef.current?.closest("main")?.scrollTop ?? window.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = Math.max(0, e.touches[0].clientY - startY.current);
    setPullDistance(Math.min(diff * 0.5, 120));
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const dist = pullDistance;
    if (dist >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(50);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {(pullDistance > 5 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: `${Math.max(pullDistance, refreshing ? 50 : 0)}px` }}
        >
          <RefreshCw
            className={`w-5 h-5 ${refreshing ? "animate-spin text-primary" : progress >= 1 ? "text-primary" : "text-muted-foreground"}`}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 180}deg)` }}
          />
          {!refreshing && pullDistance > 20 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {progress >= 1 ? "Solte para atualizar" : "Puxe para atualizar"}
            </span>
          )}
          {refreshing && (
            <span className="ml-2 text-xs text-primary">Atualizando...</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
