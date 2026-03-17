"use client";

import { useEffect } from "react";

interface BrandingApplierProps {
  faviconUrl?: string | null;
  siteName?: string | null;
}

export function BrandingApplier({ faviconUrl, siteName }: BrandingApplierProps) {
  useEffect(() => {
    if (siteName) {
      document.title = siteName;
    }
  }, [siteName]);

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}
