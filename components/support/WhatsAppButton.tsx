"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton() {
  const number = "447761109321";
  const link = `https://wa.me/${number}?text=Hi%20I%20need%20help%20with%20CaseBrain`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full flex items-center gap-2"
      onClick={() => window.open(link, "_blank")}
    >
      <MessageCircle className="h-4 w-4" />
      Chat on WhatsApp
    </Button>
  );
}

