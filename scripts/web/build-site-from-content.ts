import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";

dotenv.config();

type MenuItem = {
  nombre: string;
  descripcion?: string;
  precio: number;
};

type CatalogItem = {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  imageUrl: string;
  imageSource?: "facebook" | "manual";
};

type SiteContent = {
  businessName: string;
  whatsapp: string;
  zones: string[];
  menuItems: MenuItem[];
  catalogItems: CatalogItem[];
  cta?: string;
  gallery?: string[];
  facebookPageUrl?: string;
  instagramUrl?: string;
  heroImageUrl?: string;
  howToOrderSteps: string[];
  testimonials: Array<{ text: string; author: string }>;
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
};

function escapeHtml(value: unknown): string {
  const raw = String(value ?? "");
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function toWaLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

function sanitizeMapEmbedUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formatMoney(value: number): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseContent(value: unknown): SiteContent {
  if (!isObjectRecord(value)) {
    throw new Error("web_content_invalid");
  }

  const businessName = typeof value.businessName === "string" && value.businessName.trim().length > 0
    ? value.businessName.trim()
    : "";
  const whatsapp = typeof value.whatsapp === "string" && value.whatsapp.trim().length > 0
    ? sanitizePhone(value.whatsapp.trim())
    : "";

  if (!businessName) throw new Error("web_content_business_name_missing");
  if (!whatsapp) throw new Error("web_content_whatsapp_missing");

  const zones = Array.isArray(value.zones)
    ? value.zones.filter((zone): zone is string => typeof zone === "string" && zone.trim().length > 0).map((z) => z.trim())
    : [];

  const menuItems = Array.isArray(value.menuItems)
    ? value.menuItems
        .filter((item): item is Record<string, unknown> => isObjectRecord(item))
        .map((item) => ({
          nombre: typeof item.nombre === "string" ? item.nombre.trim() : "",
          descripcion: typeof item.descripcion === "string" ? item.descripcion.trim() : undefined,
          precio: Number(item.precio)
        }))
        .filter((item) => item.nombre.length > 0 && Number.isFinite(item.precio))
    : [];

  const catalogItems = Array.isArray(value.catalogItems)
    ? value.catalogItems
        .filter((item): item is Record<string, unknown> => isObjectRecord(item))
        .map((item) => ({
          id: typeof item.id === "string" ? item.id.trim() : "",
          nombre: typeof item.nombre === "string" ? item.nombre.trim() : "",
          descripcion: typeof item.descripcion === "string" ? item.descripcion.trim() : undefined,
          precio: Number(item.precio),
          categoria: typeof item.categoria === "string" ? item.categoria.trim() : undefined,
          imageUrl: typeof item.imageUrl === "string" ? item.imageUrl.trim() : "",
          imageSource:
            item.imageSource === "facebook" || item.imageSource === "manual" ? item.imageSource : undefined
        }))
        .filter((item) => item.id.length > 0 && item.nombre.length > 0 && Number.isFinite(item.precio) && item.imageUrl.length > 0)
    : [];

  if (catalogItems.length === 0 && menuItems.length === 0) {
    throw new Error("web_content_catalog_or_menu_missing");
  }

  const gallery = Array.isArray(value.gallery)
    ? value.gallery.filter((img): img is string => typeof img === "string" && img.trim().length > 0).map((img) => img.trim())
    : [];

  const facebookPageUrl =
    typeof value.facebookPageUrl === "string" && value.facebookPageUrl.trim().length > 0
      ? value.facebookPageUrl.trim()
      : undefined;
  const instagramUrl =
    typeof value.instagramUrl === "string" && value.instagramUrl.trim().length > 0 ? value.instagramUrl.trim() : undefined;
  const heroImageUrl =
    typeof value.heroImageUrl === "string" && value.heroImageUrl.trim().length > 0 ? value.heroImageUrl.trim() : undefined;

  const promoBar = isObjectRecord(value.promoBar) && typeof value.promoBar.text === "string" && value.promoBar.text.trim().length > 0
    ? {
        text: value.promoBar.text.trim(),
        linkLabel: toNonEmptyString(value.promoBar.linkLabel),
        linkHref: toNonEmptyString(value.promoBar.linkHref)
      }
    : undefined;

  const howToOrderSteps = Array.isArray(value.howToOrderSteps)
    ? value.howToOrderSteps
        .filter((step): step is string => typeof step === "string" && step.trim().length > 0)
        .map((step) => step.trim())
    : [
        "Escribenos por WhatsApp con el producto y cantidad.",
        "Te confirmamos disponibilidad, total y horario de entrega.",
        "Recibe tu pedido o pasa a recogerlo en el horario acordado."
      ];

  const testimonials = Array.isArray(value.testimonials)
    ? value.testimonials
        .filter((item): item is Record<string, unknown> => isObjectRecord(item))
        .map((item) => ({
          text: typeof item.text === "string" ? item.text.trim() : "",
          author: typeof item.author === "string" ? item.author.trim() : ""
        }))
        .filter((item) => item.text.length > 0 && item.author.length > 0)
    : [
        { text: "El pastel llego a tiempo y quedo precioso.", author: "Cliente frecuente" },
        { text: "Todo delicioso, excelente presentacion.", author: "Pedido de cumpleanos" },
        { text: "Muy buena atencion y sabores increibles.", author: "Cliente nuevo" }
      ];

  const contact = isObjectRecord(value.contact)
    ? {
        address: typeof value.contact.address === "string" && value.contact.address.trim().length > 0
          ? value.contact.address.trim()
          : undefined,
        mapEmbedUrl: sanitizeMapEmbedUrl(value.contact.mapEmbedUrl)
      }
    : undefined;

  const customOrder = isObjectRecord(value.customOrder)
    ? {
        title: toNonEmptyString(value.customOrder.title) ?? "Pasteles personalizados",
        description:
          toNonEmptyString(value.customOrder.description) ??
          "Creamos pasteles personalizados para cumpleaños, baby shower, bodas y eventos especiales.",
        occasions: Array.isArray(value.customOrder.occasions)
          ? value.customOrder.occasions
              .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
              .map((item) => item.trim())
          : ["Cumpleaños", "Baby shower", "Bodas", "Eventos especiales"],
        ctaLabel: toNonEmptyString(value.customOrder.ctaLabel) ?? "Solicitar pastel personalizado",
        ctaMessage:
          toNonEmptyString(value.customOrder.ctaMessage) ??
          "Hola 👋 Quiero cotizar un pastel personalizado. Fecha del evento, porciones y tema:"
      }
    : {
        title: "Pasteles personalizados",
        description:
          "Creamos pasteles personalizados para cumpleaños, baby shower, bodas y eventos especiales.",
        occasions: ["Cumpleaños", "Baby shower", "Bodas", "Eventos especiales"],
        ctaLabel: "Solicitar pastel personalizado",
        ctaMessage: "Hola 👋 Quiero cotizar un pastel personalizado. Fecha del evento, porciones y tema:"
      };

  const brandAssets = isObjectRecord(value.brandAssets)
    ? {
        logoUrl:
          typeof value.brandAssets.logoUrl === "string" && value.brandAssets.logoUrl.trim().length > 0
            ? value.brandAssets.logoUrl.trim()
            : undefined,
        businessCardImageUrl:
          typeof value.brandAssets.businessCardImageUrl === "string" && value.brandAssets.businessCardImageUrl.trim().length > 0
            ? value.brandAssets.businessCardImageUrl.trim()
            : undefined,
        businessCardNote:
          typeof value.brandAssets.businessCardNote === "string" && value.brandAssets.businessCardNote.trim().length > 0
            ? value.brandAssets.businessCardNote.trim()
            : undefined
      }
    : undefined;

  const cta = typeof value.cta === "string" && value.cta.trim().length > 0 ? value.cta.trim() : "Haz tu pedido por WhatsApp";

  return {
    businessName,
    whatsapp,
    zones,
    menuItems,
    catalogItems,
    cta,
    gallery,
    facebookPageUrl,
    instagramUrl,
    heroImageUrl,
    howToOrderSteps: howToOrderSteps.length > 0 ? howToOrderSteps : ["Escribenos por WhatsApp para tomar tu pedido."],
    testimonials: testimonials.length > 0 ? testimonials : [{ text: "Gracias por apoyar nuestro emprendimiento.", author: businessName }],
    promoBar,
    customOrder,
    contact,
    brandAssets
  };
}

function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildItemWaLink(phone: string, itemName: string): string {
  const message = `Hola 👋
Quiero pedir ${itemName}

Fecha:
Entrega o recogida:
Comentarios:`;
  return buildWhatsAppLink(phone, message);
}

function renderCatalogWithWhatsApp(items: CatalogItem[], phone: string): string {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const category = item.categoria?.trim() || "especialidades";
    const bucket = groups.get(category) ?? [];
    bucket.push(item);
    groups.set(category, bucket);
  }

  return [...groups.entries()]
    .map(([category, groupItems]) => {
      const categoryAnchor = `cat-${slugify(category)}`;
      return `
        <section class="catalog-group" id="${escapeHtml(categoryAnchor)}">
          <h3>${escapeHtml(category)}</h3>
          <div class="card-grid">
            ${groupItems
              .map(
                (item) => `
                  <article class="card" id="${escapeHtml(item.id)}">
                    <div class="card-media">
                      <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.nombre)}" loading="lazy" />
                    </div>
                    <div class="card-body">
                      <div class="card-head">
                        <h4>${escapeHtml(item.nombre)}</h4>
                        <span>${escapeHtml(formatMoney(item.precio))}</span>
                      </div>
                      <p>${escapeHtml(item.descripcion ?? "Producto artesanal disponible por pedido.")}</p>
                      <small>${escapeHtml(item.categoria ?? "especialidad")}</small>
                      <a class="btn-card" href="${escapeHtml(buildItemWaLink(phone, item.nombre))}" target="_blank" rel="noreferrer">Ordenar</a>
                    </div>
                  </article>
                `
              )
              .join("\n")}
          </div>
        </section>
      `;
    })
    .join("\n");
}

function renderCatalogTabs(items: CatalogItem[]): string {
  if (items.length === 0) return "";
  const categories = [...new Set(items.map((item) => item.categoria?.trim() || "especialidades"))];
  return `
    <nav class="category-tabs" aria-label="Categorias de productos">
      <a class="tab-chip" href="#catalogo">Todo</a>
      ${categories
        .map((category) => `<a class="tab-chip" href="#cat-${escapeHtml(slugify(category))}">${escapeHtml(category)}</a>`)
        .join("\n")}
    </nav>
  `;
}

function renderMenu(items: MenuItem[]): string {
  if (items.length === 0) {
    return `<p class="muted">El menu se actualiza semanalmente por temporada.</p>`;
  }

  return `
    <ul class="menu-list">
      ${items
        .map(
          (item) => `
            <li>
              <div>
                <strong>${escapeHtml(item.nombre)}</strong>
                <p>${escapeHtml(item.descripcion ?? "Preparacion diaria.")}</p>
              </div>
              <span>${escapeHtml(formatMoney(item.precio))}</span>
            </li>
          `
        )
        .join("\n")}
    </ul>
  `;
}

function renderHowToOrder(steps: string[]): string {
  return `
    <section id="como-ordenar" class="section">
      <header class="section-header">
        <p class="eyebrow">Como ordenar</p>
        <h2>Haz tu pedido en 3 pasos</h2>
      </header>
      <ol class="steps-list">
        ${steps
          .map(
            (step) => `
              <li>
                <p>${escapeHtml(step)}</p>
              </li>
            `
          )
          .join("\n")}
      </ol>
    </section>
  `;
}

function renderGallery(images: string[], instagramUrl?: string): string {
  if (images.length === 0) return "";
  const cta = instagramUrl
    ? `<a class="btn-secondary" href="${escapeHtml(instagramUrl)}" target="_blank" rel="noreferrer">Ver perfil</a>`
    : "";
  return `
    <section id="galeria" class="section">
      <header class="section-header">
        <p class="eyebrow">Galeria Instagram</p>
        <h2>Fotos del catalogo</h2>
        ${cta}
      </header>
      <div class="gallery-grid">
        ${images
          .map(
            (image, i) => `
              <figure class="gallery-item">
                <img src="${escapeHtml(image)}" alt="Foto ${i + 1} de ${escapeHtml(images.length)}" loading="lazy" />
              </figure>
            `
          )
          .join("\n")}
      </div>
    </section>
  `;
}

function renderTestimonials(items: Array<{ text: string; author: string }>): string {
  if (items.length === 0) return "";
  return `
    <section id="testimonios" class="section">
      <header class="section-header">
        <p class="eyebrow">Testimonios</p>
        <h2>Lo que dicen nuestros clientes</h2>
      </header>
      <div class="testimonials-grid">
        ${items
          .map(
            (item) => `
              <article class="testimonial-card">
                <p>"${escapeHtml(item.text)}"</p>
                <strong>${escapeHtml(item.author)}</strong>
              </article>
            `
          )
          .join("\n")}
      </div>
    </section>
  `;
}

function renderContactMap(content: SiteContent, waLink: string): string {
  const address = content.contact?.address ?? "Colima Centro, Colima, Mexico";
  const mapEmbedUrl =
    content.contact?.mapEmbedUrl ??
    `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  const zones = content.zones.length > 0 ? content.zones : ["Zona por confirmar"];
  return `
    <section id="contacto" class="section split">
      <header class="section-header">
        <p class="eyebrow">Mapa / contacto</p>
        <h2>Visitanos o pide por WhatsApp</h2>
        <p class="muted">${escapeHtml(address)}</p>
        <a class="btn-primary" href="${escapeHtml(waLink)}" target="_blank" rel="noreferrer">Pedir por WhatsApp</a>
        <div class="zones">
          ${zones.map((zone) => `<span>${escapeHtml(zone)}</span>`).join("\n")}
        </div>
      </header>
      <div class="map-wrap">
        <iframe
          src="${escapeHtml(mapEmbedUrl)}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
          title="Mapa de ${escapeHtml(content.businessName)}"
        ></iframe>
      </div>
    </section>
  `;
}

function renderCustomOrder(content: SiteContent): string {
  const link = buildWhatsAppLink(content.whatsapp, content.customOrder.ctaMessage);
  return `
    <section id="personalizados" class="section split">
      <header class="section-header">
        <p class="eyebrow">Personalizados</p>
        <h2>${escapeHtml(content.customOrder.title)}</h2>
        <p class="muted">${escapeHtml(content.customOrder.description)}</p>
        <a class="btn-primary" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(content.customOrder.ctaLabel)}</a>
      </header>
      <ul class="occasion-list">
        ${content.customOrder.occasions.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}
      </ul>
    </section>
  `;
}

function pageTemplate(content: SiteContent): string {
  const waLink = toWaLink(content.whatsapp);
  const heroImage = content.heroImageUrl ?? content.catalogItems[0]?.imageUrl ?? content.gallery?.[0];
  const logo = content.brandAssets?.logoUrl
    ? `<img class="brand-logo" src="${escapeHtml(content.brandAssets.logoUrl)}" alt="Logo ${escapeHtml(content.businessName)}" />`
    : "";
  const instagramLink = content.instagramUrl
    ? `<a href="${escapeHtml(content.instagramUrl)}" target="_blank" rel="noreferrer">Instagram</a>`
    : "";
  const facebookLink = content.facebookPageUrl
    ? `<a href="${escapeHtml(content.facebookPageUrl)}" target="_blank" rel="noreferrer">Facebook</a>`
    : "";
  const promoBar = content.promoBar
    ? `<div class="promo-bar">${escapeHtml(content.promoBar.text)}${
        content.promoBar.linkLabel && content.promoBar.linkHref
          ? ` · <a href="${escapeHtml(content.promoBar.linkHref)}">${escapeHtml(content.promoBar.linkLabel)}</a>`
          : ""
      }</div>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(content.businessName)}</title>
    <meta
      name="description"
      content="${escapeHtml(content.businessName)} - Catalogo y pedidos por WhatsApp."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="bg-noise" aria-hidden="true"></div>
    <header class="hero">
      ${promoBar}
      <nav class="topbar">
        <div class="brand-wrap">
          ${logo}
          <p class="brand">${escapeHtml(content.businessName)}</p>
        </div>
        <div class="top-links">
          ${instagramLink}
          ${facebookLink}
          <a href="${escapeHtml(waLink)}" target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </nav>
      <div class="hero-layout">
        <div class="hero-copy">
          <p class="eyebrow">Bakery Studio</p>
          <h1>Pasteleria artesanal para celebraciones y antojos diarios.</h1>
          <p>
            Catalogo actualizado y pedidos directos por WhatsApp. Entregas en zonas seleccionadas y
            recoleccion en tienda.
          </p>
          <div class="hero-cta">
            <a class="btn-primary" href="${escapeHtml(waLink)}" target="_blank" rel="noreferrer">${escapeHtml(content.cta)}</a>
            <a class="btn-secondary" href="#catalogo">Ver catalogo</a>
          </div>
        </div>
        ${heroImage
          ? `<figure class="hero-media"><img src="${escapeHtml(heroImage)}" alt="Producto destacado de ${escapeHtml(content.businessName)}" loading="eager" /></figure>`
          : ""}
      </div>
    </header>

    <main>
      <section id="catalogo" class="section">
        <header class="section-header">
          <p class="eyebrow">Catalogo</p>
          <h2>Productos destacados</h2>
        </header>
        ${renderCatalogTabs(content.catalogItems)}
        ${renderCatalogWithWhatsApp(content.catalogItems, content.whatsapp)}
      </section>

      ${renderCustomOrder(content)}
      ${renderHowToOrder(content.howToOrderSteps)}
      ${renderGallery(content.gallery ?? [], content.instagramUrl ?? content.facebookPageUrl)}
      ${renderTestimonials(content.testimonials)}
      ${renderContactMap(content, waLink)}
    </main>

    <footer class="footer">
      <p>${escapeHtml(content.businessName)}</p>
      <a href="${escapeHtml(waLink)}" target="_blank" rel="noreferrer">${escapeHtml(content.whatsapp)}</a>
    </footer>
    <a class="wa-sticky" href="${escapeHtml(waLink)}" target="_blank" rel="noreferrer">WhatsApp</a>
  </body>
</html>
`;
}

function stylesheet(): string {
  return `:root {
  --ink: #231b19;
  --paper: #fffaf4;
  --accent: #cf5a3a;
  --accent-soft: #f0b394;
  --deep: #50302a;
  --line: #e8d5c9;
  --card: #fff;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: "Manrope", "Helvetica Neue", sans-serif;
  color: var(--ink);
  background: radial-gradient(circle at 20% 10%, #ffe0cb 0%, #fffaf4 40%, #fff6ef 100%);
}

.bg-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(35, 27, 25, 0.04) 0.5px, transparent 0.5px);
  background-size: 4px 4px;
  opacity: 0.55;
}

.hero,
main,
.footer {
  position: relative;
  z-index: 1;
}

.hero {
  padding: 1.4rem 1.2rem 1rem;
}

.hero-layout {
  display: grid;
  gap: 1.2rem;
}

.promo-bar {
  margin: 0 0 1rem;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.75);
  padding: 0.55rem 0.8rem;
  font-size: 0.9rem;
  color: #5c4a43;
}

.promo-bar a {
  color: var(--deep);
  font-weight: 700;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.4rem;
  gap: 1rem;
}

.brand-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--line);
}

.brand {
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  font-size: 1.2rem;
}

.top-links {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
}

.topbar a {
  text-decoration: none;
  color: var(--deep);
  font-weight: 700;
  border-bottom: 2px solid var(--accent-soft);
}

.hero-copy h1 {
  margin: 0.2rem 0 0.8rem;
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 1.05;
  max-width: 18ch;
}

.hero-copy p {
  margin: 0;
  max-width: 58ch;
  color: #4d3b35;
}

.hero-media {
  margin: 0;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.hero-media img {
  display: block;
  width: 100%;
  height: 280px;
  object-fit: cover;
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 1.2rem;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.7rem 1.2rem;
  text-decoration: none;
  font-weight: 700;
  transition: transform 180ms ease;
}

.btn-primary {
  background: linear-gradient(120deg, var(--accent), #df7c56);
  color: #fff;
}

.btn-secondary {
  border: 1px solid var(--line);
  color: var(--deep);
  background: rgba(255, 255, 255, 0.7);
}

.btn-primary:hover,
.btn-secondary:hover {
  transform: translateY(-2px);
}

main {
  padding: 0.8rem 1.2rem 3rem;
  display: grid;
  gap: 2.2rem;
}

.section {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 1.2rem;
  backdrop-filter: blur(4px);
  animation: rise-in 420ms ease both;
}

.section-header h2 {
  margin: 0.1rem 0 1rem;
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(1.4rem, 4vw, 2rem);
}

.eyebrow {
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.7rem;
  color: var(--accent);
  font-weight: 700;
}

.card-grid {
  display: grid;
  gap: 1rem;
}

.category-tabs {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.tab-chip {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.42rem 0.72rem;
  background: #fff;
  color: var(--deep);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.85rem;
}

.tab-chip:hover {
  border-color: var(--accent-soft);
}

.catalog-group {
  margin-bottom: 1.4rem;
}

.catalog-group:last-child {
  margin-bottom: 0;
}

.catalog-group h3 {
  margin: 0 0 0.8rem;
  font-family: "Fraunces", Georgia, serif;
  font-size: 1.1rem;
  color: var(--deep);
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
}

.card-media img {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: cover;
  background: #f5ece5;
}

.card-body {
  padding: 0.8rem;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.6rem;
}

.card-head h3 {
  margin: 0;
  font-size: 1rem;
}

.card-head h4 {
  margin: 0;
  font-size: 1rem;
}

.card-head span {
  color: var(--accent);
  font-weight: 700;
}

.card p {
  margin: 0.5rem 0;
  color: #5c4a43;
}

.btn-card {
  display: inline-flex;
  margin-top: 0.55rem;
  text-decoration: none;
  border-radius: 999px;
  border: 1px solid var(--line);
  padding: 0.42rem 0.8rem;
  color: var(--deep);
  font-weight: 700;
}

.btn-card:hover {
  border-color: var(--accent-soft);
}

.card small {
  color: #8a6d61;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.8rem;
}

.menu-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  border-bottom: 1px dashed var(--line);
  padding-bottom: 0.6rem;
}

.menu-list li strong {
  font-size: 0.98rem;
}

.menu-list li p {
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
  color: #705950;
}

.menu-list li span {
  color: var(--accent);
  font-weight: 700;
}

.steps-list {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.6rem;
}

.steps-list li p {
  margin: 0;
  color: #5c4a43;
}

.occasion-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.occasion-list li {
  border: 1px dashed var(--line);
  border-radius: 12px;
  background: #fff;
  padding: 0.65rem 0.75rem;
  color: #5c4a43;
}

.zones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.zones span {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--deep);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  font-size: 0.9rem;
}

.gallery-grid {
  display: grid;
  gap: 0.8rem;
}

.testimonials-grid {
  display: grid;
  gap: 0.8rem;
}

.testimonial-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  padding: 0.9rem;
}

.testimonial-card p {
  margin: 0 0 0.6rem;
  color: #5c4a43;
}

.testimonial-card strong {
  color: var(--deep);
}

.gallery-item {
  margin: 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.gallery-item img {
  width: 100%;
  height: 170px;
  object-fit: cover;
  display: block;
}

.map-wrap {
  margin: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.map-wrap iframe {
  width: 100%;
  min-height: 320px;
  display: block;
  border: 0;
}

.muted {
  color: #7b665e;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  border-top: 1px solid var(--line);
  padding: 1rem 1.2rem 2rem;
  font-size: 0.92rem;
}

.footer p {
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
}

.footer a {
  color: var(--deep);
  text-decoration: none;
  font-weight: 700;
}

.wa-sticky {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 20;
  text-decoration: none;
  background: linear-gradient(120deg, #18a857, #25d366);
  color: #fff;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.72rem 1rem;
  box-shadow: 0 10px 24px rgba(18, 70, 43, 0.28);
}

.wa-sticky:hover {
  transform: translateY(-2px);
}

@keyframes rise-in {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (min-width: 760px) {
  .hero,
  main,
  .footer {
    max-width: 1080px;
    margin-inline: auto;
  }

  .hero {
    padding-top: 1.8rem;
  }

  .hero-layout {
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }

  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gallery-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .testimonials-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1080px) {
  .card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .split {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    align-items: start;
    gap: 1.2rem;
  }
}
`;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function syncSiteAssets(sourceDir: string, targetDir: string): boolean {
  if (!fs.existsSync(sourceDir)) return false;
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  return true;
}

async function main() {
  const config = loadAppConfig();
  const contentPath = process.env.WEB_CONTENT_PATH?.trim() || config.webTool.contentPath;
  const sourceFile = path.resolve(process.cwd(), contentPath);
  const distDir = path.resolve(process.cwd(), "site/dist");
  const assetsSourceDir = path.resolve(process.cwd(), "site/assets");
  const assetsTargetDir = path.join(distDir, "assets");
  const indexPath = path.join(distDir, "index.html");
  const stylePath = path.join(distDir, "styles.css");
  const snapshotPath = path.join(distDir, "content.snapshot.json");

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`web_content_file_missing:${sourceFile}`);
  }

  const raw = fs.readFileSync(sourceFile, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("web_content_json_invalid");
  }

  const content = parseContent(parsed);
  ensureDir(distDir);
  const assetsCopied = syncSiteAssets(assetsSourceDir, assetsTargetDir);
  fs.writeFileSync(indexPath, pageTemplate(content), "utf8");
  fs.writeFileSync(stylePath, stylesheet(), "utf8");
  fs.writeFileSync(snapshotPath, JSON.stringify(content, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        event: "web_build_result",
        source: sourceFile,
        distDir,
        files: [indexPath, stylePath, snapshotPath],
        assets: {
          copied: assetsCopied,
          source: assetsSourceDir,
          target: assetsTargetDir
        },
        sections: {
          catalogItems: content.catalogItems.length,
          menuItems: content.menuItems.length,
          zones: content.zones.length,
          gallery: content.gallery?.length ?? 0
        }
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "web_build_failed", detail }, null, 2));
  process.exitCode = 1;
});
