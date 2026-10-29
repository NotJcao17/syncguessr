"use client";

import { useEffect, useState } from "react";
import { CatalogFacets } from "@/lib/types";

let cache: Promise<{ total: number; facets: CatalogFacets } | null> | null = null;

function loadCatalog() {
  cache ??= fetch("/api/catalog")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return cache;
}

/** Facet counts for the filter UI, fetched once per page load. */
export function useCatalog() {
  const [data, setData] = useState<{ total: number; facets: CatalogFacets } | null>(null);
  useEffect(() => {
    let alive = true;
    loadCatalog().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
