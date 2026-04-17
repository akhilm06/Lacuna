"use client";

import { useEffect } from "react";

const BODY_CLASS = "admin-leaf-press";

export function AdminLeafPressBody() {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);
  return null;
}
