"use client";

import { Button } from "./Button";

export function PrintButton() {
  return (
    <Button type="button" variant="accent" size="sm" onClick={() => window.print()} className="print:hidden">
      🖨 Cetak
    </Button>
  );
}
