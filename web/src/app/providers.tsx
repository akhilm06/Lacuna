"use client";

import type { ReactNode } from "react";

import { LacunaGraphTuningProvider } from "@/components/lacuna-graph-tuning-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <LacunaGraphTuningProvider>{children}</LacunaGraphTuningProvider>;
}
