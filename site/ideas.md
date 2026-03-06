
# Bakery Website Blueprint (Repostería Local – Colima)

Blueprint para una página web de repostería inspirada en sitios de alto rendimiento como SweetE’s Bakeshop, pero adaptada a una repostería local que vende en **Colima** y cuyo fuerte son **pasteles personalizados y cupcakes**.

---

# 1. Wireframe (estructura visual por secciones)

## Header (sticky)
- Logo (izquierda)
- Menú:
  - Pasteles
  - Personalizados
  - Cupcakes
  - Galería
  - Cómo ordenar
  - Contacto
- Botón primario destacado:

**Ordenar por WhatsApp**

---

# 2. Home Page

## A. Promo Bar
Mensaje superior simple.

Ejemplo:

Pedidos en Colima • Entrega o recogida • Agenda con 48h de anticipación

Link opcional:

Cómo ordenar

---

## B. Hero Section

Imagen grande de un pastel premium.

**Título**

Pasteles artesanales en Colima

**Subtítulo**

Personalizados para cumpleaños y eventos

**Botones**

- Ver catálogo
- Cotizar pastel personalizado

---

## C. Best Sellers (productos destacados)

Grid con 4–6 productos.

Ejemplo:

- Pastel chocolate
- Pastel tres leches
- Pastel red velvet
- Caja 12 cupcakes
- Cupcakes personalizados
- Pastel infantil

Cada card debe incluir:

- Imagen
- Precio base
- Botón **Ordenar**

---

## D. Sección "Pasteles Personalizados"

Bloque importante para ventas.

Texto ejemplo:

Creamos pasteles personalizados para cualquier ocasión:

- Cumpleaños
- Baby shower
- Bodas
- Eventos especiales

Botón:

Solicitar pastel personalizado

---

## E. Cómo ordenar

Proceso simple en pasos.

1. Elige tu pastel o envía tu idea  
2. Confirmamos fecha, tamaño y diseño  
3. Te damos precio final y anticipo  
4. Entrega o recogida en Colima  

---

## F. Testimonios

3–6 reseñas de clientes.

Ejemplo:

★★★★★  
El pastel quedó hermoso y delicioso.  
Ana – Colima

---

## G. Galería

Grid de 8–12 fotos reales de pasteles.

Las fotos generan confianza y muestran tu estilo.

---

## H. Footer

Información básica.

- WhatsApp
- Instagram
- Ubicación
- Horario
- Políticas

---

# 3. Site Map

/
|-- pasteles
|-- cupcakes
|-- personalizados
|-- galeria
|-- como-ordenar
|-- contacto

Opcional en el futuro:

/ocasion/cumpleanos
/ocasion/boda
/ocasion/baby-shower

---

# 4. Flujo de pedidos por WhatsApp

El botón **Ordenar** debe abrir WhatsApp con mensaje prellenado.

Ejemplo de mensaje:

Hola 👋  
Quiero pedir **Pastel de chocolate**

Tamaño/porciones:  
Fecha:  
Entrega o recogida:  
Comentarios:

Link:

https://wa.me/52TU_NUMERO?text=mensaje

---

# 5. Cotización de pasteles personalizados

Formulario simple.

Campos:

- Nombre
- Fecha del evento
- Número de porciones
- Tema o idea
- Presupuesto (opcional)
- Imagen de referencia (opcional)

Al enviar:

- abrir WhatsApp con resumen
- o enviar a backend si existe

---

# 6. Arquitectura Angular recomendada

## Páginas

pages/
    home
    catalog
    custom-order
    gallery
    how-to-order
    contact

---

## Componentes

layout/
    header
    footer

shared/
    product-card
    section-title
    testimonial-card
    gallery-grid
    whatsapp-cta-button
    promo-bar

---

# 7. Modelo de datos de productos

Archivo simple `products.ts`

```ts
type Product = {
  id: string;
  category: 'cakes' | 'cupcakes';
  name: string;
  priceFrom?: number;
  portions?: string[];
  images: string[];
  tags?: string[];
  descriptionShort: string;
}
```

Ejemplo:

```ts
{
  id: "cake-chocolate",
  category: "cakes",
  name: "Pastel de chocolate",
  priceFrom: 450,
  portions: ["10-12", "15-20", "20-30"],
  images: ["cake1.jpg"],
  descriptionShort: "Pastel húmedo de chocolate con ganache."
}
```

---

# 8. Estilo visual recomendado

Para lograr una estética profesional:

- fondo claro
- mucho espacio entre secciones
- fotos grandes
- máximo 2 tipografías
- cards simples

Las **fotos del producto representan el 70% del diseño**.

---

# 9. Checklist de conversión (muy importante)

Elementos que ayudan a vender:

- botón WhatsApp fijo en móvil
- horarios visibles
- zona de entrega clara
- pedidos con anticipación
- galería con fotos reales
- proceso de pedido simple

---

# 10. Futuras mejoras

Cuando el negocio crezca se pueden agregar:

- sistema de pedidos online
- calendario de disponibilidad
- pagos online
- sección de eventos
- sección de regalos corporativos

---

# Resumen

El sitio debe ser:

- visual
- simple
- rápido para pedir
- enfocado en WhatsApp

El objetivo no es solo verse bonito, sino **convertir visitas en pedidos**.
