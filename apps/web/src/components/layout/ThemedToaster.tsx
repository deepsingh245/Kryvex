"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/providers/ThemeProvider";

export function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} richColors closeButton />;
}
