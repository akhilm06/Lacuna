import type { ReactNode } from "react";

import { AdminLeafPressBody } from "@/components/admin-leaf-press-body";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminLeafPressBody />
      {children}
    </>
  );
}
