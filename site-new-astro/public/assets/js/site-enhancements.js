(function () {
  function resolveBaseUrl() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.getAttribute('href')) {
      try {
        return new URL(canonical.getAttribute('href')).origin;
      } catch (_err) {
        // Fallback below.
      }
    }
    return window.location.origin || 'https://hadicakes.local';
  }

  function addStructuredData() {
    if (document.querySelector('script[data-generated="schema-org"]')) return;

    const base = resolveBaseUrl();
    const page = normalizePathname(window.location.pathname);

    const bakery = {
      '@context': 'https://schema.org',
      '@type': 'Bakery',
      name: 'Hadi Cakes',
      url: `${base}/index.html`,
      logo: `${base}/assets/favicon.svg`,
      sameAs: [
        'https://instagram.com/hadicakes_colima',
        'https://wa.me/523120000000'
      ],
      areaServed: 'Colima, Mexico'
    };

    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Hadi Cakes',
      url: `${base}/index.html`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${base}/catalogo.html?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };

    let pageSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Hadi Cakes',
      url: `${base}/${page}`
    };

    if (page === 'catalogo.html') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Catalogo Hadi Cakes',
        url: `${base}/catalogo.html`,
        about: 'Pasteles, cupcakes y galletas artesanales'
      };
    } else if (page === 'producto-detalle.html') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Pastel Mediano',
        category: 'Reposteria artesanal',
        image: `${base}/assets/images/img-030.jpg`,
        description: 'Pastel artesanal personalizado de Hadi Cakes.',
        brand: { '@type': 'Brand', name: 'Hadi Cakes' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'MXN',
          availability: 'https://schema.org/InStock',
          url: `${base}/producto-detalle.html`
        }
      };
    } else if (page === 'pasteles-personalizados.html') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Pasteles personalizados',
        provider: { '@type': 'Organization', name: 'Hadi Cakes' },
        areaServed: 'Colima, Mexico',
        url: `${base}/pasteles-personalizados.html`
      };
    } else if (page === 'como-ordenar.html') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Como ordenar en Hadi Cakes',
        step: [
          { '@type': 'HowToStep', name: 'Explora el catalogo' },
          { '@type': 'HowToStep', name: 'Confirma detalles por WhatsApp' },
          { '@type': 'HowToStep', name: 'Agenda y recibe tu pedido' }
        ],
        url: `${base}/como-ordenar.html`
      };
    } else if (page === 'contacto-cobertura.html') {
      pageSchema = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contacto y cobertura',
        url: `${base}/contacto-cobertura.html`
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-generated', 'schema-org');
    script.textContent = JSON.stringify([bakery, website, pageSchema]);
    document.head.appendChild(script);
  }

  function normalizePathname(pathname) {
    const p = pathname.split('#')[0].split('?')[0];
    if (!p || p === '/' || p.endsWith('/')) return 'index.html';
    return p.substring(p.lastIndexOf('/') + 1);
  }

  function setupAriaCurrent() {
    const current = normalizePathname(window.location.pathname);
    const links = document.querySelectorAll('a[href]');
    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      const target = normalizePathname(href);
      if (target === current) {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  function setupMobileMenus() {
    const headers = document.querySelectorAll('header');
    headers.forEach((header, idx) => {
      const nav = header.querySelector('nav.hidden.md\\:flex');
      if (!nav) return;

      let toggle = header.querySelector('button.md\\:hidden.text-primary');
      const headerRow = header.querySelector('.max-w-7xl.mx-auto.px-6.h-20.flex.justify-between.items-center');
      if (!toggle && headerRow) {
        const btn = document.createElement('button');
        btn.className = 'md:hidden text-primary p-2';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Abrir menu');
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 32px;">menu</span>';
        headerRow.appendChild(btn);
        toggle = btn;
      }
      if (!toggle) return;

      const menuId = `mobile-menu-${idx}`;
      toggle.setAttribute('aria-controls', menuId);
      toggle.setAttribute('aria-expanded', 'false');

      if (header.querySelector(`#${menuId}`)) return;

      const panel = document.createElement('div');
      panel.id = menuId;
      panel.className = 'md:hidden hidden px-6 pb-4';

      const wrap = document.createElement('div');
      wrap.className = 'bg-surface-container-lowest rounded-xl shadow-[0_12px_32px_rgba(5,5,5,0.06)] p-4 flex flex-col gap-3';

      const cloned = nav.cloneNode(true);
      cloned.className = 'flex flex-col gap-3';
      cloned.querySelectorAll('a').forEach((a) => {
        a.classList.remove('border-b-2', 'pb-1');
        a.classList.add('py-2');
      });
      wrap.appendChild(cloned);

      const cta = header.querySelector('a[href*="wa.me"], button[aria-label="Pedir por WhatsApp"]');
      if (cta && cta.tagName.toLowerCase() === 'a') {
        const ctaClone = cta.cloneNode(true);
        ctaClone.classList.remove('hidden', 'md:block');
        ctaClone.classList.add('w-full', 'text-center');
        wrap.appendChild(ctaClone);
      }

      panel.appendChild(wrap);
      header.appendChild(panel);

      toggle.addEventListener('click', function () {
        const open = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      panel.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', function () {
          panel.classList.add('hidden');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    });
  }

  function inferCategory(title) {
    const t = title.toLowerCase();
    if (t.includes('cupcake')) return 'cupcakes';
    if (t.includes('galleta')) return 'galletas';
    if (t.includes('personalizado') || t.includes('temático') || t.includes('tematico')) return 'personalizados';
    return 'pasteles';
  }

  function setupCatalogFilters() {
    const isCatalog = normalizePathname(window.location.pathname) === 'catalogo.html';
    if (!isCatalog) return;

    const filterButtons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const txt = (b.textContent || '').trim().toLowerCase();
      return ['todos', 'pasteles', 'cupcakes', 'galletas', 'personalizados'].includes(txt);
    });

    const productCards = Array.from(document.querySelectorAll('section.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3 > .group'));
    if (!filterButtons.length || !productCards.length) return;

    productCards.forEach((card) => {
      const h3 = card.querySelector('h3');
      const category = inferCategory((h3 && h3.textContent) || '');
      card.dataset.category = category;
    });

    function setActive(btn) {
      filterButtons.forEach((b) => {
        const active = b === btn;
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active) {
          b.classList.remove('bg-secondary-container', 'text-on-secondary-container');
          b.classList.add('bg-primary', 'text-on-primary');
        } else {
          b.classList.remove('bg-primary', 'text-on-primary');
          b.classList.add('bg-secondary-container', 'text-on-secondary-container');
        }
      });
    }

    function applyFilter(filter) {
      productCards.forEach((card) => {
        const show = filter === 'todos' || card.dataset.category === filter;
        card.style.display = show ? '' : 'none';
      });
    }

    filterButtons.forEach((btn) => {
      const filter = (btn.textContent || '').trim().toLowerCase();
      btn.addEventListener('click', function () {
        setActive(btn);
        applyFilter(filter);
      });
    });

    const initial = filterButtons.find((b) => (b.textContent || '').trim().toLowerCase() === 'todos') || filterButtons[0];
    setActive(initial);
    applyFilter('todos');
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupAriaCurrent();
    setupMobileMenus();
    setupCatalogFilters();
    addStructuredData();
  });
})();
