import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { runGwsCommand } from "../../src/tools/googleWorkspace/runGwsCommand";
import { parseCsv, toPositiveInt } from "../sheets/_shared/gws-bootstrap-utils";

dotenv.config();

type RowRecord = Record<string, string>;

type ProductRow = {
  productoId: string;
  slug: string;
  nombre: string;
  descripcionCorta: string;
  descripcionLarga: string;
  categoria: string;
  precioMxn: number;
  clavePrecio: string;
  porciones?: string;
  imagenPrincipal: string;
  imagenesSecundarias: string[];
  etiqueta?: string;
  destacadoInicio: boolean;
  orden: number;
  activo: boolean;
  ctaWhatsappTexto?: string;
  ctaWhatsappPlantilla?: string;
  productosRelacionados: string[];
};

type FavoriteRow = {
  favoritoId: string;
  productoId: string;
  tituloOverride?: string;
  descripcionOverride?: string;
  precioOverrideMxn?: number;
  imagenOverride?: string;
  badge?: string;
  orden: number;
  activo: boolean;
};

type StepRow = {
  pasoId: string;
  orden: number;
  titulo: string;
  descripcion: string;
  icono?: string;
  imagenUrl?: string;
  activo: boolean;
};

type ReviewRow = {
  resenaId: string;
  autor: string;
  ciudad?: string;
  texto: string;
  calificacion?: number;
  imagenUrl?: string;
  fechaIso?: string;
  orden: number;
  activo: boolean;
};

type ResourceRow = {
  recursoKey: string;
  tipo?: string;
  variante?: string;
  rutaOUrl: string;
  textoAlt?: string;
  uso?: string;
  ancho?: number;
  alto?: number;
  orden: number;
  activo: boolean;
};

type SiteConfigRow = {
  clave: string;
  valor: string;
  tipoDato?: string;
  locale?: string;
  activo: boolean;
};

type MockTabsFile = {
  tabs?: Record<string, string[][]>;
};

function parseJsonText(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeToken(value: string): string {
  const out = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return out || "unknown";
}

function extractGwsError(value: unknown): { code?: number; message?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;

  if (root.error && typeof root.error === "object") {
    const errObj = root.error as Record<string, unknown>;
    const code = typeof errObj.code === "number" ? errObj.code : undefined;
    const message = typeof errObj.message === "string" ? errObj.message : undefined;
    return { code, message };
  }

  const code = typeof root.code === "number" ? root.code : undefined;
  const message = typeof root.message === "string" ? root.message : undefined;
  if (code !== undefined || message !== undefined) return { code, message };
  return undefined;
}

function readValues(value: unknown): string[][] {
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;

  const candidates: unknown[] = [
    root.values,
    (root.data as Record<string, unknown> | undefined)?.values,
    (root.result as Record<string, unknown> | undefined)?.values,
    (root.response as Record<string, unknown> | undefined)?.values
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map((row) => {
      if (!Array.isArray(row)) return [];
      return row.map((cell) => (cell == null ? "" : String(cell).trim()));
    });
  }

  return [];
}

function toNumberMaybe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  let normalized = raw.replace(/[^\d,.+\-]/g, "").replace(/(?!^)[+-]/g, "");
  if (!normalized) return undefined;

  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    normalized = commaCount > 1 ? normalized.replace(/,/g, "") : normalized.replace(",", ".");
  } else if (dotCount > 1) {
    normalized = normalized.replace(/\./g, "");
  }

  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = toNumberMaybe(value);
  if (parsed == null || !Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function parseCsvField(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isActive(value: string | undefined): boolean {
  if (!value || value.trim().length === 0) return true;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "si", "sí", "yes", "activo", "activa", "x"].includes(normalized);
}

function ensureAssetPath(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\//, "")}`;
}

function ensureDirForFile(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function rowsToObjects(args: {
  tabName: string;
  rows: string[][];
  requiredHeaders: string[];
}): RowRecord[] {
  if (args.rows.length === 0) {
    throw new Error(`web_content_sync_tab_empty_${sanitizeToken(args.tabName)}`);
  }

  const headerRow = args.rows[0] ?? [];
  const headerMap = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (!key) return;
    if (!headerMap.has(key)) headerMap.set(key, index);
  });

  for (const header of args.requiredHeaders) {
    if (!headerMap.has(header)) {
      throw new Error(`web_content_sync_header_missing_${sanitizeToken(args.tabName)}_${sanitizeToken(header)}`);
    }
  }

  return args.rows.slice(1)
    .map((row) => {
      const out: RowRecord = {};
      for (const [key, index] of headerMap.entries()) {
        out[key] = (row[index] ?? "").trim();
      }
      return out;
    })
    .filter((row) => Object.values(row).some((cell) => cell.length > 0));
}

function parseProducts(rows: RowRecord[]): ProductRow[] {
  const out: ProductRow[] = [];

  for (const row of rows) {
    const productoId = row.producto_id?.trim();
    const nombre = row.nombre?.trim();
    const imagenPrincipal = ensureAssetPath(row.imagen_principal);
    const precioMxn = toNumberMaybe(row.precio_mxn);

    if (!productoId || !nombre || !imagenPrincipal || precioMxn == null) continue;

    out.push({
      productoId,
      slug: row.slug?.trim() || productoId,
      nombre,
      descripcionCorta: row.descripcion_corta?.trim() || "",
      descripcionLarga: row.descripcion_larga?.trim() || "",
      categoria: row.categoria?.trim() || "especialidades",
      precioMxn,
      clavePrecio: row.clave_precio?.trim() || productoId,
      porciones: row.porciones?.trim() || undefined,
      imagenPrincipal,
      imagenesSecundarias: parseCsvField(row.imagenes_secundarias_csv).map((item) => ensureAssetPath(item)).filter(Boolean),
      etiqueta: row.etiqueta?.trim() || undefined,
      destacadoInicio: isActive(row.destacado_inicio),
      orden: toInt(row.orden, 9999),
      activo: isActive(row.activo),
      ctaWhatsappTexto: row.cta_whatsapp_texto?.trim() || undefined,
      ctaWhatsappPlantilla: row.cta_whatsapp_plantilla?.trim() || undefined,
      productosRelacionados: parseCsvField(row.productos_relacionados_csv)
    });
  }

  return out.filter((row) => row.activo).sort((a, b) => a.orden - b.orden);
}

function parseFavorites(rows: RowRecord[]): FavoriteRow[] {
  const out: FavoriteRow[] = [];
  for (const row of rows) {
    const favoritoId = row.favorito_id?.trim();
    const productoId = row.producto_id?.trim();
    if (!favoritoId || !productoId) continue;

    out.push({
      favoritoId,
      productoId,
      tituloOverride: row.titulo_override?.trim() || undefined,
      descripcionOverride: row.descripcion_override?.trim() || undefined,
      precioOverrideMxn: toNumberMaybe(row.precio_override_mxn),
      imagenOverride: ensureAssetPath(row.imagen_override),
      badge: row.badge?.trim() || undefined,
      orden: toInt(row.orden, 9999),
      activo: isActive(row.activo)
    });
  }

  return out.filter((row) => row.activo).sort((a, b) => a.orden - b.orden);
}

function parseSteps(rows: RowRecord[]): StepRow[] {
  const out: StepRow[] = [];
  for (const row of rows) {
    const pasoId = row.paso_id?.trim();
    const titulo = row.titulo?.trim();
    const descripcion = row.descripcion?.trim();
    if (!pasoId || !titulo || !descripcion) continue;

    out.push({
      pasoId,
      orden: toInt(row.orden, 9999),
      titulo,
      descripcion,
      icono: row.icono?.trim() || undefined,
      imagenUrl: ensureAssetPath(row.imagen_url),
      activo: isActive(row.activo)
    });
  }

  return out.filter((row) => row.activo).sort((a, b) => a.orden - b.orden);
}

function parseReviews(rows: RowRecord[]): ReviewRow[] {
  const out: ReviewRow[] = [];
  for (const row of rows) {
    const resenaId = row.resena_id?.trim();
    const autor = row.autor?.trim();
    const texto = row.texto?.trim();
    if (!resenaId || !autor || !texto) continue;

    out.push({
      resenaId,
      autor,
      ciudad: row.ciudad?.trim() || undefined,
      texto,
      calificacion: toNumberMaybe(row.calificacion_1_5),
      imagenUrl: ensureAssetPath(row.imagen_url),
      fechaIso: row.fecha_iso?.trim() || undefined,
      orden: toInt(row.orden, 9999),
      activo: isActive(row.activo)
    });
  }

  return out.filter((row) => row.activo).sort((a, b) => a.orden - b.orden);
}

function parseResources(rows: RowRecord[]): ResourceRow[] {
  const out: ResourceRow[] = [];
  for (const row of rows) {
    const recursoKey = row.recurso_key?.trim();
    const rutaOUrl = ensureAssetPath(row.ruta_o_url);
    if (!recursoKey || !rutaOUrl) continue;

    out.push({
      recursoKey,
      tipo: row.tipo?.trim() || undefined,
      variante: row.variante?.trim() || undefined,
      rutaOUrl,
      textoAlt: row.texto_alt?.trim() || undefined,
      uso: row.uso?.trim() || undefined,
      ancho: toNumberMaybe(row.ancho),
      alto: toNumberMaybe(row.alto),
      orden: toInt(row.orden, 9999),
      activo: isActive(row.activo)
    });
  }

  return out.filter((row) => row.activo).sort((a, b) => a.orden - b.orden);
}

function parseSiteConfig(rows: RowRecord[]): SiteConfigRow[] {
  const out: SiteConfigRow[] = [];
  for (const row of rows) {
    const clave = row.clave_configuracion?.trim();
    if (!clave) continue;
    out.push({
      clave,
      valor: row.valor_configuracion?.trim() || "",
      tipoDato: row.tipo_dato?.trim() || undefined,
      locale: row.locale?.trim() || undefined,
      activo: isActive(row.activo)
    });
  }
  return out.filter((row) => row.activo);
}

function parseConfigValue(raw: string, type?: string): string {
  const kind = (type ?? "string").trim().toLowerCase();
  if (kind === "boolean") {
    return isActive(raw) ? "1" : "0";
  }
  if (kind === "number") {
    const n = toNumberMaybe(raw);
    return n == null ? "" : String(n);
  }
  return raw;
}

async function readTabFromGws(args: {
  tabName: string;
  spreadsheetId: string;
  gwsCommand: string;
  gwsCommandArgs: string[];
  timeoutMs: number;
}): Promise<string[][]> {
  const params = {
    spreadsheetId: args.spreadsheetId,
    range: `${args.tabName}!A1:Z5000`
  };

  const result = await runGwsCommand({
    command: args.gwsCommand,
    commandArgs: [
      ...args.gwsCommandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "get",
      "--params",
      JSON.stringify(params)
    ],
    timeoutMs: args.timeoutMs
  });

  const parsedStdout = parseJsonText(result.stdout);
  const parsedStderr = parseJsonText(result.stderr);
  const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);

  if (!result.timedOut && result.exitCode === 0 && !errInfo) {
    return readValues(parsedStdout);
  }

  if (result.timedOut) {
    throw new Error(`web_content_sync_gws_timeout_${sanitizeToken(args.tabName)}`);
  }

  const detail = errInfo?.message ?? result.stderr ?? `exit_${result.exitCode ?? "unknown"}`;
  throw new Error(`web_content_sync_gws_${sanitizeToken(detail)}`);
}

function readTabsFromMock(mockPath: string): Record<string, string[][]> {
  const absolute = path.resolve(process.cwd(), mockPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`web_content_sync_mock_file_missing:${absolute}`);
  }

  const raw = fs.readFileSync(absolute, "utf8");
  const parsed = JSON.parse(raw) as MockTabsFile;

  if (!parsed || typeof parsed !== "object" || !parsed.tabs || typeof parsed.tabs !== "object") {
    throw new Error("web_content_sync_mock_invalid");
  }

  const out: Record<string, string[][]> = {};
  for (const [tab, rows] of Object.entries(parsed.tabs)) {
    if (!Array.isArray(rows)) continue;
    out[tab] = rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell == null ? "" : String(cell).trim())) : []));
  }

  return out;
}

async function main() {
  const config = loadAppConfig();

  const mode = (process.env.WEB_CONTENT_SYNC_PREVIEW ?? "0") === "1" ? "preview" : "apply";
  const mockPath = process.env.WEB_CONTENT_SYNC_MOCK_JSON_PATH?.trim() || undefined;

  const gwsCommand = process.env.WEB_CONTENT_SYNC_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.WEB_CONTENT_SYNC_GWS_COMMAND_ARGS
    ? parseCsv(process.env.WEB_CONTENT_SYNC_GWS_COMMAND_ARGS)
    : config.orderTool.sheets.gws.commandArgs;
  const spreadsheetId = process.env.WEB_CONTENT_SYNC_GWS_SPREADSHEET_ID?.trim()
    || config.orderTool.sheets.gws.spreadsheetId
    || config.expenseTool.gws.spreadsheetId;
  const timeoutMs = toPositiveInt(process.env.WEB_CONTENT_SYNC_TIMEOUT_MS, config.orderTool.sheets.timeoutMs);

  const tabs = {
    productos: process.env.WEB_CONTENT_SYNC_TAB_PRODUCTOS?.trim() || "productos",
    favoritos: process.env.WEB_CONTENT_SYNC_TAB_FAVORITOS?.trim() || "favoritos_inicio",
    pasos: process.env.WEB_CONTENT_SYNC_TAB_PASOS?.trim() || "pasos_compra",
    resenas: process.env.WEB_CONTENT_SYNC_TAB_RESENAS?.trim() || "resenas",
    recursos: process.env.WEB_CONTENT_SYNC_TAB_RECURSOS?.trim() || "recursos",
    configuracion: process.env.WEB_CONTENT_SYNC_TAB_CONFIGURACION?.trim() || "configuracion_sitio"
  };

  const outputPath = path.resolve(process.cwd(), process.env.WEB_CONTENT_SYNC_OUTPUT_PATH?.trim() || config.webTool.contentPath);
  const astroOutputPath = path.resolve(
    process.cwd(),
    process.env.WEB_CONTENT_SYNC_ASTRO_OUTPUT_PATH?.trim() || "site-new-astro/src/data/site-content.generated.json"
  );

  if (!mockPath && !spreadsheetId) {
    throw new Error("web_content_sync_spreadsheet_id_missing");
  }

  console.log(
    JSON.stringify(
      {
        event: "web_content_sync_start",
        mode,
        source: mockPath ? "mock_json" : "google_sheets",
        mockPath,
        spreadsheetConfigured: Boolean(spreadsheetId),
        tabs,
        outputs: {
          contentPath: outputPath,
          astroContentPath: astroOutputPath
        }
      },
      null,
      2
    )
  );

  const mockTabs = mockPath ? readTabsFromMock(mockPath) : undefined;

  async function readTab(tabName: string): Promise<string[][]> {
    if (mockTabs) {
      const rows = mockTabs[tabName];
      if (!rows || rows.length === 0) {
        throw new Error(`web_content_sync_mock_tab_missing_${sanitizeToken(tabName)}`);
      }
      return rows;
    }

    return readTabFromGws({
      tabName,
      spreadsheetId: spreadsheetId!,
      gwsCommand,
      gwsCommandArgs,
      timeoutMs
    });
  }

  const [productosTable, favoritosTable, pasosTable, resenasTable, recursosTable, configuracionTable] = await Promise.all([
    readTab(tabs.productos),
    readTab(tabs.favoritos),
    readTab(tabs.pasos),
    readTab(tabs.resenas),
    readTab(tabs.recursos),
    readTab(tabs.configuracion)
  ]);

  const productosRows = rowsToObjects({
    tabName: tabs.productos,
    rows: productosTable,
    requiredHeaders: ["producto_id", "nombre", "precio_mxn", "imagen_principal", "activo"]
  });
  const favoritosRows = rowsToObjects({
    tabName: tabs.favoritos,
    rows: favoritosTable,
    requiredHeaders: ["favorito_id", "producto_id", "activo"]
  });
  const pasosRows = rowsToObjects({
    tabName: tabs.pasos,
    rows: pasosTable,
    requiredHeaders: ["paso_id", "titulo", "descripcion", "activo"]
  });
  const resenasRows = rowsToObjects({
    tabName: tabs.resenas,
    rows: resenasTable,
    requiredHeaders: ["resena_id", "autor", "texto", "activo"]
  });
  const recursosRows = rowsToObjects({
    tabName: tabs.recursos,
    rows: recursosTable,
    requiredHeaders: ["recurso_key", "ruta_o_url", "activo"]
  });
  const configuracionRows = rowsToObjects({
    tabName: tabs.configuracion,
    rows: configuracionTable,
    requiredHeaders: ["clave_configuracion", "valor_configuracion", "activo"]
  });

  const products = parseProducts(productosRows);
  const favorites = parseFavorites(favoritosRows);
  const steps = parseSteps(pasosRows);
  const reviews = parseReviews(resenasRows);
  const resources = parseResources(recursosRows);
  const siteConfigRows = parseSiteConfig(configuracionRows);

  const productById = new Map(products.map((item) => [item.productoId, item]));
  const resourceByKey = new Map(resources.map((item) => [item.recursoKey, item]));

  const siteConfig: Record<string, string> = {};
  for (const row of siteConfigRows) {
    siteConfig[row.clave] = parseConfigValue(row.valor, row.tipoDato);
  }

  const cfg = (key: string, fallback = ""): string => {
    const raw = siteConfig[key];
    if (raw == null || raw.trim().length === 0) return fallback;
    return raw.trim();
  };

  const cfgCsv = (key: string, fallback: string[]): string[] => {
    const raw = cfg(key);
    if (!raw) return fallback;
    return parseCsvField(raw);
  };

  const catalogItems = products.map((item) => ({
    id: item.productoId,
    nombre: item.nombre,
    descripcion: item.descripcionCorta || item.descripcionLarga || "Producto artesanal disponible por pedido.",
    precio: item.precioMxn,
    categoria: item.categoria,
    imageUrl: item.imagenPrincipal,
    imageSource: "manual",
    porciones: item.porciones,
    etiqueta: item.etiqueta,
    clavePrecio: item.clavePrecio,
    orden: item.orden,
    productosRelacionados: item.productosRelacionados
  }));

  const homeFavorites = favorites
    .map((favorite) => {
      const product = productById.get(favorite.productoId);
      if (!product) return undefined;
      return {
        id: favorite.favoritoId,
        productId: product.productoId,
        nombre: favorite.tituloOverride || product.nombre,
        descripcion:
          favorite.descripcionOverride ||
          product.descripcionCorta ||
          product.descripcionLarga ||
          "Producto artesanal disponible por pedido.",
        precio: favorite.precioOverrideMxn ?? product.precioMxn,
        imageUrl: favorite.imagenOverride || product.imagenPrincipal,
        badge: favorite.badge,
        orden: favorite.orden,
        ctaTexto: product.ctaWhatsappTexto,
        ctaPlantilla: product.ctaWhatsappPlantilla
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.orden - b.orden);

  const orderSteps = steps.map((step) => ({
    id: step.pasoId,
    orden: step.orden,
    titulo: step.titulo,
    descripcion: step.descripcion,
    icono: step.icono,
    imagenUrl: step.imagenUrl
  }));

  const testimonials = reviews.map((review) => ({
    text: review.texto,
    author: review.ciudad ? `${review.autor}, ${review.ciudad}` : review.autor
  }));

  const gallery = resources
    .filter((resource) => parseCsvField(resource.uso).includes("galeria") || resource.variante === "galeria")
    .sort((a, b) => a.orden - b.orden)
    .map((resource) => resource.rutaOUrl);

  const heroImageUrl =
    ensureAssetPath(cfg("hero_imagen_url")) ||
    resourceByKey.get("hero_inicio")?.rutaOUrl ||
    homeFavorites[0]?.imageUrl ||
    catalogItems[0]?.imageUrl ||
    "/assets/images/img-011.jpg";

  const output = {
    businessName: cfg("nombre_negocio", "Hadi Cakes"),
    whatsapp: cfg("telefono_whatsapp", "+523122424208"),
    zones: cfgCsv("zonas_entrega_csv", ["Colima Centro", "Villa de Alvarez"]),
    menuItems: homeFavorites.slice(0, 4).map((item) => ({
      nombre: item.nombre,
      descripcion: item.descripcion,
      precio: item.precio
    })),
    catalogItems,
    homeFavorites,
    cta: cfg("cta_principal", "Ordenar por WhatsApp"),
    gallery: gallery.length > 0 ? gallery : catalogItems.slice(0, 5).map((item) => item.imageUrl),
    facebookPageUrl: cfg("facebook_url", "https://facebook.com/HadiCakess"),
    instagramUrl: cfg("instagram_url", "https://instagram.com/hadi.cakess"),
    heroImageUrl,
    howToOrderSteps: orderSteps.map((step) => step.descripcion),
    orderSteps,
    testimonials,
    reviews: reviews.map((review) => ({
      id: review.resenaId,
      author: review.autor,
      city: review.ciudad,
      text: review.texto,
      rating: review.calificacion,
      imageUrl: review.imagenUrl,
      dateIso: review.fechaIso,
      order: review.orden
    })),
    promoBar: {
      text: cfg("promo_texto", "Pedidos en Colima • Entrega o recogida • Agenda con anticipacion"),
      linkLabel: cfg("promo_link_label", "Como ordenar"),
      linkHref: cfg("promo_link_href", "#como-ordenar")
    },
    customOrder: {
      title: cfg("personalizados_titulo", "Pasteles personalizados"),
      description: cfg(
        "personalizados_descripcion",
        "Creamos pasteles para cumpleanos, baby shower, bodas y eventos especiales."
      ),
      occasions: cfgCsv("personalizados_ocasiones_csv", ["Cumpleanos", "Baby shower", "Bodas", "Eventos"]),
      ctaLabel: cfg("personalizados_cta_label", "Solicitar pastel personalizado"),
      ctaMessage: cfg(
        "personalizados_cta_mensaje",
        "Hola Hadi Cakes, quiero cotizar un pastel personalizado. Fecha, porciones y tema:"
      )
    },
    contact: {
      address: cfg("direccion_linea", "Colima, Colima"),
      mapEmbedUrl: cfg("mapa_embed_url", "https://www.google.com/maps?q=Colima%20Colima&output=embed")
    },
    brandAssets: {
      logoUrl: resourceByKey.get("logo_principal")?.rutaOUrl || "/assets/brand/logo-principal.svg",
      businessCardImageUrl: resourceByKey.get("tarjeta_negocio")?.rutaOUrl || "/assets/brand/tarjeta.jpg",
      businessCardNote: cfg("tarjeta_nota", "Atencion por WhatsApp todos los dias")
    },
    siteConfig,
    syncMeta: {
      source: mockPath ? "mock_json" : "google_sheets",
      tabs,
      generatedAt: new Date().toISOString(),
      rows: {
        productos: products.length,
        favoritos_inicio: homeFavorites.length,
        pasos_compra: orderSteps.length,
        resenas: reviews.length,
        recursos: resources.length,
        configuracion_sitio: Object.keys(siteConfig).length
      }
    }
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (mode === "apply") {
    ensureDirForFile(outputPath);
    ensureDirForFile(astroOutputPath);
    fs.writeFileSync(outputPath, serialized, "utf8");
    fs.writeFileSync(astroOutputPath, serialized, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        event: "web_content_sync_result",
        mode,
        wroteFiles: mode === "apply",
        outputs: {
          contentPath: outputPath,
          astroContentPath: astroOutputPath
        },
        rows: output.syncMeta.rows,
        sample: {
          businessName: output.businessName,
          whatsapp: output.whatsapp,
          firstCatalogItem: output.catalogItems[0] ?? null,
          firstFavorite: output.homeFavorites[0] ?? null,
          firstStep: output.orderSteps[0] ?? null
        },
        nextCommand: "npm run web:content:sync"
      },
      null,
      2
    )
  );
}

void main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event: "web_content_sync_failed", detail }, null, 2));
  process.exitCode = 1;
});
