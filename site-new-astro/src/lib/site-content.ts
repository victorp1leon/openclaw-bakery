import rawSiteContent from "../data/site-content.generated.json";

export type SiteCatalogItem = {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imageUrl: string;
  imageSource?: "facebook" | "manual";
  porciones?: string;
  etiqueta?: string;
  clavePrecio?: string;
  orden?: number;
  productosRelacionados?: string[];
};

export type SiteFavoriteItem = {
  id: string;
  productId: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imageUrl: string;
  badge?: string;
  orden?: number;
  ctaTexto?: string;
  ctaPlantilla?: string;
};

export type SiteStep = {
  id: string;
  orden?: number;
  titulo: string;
  descripcion: string;
  icono?: string;
  imagenUrl?: string;
};

export type SiteTestimonial = {
  text: string;
  author: string;
};

export type SiteContent = {
  businessName: string;
  whatsapp: string;
  zones: string[];
  menuItems: Array<{ nombre: string; descripcion?: string; precio: number }>;
  catalogItems: SiteCatalogItem[];
  homeFavorites: SiteFavoriteItem[];
  cta: string;
  gallery: string[];
  facebookPageUrl?: string;
  instagramUrl?: string;
  heroImageUrl?: string;
  howToOrderSteps: string[];
  orderSteps: SiteStep[];
  testimonials: SiteTestimonial[];
  promoBar?: {
    text: string;
    linkLabel?: string;
    linkHref?: string;
  };
  customOrder: {
    title: string;
    description: string;
    occasions: string[];
    ctaLabel: string;
    ctaMessage: string;
  };
  contact?: {
    address?: string;
    mapEmbedUrl?: string;
  };
  brandAssets?: {
    logoUrl?: string;
    businessCardImageUrl?: string;
    businessCardNote?: string;
  };
  siteConfig: Record<string, string>;
};

function toString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function ensureAssetPath(value: string, fallback = ""): string {
  const raw = value.trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\//, "")}`;
}

function sortByOrder<T extends { orden?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
}

function parseCatalogItems(value: unknown): SiteCatalogItem[] {
  return sortByOrder(
    toArray(value)
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const row = item as Record<string, unknown>;
        const id = toString(row.id);
        const nombre = toString(row.nombre);
        const imageUrl = ensureAssetPath(toString(row.imageUrl));
        const precio = toNumber(row.precio, Number.NaN);
        if (!id || !nombre || !imageUrl || !Number.isFinite(precio)) return undefined;

        return {
          id,
          nombre,
          descripcion: toString(row.descripcion) || undefined,
          precio,
          categoria: toString(row.categoria) || undefined,
          imageUrl,
          imageSource: toString(row.imageSource) === "facebook" ? "facebook" : "manual",
          porciones: toString(row.porciones) || undefined,
          etiqueta: toString(row.etiqueta) || undefined,
          clavePrecio: toString(row.clavePrecio) || undefined,
          orden: Number.isFinite(Number(row.orden)) ? Number(row.orden) : undefined,
          productosRelacionados: toArray(row.productosRelacionados)
            .map((entry) => toString(entry))
            .filter((entry) => entry.length > 0)
        } satisfies SiteCatalogItem;
      })
      .filter((item): item is SiteCatalogItem => Boolean(item))
  );
}

function parseFavorites(value: unknown): SiteFavoriteItem[] {
  return sortByOrder(
    toArray(value)
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const row = item as Record<string, unknown>;
        const id = toString(row.id);
        const productId = toString(row.productId);
        const nombre = toString(row.nombre);
        const imageUrl = ensureAssetPath(toString(row.imageUrl));
        const precio = toNumber(row.precio, Number.NaN);
        if (!id || !productId || !nombre || !imageUrl || !Number.isFinite(precio)) return undefined;

        return {
          id,
          productId,
          nombre,
          descripcion: toString(row.descripcion) || undefined,
          precio,
          imageUrl,
          badge: toString(row.badge) || undefined,
          orden: Number.isFinite(Number(row.orden)) ? Number(row.orden) : undefined,
          ctaTexto: toString(row.ctaTexto) || undefined,
          ctaPlantilla: toString(row.ctaPlantilla) || undefined
        } satisfies SiteFavoriteItem;
      })
      .filter((item): item is SiteFavoriteItem => Boolean(item))
  );
}

function parseSteps(value: unknown): SiteStep[] {
  return sortByOrder(
    toArray(value)
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const row = item as Record<string, unknown>;
        const id = toString(row.id);
        const titulo = toString(row.titulo);
        const descripcion = toString(row.descripcion);
        if (!id || !titulo || !descripcion) return undefined;

        return {
          id,
          orden: Number.isFinite(Number(row.orden)) ? Number(row.orden) : undefined,
          titulo,
          descripcion,
          icono: toString(row.icono) || undefined,
          imagenUrl: ensureAssetPath(toString(row.imagenUrl)) || undefined
        } satisfies SiteStep;
      })
      .filter((item): item is SiteStep => Boolean(item))
  );
}

function parseTestimonials(value: unknown): SiteTestimonial[] {
  return toArray(value)
    .map((item) => {
      if (!item || typeof item !== "object") return undefined;
      const row = item as Record<string, unknown>;
      const text = toString(row.text);
      const author = toString(row.author);
      if (!text || !author) return undefined;
      return { text, author } satisfies SiteTestimonial;
    })
    .filter((item): item is SiteTestimonial => Boolean(item));
}

function parseSiteContent(raw: unknown): SiteContent {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const catalogItems = parseCatalogItems(root.catalogItems);
  const homeFavorites = parseFavorites(root.homeFavorites);
  const orderSteps = parseSteps(root.orderSteps);

  return {
    businessName: toString(root.businessName) || "Hadi Cakes",
    whatsapp: toString(root.whatsapp) || "+523122424208",
    zones: toArray(root.zones).map((zone) => toString(zone)).filter((zone) => zone.length > 0),
    menuItems: toArray(root.menuItems)
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const row = item as Record<string, unknown>;
        const nombre = toString(row.nombre);
        const precio = toNumber(row.precio, Number.NaN);
        if (!nombre || !Number.isFinite(precio)) return undefined;
        return {
          nombre,
          descripcion: toString(row.descripcion) || undefined,
          precio
        };
      })
      .filter((item): item is { nombre: string; descripcion?: string; precio: number } => Boolean(item)),
    catalogItems,
    homeFavorites,
    cta: toString(root.cta) || "Ordenar por WhatsApp",
    gallery: toArray(root.gallery).map((item) => ensureAssetPath(toString(item))).filter((item) => item.length > 0),
    facebookPageUrl: toString(root.facebookPageUrl) || undefined,
    instagramUrl: toString(root.instagramUrl) || undefined,
    heroImageUrl: ensureAssetPath(toString(root.heroImageUrl)) || catalogItems[0]?.imageUrl,
    howToOrderSteps: toArray(root.howToOrderSteps).map((step) => toString(step)).filter((step) => step.length > 0),
    orderSteps,
    testimonials: parseTestimonials(root.testimonials),
    promoBar:
      root.promoBar && typeof root.promoBar === "object"
        ? {
            text: toString((root.promoBar as Record<string, unknown>).text),
            linkLabel: toString((root.promoBar as Record<string, unknown>).linkLabel) || undefined,
            linkHref: toString((root.promoBar as Record<string, unknown>).linkHref) || undefined
          }
        : undefined,
    customOrder:
      root.customOrder && typeof root.customOrder === "object"
        ? {
            title: toString((root.customOrder as Record<string, unknown>).title) || "Pasteles personalizados",
            description:
              toString((root.customOrder as Record<string, unknown>).description) ||
              "Creamos pasteles personalizados para tus celebraciones.",
            occasions: toArray((root.customOrder as Record<string, unknown>).occasions)
              .map((entry) => toString(entry))
              .filter((entry) => entry.length > 0),
            ctaLabel: toString((root.customOrder as Record<string, unknown>).ctaLabel) || "Solicitar pastel personalizado",
            ctaMessage:
              toString((root.customOrder as Record<string, unknown>).ctaMessage) ||
              "Hola Hadi Cakes, quiero cotizar un pastel personalizado."
          }
        : {
            title: "Pasteles personalizados",
            description: "Creamos pasteles personalizados para tus celebraciones.",
            occasions: ["Cumpleanos", "Baby shower", "Bodas", "Eventos"],
            ctaLabel: "Solicitar pastel personalizado",
            ctaMessage: "Hola Hadi Cakes, quiero cotizar un pastel personalizado."
          },
    contact:
      root.contact && typeof root.contact === "object"
        ? {
            address: toString((root.contact as Record<string, unknown>).address) || undefined,
            mapEmbedUrl: toString((root.contact as Record<string, unknown>).mapEmbedUrl) || undefined
          }
        : undefined,
    brandAssets:
      root.brandAssets && typeof root.brandAssets === "object"
        ? {
            logoUrl: ensureAssetPath(toString((root.brandAssets as Record<string, unknown>).logoUrl)) || undefined,
            businessCardImageUrl:
              ensureAssetPath(toString((root.brandAssets as Record<string, unknown>).businessCardImageUrl)) || undefined,
            businessCardNote: toString((root.brandAssets as Record<string, unknown>).businessCardNote) || undefined
          }
        : undefined,
    siteConfig:
      root.siteConfig && typeof root.siteConfig === "object"
        ? Object.fromEntries(
            Object.entries(root.siteConfig as Record<string, unknown>)
              .map(([key, value]) => [key, toString(value)])
              .filter(([, value]) => value.length > 0)
          )
        : {}
  };
}

export const siteContent: SiteContent = parseSiteContent(rawSiteContent);

export function formatPriceMxn(amount: number): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `$${Math.round(amount)} MXN`;
  }
}

export function whatsappNumberOnly(input: string): string {
  return input.replace(/[^\d]/g, "");
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${whatsappNumberOnly(phone)}?text=${encodeURIComponent(message)}`;
}

export function baseUrlFromConfig(fallback = "https://hadicakes.local"): string {
  const raw = siteContent.siteConfig.canonical_base_url?.trim();
  if (!raw) return fallback;
  return raw.replace(/\/$/, "");
}
