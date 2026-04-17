"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  LACUNA_GRAPH_TUNING_DEFAULTS,
  LACUNA_GRAPH_TUNING_STORAGE_KEY,
  type LacunaGraphTuning,
  loadLacunaGraphTuning,
  mergeLacunaGraphTuningPatch,
  saveLacunaGraphTuning,
} from "@/lib/lacuna-graph-tuning";

export const LACUNA_GRAPH_TUNING_CHANGED_EVENT = "lacuna-graph-tuning-changed";

type LacunaGraphTuningContextValue = {
  tuning: LacunaGraphTuning;
  setTuning: (next: LacunaGraphTuning) => void;
  patchTuning: (patch: Partial<LacunaGraphTuning>) => void;
  resetTuning: () => void;
};

const LacunaGraphTuningContext =
  createContext<LacunaGraphTuningContextValue | null>(null);

let snapshotCache: LacunaGraphTuning = LACUNA_GRAPH_TUNING_DEFAULTS;
let snapshotKey = "";

function tuningSnapshot(): LacunaGraphTuning {
  const loaded = loadLacunaGraphTuning();
  const key = JSON.stringify(loaded);
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshotCache = loaded;
  }
  return snapshotCache;
}

function subscribeTuning(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === LACUNA_GRAPH_TUNING_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LACUNA_GRAPH_TUNING_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LACUNA_GRAPH_TUNING_CHANGED_EVENT, onChange);
  };
}

export function LacunaGraphTuningProvider({ children }: { children: ReactNode }) {
  const tuning = useSyncExternalStore(
    subscribeTuning,
    tuningSnapshot,
    () => LACUNA_GRAPH_TUNING_DEFAULTS,
  );

  const setTuning = useCallback((next: LacunaGraphTuning) => {
    saveLacunaGraphTuning(next);
    window.dispatchEvent(new Event(LACUNA_GRAPH_TUNING_CHANGED_EVENT));
  }, []);

  const patchTuning = useCallback((patch: Partial<LacunaGraphTuning>) => {
    const merged = mergeLacunaGraphTuningPatch(loadLacunaGraphTuning(), patch);
    saveLacunaGraphTuning(merged);
    window.dispatchEvent(new Event(LACUNA_GRAPH_TUNING_CHANGED_EVENT));
  }, []);

  const resetTuning = useCallback(() => {
    saveLacunaGraphTuning(LACUNA_GRAPH_TUNING_DEFAULTS);
    window.dispatchEvent(new Event(LACUNA_GRAPH_TUNING_CHANGED_EVENT));
  }, []);

  const value = useMemo(
    () => ({ tuning, setTuning, patchTuning, resetTuning }),
    [tuning, setTuning, patchTuning, resetTuning],
  );

  return (
    <LacunaGraphTuningContext.Provider value={value}>
      {children}
    </LacunaGraphTuningContext.Provider>
  );
}

export function useLacunaGraphTuningOptional(): LacunaGraphTuningContextValue | null {
  return useContext(LacunaGraphTuningContext);
}

export function useLacunaGraphTuning(): LacunaGraphTuningContextValue {
  const ctx = useContext(LacunaGraphTuningContext);
  if (!ctx) {
    throw new Error("useLacunaGraphTuning requires LacunaGraphTuningProvider");
  }
  return ctx;
}
