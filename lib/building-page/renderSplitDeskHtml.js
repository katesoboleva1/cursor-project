/**
 * Template B — Split Desk + Gallery hero
 * Gallery photo header · Floors | unit list | detail + Signal
 * DLD tickers link to separate DLD page · Google rating + Google reviews ticker
 *
 * Investor UI only. Broker «Разговорчики» / inbox feed lives elsewhere
 * (see lib/building-page/brokerRazgovorchiki.stub.js → b2b.refty.ai/inbox).
 */
const { esc, fmt, groupByFloor, askDldCompareMini, dldTickerHtml, dldTickerCss } = require('./shared');
const { ppsFlipBootScript } = require('./buildingHero');
const {
  buildingRoomChatCss,
  buildingRoomChatBootScript,
  buildingUnderBuildingHtml,
} = require('./buildingRoomChat');
const { cvh1brFloorChartEmbed } = require('./cvh1brFloorChartEmbed');
const { swipeStartChatCss, swipeStartChatSheetHtml, swipeStartChatDockHtml } = require('./swipeStartChat');

function starGlyphs(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.round(r); // 4.5 → 5 filled for display simplicity, or floor
  const filled = Math.min(5, Math.floor(r + 0.5)); // round half up for stars
  return { text: '★'.repeat(filled) + '☆'.repeat(5 - filled), value: r };
}

function googleRatingHtml(place) {
  if (!place) return '';
  if (place.rating == null) {
    if (!place.maps_url) return '';
    const label = place.note
      ? 'Google Maps · отзывы локации'
      : 'Open on Google Maps';
    return `<a class="google-rating" href="${esc(place.maps_url)}" target="_blank" rel="noopener noreferrer" title="${esc(place.note || 'Open on Google Maps')}"><span class="g-score">${esc(label)}</span></a>`;
  }
  const { text } = starGlyphs(place.rating);
  const n = place.reviews_count != null ? fmt(place.reviews_count) : null;
  const label = `${Number(place.rating).toFixed(1)} · ${n != null ? `${n} Google reviews` : 'Google'}`;
  const inner = `<span class="g-stars" aria-hidden="true">${esc(text)}</span><span class="g-score">${esc(label)}</span>`;
  if (place.maps_url) {
    return `<a class="google-rating" href="${esc(place.maps_url)}" target="_blank" rel="noopener noreferrer" title="Open on Google Maps">${inner}</a>`;
  }
  return `<div class="google-rating">${inner}</div>`;
}

function trustBitsHtml(stock) {
  const bits = [];
  if (stock?.developer) bits.push(esc(stock.developer));
  if (stock?.units != null) bits.push(`${fmt(stock.units)} units`);
  if (stock?.age_years != null) bits.push(`~${fmt(stock.age_years)}y`);
  if (!bits.length) return '';
  return `<div class="trust-bits">${bits.map((b) => `<span>${b}</span>`).join('<i>·</i>')}</div>`;
}

function reviewsTickerHtml(reviews) {
  const rows = reviews || [];
  if (!rows.length) return '';
  const isGoogle = rows.some((r) => r.source === 'google');
  const items = rows
    .map((rv) => {
      const stars = '★'.repeat(Math.min(5, Math.max(0, Number(rv.rating) || 0)));
      const text = String(rv.text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      const photo = rv.photo || rv.avatar || '';
      const avatar = rv.avatar || '';
      return `<span class="rev-item">
        ${photo ? `<img class="rev-photo" src="${esc(photo)}" alt="" loading="lazy" decoding="async" />` : ''}
        <span class="rev-body">
          <span class="rev-top">${avatar ? `<img class="rev-avatar" src="${esc(avatar)}" alt="" loading="lazy" />` : ''}<b>${esc(rv.author || 'Resident')}</b> <span class="rev-stars">${esc(stars)}</span></span>
          <span class="rev-text">${esc(text)}</span>
          ${rv.meta ? `<span class="rev-meta">${esc(rv.meta)}</span>` : ''}
        </span>
      </span>`;
    })
    .join('<span class="rev-sep">✦</span>');
  return `<div class="reviews-ticker" id="reviews" aria-label="${isGoogle ? 'Google reviews' : 'Resident reviews'}">
    <div class="reviews-ticker-label">${isGoogle ? 'Google · reviews' : 'Residents'}</div>
    <div class="reviews-ticker-viewport">
      <div class="reviews-ticker-track">${items}<span class="rev-sep">✦</span>${items}</div>
    </div>
  </div>`;
}

/** Bottom Google · reviews chip removed — reviews stay in .page-below only */
function reviewsPinHtml() {
  return '';
}

function reviewsLongreadHtml(reviews, google) {
  const rows = reviews || [];
  if (!rows.length && !google?.maps_url && !google?.note) return '';
  const cards = rows
    .map((rv) => {
      const stars = '★'.repeat(Math.min(5, Math.max(0, Number(rv.rating) || 0)));
      const photo = rv.photo || rv.avatar || '';
      return `<article class="review-card" itemscope itemtype="https://schema.org/Review">
        ${photo ? `<img class="review-card-photo" src="${esc(photo)}" alt="" loading="lazy" decoding="async" itemprop="image" />` : ''}
        <div class="review-card-body">
          <div class="review-card-top">
            ${rv.avatar ? `<img class="review-card-av" src="${esc(rv.avatar)}" alt="" loading="lazy" />` : ''}
            <strong itemprop="author">${esc(rv.author || 'Resident')}</strong>
            <span class="rev-stars" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating"><meta itemprop="ratingValue" content="${esc(String(rv.rating || 5))}" />${esc(stars)}</span>
          </div>
          <p itemprop="reviewBody">${esc(String(rv.text || ''))}</p>
          <span class="rev-meta">${esc(rv.meta || (rv.source === 'google' ? 'Google review' : ''))}</span>
        </div>
      </article>`;
    })
    .join('\n');
  const maps =
    google?.maps_url
      ? `<a class="longread-more" href="${esc(google.maps_url)}" target="_blank" rel="noopener">Все отзывы на Google Maps →</a>`
      : '';
  const note = google?.note ? `<p class="longread-lead">${esc(google.note)}</p>` : '';
  const lead = rows.some((r) => r.source === 'google')
    ? `Google / resident feedback for ${esc(google?.name || 'the building')} — useful for AI summaries and human longreads.`
    : `Community notes for ${esc(google?.name || 'the building')}. Для живых Google-отзывов — ссылка на Maps ниже.`;
  return `<section class="longread-block" id="reviews-longread">
    <h2>Отзывы · с фото</h2>
    <p class="longread-lead">${lead}</p>
    ${note}
    ${cards ? `<div class="reviews-grid">${cards}</div>` : ''}
    ${maps}
  </section>`;
}

function longreadHtml(page, dldHref) {
  const seo = page.seo || {};
  const b = page.building || '—';
  const blog = page.blog || [];
  const faqs = seo.faqs || [];
  const faqHtml = faqs
    .map(
      (f, i) => `<details class="faq-item" id="faq-${i}">
      <summary>${esc(f.q)}</summary>
      <p>${esc(f.a)}</p>
    </details>`
    )
    .join('\n');
  const blogHtml = blog
    .map(
      (x) => `<a class="blog-card" href="${esc(x.href || '#longread')}">
      <span class="blog-k">${esc(x.kicker || '')}</span>
      <strong>${esc(x.title || '')}</strong>
      <span class="blog-m">${esc(x.meta || '')}</span>
    </a>`
    )
    .join('\n');

  return `<article class="longread" id="longread">
    <nav class="toc" aria-label="On this page">
      <a href="#longread">Guide</a>
      <a href="#faq">FAQ</a>
      <a href="#reviews-longread">Reviews</a>
      <a href="${esc(dldHref)}">DLD</a>
      <a href="#guide-floors">Floors</a>
    </nav>
    <section class="longread-block" id="guide-floors">
      <h2>${esc(seo.title || `${b} guide`)}</h2>
      ${(seo.paragraphs || []).map((p) => `<p>${p}</p>`).join('\n')}
      <div class="seo-chips">${(seo.chips || []).map((c) => `<span>${esc(c)}</span>`).join('')}</div>
    </section>
    <section class="longread-block" id="faq">
      <h2>FAQ · ${esc(b)}</h2>
      <p class="longread-lead">Short answers for search / AI overviews. Expand for detail.</p>
      ${faqHtml}
    </section>
    ${reviewsLongreadHtml(page.reviews || [], page.google_place)}
    <section class="longread-block" id="related">
      <h2>Related · topics</h2>
      <div class="blog-list">${blogHtml}</div>
    </section>
  </article>`;
}


/** Compact Silent offer chip — −75% + 24h countdown (price details in modal). */
function silentOfferChipHtml(id) {
  return `<button type="button" class="tarif-chip tarif-chip--compact is-featured tarif-chip--silent" id="${id}"
      aria-haspopup="dialog" aria-controls="tariffsOverlay"
      aria-label="Silent −75% · offer expires in 24 hours · открыть тарифы">
      <span class="tarif-chip-pct">−75%</span>
      <time class="intro-countdown tarif-chip-cd" data-intro-countdown datetime="" title="Окно 24ч с первого визита">--:--:--</time>
    </button>`;
}

/** Dark Higgsfield-style comparison: Trial / Silent / Anti-broker. */
function tariffsModalHtml() {
  return `<div class="tariffs-overlay" id="tariffsOverlay" hidden aria-hidden="true">
    <div class="tariffs-backdrop" data-tariffs-dismiss tabindex="-1"></div>
    <div class="tariffs-dialog" role="dialog" aria-modal="true" aria-labelledby="tariffsTitle" id="tariffsDialog">
      <button type="button" class="tariffs-x" data-tariffs-dismiss aria-label="Закрыть">×</button>
      <header class="tariffs-hero">
        <span class="tariffs-kicker">Extra Discount · −75%</span>
        <h2 class="tariffs-title" id="tariffsTitle">Silent · 24 hours</h2>
        <p class="tariffs-sub">Intro: <s>5 200</s> → <b>1 300 AED</b> / 2 мес. Выбери уровень доступа.</p>
      </header>
      <div class="tariffs-grid">
        <article class="tariffs-card">
          <div class="tariffs-plan-row"><h3 class="tariffs-plan">Trial</h3><span class="tariffs-pill tariffs-pill--mute">3 дня</span></div>
          <p class="tariffs-card-sub">Короткий просмотр · убедиться, что мы норм</p>
          <div class="tariffs-price"><b>$54</b><span>/ 3 дня</span></div>
          <button type="button" class="tariffs-cta tariffs-cta--ghost" data-tarif-pick="trial">Start trial</button>
          <ul class="tariffs-feats">
            <li><span class="ok">✓</span>Этажи видны</li>
            <li class="off"><span class="x">×</span>Номер юнита скрыт</li>
            <li class="off"><span class="x">×</span>Нет оригинала</li>
            <li><span class="ok">✓</span>До <b>3</b> диалогов в день с брокерами</li>
            <li><span class="ok">✓</span>Рекомендатор юнитов с учётом этажности</li>
          </ul>
        </article>
        <article class="tariffs-card is-hot">
          <div class="tariffs-plan-row">
            <h3 class="tariffs-plan">Silent</h3>
            <span class="tariffs-pill tariffs-pill--pink">−75% OFF</span>
            <span class="tariffs-pill tariffs-pill--lime">BEST</span>
          </div>
          <p class="tariffs-card-sub">Исследователь рынка · полный доступ 2 мес</p>
          <p class="tariffs-card-slogan">получай доступ к объектам быстрее других</p>
          <div class="tariffs-price"><s>5 200</s><b>1 300</b><span>AED / 2 мес</span></div>
          <button type="button" class="tariffs-cta" data-tarif-pick="silent">Get Silent</button>
          <ul class="tariffs-feats">
            <li><span class="ok">✓</span>Номера юнитов</li>
            <li><span class="ok">✓</span>Оригиналы через плагин</li>
            <li><span class="ok">✓</span>AI робот <b>мониторит за тебя все объекты</b></li>
            <li><span class="ok">✓</span>Analytics <b>оценивает каждый объект</b> и показывает, как сравнил с рынком</li>
            <li><span class="ok">✓</span>До <b>20</b> диалогов · безлимит поисков</li>
            <li><span class="ok">✓</span>Price drop</li>
            <li><span class="ok">✓</span>All history unit · полная история юнита</li>
          </ul>
        </article>
        <article class="tariffs-card">
          <div class="tariffs-plan-row"><h3 class="tariffs-plan">Anti-broker</h3><span class="tariffs-pill tariffs-pill--mute">3 мес</span></div>
          <p class="tariffs-card-sub">AI торг · показы · сопровождение сделки</p>
          <div class="tariffs-price"><b>11 000</b><span>AED / 3 мес</span></div>
          <button type="button" class="tariffs-cta tariffs-cta--ghost" data-tarif-pick="anti">Get Anti-broker</button>
          <ul class="tariffs-feats">
            <li><span class="ok">✓</span>Всё из Silent</li>
            <li><span class="ok">✓</span>Экономия <b>75%</b> на комиссии брокера — <b>20 000</b> дирхам</li>
            <li><span class="ok">✓</span>AI-бот торгуется</li>
            <li><span class="ok">✓</span>До <b>15</b> показов + 1 сделка</li>
            <li><span class="ok">✓</span>Доступ к дистресс-сделкам (collection)</li>
          </ul>
        </article>
      </div>
    </div>
  </div>`;
}

/** Mobile bottom app dock: Collections · AI search · Inbox · Profile */
function mobAppDockHtml() {
  return `<nav class="mob-app-dock" id="mobAppDock" aria-label="Навигация">
    <button type="button" class="mob-app-dock-btn" data-mob-nav="collections" aria-label="Коллекции">
      <span class="mob-app-dock-ic" aria-hidden="true">▣</span>
      <span class="mob-app-dock-lbl">Коллекции</span>
    </button>
    <button type="button" class="mob-app-dock-btn mob-app-dock-btn--ai" data-mob-nav="ai" aria-label="AI поиск">
      <span class="mob-app-dock-ic" aria-hidden="true">✦</span>
      <span class="mob-app-dock-lbl">AI поиск</span>
    </button>
    <button type="button" class="mob-app-dock-btn" data-mob-nav="inbox" aria-label="Inbox">
      <span class="mob-app-dock-ic" aria-hidden="true">✉</span>
      <span class="mob-app-dock-lbl">Inbox</span>
    </button>
    <button type="button" class="mob-app-dock-btn" data-mob-nav="profile" aria-label="Profile">
      <span class="mob-app-dock-ic" aria-hidden="true">☺</span>
      <span class="mob-app-dock-lbl">Profile</span>
    </button>
  </nav>
  <div class="mob-ai-sheet" id="mobAiSheet" hidden aria-hidden="true">
    <div class="mob-ai-backdrop" data-mob-ai-dismiss tabindex="-1"></div>
    <div class="mob-ai-panel" role="dialog" aria-modal="true" aria-labelledby="mobAiTitle">
      <div class="mob-ai-head">
        <strong id="mobAiTitle">AI поиск</strong>
        <button type="button" class="mob-ai-x" data-mob-ai-dismiss aria-label="Закрыть">×</button>
      </div>
      <label class="mob-ai-field" for="mobAiInput">
        <input type="search" id="mobAiInput" placeholder="Ну давай ещё поищем что-нибудь — можешь задать любой вопрос" enterkeyhint="search" autocomplete="off" />
      </label>
      <button type="button" class="mob-ai-go" id="mobAiGo">Искать</button>
    </div>
  </div>`;
}

const GOOGLE_G_SVG =
  '<svg width="18" height="18" viewBox="0 0 48 48" focusable="false" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.1 44 32.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>';

/** Google sign-in / profile — desk: beside search; mob: under Marina Gate filters. */
function authSlotHtml(variant) {
  const cls = variant === 'mob' ? 'auth-slot auth-slot--mob' : 'auth-slot auth-slot--desk';
  return `<div class="${cls}" data-auth-slot>
    <button type="button" class="auth-google" data-auth-google aria-label="Войти через Google">
      <span class="auth-google-icon" aria-hidden="true">${GOOGLE_G_SVG}</span>
      <span class="auth-google-text">Войти через Google</span>
    </button>
    <div class="auth-profile" data-auth-profile hidden>
      <span class="auth-avatar" data-auth-avatar aria-hidden="true">?</span>
      <span class="auth-meta">
        <b data-auth-name>User</b>
        <small data-auth-email>user@gmail.com</small>
      </span>
      <button type="button" class="auth-out" data-auth-out title="Выйти">Выйти</button>
    </div>
  </div>`;
}

function authPopupHtml() {
  return `<div class="gauth-overlay" id="gauthOverlay" hidden aria-hidden="true">
    <div class="gauth-backdrop" data-gauth-dismiss tabindex="-1"></div>
    <div class="gauth-dialog" role="dialog" aria-modal="true" aria-labelledby="gauthTitle" id="gauthDialog">
      <button type="button" class="gauth-x" data-gauth-dismiss aria-label="Закрыть">×</button>
      <div class="gauth-brand">
        <span class="gauth-g" aria-hidden="true">${GOOGLE_G_SVG.replace('width="18"', 'width="28"').replace('height="18"', 'height="28"')}</span>
        <span class="gauth-word">Sign in with Google</span>
      </div>
      <h2 class="gauth-title" id="gauthTitle">Выбери аккаунт</h2>
      <p class="gauth-sub">чтобы открыть Silent · −75% · 1 300 AED</p>
      <button type="button" class="gauth-account" id="gauthAccount" data-gauth-continue>
        <span class="gauth-acc-av" aria-hidden="true">AM</span>
        <span class="gauth-acc-meta">
          <b>Alex Marina</b>
          <small>alex.marina@gmail.com</small>
        </span>
        <span class="gauth-acc-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" class="gauth-continue" id="gauthContinue" data-gauth-continue>
        <span class="gauth-continue-icon" aria-hidden="true">${GOOGLE_G_SVG}</span>
        Продолжить с Google
      </button>
      <p class="gauth-fine">Demo OAuth · вход сохраняется в этом браузере</p>
    </div>
  </div>`;
}

function jsonLdHtml(page, pageUrl) {
  const seo = page.seo || {};
  const b = page.building || '';
  const district = page.district || 'Dubai Marina';
  const g = page.google_place || {};
  const reviews = page.reviews || [];
  const faqs = seo.faqs || [];
  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Refty', item: 'https://refty.ai/' },
        { '@type': 'ListItem', position: 2, name: district, item: pageUrl },
        { '@type': 'ListItem', position: 3, name: b, item: pageUrl },
      ],
    },
    {
      '@type': 'ApartmentComplex',
      '@id': `${pageUrl}#building`,
      name: b,
      description: seo.answer || seo.meta_description || '',
      address: {
        '@type': 'PostalAddress',
        addressLocality: district,
        addressRegion: 'Dubai',
        addressCountry: 'AE',
      },
      numberOfAccommodationUnits: page.building_stock?.units || undefined,
      ...(g.rating != null
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: g.rating,
              reviewCount: g.reviews_count || reviews.length,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
      review: reviews.slice(0, 5).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author || 'Resident' },
        reviewBody: r.text || '',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating || 5,
          bestRating: 5,
        },
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'WebPage',
      '@id': pageUrl,
      url: pageUrl,
      name: seo.title || b,
      description: seo.meta_description || '',
      isPartOf: { '@type': 'WebSite', name: 'Refty', url: 'https://refty.ai/' },
      about: { '@id': `${pageUrl}#building` },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.longread-block p', '.faq-item p', 'h1'],
      },
    },
  ];
  const payload = { '@context': 'https://schema.org', '@graph': graph };
  return `<script type="application/ld+json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

function renderSplitDeskHtml(page) {
  const b = page.building || '—';
  const district = page.district || '—';
  const seo = page.seo || {};
  const pps = page.pps_dynamics || { sale: [], rent: [] };
  const sale = page.listings_sale || [];
  const rent = page.listings_rent || [];
  const floors = page.building_floors || 0;
  const google = page.google_place || null;
  const reviews = page.reviews || [];
  const stock = page.building_stock || {};
  let deals = page.dld_deals_dynamics || { sale: [], rent: [] };
  if (!(deals.sale && deals.sale.length) && !(deals.rent && deals.rent.length)) {
    const dldTick = page.dld_ticker || { sale: [], rent: [] };
    const fromTicker = (rows) => {
      const by = new Map();
      for (const r of rows || []) {
        const m = String(r.d || '').slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(m)) continue;
        by.set(m, (by.get(m) || 0) + 1);
      }
      return [...by.keys()].sort().map((m) => ({ m, n: by.get(m) }));
    };
    deals = { sale: fromTicker(dldTick.sale), rent: fromTicker(dldTick.rent) };
  }
  const slug =
    'building_' +
    String(b)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60);
  const dldHref = `${slug}_dld.html`;
  const pageUrl = `https://refty.ai/${slug}_b_split.html`;
  const hero =
    sale.find((r) => r.photo)?.photo ||
    rent.find((r) => r.photo)?.photo ||
    '';
  const dld = page.dld_ticker || { sale: [], rent: [] };
  const cvhChart = cvh1brFloorChartEmbed(b);
  const dldSaleTick = (dld.sale || []).slice(0, 48);
  const dldRentTick = (dld.rent || []).slice(0, 48);

  const payload = {
    building: b,
    district,
    buildingFloors: floors,
    sale: groupByFloor(sale),
    rent: groupByFloor(rent),
    pps: { sale: pps.sale || [], rent: pps.rent || [] },
    counts: { sale: sale.length, rent: rent.length },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(seo.title || `${b} · Split Desk · Refty`)}</title>
  <meta name="description" content="${esc(seo.meta_description || `${b} ${district}`)}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${esc(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(seo.title || b)}" />
  <meta property="og:description" content="${esc(seo.meta_description || '')}" />
  ${hero ? `<meta property="og:image" content="${esc(hero)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  ${jsonLdHtml(page, pageUrl)}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Manrope:wght@500;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:#07131a; --ink:#031016; --card:#0d1c24; --elev:#132830; --line:#1c3340;
      --text:#eef6f4; --muted:#8aa3ad; --sand:#d8c3a5; --sea:#3ecfcf; --accent:#d8c3a5;
      --good:#5ee4a8; --bad:#ff7a7a;
      --safe: env(safe-area-inset-bottom,0px);
      --desk-h: min(82vh, 920px);
      --tabs-h: 84px;
      --mob-head-h: 48px;
      --mob-nav-h: 64px;
    }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    /* overflow-x on body breaks position:sticky — clip wide children instead */
    body {
      margin:0; font:14px/1.45 Manrope,system-ui,sans-serif; background:var(--bg); color:var(--text);
      min-height:100%;
    }
    body.split-desk{
      display:flex; flex-direction:column;
    }
    a { color:var(--sea); }

    .hero {
      position:relative; display:contents; overflow:visible;
    }
    .hero-mob-top{display:none}
    .hero-mob-bar{display:none}
    .hero-panel{display:contents}
    .hero-core {
      order:20;
      padding:28px 20px 22px; max-width:1400px; width:100%; margin:0 auto;
      background:#041018 center/cover no-repeat;
      ${hero ? `background-image:linear-gradient(180deg,rgba(7,19,26,.2),rgba(7,19,26,.94) 55%, #07131a),url('${esc(hero)}');` : ''}
    }
    .hero-tail{display:none}
    /* reviews + longread AFTER desk — under sticky desk (never covers listing photos).
       Desktop: collapsed until body.desk-below-open (last/lowest floor reached). */
    .page-below{
      order:50; width:100%; position:relative; z-index:1;
      background:var(--bg);
    }
    @media (min-width:1101px){
      body.split-desk:not(.desk-below-open) .page-below{
        display:none !important;
        visibility:hidden;
        pointer-events:none;
        height:0 !important;
        max-height:0 !important;
        margin:0 !important;
        padding:0 !important;
        overflow:hidden !important;
        border:0 !important;
      }
      body.split-desk.desk-below-open .page-below{
        display:block;
        visibility:visible;
        pointer-events:auto;
      }
    }
    #dld-sale{order:10}
    .cvh1br-chart, #cvh-1br-chart{order:15}
    #dld-rent{order:30}
    .workspace{order:40}
    .kicker { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--sand); font-weight:800; }
    .hero h1 { margin:6px 0 0; font-family:Fraunces,serif; font-size:clamp(1.85rem,4.5vw,3rem); letter-spacing:-.03em; font-weight:800; }
    .hero .sub { margin-top:8px; color:var(--muted); max-width:52ch; }
    .trust-strip {
      display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-top:12px;
    }
    .google-rating {
      display:inline-flex; align-items:center; gap:8px; text-decoration:none; color:inherit;
      padding:6px 12px; border-radius:999px; border:1px solid rgba(251,188,5,.35);
      background:rgba(251,188,5,.1); font-weight:750; font-size:13px;
    }
    .google-rating:hover { border-color:rgba(251,188,5,.7); background:rgba(251,188,5,.16); }
    .g-stars { color:#fbbc05; letter-spacing:1px; font-size:14px; line-height:1; }
    .g-score { color:var(--text); font-variant-numeric:tabular-nums; }
    .trust-bits {
      display:inline-flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:12px; color:var(--muted); font-weight:650;
    }
    .trust-bits i { font-style:normal; opacity:.5; }
    .trust-bits span { color:var(--sand); }
    .metrics {
      display:flex; flex-wrap:wrap; align-items:stretch; justify-content:flex-start;
      gap:12px; margin-top:14px; max-width:1480px;
    }
    .metrics .pps, .metrics .stat {
      flex:0 1 300px; width:300px; max-width:calc(100vw - 28px);
      background:rgba(13,28,36,.78); border:1px solid var(--line); border-radius:12px; padding:10px 12px; backdrop-filter:blur(10px);
    }
    .metrics .pps.pps-flip {
      cursor:pointer; padding:0; background:transparent; border:0; perspective:900px;
      min-height:220px;
    }
    .pps-flip-inner {
      position:relative; width:100%; height:100%; min-height:220px;
      transition: transform .55s cubic-bezier(.2,.8,.2,1);
      transform-style: preserve-3d;
    }
    .pps-flip.is-flipped .pps-flip-inner { transform: rotateY(180deg); }
    .pps-face {
      position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden;
      border:1px solid var(--line); border-radius:12px; padding:12px 14px;
      background:rgba(13,28,36,.88); display:flex; flex-direction:column;
    }
    .pps-face--back { transform: rotateY(180deg); border-color:rgba(62,207,207,.35); }
    .pps-flip-hint {
      margin-top:auto; padding-top:8px; font-size:9px; letter-spacing:.06em; text-transform:uppercase;
      color:var(--muted); font-weight:700; opacity:.75;
    }
    .pps-deals-chart { flex:1; display:flex; align-items:flex-end; margin-top:8px; min-height:72px; }
    .pps-deals-bars {
      display:flex; align-items:flex-end; gap:3px; width:100%; height:72px;
    }
    .pps-deals-bars i {
      flex:1 1 0; min-width:0; border-radius:3px 3px 1px 1px;
      background:linear-gradient(180deg, var(--sea), rgba(62,207,207,.35));
      display:block;
    }
    .pps { color:var(--sea); }
    .pps.pps--ask {
      color:#f0a0a0;
      border-color:rgba(255,122,122,.4);
      background:rgba(255,122,122,.08);
    }
    .pps.pps--ask .pps-l { color:#f5b4b4; }
    .pps.pps--compare {
      flex:1 1 520px; width:520px; max-width:calc(100vw - 28px);
      border:1px solid rgba(216,195,165,.28);
      background:linear-gradient(135deg, rgba(255,122,122,.07), rgba(94,228,168,.07));
    }
    .pps.pps--compare .pps-face--front {
      border-color:rgba(255,122,122,.35);
      background:rgba(255,122,122,.06);
    }
    .pps.pps--compare .pps-face--back {
      border-color:rgba(94,228,168,.35);
      background:rgba(94,228,168,.06);
    }
    .pps-v--split {
      display:flex; align-items:baseline; justify-content:space-between; gap:12px;
      font-size:1.25em;
    }
    .pps-v--split .pps-ask { color:#f0a0a0; font-weight:800; }
    .pps-v--split .pps-dld { color:#7ddeb8; font-weight:800; }
    .pps-v--split em {
      font-style:normal; font-size:10px; font-weight:700; color:var(--muted); margin-left:4px;
      display:inline-block; max-width:9em; line-height:1.15;
    }
    .pps-legend {
      display:flex; gap:14px; margin-top:6px; font-size:10px; font-weight:700;
      letter-spacing:.04em; text-transform:uppercase; color:var(--muted);
    }
    .pps-legend i {
      display:inline-block; width:10px; height:3px; border-radius:2px; margin-right:5px; vertical-align:middle;
    }
    .pps-legend .lg-ask { color:#f0a0a0; }
    .pps-legend .lg-ask i { background:#f0a0a0; }
    .pps-legend .lg-dld { color:#7ddeb8; }
    .pps-legend .lg-dld i { background:#7ddeb8; }
    .pps-dld-go {
      margin-left:auto; font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;
      color:var(--sea); text-decoration:none; padding:4px 8px; border-radius:999px;
      border:1px solid rgba(62,207,207,.35); background:rgba(62,207,207,.1);
    }
    .pps-dld-go:hover { background:rgba(62,207,207,.2); color:#dffcff; }
    .pps-legend { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
    .pps-chart--dual svg { height:140px; }
    .pps.pps--fact { color:#7ddeb8; }
    .pps.pps--fact .pps-face--front,
    .pps.pps--fact .pps-face--back {
      border-color:rgba(94,228,168,.4);
      background:rgba(94,228,168,.08);
    }
    .pps.pps--fact .pps-l { color:#9eebc8; }
    .pps-top { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:2px; }
    .pps-l,.stat-l { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; }
    .pps-drop-big {
      font-size:15px; font-weight:900; font-variant-numeric:tabular-nums; line-height:1;
      color:var(--sand); white-space:nowrap;
    }
    .pps-drop-big.pps-drop { color:var(--bad); }
    .pps-drop-big.pps-up { color:var(--good); }
    .pps-v,.stat-v { font-weight:800; font-variant-numeric:tabular-nums; font-size:1.45em; line-height:1.15; }
    .pps-v em { font-style:normal; color:var(--sand); font-size:12px; margin-left:6px; }
    .pps-v em.pps-drop { color:var(--bad); font-weight:800; }
    .pps-v em.pps-up { color:var(--good); font-weight:800; }
    .pps-vs { font-size:11px; color:var(--muted); margin-top:2px; font-weight:650; line-height:1.25; }
    .pps-chart { position:relative; margin-top:10px; flex:1 1 auto; min-height:110px; }
    .pps-chart svg { display:block; width:100%; height:110px; overflow:visible; }
    .pps-dates {
      display:flex; justify-content:space-between; gap:0; margin-top:6px;
      font-size:9px; line-height:1.1; color:var(--muted); font-variant-numeric:tabular-nums; font-weight:600;
    }
    .pps-dates span { flex:1 1 0; text-align:center; overflow:hidden; white-space:nowrap; min-height:10px; }
    .pps-dates span.is-hide { visibility:hidden; }
    .stat-note { font-size:11px; color:var(--muted); margin-top:4px; }
    .dld-full {
      display:block; width:100%; margin:0; padding:0; position:relative; z-index:6;
      border:0; border-bottom:1px solid var(--line); overflow:hidden; background:#031016;
      cursor:pointer; font:inherit; color:inherit; text-align:left; text-decoration:none;
    }
    .dld-full:hover { outline:1px solid rgba(216,195,165,.35); outline-offset:-1px; }
    .dld-full--under { border-top:1px solid var(--line); }
    .dld-full .dld-ticker { border:0; min-height:44px; width:100%; background:#031016; pointer-events:none; }
    .dld-full .dld-ticker-label { pointer-events:none; }

    /* Desktop: pin desk after hero. Host is only desk-tall so sticky releases
       before .page-below — reviews stay below in flow, never cover listing photos. */
    .desk-sticky-host{
      order:39; width:100%;
      align-self:flex-start;
      flex-shrink:0;
    }
    .desk-band{
      width:100%;
      box-sizing:border-box;
      padding-bottom:0;
      position:sticky; top:0; z-index:5;
      height:100dvh; max-height:100dvh;
      display:flex; flex-direction:column;
      background:var(--bg);
      overflow:hidden;
    }
    .workspace {
      max-width:none; width:100%; margin:0; padding:0;
      scroll-margin-top: var(--tabs-h);
      position:relative; z-index:1;
      box-sizing:border-box;
      background:var(--bg);
      flex:1 1 auto; min-height:0;
      display:flex; flex-direction:column;
    }

    /* Chrome is the sticky band's top bar (title · for-sale · −75%) */
    .desk-chrome{
      flex:0 0 auto;
      width:100%; box-sizing:border-box;
      position:relative; top:auto; z-index:50;
      background:rgba(7,19,26,.98); backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    /* MUST be one line: filters + Marina Gate (+ trend/search/Google) */
    .desk-head{
      display:flex; flex-wrap:nowrap; align-items:center; gap:6px 8px;
      width:100%; box-sizing:border-box;
      padding:5px 12px; min-height:40px;
      border-bottom:1px solid var(--line);
      overflow:hidden;
    }
    /* Title leftmost, then filters — same one-line row */
    .desk-head .desk-jump{
      order:0; margin:0; flex:0 1 auto; min-width:0;
      max-width:min(34vw, 240px); font-size:.92rem; min-height:32px; padding:0 4px;
    }
    .desk-head .workspace-tabs{
      order:1; flex:0 0 auto; width:auto; max-width:none;
      min-height:0; padding:0; margin:0; gap:5px;
      border-bottom:0; background:transparent; backdrop-filter:none;
      flex-wrap:nowrap; align-items:center;
    }
    .desk-head .workspace-tabs .tab,
    .desk-head .workspace-tabs .tab-room{
      min-height:32px; padding:0 11px; font-size:12px; white-space:nowrap;
    }
    .desk-head .rooms-filters{ flex-wrap:nowrap; margin-left:0; gap:5px; }
    .desk-head .desk-trend{ order:2; flex:0 0 auto; min-height:28px; padding:0 8px; font-size:11px; }
    .desk-head .desk-tools{
      order:3; flex:1 1 auto; margin-left:auto; width:auto; max-width:none;
      padding:0; min-height:0; border:0; min-width:0;
    }
    .desk-head .desk-tools .desk-search{ min-width:100px; }
    /* Silent offer — compact −75% + countdown beside Google auth */
    .desk-auth-offer{
      display:inline-flex; align-items:center; gap:8px;
      flex:0 0 auto; min-width:0; max-width:100%;
    }
    .intro-countdown{
      display:inline-flex; align-items:center; min-height:22px; padding:0 7px;
      border-radius:7px; border:1px solid rgba(216,195,165,.35);
      background:rgba(216,195,165,.1); color:var(--sand);
      font-size:11px; font-weight:800; font-variant-numeric:tabular-nums;
      letter-spacing:.02em; white-space:nowrap;
    }
    .intro-countdown.is-ended{
      color:var(--muted); border-color:var(--line); background:var(--elev);
    }
    .tarif-chip{
      appearance:none; font:inherit; text-align:center; cursor:pointer;
      display:inline-flex; flex-wrap:nowrap; align-items:center; justify-content:center;
      gap:6px; min-height:34px; padding:5px 12px; border-radius:999px;
      border:1px solid rgba(223,255,0,.28); background:rgba(12,12,16,.88);
      color:inherit; min-width:0; max-width:100%;
      -webkit-tap-highlight-color:transparent;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
    }
    .tarif-chip:hover{ border-color:rgba(223,255,0,.5); }
    .tarif-chip:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
    .tarif-chip.is-featured{
      border-color:rgba(223,255,0,.42);
      background:linear-gradient(165deg, rgba(223,255,0,.1), rgba(12,12,16,.92));
    }
    .tarif-chip--compact{
      flex:0 0 auto; min-height:32px; padding:0 10px; gap:6px;
    }
    .tarif-chip-pct{ font-size:12px; font-weight:800; color:#ff2d8a; letter-spacing:-.01em; }
    .tarif-chip--compact .intro-countdown{
      font-size:11px; min-height:20px; padding:0 6px;
      border-color:rgba(223,255,0,.22); background:rgba(223,255,0,.06); color:#dfff00;
    }
    /* Tariffs compare modal (Higgsfield dark cards) */
    .tariffs-overlay{
      position:fixed; inset:0; z-index:12100;
      display:flex; align-items:flex-start; justify-content:center;
      padding:max(12px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom));
      overflow:auto; -webkit-overflow-scrolling:touch;
    }
    .tariffs-overlay[hidden]{ display:none !important; }
    .tariffs-backdrop{
      position:fixed; inset:0; background:rgba(5,5,7,.72);
      backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
    }
    .tariffs-dialog{
      position:relative; z-index:1; width:min(1080px, 100%);
      margin:clamp(12px, 4vh, 36px) auto;
      padding:22px 18px 20px; border-radius:22px;
      background:
        radial-gradient(700px 280px at 50% -10%, rgba(223,255,0,.1), transparent 55%),
        radial-gradient(500px 220px at 90% 10%, rgba(255,45,138,.08), transparent 50%),
        #0c0c10;
      border:1px solid rgba(255,255,255,.08);
      box-shadow:0 24px 64px rgba(0,0,0,.55);
      color:#f4f4f6;
      animation:tariffs-pop .22s ease-out;
    }
    @keyframes tariffs-pop{
      from{ opacity:0; transform:translateY(10px) scale(.98); }
      to{ opacity:1; transform:none; }
    }
    .tariffs-x{
      position:absolute; top:10px; right:12px; width:40px; height:40px;
      border:0; border-radius:999px; background:transparent; color:#8b8b97;
      font-size:26px; line-height:1; cursor:pointer;
    }
    .tariffs-x:hover{ background:rgba(255,255,255,.06); color:#fff; }
    .tariffs-x:focus-visible{ outline:2px solid #dfff00; outline-offset:2px; }
    .tariffs-hero{ text-align:center; margin:0 28px 18px; }
    .tariffs-kicker{
      display:inline-flex; padding:4px 10px; border-radius:999px;
      background:#ff2d8a; color:#fff; font-size:10px; font-weight:800;
      font-style:italic; letter-spacing:.08em; text-transform:uppercase;
    }
    .tariffs-title{
      margin:12px 0 6px; font-size:clamp(1.35rem, 3.5vw, 1.85rem);
      font-weight:800; letter-spacing:-.03em;
    }
    .tariffs-sub{ margin:0 auto; max-width:420px; color:#8b8b97; font-size:13px; }
    .tariffs-sub s{ color:#6b6b76; }
    .tariffs-sub b{ color:#5ee4a8; }
    .tariffs-grid{
      display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px;
    }
    @media (max-width:900px){
      .tariffs-grid{ grid-template-columns:1fr; max-width:420px; margin:0 auto; }
    }
    .tariffs-card{
      display:flex; flex-direction:column; gap:10px;
      padding:18px 16px 16px; border-radius:18px;
      background:linear-gradient(180deg, rgba(255,255,255,.04), transparent 40%), #101018;
      border:1px solid rgba(255,255,255,.08);
    }
    .tariffs-card.is-hot{
      border-color:rgba(223,255,0,.35);
      box-shadow:0 0 0 1px rgba(223,255,0,.1), 0 0 36px rgba(223,255,0,.07);
    }
    .tariffs-plan-row{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
    .tariffs-plan{ margin:0; font-size:1.15rem; font-weight:800; letter-spacing:-.02em; }
    .tariffs-pill{
      display:inline-flex; padding:3px 8px; border-radius:999px;
      font-size:9px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;
    }
    .tariffs-pill--pink{ background:#ff2d8a; color:#fff; }
    .tariffs-pill--lime{ background:#dfff00; color:#111; }
    .tariffs-pill--mute{ background:rgba(255,255,255,.06); color:#8b8b97; }
    .tariffs-card-sub{ margin:0; color:#8b8b97; font-size:12px; }
    .tariffs-card-slogan{
      margin:-2px 0 0; color:#dfff00; font-size:12px; font-weight:750; line-height:1.35;
    }
    .tariffs-price{ display:flex; flex-wrap:wrap; align-items:baseline; gap:6px; }
    .tariffs-price s{ color:#6b6b76; font-size:.95rem; font-weight:700; }
    .tariffs-price b{ font-size:1.65rem; font-weight:800; letter-spacing:-.03em; }
    .tariffs-price span{ color:#8b8b97; font-size:12px; font-weight:700; }
    .tariffs-cta{
      appearance:none; border:0; border-radius:999px; min-height:44px;
      padding:0 16px; font:inherit; font-weight:800; cursor:pointer;
      background:#dfff00; color:#111; width:100%;
    }
    .tariffs-cta:hover{ filter:brightness(1.05); }
    .tariffs-cta:focus-visible{ outline:2px solid #dfff00; outline-offset:2px; }
    .tariffs-cta--ghost{
      background:transparent; color:#f4f4f6; border:1px solid rgba(255,255,255,.12);
    }
    .tariffs-feats{ list-style:none; margin:0; padding:0; display:grid; gap:6px; font-size:12px; }
    .tariffs-feats li{ display:flex; gap:8px; align-items:flex-start; color:#c8c8d0; }
    .tariffs-feats .ok{ color:#5ee4a8; font-weight:800; }
    .tariffs-feats .x{ color:#ff5a7a; font-weight:800; }
    .tariffs-feats li.off{ color:#6b6b76; }
    body.tariffs-open{ overflow:hidden; }
    /* Mobile bottom app dock — desktop hidden */
    .mob-app-dock{ display:none; }
    .mob-ai-sheet{ display:none; }
    .desk-tools{
      display:flex; align-items:center; gap:8px;
      min-width:0; max-width:640px;
    }
    .desk-tools .desk-search{
      flex:1 1 auto; margin-left:0; max-width:none; min-width:120px;
    }
    .auth-slot{
      flex:0 0 auto; display:inline-flex; align-items:center; gap:8px;
      min-width:0; max-width:min(220px, 42vw);
    }
    .auth-slot--mob{ display:none; }
    .auth-google{
      appearance:none; display:inline-flex; align-items:center; gap:8px;
      min-height:36px; padding:0 12px 0 10px; border-radius:999px;
      border:1px solid var(--line); background:#fff; color:#3c4043;
      font:inherit; font-size:12px; font-weight:700; cursor:pointer;
      white-space:nowrap; box-shadow:0 1px 2px rgba(0,0,0,.12);
    }
    .auth-google:hover{ background:#f7f8f8; border-color:#dadce0; }
    .auth-google:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
    .auth-google-icon{ display:inline-flex; flex:0 0 auto; }
    .auth-profile{
      display:inline-flex; align-items:center; gap:8px; min-width:0;
      padding:3px 6px 3px 3px; border-radius:999px;
      border:1px solid var(--line); background:var(--elev);
    }
    .auth-avatar{
      flex:0 0 auto; width:30px; height:30px; border-radius:999px;
      display:inline-flex; align-items:center; justify-content:center;
      background:linear-gradient(145deg,#4285f4,#34a853); color:#fff;
      font-size:12px; font-weight:800; letter-spacing:-.02em;
    }
    .auth-meta{ display:grid; gap:0; min-width:0; line-height:1.15; }
    .auth-meta b{
      font-size:12px; font-weight:800; color:var(--text);
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;
    }
    .auth-meta small{
      font-size:10px; color:var(--muted); font-weight:650;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;
    }
    .auth-out{
      appearance:none; border:0; background:transparent; color:var(--muted);
      font:inherit; font-size:11px; font-weight:750; cursor:pointer;
      min-height:28px; padding:0 8px; border-radius:999px;
    }
    .auth-out:hover{ color:var(--sand); background:rgba(255,255,255,.04); }
    .auth-out:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
    .auth-slot.is-in .auth-google{ display:none; }
    .auth-slot:not(.is-in) .auth-profile{ display:none !important; }
    .auth-slot.is-in .auth-profile{ display:inline-flex; }
    .auth-google.is-loading{ opacity:.65; pointer-events:none; }
    .gauth-overlay{
      position:fixed; inset:0; z-index:12000;
      display:flex; align-items:center; justify-content:center;
      padding:max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
    }
    .gauth-overlay[hidden]{ display:none !important; }
    .gauth-backdrop{
      position:absolute; inset:0; background:rgba(32,33,36,.55);
      backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px);
    }
    .gauth-dialog{
      position:relative; z-index:1; width:min(400px, 100%);
      background:#fff; color:#202124; border-radius:28px;
      box-shadow:0 8px 28px rgba(0,0,0,.28), 0 2px 8px rgba(0,0,0,.12);
      padding:28px 28px 22px; font-family:Roboto, 'Helvetica Neue', Arial, sans-serif;
      animation:gauth-pop .22s ease-out;
    }
    @keyframes gauth-pop{
      from{ opacity:0; transform:scale(.96) translateY(8px); }
      to{ opacity:1; transform:none; }
    }
    .gauth-x{
      position:absolute; top:12px; right:14px; width:36px; height:36px;
      border:0; border-radius:999px; background:transparent; color:#5f6368;
      font-size:24px; line-height:1; cursor:pointer;
    }
    .gauth-x:hover{ background:#f1f3f4; color:#202124; }
    .gauth-brand{ display:flex; align-items:center; gap:10px; margin-bottom:18px; }
    .gauth-g{ display:inline-flex; }
    .gauth-word{ font-size:16px; font-weight:500; color:#202124; }
    .gauth-title{
      margin:0 0 6px; font-size:24px; font-weight:400; color:#202124; line-height:1.25;
    }
    .gauth-sub{ margin:0 0 20px; font-size:14px; color:#5f6368; line-height:1.4; }
    .gauth-account{
      appearance:none; width:100%; display:flex; align-items:center; gap:14px;
      text-align:left; padding:12px 14px; margin:0 0 14px;
      border:1px solid #dadce0; border-radius:8px; background:#fff; cursor:pointer;
    }
    .gauth-account:hover, .gauth-account:focus-visible{
      background:#f8f9fa; border-color:#1a73e8; box-shadow:0 0 0 1px #1a73e8; outline:none;
    }
    .gauth-acc-av{
      flex:0 0 auto; width:40px; height:40px; border-radius:999px;
      display:inline-flex; align-items:center; justify-content:center;
      background:#1a73e8; color:#fff; font-size:14px; font-weight:700;
    }
    .gauth-acc-meta{ flex:1; min-width:0; display:grid; gap:2px; }
    .gauth-acc-meta b{
      font-size:14px; font-weight:500; color:#3c4043;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .gauth-acc-meta small{
      font-size:12px; color:#5f6368;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .gauth-acc-chev{ color:#5f6368; font-size:22px; font-weight:300; line-height:1; }
    .gauth-continue{
      appearance:none; width:100%; display:inline-flex; align-items:center; justify-content:center;
      gap:10px; min-height:44px; padding:0 18px; border:0; border-radius:24px;
      background:#1a73e8; color:#fff; font:inherit; font-size:14px; font-weight:600; cursor:pointer;
    }
    .gauth-continue:hover{ background:#1765cc; }
    .gauth-continue:focus-visible{ outline:2px solid #1a73e8; outline-offset:2px; }
    .gauth-continue.is-loading{ opacity:.72; pointer-events:none; }
    .gauth-continue-icon{ display:inline-flex; background:#fff; border-radius:999px; padding:3px; }
    .gauth-fine{ margin:14px 0 0; text-align:center; font-size:11px; color:#80868b; }
    body.gauth-open{ overflow:hidden; }
    .hero-mob-offer{ display:none; }

    /* Sell-my-home style unit cost analysis in detail pane */
    .ux-anal{
      margin:0 0 10px; padding:12px 12px 10px; border-radius:14px;
      border:1px solid rgba(62,207,207,.28);
      background:linear-gradient(165deg, rgba(62,207,207,.1), rgba(7,19,26,.55) 42%, var(--card));
    }
    .ux-anal-head{
      display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px;
      margin:0 0 10px;
    }
    .ux-anal-head h2{
      margin:0; font-family:Fraunces,serif; font-size:1.05rem; font-weight:800;
      letter-spacing:-.02em; color:var(--text);
    }
    .ux-badge{
      display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px;
      font-size:10px; font-weight:800; letter-spacing:.02em;
    }
    .ux-badge.ok{ background:rgba(94,228,168,.16); color:var(--good); border:1px solid rgba(94,228,168,.4); }
    .ux-badge.warn{ background:rgba(216,195,165,.14); color:var(--sand); border:1px solid rgba(216,195,165,.4); }
    .ux-badge.bad{ background:rgba(255,122,122,.14); color:var(--bad); border:1px solid rgba(255,122,122,.4); }
    .ux-kv{
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin:0 0 10px;
    }
    @media (min-width:520px){ .ux-kv{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
    .ux-kv div{
      padding:7px 8px; border-radius:10px; border:1px solid var(--line); background:var(--elev);
      min-width:0;
    }
    .ux-kv .l{
      font-size:9px; letter-spacing:.06em; text-transform:uppercase;
      color:var(--muted); font-weight:800;
    }
    .ux-kv .v{
      margin-top:2px; font-size:13px; font-weight:800; color:var(--text);
      font-variant-numeric:tabular-nums; word-break:break-word;
    }
    .ux-kv .v.good{ color:var(--good); }
    .ux-kv .v.bad{ color:var(--bad); }
    .ux-kv .v.sand{ color:var(--sand); }
    .ux-anal-sec{ margin:0 0 10px; }
    .ux-anal-sec h3{
      margin:0 0 6px; font-size:12px; font-weight:800; color:var(--sand);
      letter-spacing:.02em;
    }
    .ux-anal-sec h3 span{ color:var(--muted); font-weight:650; }
    .ux-chart-wrap{
      margin:0 0 8px; padding:6px; border-radius:10px;
      border:1px solid var(--line); background:#0a1218;
    }
    .ux-chart-wrap .ux-chart-l{
      margin:0 0 4px 2px; font-size:10px; font-weight:700; color:var(--muted);
    }
    .ux-chart-wrap svg{ width:100%; height:auto; display:block; }
    .ux-table{ width:100%; border-collapse:collapse; font-size:11px; }
    .ux-table th, .ux-table td{
      border-bottom:1px solid var(--line); padding:5px 4px; text-align:left; vertical-align:top;
    }
    .ux-table th{
      color:var(--muted); font-size:9px; font-weight:800;
      text-transform:uppercase; letter-spacing:.04em;
    }
    .ux-table .save{ color:var(--good); font-weight:800; white-space:nowrap; }
    .ux-table button.ux-jump{
      appearance:none; border:0; background:transparent; color:var(--sea);
      font:inherit; font-weight:800; cursor:pointer; padding:0; text-align:left;
    }
    .ux-table button.ux-jump:hover{ text-decoration:underline; }
    .ux-anal-empty{ margin:0; font-size:12px; color:var(--muted); }
    .ux-anal-note{ margin:4px 0 0; font-size:10px; color:var(--muted); line-height:1.35; }
    .ux-anal-ph-wrap{ flex:0 0 auto; }
    .ux-anal-ph{
      width:88px; height:66px; object-fit:cover; border-radius:10px;
      border:1px solid var(--line); background:#000; display:block;
    }
    .ux-anal--kpi{ margin:0 0 10px; }
    .ux-kv .ux-kv-best{ grid-column:1 / -1; border-color:rgba(62,207,207,.35); }
    .ux-valuate-btn{
      appearance:none; width:100%; min-height:42px; padding:0 14px; border-radius:12px;
      border:1px solid rgba(62,207,207,.45); background:rgba(62,207,207,.14);
      color:var(--sea); font:inherit; font-size:13px; font-weight:800; cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    .ux-valuate-btn:hover{ background:rgba(62,207,207,.22); border-color:rgba(62,207,207,.7); }
    .ux-valuate-btn:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
    .ux-val-overlay{
      position:fixed; inset:0; z-index:12200;
      display:flex; align-items:stretch; justify-content:center;
      padding:0; overflow:auto; -webkit-overflow-scrolling:touch;
    }
    .ux-val-overlay[hidden]{ display:none !important; }
    .ux-val-backdrop{
      position:fixed; inset:0; background:rgba(5,8,12,.82);
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
    }
    .ux-val-dialog{
      position:relative; z-index:1; width:100%; max-width:960px; margin:0 auto;
      min-height:100%; box-sizing:border-box;
      padding:max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
      background:linear-gradient(180deg, #0b1620, #07131a 40%);
      color:var(--text); outline:none;
    }
    .ux-val-x{
      position:absolute; top:max(10px, env(safe-area-inset-top)); right:12px;
      width:40px; height:40px; border:0; border-radius:999px;
      background:rgba(255,255,255,.06); color:#fff; font-size:24px; line-height:1; cursor:pointer;
    }
    .ux-val-x:hover{ background:rgba(255,255,255,.12); }
    .ux-val-x:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
    .ux-val-hero{ margin:0 48px 14px 0; }
    .ux-val-title{
      margin:0; font-family:Fraunces,serif; font-size:clamp(1.35rem,3vw,1.85rem);
      font-weight:800; letter-spacing:-.03em;
    }
    .ux-val-sub{ margin:6px 0 0; font-size:12px; color:var(--muted); }
    .ux-val-body{ max-width:100%; }
    body.ux-val-open{ overflow:hidden; }
    .auth-slot--desk{ display:none !important; }


    .workspace-tabs {
      /* nested in .desk-head — one line with Marina Gate */
      display:flex; flex-wrap:nowrap; align-items:center;
      flex:0 0 auto;
      box-sizing:border-box;
      position:relative; top:auto; z-index:auto;
      gap:6px;
    }
    .original-ad{
      display:inline-flex; align-items:center; margin:0;
      font-size:12px; font-weight:800; color:var(--sea); text-decoration:none;
      border-bottom:1px solid rgba(62,207,207,.35);
    }
    .original-ad:hover{ color:var(--sand); border-bottom-color:rgba(216,195,165,.55); }
    .original-ad-wrap{ margin:8px 0 0; }
    .photos-row{
      display:grid; grid-template-columns:minmax(0,1fr);
      gap:8px; align-items:stretch;
    }
    .photos-row .photos-main{ margin:0; max-height:min(48vh, 420px); width:100%; }
    .plugin-cta{
      display:flex; flex-direction:row; flex-wrap:wrap; justify-content:flex-start; align-items:center;
      gap:6px 12px; padding:10px 12px; border-radius:14px; text-decoration:none; color:inherit;
      border:1px solid rgba(62,207,207,.4);
      background:linear-gradient(165deg, rgba(62,207,207,.14), rgba(7,19,26,.55));
      min-height:0; width:100%; box-sizing:border-box; -webkit-tap-highlight-color:transparent;
    }
    .plugin-cta:hover{
      border-color:rgba(62,207,207,.7); background:linear-gradient(165deg, rgba(62,207,207,.22), rgba(7,19,26,.65));
    }
    .plugin-cta:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
    .plugin-cta-k{
      font-size:9px; letter-spacing:.08em; text-transform:uppercase; font-weight:800; color:var(--sea);
    }
    .plugin-cta-t{
      font-size:13px; font-weight:800; line-height:1.3; color:var(--text); letter-spacing:-.01em;
    }
    .plugin-cta-go{ font-size:11px; font-weight:750; color:var(--sand); }
    .rooms-filters {
      display:inline-flex; flex-wrap:wrap; gap:6px; align-items:center; margin-left:2px;
    }
    .tab-room {
      min-height:36px; padding:0 12px; border-radius:999px; border:1px solid var(--line);
      background:var(--elev); color:var(--muted); font:inherit; font-weight:700; font-size:12px; cursor:pointer;
    }
    .tab-room.is-on { background:rgba(62,207,207,.18); color:var(--sea); border-color:rgba(62,207,207,.45); }
    .tab-room:focus-visible { outline:2px solid var(--sea); outline-offset:2px; }
    .desk-jump {
      appearance:none; border:0; background:transparent; color:var(--text);
      font-family:Fraunces,serif; font-weight:800; font-size:.98rem;
      letter-spacing:-.02em; line-height:1.15; padding:0 6px; margin:0;
      cursor:pointer; min-height:40px;
      display:inline-flex; align-items:center; max-width:min(42vw, 280px); flex:0 1 auto;
      -webkit-tap-highlight-color:transparent;
    }
    .desk-jump:hover { color:var(--sand); }
    .desk-jump:focus-visible { outline:2px solid var(--sea); outline-offset:3px; border-radius:8px; }
    .desk-jump span {
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .desk-trend {
      flex:0 0 auto; display:inline-flex; align-items:center; gap:4px;
      min-height:32px; padding:0 10px; border-radius:999px; font-weight:800; font-size:12px;
      font-variant-numeric:tabular-nums; border:1px solid var(--line); background:var(--elev);
      color:var(--muted); white-space:nowrap;
    }
    .desk-trend.is-up { color:var(--good); border-color:rgba(94,228,168,.45); background:rgba(94,228,168,.12); }
    .desk-trend.is-down { color:var(--bad); border-color:rgba(255,122,122,.45); background:rgba(255,122,122,.12); }
    .desk-trend.is-flat { color:var(--muted); }
    .desk-search {
      flex:1 1 180px; min-width:140px; max-width:420px;
      display:flex; align-items:center; min-height:40px;
    }
    .desk-search input {
      width:100%; min-height:40px; padding:0 14px 0 36px; border-radius:999px;
      border:1px solid var(--line); background:var(--elev) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238aa3ad' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='7' cy='7' r='5'/%3E%3Cpath d='M11 11l3.5 3.5'/%3E%3C/svg%3E") 12px 50%/16px no-repeat;
      color:var(--text); font:inherit; font-size:13px; outline:none;
    }
    .desk-search input::placeholder { color:var(--muted); opacity:.9; }
    .desk-search input:focus { border-color:rgba(62,207,207,.55); box-shadow:0 0 0 2px rgba(62,207,207,.18); }
    .reviews-ticker {
      display:flex; align-items:stretch; width:100%; margin:12px 0 0; border-top:1px solid var(--line);
      border-bottom:1px solid var(--line); background:#031016; overflow:hidden; min-height:88px;
    }
    .reviews-ticker-label {
      flex:0 0 140px; width:140px; min-width:140px; max-width:140px; padding:0 12px;
      display:flex; align-items:center; justify-content:center; text-align:center;
      font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:800;
      color:#1a1208; background:#fbbc05; white-space:pre-line; line-height:1.25;
    }
    .reviews-ticker-viewport {
      flex:1; overflow:hidden;
      mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);
    }
    .reviews-ticker-track {
      display:inline-flex; align-items:center; gap:0; white-space:nowrap;
      padding:12px 0; width:max-content; will-change:transform;
      animation: rev-left 220s linear infinite;
    }
    .rev-item {
      display:inline-flex; align-items:center; gap:10px; vertical-align:middle;
      padding:0 8px; max-width:420px; white-space:normal;
    }
    .rev-photo {
      width:72px; height:56px; object-fit:cover; border-radius:10px; flex:0 0 auto; background:#000;
    }
    .rev-body { display:grid; gap:2px; min-width:0; max-width:320px; }
    .rev-top { display:inline-flex; align-items:center; gap:6px; font-size:12px; }
    .rev-avatar { width:20px; height:20px; border-radius:999px; object-fit:cover; }
    .rev-item b { color:var(--sand); font-weight:800; }
    .rev-stars { color:#fbbc05; letter-spacing:1px; font-size:11px; }
    .rev-text { font-size:12px; color:var(--text); line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .rev-meta { color:var(--muted); font-size:10px; }
    .rev-sep { color:var(--muted); padding:0 16px; opacity:.5; font-size:10px; align-self:center; }
    @keyframes rev-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) {
      .reviews-ticker-track { animation:none !important; }
    }
    .tabs {
      display:flex; flex-wrap:wrap; gap:6px; padding:10px 16px 8px; z-index:8;
      align-items:center;
    }
    .tab {
      min-height:40px; padding:0 16px; border-radius:999px; border:1px solid var(--line);
      background:var(--card); color:var(--muted); font:inherit; font-weight:700; cursor:pointer;
    }
    .tab.is-on { background:var(--sand); color:#1a1208; border-color:var(--sand); }

    .desk {
      display:grid; grid-template-columns:88px minmax(0,1.35fr) minmax(320px,0.85fr); gap:0;
      flex:1 1 auto; height:auto; min-height:0; max-height:none;
      width:100%;
      border:1px solid var(--line); border-left:0; border-right:0; border-radius:0; overflow:hidden;
      background:var(--card); box-shadow:0 18px 50px rgba(0,0,0,.35);
      position:relative; top:auto; z-index:auto;
    }
    .rail {
      display:flex; flex-direction:column; overflow:hidden; background:var(--ink);
      border-right:1px solid var(--line);
    }
    .floors {
      overflow:auto; padding:6px 6px 6px 0; flex:1 1 auto;
      overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
    }
    .floor-seg { margin-bottom:6px; }
    .floor-seg:last-child { margin-bottom:0; }
    .floor-btn {
      width:100%; display:flex; justify-content:space-between; align-items:center;
      padding:10px 8px; margin-bottom:4px; border:1px solid transparent; border-left:0;
      border-radius:0 10px 10px 0;
      background:transparent; color:var(--muted); font:inherit; font-weight:700; cursor:pointer;
    }
    .floor-btn:last-child { margin-bottom:0; }
    .floor-btn strong { color:var(--text); font-size:15px; }
    .floor-btn span { font-size:11px; }
    .floor-seg--high .floor-btn {
      border-color:rgba(94,228,168,.28); background:rgba(94,228,168,.1); color:#5ee4a8;
    }
    .floor-seg--high .floor-btn strong { color:#5ee4a8; }
    .floor-seg--high .floor-btn.is-on,
    .floor-seg--high .floor-btn:hover {
      background:rgba(94,228,168,.22); border-color:rgba(94,228,168,.65);
    }
    .floor-seg--mid .floor-btn {
      border-color:rgba(245,215,110,.28); background:rgba(245,215,110,.1); color:#f5d76e;
    }
    .floor-seg--mid .floor-btn strong { color:#f5d76e; }
    .floor-seg--mid .floor-btn.is-on,
    .floor-seg--mid .floor-btn:hover {
      background:rgba(245,215,110,.22); border-color:rgba(245,215,110,.65);
    }
    .floor-seg--low .floor-btn {
      border-color:rgba(255,122,122,.28); background:rgba(255,122,122,.1); color:#ff7a7a;
    }
    .floor-seg--low .floor-btn strong { color:#ff7a7a; }
    .floor-seg--low .floor-btn.is-on,
    .floor-seg--low .floor-btn:hover {
      background:rgba(255,122,122,.22); border-color:rgba(255,122,122,.65);
    }

    .stage {
      display:flex; flex-direction:column; overflow:hidden; background:#060d12;
      border-right:1px solid var(--line); min-width:0; position:relative;
    }
    .stage-hint {
      position:absolute; left:50%; bottom:10px; transform:translateX(-50%); z-index:3;
      pointer-events:none; font-size:11px; font-weight:700; color:rgba(238,246,244,.7);
      background:rgba(8,12,18,.55); padding:5px 10px; border-radius:999px;
      backdrop-filter:blur(6px); transition:opacity .25s;
    }
    .stage-hint.is-hide { opacity:0; }
    .stage-feed {
      flex:1 1 auto; min-height:0; overflow-y:auto; overscroll-behavior:contain;
      scroll-snap-type: y mandatory; -webkit-overflow-scrolling:touch;
      scroll-behavior:smooth; padding:0;
    }
    .unit-card {
      scroll-snap-align: start; scroll-snap-stop: always;
      min-height:88%; box-sizing:border-box;
      display:flex; flex-direction:column; padding:12px 12px 20px;
      opacity:.38; transform:translateY(10px) scale(.97); transform-origin:center top;
      transition:opacity .32s ease, transform .32s ease;
      border-bottom:1px solid rgba(28,51,64,.55);
    }
    .unit-card.is-on { opacity:1; transform:translateY(0) scale(1); }
    .unit-card .stage-meta { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 12px; margin-bottom:10px; }
    .unit-card .stage-meta h2 {
      margin:0; font-family:Fraunces,serif; font-size:1.15rem; letter-spacing:-.02em; font-weight:800;
    }
    .unit-card .stage-meta .price { margin:0; font-size:1.2rem; font-weight:800; color:var(--sand); }
    .unit-card .stage-meta .muted { font-size:12px; color:var(--muted); }
    .unit-details-btn {
      display:none; flex:1 1 140px; min-height:40px; padding:0 14px; border-radius:12px;
      border:1px solid rgba(216,195,165,.45); background:rgba(216,195,165,.12); color:var(--sand);
      font:inherit; font-weight:800; font-size:.82rem; cursor:pointer;
      align-items:center; justify-content:center; gap:.35rem;
    }
    .unit-details-btn:hover { background:rgba(216,195,165,.2); }
    .unit-quick-actions {
      display:flex; flex-wrap:wrap; gap:8px; width:100%; margin-top:6px;
    }
    .unit-cheaper-btn {
      flex:1 1 140px; min-height:40px; padding:0 14px; border-radius:12px;
      border:1px solid rgba(94,228,168,.5); background:rgba(94,228,168,.14); color:#86efac;
      font:inherit; font-weight:800; font-size:.82rem; cursor:pointer;
      display:inline-flex; align-items:center; justify-content:center; gap:.35rem;
    }
    .unit-cheaper-btn:hover { background:rgba(94,228,168,.24); }
    .unit-cheaper-btn:disabled,
    .unit-cheaper-btn.is-end {
      opacity:.55; cursor:default; border-color:rgba(255,255,255,.12); color:var(--muted); background:rgba(0,0,0,.2);
      font-size:.72rem; line-height:1.25; padding:8px 12px; text-align:center;
      white-space:normal; height:auto; min-height:44px;
    }
    .unit-cheaper-btn b { color:#bbf7d0; font-weight:900; }
    .unit-cheaper-btn.is-end b { color:var(--muted); }
    .detail-close-mob {
      display:none; flex:0 0 auto; width:36px; height:36px; margin-left:auto; border-radius:10px;
      border:1px solid var(--line); background:var(--elev); color:var(--text);
      font:inherit; font-weight:800; cursor:pointer;
    }
    .detail-backdrop {
      display:none; position:fixed; inset:0; z-index:39;
      background:rgba(3,16,22,.5); backdrop-filter:blur(2px);
    }
    .unit-params {
      display:flex; flex-wrap:wrap; gap:6px; width:100%; margin:2px 0 0;
    }
    .unit-params span {
      display:inline-flex; align-items:center; min-height:24px; padding:0 8px; border-radius:999px;
      border:1px solid var(--line); background:rgba(0,0,0,.22); color:var(--text);
      font-size:11px; font-weight:700; white-space:nowrap;
    }
    .unit-params span b { color:var(--sand); font-weight:800; margin-right:4px; }
    .unit-card .floor-pill {
      display:inline-flex; align-items:center; min-height:24px; padding:0 8px; border-radius:999px;
      background:rgba(216,195,165,.14); color:var(--sand); font-size:11px; font-weight:800;
    }
    .photos-grid { display:grid; gap:8px; margin:0; align-content:start; flex:1; }
    .photos-main {
      position:relative; border-radius:16px; overflow:hidden; background:#0a0e14;
      aspect-ratio: 4 / 3; max-height:min(48vh, 420px); width:100%;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
      margin:0 auto;
    }
    .photos-main img { width:100%; height:100%; object-fit:cover; display:block; }
    .photos-count {
      position:absolute; right:10px; bottom:10px; z-index:1;
      background:rgba(8,12,18,.72); color:#fff; font-size:11px; font-weight:700;
      padding:4px 8px; border-radius:999px; backdrop-filter:blur(6px);
    }
    .photos-thumbs {
      display:flex; gap:6px; overflow-x:auto; padding-bottom:2px; justify-content:flex-start;
      scrollbar-width:thin;
    }
    .photos-thumbs img {
      flex:0 0 auto; width:72px; height:54px; object-fit:cover; border-radius:8px; background:#0a0e14;
      cursor:pointer; opacity:.72; border:2px solid transparent;
    }
    .photos-thumbs img.is-on, .photos-thumbs img:hover { opacity:1; border-color:var(--sand); }
    .stage-empty {
      flex:1; display:grid; place-items:center; color:var(--muted); padding:24px; text-align:center;
      min-height:100%;
    }
    .stage-next-cue {
      text-align:center; font-size:11px; color:var(--muted); font-weight:650; margin-top:10px;
    }

    .detail {
      display:flex; flex-direction:column; overflow:hidden; background:#0a1218;
      min-width:0; min-height:0; height:100%; align-self:stretch;
    }
    .detail.empty { color:var(--muted); display:grid; place-items:center; padding:16px; }
    .detail > .act-chat { flex:1 1 auto; min-height:0; height:100%; }
    .detail .swipe-chat-wrap--desk {
      flex:0 0 auto; margin-top:auto;
    }
    .detail .swipe-chat-wrap--desk .unit-quick-actions {
      margin:0 0 .5rem; width:100%;
    }
    .detail .swipe-chat-wrap--desk .unit-cheaper-btn {
      flex:1 1 100%; width:100%; min-height:42px;
    }
    .sig-sec {
      margin:4px 0 0; padding:12px 14px; border-radius:14px; background:var(--card); border:1px solid var(--line);
    }
    .act-block {
      margin:0; padding:10px 12px; border-radius:14px;
      border:1px solid rgba(255,255,255,.06); background:rgba(0,0,0,.18);
    }
    .act-block + .act-block { margin-top:8px; }
    .act-block-h {
      font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:800;
      color:var(--muted); margin:0 0 8px;
    }
    .act-block--price { border-color:rgba(62,207,207,.28); background:rgba(62,207,207,.06); }
    .act-block--price .sig-sec { margin:0; padding:0; border:0; background:transparent; }
    .act-block--unit { border-color:rgba(216,195,165,.22); }
    .act-block--reco { border-color:rgba(94,228,168,.22); background:rgba(94,228,168,.05); }
    .act-block--reco .reco { margin:0; border:0; padding:0; background:transparent; }
    .sig-sec h3 {
      margin:0 0 10px; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--sand); font-weight:800;
      display:flex; justify-content:space-between; align-items:baseline; gap:8px;
    }
    .sig-sec h3 .delta { color:var(--sea); font-weight:800; letter-spacing:0; text-transform:none; font-size:13px; }
    .sig-sec h3 .delta.up { color:var(--bad); }
    .sig-sec h3 .delta.down { color:var(--good); }
    .sig-legend {
      display:flex; flex-wrap:wrap; gap:8px 12px; margin:0 0 8px; font-size:10px; color:var(--muted);
    }
    .sig-legend i {
      display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px; vertical-align:middle;
    }
    .sig-chart { margin-bottom:6px; }
    .sig-chart svg { display:block; width:100%; height:auto; }
    .sig-chart-tip { font-size:11px; color:var(--muted); margin-bottom:10px; }
    .htable { width:100%; border-collapse:collapse; font-size:12px; font-variant-numeric:tabular-nums; }
    .htable th, .htable td { padding:7px 6px; text-align:left; border-bottom:1px solid rgba(28,51,64,.75); vertical-align:top; }
    .htable th { color:var(--muted); font-size:10px; letter-spacing:.06em; text-transform:uppercase; font-weight:700; }
    .htable .amt { font-weight:750; color:var(--sand); white-space:nowrap; }
    .htable .muted { color:var(--muted); }
    .htable .src {
      display:inline-block; font-size:10px; font-weight:750; padding:2px 6px; border-radius:999px;
      background:rgba(62,207,207,.12); color:var(--sea);
    }
    .sig-empty { color:var(--muted); font-size:12px; margin:0; }
    /* Palm Beach «Price change» → «Изменение цены» */
    .px-box{margin-top:0;padding:.55rem .5rem .5rem;border-radius:11px;border:1px solid rgba(56,189,248,.22);background:linear-gradient(180deg,#121a24 0%,#0c1118 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
    .px-kpi{display:grid;grid-template-columns:1fr auto;gap:.45rem;align-items:end;margin-bottom:.45rem}
    .px-kpi .lbl{font-size:.58rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:800;margin-bottom:.15rem}
    .px-kpi .path{font-size:.78rem;font-weight:800;color:var(--text);line-height:1.25}
    .px-kpi .big{text-align:right;font-size:1.45rem;font-weight:900;line-height:1;letter-spacing:-.02em}
    .px-kpi .big.down{color:#f87171;text-shadow:0 0 18px rgba(248,113,113,.25)}
    .px-kpi .big.up{color:#4ade80;text-shadow:0 0 18px rgba(74,222,128,.2)}
    .px-kpi .big.flat{color:var(--muted)}
    .px-kpi .sub{display:block;font-size:.58rem;font-weight:700;color:var(--muted);margin-top:.2rem;text-align:right}
    .px-delta{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:0 0 .45rem;padding:.45rem .55rem;border-radius:9px;border:1px solid transparent;font-weight:800}
    .px-delta.down{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.4);color:#fca5a5}
    .px-delta.up{background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.4);color:#86efac}
    .px-delta.flat{background:rgba(56,189,248,.08);border-color:rgba(56,189,248,.25);color:var(--muted)}
    .px-delta-k{font-size:.62rem;text-transform:uppercase;letter-spacing:.04em;opacity:.85}
    .px-delta-v{font-size:.88rem;color:inherit}
    .px-delta-v em{font-style:normal;opacity:.85;font-size:.75rem;margin-left:.15rem}
    .px-delta.down .px-delta-v{color:#f87171}
    .px-delta.up .px-delta-v{color:#4ade80}
    .px-chart-wrap{position:relative;margin:0 0 .4rem;border-radius:9px;overflow:hidden;border:1px solid rgba(45,58,77,.8);background:#0a0e14}
    .px-chart{width:100%;height:124px;display:block}
    .px-steps-h{display:flex;justify-content:space-between;align-items:baseline;margin:.15rem 0 .3rem}
    .px-steps-h b{font-size:.62rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
    .px-steps-h span{font-size:.58rem;color:var(--muted)}
    .px-steps{display:flex;flex-direction:column;gap:.28rem;max-height:190px;overflow:auto;padding-right:.1rem}
    .px-step{display:grid;grid-template-columns:58px 1fr auto;gap:.3rem .4rem;align-items:start;padding:.35rem .4rem;border-radius:8px;border:1px solid transparent;background:rgba(26,34,45,.55)}
    .px-step:hover{border-color:rgba(56,189,248,.25);background:rgba(56,189,248,.06)}
    .px-step.is-first{border-color:rgba(56,189,248,.3)}
    .px-step .d{color:var(--muted);font-weight:700;font-size:.62rem;padding-top:.1rem}
    .px-step .p{color:var(--text);font-weight:800;font-size:.78rem;line-height:1.2}
    .px-step .from{color:var(--muted);font-weight:600;font-size:.62rem}
    .px-step .delta{font-weight:800;white-space:nowrap;font-size:.68rem;padding-top:.1rem}
    .px-step .delta.down{color:#f87171}.px-step .delta.up{color:#4ade80}.px-step .delta.same{color:var(--muted)}
    .px-step .ag{grid-column:2 / -1;color:var(--muted);font-size:.58rem;font-weight:500}
    .px-flat{color:var(--muted);font-size:13px;font-weight:700;padding:.2rem 0}
    .act-chat {
      margin:0; border-radius:0; border:0; border-left:0;
      background:linear-gradient(180deg, #101820 0%, #0a1218 100%);
      overflow:hidden; display:flex; flex-direction:column; flex:1 1 auto; min-height:0; height:100%;
    }
    .act-chat-head {
      display:flex; align-items:center; gap:10px; padding:12px 14px;
      border-bottom:1px solid rgba(255,255,255,.06); background:rgba(0,0,0,.28); flex:0 0 auto;
    }
    .act-avatar {
      width:36px; height:36px; border-radius:999px; flex:0 0 auto;
      display:grid; place-items:center; font-size:20px; line-height:1;
      background:linear-gradient(135deg, var(--sand), #e8c48a);
    }
    .act-avatar.tone-over { background:linear-gradient(135deg, #fbbf24, #f87171); }
    .act-avatar.tone-under { background:linear-gradient(135deg, #86efac, #34d399); }
    .act-avatar.tone-fair { background:linear-gradient(135deg, var(--sand), #e8c48a); }
    .act-face { font-size:1.15em; }
    /* Telegram-style voice control */
    .tg-voice {
      margin-left:auto; display:inline-flex; align-items:center; gap:8px;
      min-height:36px; padding:4px 10px 4px 4px; border-radius:999px; cursor:pointer;
      border:0; background:rgba(62,207,207,.12); color:#dffcff; font:inherit;
      transition: background .15s, opacity .15s, transform .12s;
    }
    .tg-voice:hover { background:rgba(62,207,207,.2); }
    .tg-voice.is-off { background:rgba(255,255,255,.06); color:var(--muted); opacity:.75; }
    .tg-voice.is-playing .tg-wave i { animation: tg-bar 0.9s ease-in-out infinite; }
    .tg-voice.tone-over { background:rgba(248,113,113,.14); color:#fecaca; }
    .tg-voice.tone-over .tg-voice-orb { background:linear-gradient(145deg, #f87171, #ef4444); box-shadow:0 2px 8px rgba(248,113,113,.35); }
    .tg-voice.tone-under { background:rgba(52,211,153,.14); color:#a7f3d0; }
    .tg-voice.tone-under .tg-voice-orb { background:linear-gradient(145deg, #34d399, #10b981); box-shadow:0 2px 8px rgba(52,211,153,.35); }
    .tg-voice.tone-fair { background:rgba(94,228,168,.12); color:#dffcff; }
    .tg-voice-orb {
      width:28px; height:28px; border-radius:999px; flex:0 0 auto;
      display:grid; place-items:center;
      background:linear-gradient(145deg, #5ec8e8, #3aa8c4);
      box-shadow:0 2px 8px rgba(62,207,207,.35);
    }
    .tg-voice.is-off .tg-voice-orb { background:linear-gradient(145deg, #4a5560, #2d3640); box-shadow:none; }
    .tg-voice-orb svg { width:12px; height:12px; display:block; }
    .tg-wave {
      display:inline-flex; align-items:center; gap:2px; height:18px; min-width:42px;
    }
    .tg-wave i {
      display:block; width:3px; border-radius:99px; background:currentColor; opacity:.85;
      height:6px; transform-origin:center;
    }
    .tg-wave i:nth-child(1){ height:7px; animation-delay:0s; }
    .tg-wave i:nth-child(2){ height:14px; animation-delay:.08s; }
    .tg-wave i:nth-child(3){ height:10px; animation-delay:.16s; }
    .tg-wave i:nth-child(4){ height:16px; animation-delay:.24s; }
    .tg-wave i:nth-child(5){ height:9px; animation-delay:.32s; }
    .tg-voice:not(.is-playing) .tg-wave i { animation:none; opacity:.55; }
    .tg-voice-meta { font-size:11px; font-weight:700; letter-spacing:.02em; white-space:nowrap; }
    @keyframes tg-bar {
      0%,100% { transform: scaleY(.45); opacity:.55; }
      50% { transform: scaleY(1); opacity:1; }
    }
    @keyframes tg-pulse {
      0%,100% { transform: scale(1); box-shadow:0 2px 8px rgba(62,207,207,.35); }
      50% { transform: scale(1.06); box-shadow:0 0 0 6px rgba(62,207,207,.12); }
    }
    .act-dot { margin-left:8px; }
    .act-chat-head b { display:block; font-size:14px; }
    .act-chat-head span { font-size:11px; color:var(--muted); }
    .act-dot {
      width:7px; height:7px; border-radius:999px; background:var(--good);
      box-shadow:0 0 0 3px rgba(74,222,128,.18); margin-left:8px; flex:0 0 auto;
    }
    .act-thread {
      padding:12px 12px 16px; display:grid; gap:10px; align-content:start;
      flex:1 1 auto; overflow:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
    }
    .act-msg {
      max-width:92%; padding:10px 12px; border-radius:14px; font-size:13px; line-height:1.4;
    }
    .act-msg.bot {
      justify-self:start; background:#17232d; border:1px solid rgba(255,255,255,.06);
      border-bottom-left-radius:5px; color:var(--text);
    }
    .act-msg.user {
      justify-self:end; background:rgba(62,207,207,.16); border:1px solid rgba(62,207,207,.28);
      border-bottom-right-radius:5px; color:#dffcff;
    }
    .act-msg .meta { display:block; font-size:10px; color:var(--muted); margin-bottom:4px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
    .act-opts { display:grid; gap:7px; margin-top:2px; }
    .act-opt {
      width:100%; text-align:left; cursor:pointer; font:inherit; color:inherit;
      padding:11px 12px; border-radius:12px; border:1px solid rgba(216,195,165,.28);
      background:rgba(216,195,165,.06); display:grid; gap:2px; transition:background .15s, border-color .15s, transform .12s;
    }
    .act-opt:hover { background:rgba(216,195,165,.14); border-color:rgba(216,195,165,.55); transform:translateY(-1px); }
    .act-opt:disabled { opacity:.45; cursor:default; transform:none; }
    .act-opt.is-on { border-color:var(--sea); background:rgba(62,207,207,.12); }
    .act-opt.act-opt--offer {
      border-color:rgba(94,228,168,.45); background:rgba(94,228,168,.1);
    }
    .act-opt.act-opt--offer:hover { border-color:var(--good); background:rgba(94,228,168,.18); }
    .act-opt.act-opt--offer .ot { color:var(--good); }
    .act-invite {
      margin-top:10px; padding:12px 12px; border-radius:14px;
      border:1px solid rgba(94,228,168,.4); background:rgba(94,228,168,.1);
      display:grid; gap:8px;
    }
    .act-invite b { color:var(--good); font-size:13px; }
    .act-invite p { margin:0; font-size:12px; color:var(--text); line-height:1.4; }
    .act-invite a.act-invite-go {
      display:inline-flex; align-items:center; justify-content:center; min-height:40px;
      padding:0 14px; border-radius:999px; text-decoration:none; font-weight:800; font-size:13px;
      background:var(--good); color:#031016;
    }
    .act-invite a.act-invite-go:hover { filter:brightness(1.06); }
    .act-invite .act-invite-url{
      margin:0; word-break:break-all; font-size:11px; line-height:1.35;
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:#d1fae5;
    }
    .act-invite .act-invite-copy-btn{
      justify-self:start; cursor:pointer; border:1px solid rgba(94,228,168,.5);
      border-radius:999px; padding:9px 14px; background:rgba(94,228,168,.18);
      color:#ecfdf5; font-weight:800; font-size:12px;
    }
    .act-invite .act-invite-copy-btn.is-ok{ background:rgba(94,228,168,.4); color:#031016; }
    /* Building-wide off-market room is hidden — hide its entry point too */
    .act-opt[data-act="leadchat"]{ display:none!important; }
    .act-opt .ot { font-weight:800; font-size:13px; }
    .act-opt .od { font-size:11px; color:var(--muted); }
    .act-form { display:grid; gap:8px; margin-top:8px; }
    .act-form input, .act-form select, .act-form textarea {
      width:100%; box-sizing:border-box; border-radius:10px; border:1px solid var(--line);
      background:#0a1016; color:var(--text); padding:9px 10px; font:inherit; font-size:13px;
    }
    .act-form textarea { min-height:64px; resize:vertical; }
    .act-form label { font-size:11px; color:var(--muted); font-weight:700; }
    .act-go {
      justify-self:start; cursor:pointer; border:0; border-radius:999px; padding:9px 14px;
      background:var(--sand); color:#1a1208; font-weight:800; font-size:12px;
    }
    .act-go:hover { filter:brightness(1.05); }
    .act-ok { color:var(--good); font-weight:750; }
    .reco {
      margin:2px 0 4px; padding:10px 12px; border-radius:14px;
      border:1px solid rgba(94,228,168,.28); background:rgba(94,228,168,.08);
    }
    .reco-h {
      font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:800;
      color:var(--good); margin:0 0 8px;
    }
    .reco-empty { margin:0; font-size:12px; color:var(--muted); }
    .reco-list { display:grid; gap:6px; }
    .reco-item {
      width:100%; text-align:left; cursor:pointer; font:inherit; color:inherit;
      display:grid; grid-template-columns:44px 1fr auto; gap:8px; align-items:center;
      padding:7px 8px; border-radius:12px; border:1px solid var(--line); background:rgba(0,0,0,.2);
    }
    .reco-item:hover { border-color:rgba(94,228,168,.5); background:rgba(94,228,168,.1); }
    .reco-item img { width:44px; height:34px; object-fit:cover; border-radius:8px; background:#000; }
    .reco-item .t { font-weight:750; font-size:12px; }
    .reco-item .m { font-size:10px; color:var(--muted); }
    .reco-item .p { font-weight:800; color:var(--sand); font-size:12px; white-space:nowrap; }
    .reco-item .save { display:block; color:var(--good); font-size:10px; font-weight:800; }
    .longread {
      max-width:1400px; margin:0 auto; padding:8px 16px calc(40px + var(--safe));
    }
    .toc {
      display:flex; flex-wrap:wrap; gap:8px; margin:8px 0 18px; position:sticky; top:0; z-index:5;
      padding:10px 0; background:linear-gradient(180deg, rgba(7,19,26,.98), rgba(7,19,26,.88));
    }
    .toc a {
      min-height:34px; padding:0 12px; border-radius:999px; border:1px solid var(--line);
      background:var(--card); color:var(--muted); text-decoration:none; font-size:12px; font-weight:750;
      display:inline-flex; align-items:center;
    }
    .toc a:hover { color:var(--sand); border-color:var(--sand); }
    .longread-block {
      margin-top:14px; background:var(--card); border:1px solid var(--line); border-radius:18px; padding:20px 18px;
    }
    .longread-block h2 {
      margin:0 0 12px; font-family:Fraunces,serif; font-size:clamp(1.25rem,2.4vw,1.6rem); letter-spacing:-.02em;
    }
    .longread-lead { color:var(--muted); margin:0 0 14px; max-width:70ch; }
    .longread-block p { margin:0 0 12px; color:var(--muted); font-size:15px; line-height:1.55; max-width:75ch; }
    .seo-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .seo-chips span {
      display:inline-flex; align-items:center; min-height:32px; padding:0 12px; border-radius:999px;
      background:var(--elev); border:1px solid var(--line); font-size:12px; font-weight:650; color:var(--sand);
    }
    .faq-item {
      border:1px solid var(--line); border-radius:12px; background:var(--bg); margin-bottom:8px; padding:0 14px;
    }
    .faq-item summary {
      cursor:pointer; font-weight:750; padding:12px 0; list-style:none;
    }
    .faq-item summary::-webkit-details-marker { display:none; }
    .faq-item[open] summary { color:var(--sand); }
    .faq-item p { margin:0 0 12px; color:var(--muted); font-size:14px; }
    .reviews-grid {
      display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px;
    }
    .review-card {
      display:grid; grid-template-columns:100px 1fr; gap:12px; padding:12px; border-radius:14px;
      background:var(--bg); border:1px solid var(--line);
    }
    .review-card-photo { width:100px; height:100px; object-fit:cover; border-radius:12px; background:#000; }
    .review-card-top { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:6px; }
    .review-card-av { width:22px; height:22px; border-radius:999px; object-fit:cover; }
    .review-card-body p { margin:0 0 8px; color:var(--text); font-size:13px; line-height:1.45; max-width:none; }
    .longread-more { display:inline-flex; margin-top:12px; font-weight:750; }
    .blog-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; }
    .blog-card {
      display:grid; gap:6px; padding:14px; border-radius:14px; border:1px solid var(--line);
      background:var(--bg); text-decoration:none; color:inherit;
    }
    .blog-card:hover { border-color:rgba(216,195,165,.45); }
    .blog-k { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--sea); font-weight:800; }
    .blog-m { font-size:12px; color:var(--muted); }
    @media (max-width:640px) {
      .review-card { grid-template-columns:1fr; }
      .review-card-photo { width:100%; height:160px; }
    }
    ${dldTickerCss()}
    ${buildingRoomChatCss()}
    ${cvhChart.css}
    ${swipeStartChatCss()}
    @media (max-width:1100px) {
      .metrics .pps, .metrics .stat { flex-basis:300px; width:300px; }
      .pps-chart svg { height:72px; }
      .workspace {
        padding:0 0 calc(12px + var(--mob-nav-h) + var(--safe));
        position:relative; top:auto; z-index:auto;
        align-self:auto;
        background:transparent;
      }
      .tabs { padding:10px 10px 8px; }
      .desk {
        border-right:0; border-radius:0;
        grid-template-columns:44px minmax(0,1fr);
        height:calc(100dvh - var(--mob-head-h) - var(--mob-nav-h) - var(--safe));
        min-height:360px; max-height:none;
        align-items:stretch;
        position:relative; top:auto; z-index:auto;
      }
      /* floors LEFT rail = same height as stage; scroll inside, not inflate desk */
      .rail {
        max-height:none; height:auto; align-self:stretch; min-height:0;
        display:flex; flex-direction:column; overflow:hidden;
      }
      .floors { padding:3px 2px 3px 0; flex:1 1 auto; min-height:0; overflow:auto; }
      .floor-seg { margin-bottom:2px; }
      .floor-btn {
        padding:5px 3px; margin-bottom:2px; border-radius:0 7px 7px 0;
        flex-direction:column; justify-content:center; align-items:center; gap:0;
        min-height:34px; line-height:1.05;
      }
      .floor-btn strong { font-size:11px; font-weight:800; }
      .floor-btn span { font-size:8px; font-weight:700; opacity:.75; }
      /* mobile: detail sidebar off-canvas until «Unit details» — never a 3rd grid column */
      .detail {
        display:none !important;
        position:fixed; left:0; right:0; bottom:0; z-index:40;
        width:100%; max-width:100%;
        height:min(78vh, 680px); max-height:78vh; min-height:0;
        border-radius:18px 18px 0 0; border-top:1px solid var(--line);
        box-shadow:0 -16px 48px rgba(0,0,0,.5);
        padding-bottom:var(--safe);
      }
      body.detail-open .detail,
      body.detail-open .detail.empty { display:flex !important; }
      body.detail-open .detail.empty { display:grid !important; }
      body.detail-open { overflow:hidden; }
      body.detail-open .detail-backdrop { display:block; }
      .unit-details-btn { display:inline-flex; }
      .detail-close-mob { display:inline-flex; align-items:center; justify-content:center; }
      .stage {
        max-height:none; height:auto; min-height:0; align-self:stretch;
        border-right:0;
      }
      .photos-main {
        width:100%; max-width:100%;
        height:min(36vh, 280px); max-height:min(36vh, 280px);
        aspect-ratio:auto;
      }
      .photos-row{
        grid-template-columns:minmax(0,1fr); gap:8px;
      }
      .plugin-cta{ padding:9px 10px; gap:6px 10px; border-radius:12px; }
      .plugin-cta-t{ font-size:12px; }
      .photos-thumbs img { width:64px; height:48px; }
      /* mobile: fixed compact head — title + 2 dropdowns; no overlap with floors */
      body.split-desk{display:block}
      .hero{
        position:relative; z-index:auto;
        display:flex; flex-direction:column;
        background-color:#041018;
        padding-top:var(--mob-head-h);
      }
      /* one compact row: [for-sale][rooms][Marina Gate…][−75%+timer] */
      .hero-mob-top{
        position:fixed; top:0; left:0; right:0; z-index:50;
        display:flex !important; flex-direction:row; flex-wrap:nowrap; align-items:center;
        gap:5px; padding:5px 8px; box-sizing:border-box;
        min-height:var(--mob-head-h);
        border-bottom:1px solid var(--line);
        background:rgba(4,16,24,.98);
        backdrop-filter:blur(10px);
        pointer-events:auto;
      }
      .hero-mob-filters{
        display:flex; align-items:center; flex-wrap:nowrap; gap:4px;
        flex:0 0 auto; width:auto; min-width:0; max-width:none;
        padding:0; box-sizing:border-box;
        border:0; background:transparent;
      }
      .hero-mob-bar{
        display:flex !important; align-items:center; gap:5px;
        flex:1 1 auto; min-width:0;
        min-height:32px; padding:0;
        border:0; background:transparent; color:var(--text);
        font:inherit; cursor:pointer; text-align:left;
        -webkit-tap-highlight-color:transparent;
        pointer-events:auto; position:relative; z-index:2;
      }
      .hero-mob-bar:focus-visible{ outline:2px solid var(--sea); outline-offset:-2px; }
      .hero-mob-title{
        font-family:Fraunces,serif; font-weight:800; font-size:.78rem;
        letter-spacing:-.02em; line-height:1.1; min-width:0; flex:1 1 auto;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .hero-mob-chev{
        flex:0 0 auto; width:24px; height:24px; border-radius:6px;
        display:inline-flex; align-items:center; justify-content:center;
        border:1px solid var(--line); background:var(--elev);
        font-size:10px; color:var(--sand); transition:transform .28s ease;
      }
      .hero.is-open .hero-mob-chev{ transform:rotate(180deg); }
      .mob-dd{
        position:relative; flex:0 0 auto; min-width:0;
      }
      .mob-dd-btn{
        width:auto; max-width:88px; min-height:30px; padding:0 20px 0 8px;
        border-radius:8px; border:1px solid var(--line);
        background:var(--elev) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238aa3ad' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E") right 6px center/9px no-repeat;
        color:var(--text); font:inherit; font-weight:700; font-size:11px;
        text-align:left; cursor:pointer; appearance:none;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        -webkit-tap-highlight-color:transparent;
      }
      #mobPurposeDd .mob-dd-btn{ max-width:92px; }
      #mobRoomsDd .mob-dd-btn{ max-width:64px; }
      .mob-dd-btn:focus-visible{ outline:2px solid var(--sea); outline-offset:2px; }
      .mob-dd.is-open .mob-dd-btn{
        border-color:rgba(62,207,207,.55);
        box-shadow:0 0 0 2px rgba(62,207,207,.15);
      }
      .mob-dd-menu{
        display:none; position:absolute; left:0; right:auto; top:calc(100% + 4px);
        z-index:60; padding:6px; border-radius:12px;
        min-width:max(100%, 132px);
        border:1px solid var(--line); background:rgba(7,19,26,.98);
        box-shadow:0 12px 32px rgba(0,0,0,.45);
        max-height:min(50vh, 320px); overflow:auto;
      }
      #mobRoomsDd .mob-dd-menu{ left:auto; right:0; }
      .mob-dd.is-open .mob-dd-menu{ display:block; }
      .mob-dd-opt{
        display:flex; align-items:center; gap:8px; width:100%;
        min-height:40px; padding:0 10px; border:0; border-radius:8px;
        background:transparent; color:var(--text); font:inherit; font-weight:700; font-size:13px;
        text-align:left; cursor:pointer;
      }
      .mob-dd-opt:hover, .mob-dd-opt:focus-visible{ background:rgba(62,207,207,.12); outline:none; }
      .mob-dd-opt.is-on{ color:var(--sea); background:rgba(62,207,207,.14); }
      .mob-dd-opt .mob-dd-check{
        flex:0 0 auto; width:16px; text-align:center; color:var(--sea); opacity:0;
      }
      .mob-dd-opt.is-on .mob-dd-check{ opacity:1; }
      /* mobile chrome is .hero-mob-top — hide desk chrome only, keep workspace */
      .desk-chrome{display:none !important}
      .desk-sticky-host{
        display:block; order:unset; align-self:auto;
      }
      .desk-band{
        display:block !important; order:unset;
        position:relative !important; top:auto !important; z-index:auto;
        height:auto !important; max-height:none !important;
        overflow:visible !important;
        padding-bottom:0; background:transparent;
      }
      .workspace{
        display:block; flex:none; min-height:0; padding:0 0 12px;
      }
      .desk{
        height:var(--desk-h); min-height:420px; max-height:var(--desk-h);
      }
      .page-below{ z-index:1; }
      .hero-mob-offer{
        display:flex; flex-wrap:nowrap; align-items:center; justify-content:flex-end;
        gap:4px; flex:0 0 auto; width:auto; max-width:42%; min-width:0;
        padding:0; margin-left:auto; box-sizing:border-box; border-top:0;
      }
      .hero-mob-offer .tarif-chip--compact{
        flex:0 1 auto; min-width:0; padding:0 8px; min-height:30px;
        max-width:100%;
      }
      .hero-mob-offer .tarif-chip-pct{ font-size:11px; }
      .hero-mob-offer .intro-countdown{ font-size:10px; min-height:18px; padding:0 5px; }
      .auth-slot--mob{
        display:none !important;
      }
      .mob-app-dock{
        display:grid; grid-template-columns:1fr 1.35fr 1fr 1fr;
        align-items:end; gap:4px; position:fixed; left:0; right:0; bottom:0;
        z-index:45; box-sizing:border-box;
        padding:6px 10px calc(6px + var(--safe));
        background:linear-gradient(180deg, rgba(7,19,26,.15), rgba(7,19,26,.96) 28%, #07131a);
        border-top:1px solid var(--line);
        box-shadow:0 -12px 36px rgba(0,0,0,.45);
      }
      .mob-app-dock-btn{
        appearance:none; border:0; background:transparent; color:var(--muted);
        font:inherit; cursor:pointer; min-height:48px; padding:4px 2px;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:2px; border-radius:12px; -webkit-tap-highlight-color:transparent;
      }
      .mob-app-dock-btn:hover, .mob-app-dock-btn:focus-visible{
        color:var(--text); background:rgba(62,207,207,.1); outline:none;
      }
      .mob-app-dock-btn:focus-visible{ outline:2px solid var(--sea); outline-offset:1px; }
      .mob-app-dock-btn--ai{
        color:#041018; background:linear-gradient(145deg, #3ecfcf, #d8c3a5);
        border-radius:16px; min-height:52px; font-weight:800;
        box-shadow:0 8px 22px rgba(62,207,207,.28);
        transform:translateY(-4px);
      }
      .mob-app-dock-btn--ai:hover, .mob-app-dock-btn--ai:focus-visible{
        color:#041018; filter:brightness(1.05); background:linear-gradient(145deg, #3ecfcf, #d8c3a5);
      }
      .mob-app-dock-ic{ font-size:15px; line-height:1; font-weight:800; }
      .mob-app-dock-btn--ai .mob-app-dock-ic{ font-size:17px; }
      .mob-app-dock-lbl{
        font-size:9px; font-weight:750; letter-spacing:.02em; line-height:1.1;
        white-space:nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis;
      }
      .mob-app-dock-btn--ai .mob-app-dock-lbl{ font-size:11px; font-weight:800; }
      body.detail-open .mob-app-dock,
      body.chat-open .mob-app-dock,
      body.tariffs-open .mob-app-dock,
      body.ux-val-open .mob-app-dock,
      body.gauth-open .mob-app-dock{ display:none !important; }
      .mob-ai-sheet{
        display:block; position:fixed; inset:0; z-index:60;
      }
      .mob-ai-sheet[hidden]{ display:none !important; }
      .mob-ai-backdrop{
        position:absolute; inset:0; background:rgba(3,16,22,.62);
        backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
      }
      .mob-ai-panel{
        position:absolute; left:0; right:0; bottom:0;
        padding:14px 14px calc(14px + var(--safe));
        border-radius:18px 18px 0 0; border-top:1px solid var(--line);
        background:#0d1c24; box-shadow:0 -16px 48px rgba(0,0,0,.5);
      }
      .mob-ai-head{
        display:flex; align-items:center; justify-content:space-between;
        gap:10px; margin:0 0 10px;
      }
      .mob-ai-head strong{ font-size:15px; font-weight:800; }
      .mob-ai-x{
        width:40px; height:40px; border:0; border-radius:999px;
        background:transparent; color:var(--muted); font-size:24px; cursor:pointer;
      }
      .mob-ai-field{ display:block; margin:0 0 10px; }
      .mob-ai-field input{
        width:100%; min-height:48px; padding:0 14px; border-radius:14px;
        border:1px solid var(--line); background:var(--elev); color:var(--text);
        font:inherit; font-size:14px; outline:none;
      }
      .mob-ai-field input:focus{ border-color:rgba(62,207,207,.55); box-shadow:0 0 0 2px rgba(62,207,207,.18); }
      .mob-ai-go{
        appearance:none; width:100%; min-height:48px; border:0; border-radius:14px;
        background:linear-gradient(145deg,#3ecfcf,#d8c3a5); color:#041018;
        font:inherit; font-weight:800; cursor:pointer;
      }
      .mob-broker-dock{
        bottom:calc(var(--mob-nav-h) + var(--safe)) !important;
        padding-bottom:10px !important;
      }
      .longread{ padding-bottom:calc(120px + var(--mob-nav-h) + var(--safe)) !important; }
      .workspace-tabs{display:none !important}
      .hero-panel{
        display:block; order:unset;
        max-height:0; overflow:hidden; opacity:0; padding:0;
        transition:max-height .38s ease, opacity .28s ease, padding .28s ease;
      }
      .hero.is-open .hero-panel{
        max-height:min(78vh, 1100px); opacity:1; padding:0 0 12px;
        overflow:auto; -webkit-overflow-scrolling:touch;
      }
      .hero-core{
        order:unset; max-width:none; margin:0;
        padding:12px 14px 14px;
      }
      #dld-sale, #dld-rent, .cvh1br-chart, #cvh-1br-chart{order:unset}
      .hero.is-open .hero-panel .metrics .pps,
      .hero.is-open .hero-panel .metrics .stat{
        flex:1 1 100%; width:100%; max-width:100%;
      }
      .hero-panel .dld-full{display:block}
      .hero-tail{display:none !important}
      .page-below{
        display:block; order:unset; position:relative; z-index:1;
        padding-bottom:calc(24px + var(--mob-nav-h) + var(--safe));
      }
      .page-below .reviews-ticker{margin-top:8px}
      .page-below .longread{padding:8px 14px 20px}
      @media (prefers-reduced-motion:reduce){
        .hero-panel,.hero-mob-chev{transition:none}
      }
    }
    @media (max-width:640px) {
      .metrics { max-width:100%; }
      .metrics .pps, .metrics .stat { flex:1 1 100%; width:100%; max-width:100%; }
      .metrics .pps.pps-flip, .pps-flip-inner { min-height:240px; }
      .pps-chart svg { height:88px; }
    }
  </style>
</head>
<body class="split-desk">
  <header class="hero" id="hero">
    <div class="hero-mob-top" id="heroMobTop">
      <div class="hero-mob-filters" id="heroMobFilters">
        <div class="mob-dd" id="mobPurposeDd" data-mob-dd="purpose">
          <button type="button" class="mob-dd-btn" id="mobPurposeBtn" aria-haspopup="listbox" aria-expanded="false">for-sale</button>
          <div class="mob-dd-menu" id="mobPurposeMenu" role="listbox" hidden>
            <button type="button" class="mob-dd-opt is-on" data-tab="sale" role="option" aria-selected="true"><span class="mob-dd-check" aria-hidden="true">✓</span>for-sale</button>
            <button type="button" class="mob-dd-opt" data-tab="rent" role="option" aria-selected="false"><span class="mob-dd-check" aria-hidden="true">✓</span>for-rent</button>
          </div>
        </div>
      </div>
      <button type="button" class="hero-mob-bar" id="heroMobBar" aria-expanded="false" aria-controls="heroInner">
        <span class="hero-mob-title" id="heroMobTitle">${esc(b)}</span>
        <span class="hero-mob-chev" aria-hidden="true">▾</span>
      </button>
      <div class="mob-dd" id="mobRoomsDd" data-mob-dd="rooms">
        <button type="button" class="mob-dd-btn" id="mobRoomsBtn" aria-haspopup="listbox" aria-expanded="false">1 BR</button>
        <div class="mob-dd-menu" id="mobRoomsMenu" role="listbox" hidden></div>
      </div>
      <div class="hero-mob-offer" id="heroMobOffer">
        ${silentOfferChipHtml('tarif-chip-silent-mob')}
      </div>
    </div>
    <div class="hero-panel" id="heroInner">
      <a class="dld-full" id="dld-sale" href="${esc(dldHref)}#sale" title="DLD Sale · отдельная страница">
        ${dldTickerHtml(dldSaleTick, 'sale')}
      </a>
      ${cvhChart.html}
      <div class="hero-core" id="heroCore">
        <div class="kicker">Split Desk · ${esc(district)}</div>
        <h1>${esc(seo.h1 || b)}</h1>
        <div class="trust-strip">
          ${googleRatingHtml(google)}
          ${trustBitsHtml(stock)}
        </div>
        <div class="metrics">
          ${askDldCompareMini('sale', sale, pps.sale, dld.sale, deals.sale, stock, { dldHref })}
          ${askDldCompareMini('rent', rent, pps.rent, dld.rent, deals.rent, stock, { dldHref })}
        </div>
      </div>
      <a class="dld-full dld-full--under" id="dld-rent" href="${esc(dldHref)}#rent" title="DLD Rent · отдельная страница">
        ${dldTickerHtml(dldRentTick, 'rent')}
      </a>
    </div>
  </header>
  ${ppsFlipBootScript()}
  <div class="desk-sticky-host">
  <div class="desk-band">
  <div class="desk-chrome" id="deskChrome">
  <div class="desk-head" id="deskHead">
    <button type="button" class="desk-jump" id="deskJumpAnalytics" title="Аналитика здания · открыть/закрыть" aria-expanded="false">
      <span id="deskJumpTitle">${esc(b)} · 1 BR</span>
    </button>
    <div class="tabs workspace-tabs" id="deskFilters" role="tablist">
      <button type="button" class="tab is-on" data-tab="sale">for-sale</button>
      <button type="button" class="tab" data-tab="rent">for-rent</button>
      <span class="rooms-filters" data-rooms-filters role="group" aria-label="Rooms"></span>
    </div>
    <span class="desk-trend is-flat" id="deskTrend" title="Динамика ask AED/sqft · ~3 мес.">···</span>
    <div class="desk-tools" id="deskTools">
      <label class="desk-search" for="deskSearchDubai">
        <input type="search" id="deskSearchDubai" placeholder="Ну давай ещё поищем что-нибудь — можешь задать любой вопрос" autocomplete="off" enterkeyhint="search" />
      </label>
      <div class="desk-auth-offer" id="deskAuthOffer">
        ${silentOfferChipHtml('tarif-chip-silent')}
      </div>
    </div>
  </div>
  </div>
  <div class="workspace">
    <div class="desk">
      <aside class="rail">
        <div class="floors" id="floors"></div>
      </aside>
      <section class="stage" id="stage">
        <div class="stage-empty">Выбери этаж слева</div>
      </section>
      <section class="detail empty" id="detail">Выбери лот</section>
    </div>
    <div class="detail-backdrop" id="detailBackdrop" hidden aria-hidden="true"></div>
  </div>
  </div>
  </div>
  <div class="page-below" id="pageBelow" tabindex="-1">
    ${buildingUnderBuildingHtml(page)}
    ${reviewsTickerHtml(reviews)}
    ${longreadHtml(page, dldHref)}
  </div>
  ${reviewsPinHtml(reviews)}
  ${swipeStartChatSheetHtml()}
  ${swipeStartChatDockHtml()}
  ${mobAppDockHtml()}
  ${authPopupHtml()}
  ${tariffsModalHtml()}
  <div class="ux-val-overlay" id="uxValOverlay" hidden aria-hidden="true">
    <div class="ux-val-backdrop" data-ux-val-dismiss tabindex="-1"></div>
    <div class="ux-val-dialog" role="dialog" aria-modal="true" aria-labelledby="uxValTitle" id="uxValDialog" tabindex="-1">
      <button type="button" class="ux-val-x" data-ux-val-dismiss aria-label="Закрыть">×</button>
      <header class="ux-val-hero">
        <h2 class="ux-val-title" id="uxValTitle">Оценка объекта</h2>
        <p class="ux-val-sub">Сегмент · графики · история · как в sell-my-home</p>
      </header>
      <div class="ux-val-body" id="uxValBody"></div>
    </div>
  </div>
  <script type="application/json" id="data">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
  ${buildingRoomChatBootScript(page)}
  ${cvhChart.boot}
  <script>
  (function(){
    const data = JSON.parse(document.getElementById('data').textContent);
    let tab = 'sale', floorId = null, unitIdx = 0, stackIdx = 0;
    /** Rooms filter: null = all, else array of room codes e.g. ['1'] or ['1','2'] */
    let roomsFilter = ['1'];
    let stack = [];
    let feedObserver = null;
    let syncingScroll = false;
    let audioCtx = null;
    let lastScrollSoundAt = 0;
    const floorsEl = document.getElementById('floors');
    const stageEl = document.getElementById('stage');
    const detailEl = document.getElementById('detail');

    function unlockAudio(){
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      } catch (e) {}
    }
    /** Real user gesture only — never call from IntersectionObserver. */
    function onUserGesture(){
      unlockAudio();
      unlockVoice();
    }
    /** Short tick — lower pitch when scrolling down. Override via scroll_sound_picker.html */
    function playScrollSound(dir){
      const now = Date.now();
      if (now - lastScrollSoundAt < 90) return;
      lastScrollSoundAt = now;
      try {
        unlockAudio();
        if (!audioCtx) return;
        const id = (localStorage.getItem('refty_scroll_sound') || 'ratchet');
        const t = audioCtx.currentTime;
        if (id === 'silent') return;
        if (id === 'soft_pop') {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(dir > 0 ? 420 : 560, t);
          o.frequency.exponentialRampToValueAtTime(dir > 0 ? 180 : 320, t + 0.08);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
          o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.11);
          return;
        }
        if (id === 'ui_tick') {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(dir > 0 ? 880 : 1100, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.025, t + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
          o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.04);
          return;
        }
        if (id === 'wood_knock') {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(dir > 0 ? 160 : 220, t);
          o.frequency.exponentialRampToValueAtTime(dir > 0 ? 60 : 90, t + 0.06);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
          o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.1);
          return;
        }
        if (id === 'glass') {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(dir > 0 ? 1400 : 1800, t);
          o.frequency.exponentialRampToValueAtTime(dir > 0 ? 900 : 1200, t + 0.12);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.035, t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.15);
          return;
        }
        if (id === 'marimba') {
          const base = dir > 0 ? 330 : 440;
          [1, 2.01, 3.02].forEach((mul, i) => {
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(base * mul, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime((i === 0 ? 0.05 : 0.018), t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 - i * 0.03);
            o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.2);
          });
          return;
        }
        if (id === 'ratchet') {
          const down = dir > 0;
          const clicks = down ? 2 : 1;
          for (let i = 0; i < clicks; i++) {
            const at = t + i * 0.028;
            const n = Math.max(64, Math.floor(audioCtx.sampleRate * 0.012));
            const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let j = 0; j < n; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / n, 2.4);
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const bp = audioCtx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(down ? 1800 - i * 180 : 2400, at);
            bp.Q.value = 4.5;
            const hp = audioCtx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 700;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.0001, at);
            g.gain.exponentialRampToValueAtTime(0.05, at + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
            src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(audioCtx.destination);
            src.start(at); src.stop(at + 0.045);
          }
          const o = audioCtx.createOscillator(), og = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(down ? 140 : 190, t);
          o.frequency.exponentialRampToValueAtTime(down ? 70 : 110, t + 0.05);
          og.gain.setValueAtTime(0.0001, t);
          og.gain.exponentialRampToValueAtTime(0.028, t + 0.004);
          og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
          o.connect(og); og.connect(audioCtx.destination); o.start(t); o.stop(t + 0.08);
          return;
        }
        // classic (default)
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(dir > 0 ? 380 : 520, t);
        o.frequency.exponentialRampToValueAtTime(dir > 0 ? 260 : 640, t + 0.05);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t);
        o.stop(t + 0.09);
      } catch (e) {}
    }
    document.addEventListener('pointerdown', onUserGesture, { once: true, passive: true });
    document.addEventListener('wheel', onUserGesture, { once: true, passive: true });
    document.addEventListener('touchstart', onUserGesture, { once: true, passive: true });
    try {
      if (localStorage.getItem('refty_scroll_sound_v') !== 'ratchet1') {
        localStorage.setItem('refty_scroll_sound', 'ratchet');
        localStorage.setItem('refty_scroll_sound_v', 'ratchet1');
      }
    } catch (e) {}

    function isViewUnit(u) {
      if (u.is_view === true) return true;
      if (u.is_view === false) return false;
      const t = String(u.title||'')+' '+String(u.description||'');
      return /\\b(marina view|sea view|lake view|water view|bay view|gulf view|ocean view|canal view|harbour view|harbor view|palm view|beach view|full view|panoramic view|stunning view|uninterrupted view)\\b/i.test(t);
    }

    function fmtP(p, purpose) {
      const x = Number(p); if (!x) return '—';
      if (String(purpose).includes('rent')) return x.toLocaleString('en-US') + ' AED/yr';
      return (x >= 1e6 ? (x/1e6).toFixed(2)+'M' : x.toLocaleString('en-US')) + ' AED';
    }
    function pctTxt(v){
      if(v==null||!Number.isFinite(Number(v))) return '—';
      const n=Number(v);
      return (n>0?'+':'')+n+'%';
    }
    /** Prefer vs market; fallback vs similar */
    /** Prefer price vs market; fallback price vs similar */
    function relPct(u){
      if(u.pvm_pct!=null&&Number.isFinite(Number(u.pvm_pct))) return { pct:Number(u.pvm_pct), basis:'market' };
      if(u.pvs_pct!=null&&Number.isFinite(Number(u.pvs_pct))) return { pct:Number(u.pvs_pct), basis:'similar' };
      return null;
    }
    function marketSimilarLine(u){
      const parts=[];
      if(u.pvm_pct!=null) parts.push('vs market '+pctTxt(u.pvm_pct));
      if(u.pvs_pct!=null) parts.push('vs similar '+pctTxt(u.pvs_pct));
      return parts.join(' · ') || '—';
    }
    function overpriceTag(u){
      const r=relPct(u);
      if(!r) return '';
      if(r.pct>5) return 'overprice '+pctTxt(r.pct);
      if(r.pct<-2) return 'below market '+pctTxt(r.pct);
      return 'в рынке';
    }
    /** Market verdict: overprice · ниже рынка · в рынке */
    function dealFace(u){
      const r=relPct(u);
      const pct = r ? Math.round(Math.abs(r.pct)) : null;
      if(!r) return { emoji:'✅', tone:'fair', label:'в рынке', shortLabel:'в рынке', say:'В рынке. Нет данных для сравнения с рынком.' };
      if(r.pct>5) return { emoji:'🔴', tone:'over', label:'overprice', shortLabel:'overprice', say:'Overprice. Выше рынка на '+pct+' процентов.' };
      if(r.pct<-2) return { emoji:'🟢', tone:'under', label:'ниже рынка', shortLabel:'ниже рынка', say:'Ниже рынка на '+pct+' процентов.' };
      return { emoji:'✅', tone:'fair', label:'в рынке', shortLabel:'в рынке', say:'В рынке. Цена около рыночной.' };
    }
    let lastSpokeKey = '';
    let voiceTimer = null;
    let voiceWatchKey = '';
    let voicePlayToken = 0;
    let voiceFace = null;
    let cachedRuVoice = null;
    let voiceGestureOk = false;
    let voicePrimed = false;
    let voicePending = null;
    function voiceMuted(){
      try { return localStorage.getItem('refty_deal_voice') === 'off'; } catch(e){ return false; }
    }
    function setVoiceMuted(off){
      try { localStorage.setItem('refty_deal_voice', off ? 'off' : 'on'); } catch(e){}
    }
    /** Must run inside a real user gesture — primes Chrome/Safari speechSynthesis. */
    function primeSpeechSynthesis(){
      if (voicePrimed || !window.speechSynthesis) return;
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        const warm = new SpeechSynthesisUtterance('');
        warm.volume = 0;
        warm.rate = 2;
        warm.lang = 'ru-RU';
        window.speechSynthesis.speak(warm);
        voicePrimed = true;
      } catch(e){}
    }
    function markVoiceGesture(opts){
      const skipPending = !!(opts && opts.skipPending);
      voiceGestureOk = true;
      // When about to speak real text in this turn, skip empty warm-up (avoids cancel race).
      if (!skipPending) primeSpeechSynthesis();
      try {
        if (window.speechSynthesis && window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch(e){}
      pickRuVoice();
      if (!skipPending && voicePending && !voiceMuted()) {
        const p = voicePending;
        voicePending = null;
        playUnitVoiceNow(p.u, p.f);
      }
    }
    function unlockVoice(){
      markVoiceGesture();
    }
    function setVoiceUi(state){
      const btn = detailEl && detailEl.querySelector('#act-voice');
      if (!btn) return;
      const face = voiceFace;
      btn.classList.toggle('is-off', state === 'off');
      btn.classList.toggle('is-playing', state === 'playing');
      btn.classList.toggle('tone-over', !!(face && face.tone === 'over' && state !== 'off'));
      btn.classList.toggle('tone-under', !!(face && face.tone === 'under' && state !== 'off'));
      btn.classList.toggle('tone-fair', !!(face && face.tone === 'fair' && state !== 'off'));
      const meta = btn.querySelector('.tg-voice-meta');
      if (meta) {
        if (state === 'off') meta.textContent = 'mute';
        else if (face) meta.textContent = face.shortLabel || face.label;
        else meta.textContent = state === 'playing' ? 'стоп' : 'в рынке';
      }
      const icon = btn.querySelector('.tg-voice-icon');
      if (icon) {
        icon.innerHTML = state === 'playing'
          ? '<rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/>'
          : state === 'off'
            ? '<path d="M3 5.5v5h3.2L11 14V2L6.2 5.5H3z"/><path d="M13 5l4 6M17 5l-4 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
            : '<path d="M3.2 2.2v11.6L13.5 8z"/>';
      }
    }
    function cancelUnitVoice(){
      if (voiceTimer) { clearTimeout(voiceTimer); voiceTimer = null; }
      voicePlayToken++;
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch(e){}
      setVoiceUi(voiceMuted() ? 'off' : 'idle');
    }
    function scoreVoice(v){
      const n = String(v.name || '') + ' ' + String(v.voiceURI || '');
      let s = 0;
      if (/neural|natural|premium|enhanced|online|wavenet|studio/i.test(n)) s += 60;
      if (/google/i.test(n)) s += 45;
      if (/microsoft/i.test(n)) s += 30;
      if (/milena|irina|katya|tanya|yuri|pavel|dmitri|elena/i.test(n)) s += 35;
      if (v.localService === false) s += 12;
      if (/compact|eloquence|robot|novelty|whisper|zarvox/i.test(n)) s -= 40;
      return s;
    }
    function pickRuVoice(){
      if (cachedRuVoice) return cachedRuVoice;
      if (!window.speechSynthesis) return null;
      const voices = window.speechSynthesis.getVoices() || [];
      const ru = voices.filter((v) => /ru/i.test(v.lang));
      ru.sort((a, b) => scoreVoice(b) - scoreVoice(a));
      cachedRuVoice = ru[0] || null;
      return cachedRuVoice;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', function(){ cachedRuVoice = null; pickRuVoice(); });
      pickRuVoice();
    }
    function unitNarration(u, f){
      return dealFace(u).say;
    }
    function speakText(text, face){
      if (!window.speechSynthesis || voiceMuted() || !text) return;
      const token = ++voicePlayToken;
      function go(){
        if (token !== voicePlayToken || voiceMuted()) return;
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          const uo = new SpeechSynthesisUtterance(String(text));
          uo.lang = 'ru-RU';
          uo.rate = 0.95;
          uo.pitch = face && face.tone === 'under' ? 1.05 : (face && face.tone === 'over' ? 0.94 : 1.0);
          uo.volume = 0.92;
          const ru = pickRuVoice();
          if (ru) uo.voice = ru;
          uo.onstart = function(){ setVoiceUi('playing'); };
          uo.onend = function(){
            if (token !== voicePlayToken || voiceMuted()) return;
            setVoiceUi('idle');
          };
          uo.onerror = function(){ setVoiceUi(voiceMuted() ? 'off' : 'idle'); };
          function doSpeak(){
            if (token !== voicePlayToken || voiceMuted()) return;
            try {
              window.speechSynthesis.speak(uo);
              if (window.speechSynthesis.paused) window.speechSynthesis.resume();
            } catch(e){ setVoiceUi('idle'); }
          }
          // Chrome drops speak() if called in the same turn as cancel().
          // Only cancel when needed; delay speak only after cancel (engine already primed).
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
            setTimeout(doSpeak, 50);
          } else {
            doSpeak();
          }
        } catch(e){ setVoiceUi('idle'); }
      }
      go();
      if (!pickRuVoice()) {
        window.speechSynthesis.addEventListener('voiceschanged', function retry(){
          window.speechSynthesis.removeEventListener('voiceschanged', retry);
          go();
        });
      }
    }
    function playUnitVoiceNow(u, f){
      if (!window.speechSynthesis) return;
      voicePending = null;
      markVoiceGesture({ skipPending: true });
      try { localStorage.setItem('refty_deal_voice', 'on'); } catch(e){}
      if (voiceTimer) { clearTimeout(voiceTimer); voiceTimer = null; }
      const key = unitKey(u);
      voiceWatchKey = key;
      const face = dealFace(u);
      voiceFace = face;
      const text = unitNarration(u, f);
      lastSpokeKey = key + '|' + text;
      setVoiceUi('playing');
      speakText(text, face);
      voicePrimed = true;
    }
    /** Auto-speak market verdict when lot opens (after first scroll / tap). */
    function scheduleUnitVoice(u, f){
      voiceFace = dealFace(u);
      if (!window.speechSynthesis || voiceMuted()) {
        setVoiceUi('off');
        voicePending = null;
        return;
      }
      const key = unitKey(u);
      if (voiceWatchKey === key && lastSpokeKey === key + '|' + unitNarration(u, f)) return;
      if (!voiceGestureOk) {
        voicePending = { u: u, f: f };
        setVoiceUi('idle');
        return;
      }
      voicePending = null;
      playUnitVoiceNow(u, f);
    }
    function tgVoiceBtnHtml(face){
      const lbl = (face && (face.shortLabel || face.label)) || 'в рынке';
      const tone = (face && face.tone) || 'fair';
      return '<button type="button" class="tg-voice tone-'+tone+'" id="act-voice" title="Озвучка: overprice / ниже рынка / в рынке">' +
        '<span class="tg-voice-orb"><svg class="tg-voice-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.2 2.2v11.6L13.5 8z"/></svg></span>' +
        '<span class="tg-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
        '<span class="tg-voice-meta">'+lbl+'</span>' +
      '</button>';
    }
    function ppsRelLine(u){
      const pps=Number(u.pps);
      const r=relPct(u);
      const hasPps=Number.isFinite(pps)&&pps>0;
      if(!hasPps&&!r) return '';
      if(!hasPps) return pctTxt(r.pct)+' AED/sqft vs '+r.basis;
      let s=Math.round(pps).toLocaleString('en-US')+' AED/sqft';
      if(r){
        const fair=Math.round(pps/(1+r.pct/100));
        s+=' · fair ~'+fair.toLocaleString('en-US')+'/sqft vs '+r.basis+' ('+pctTxt(r.pct)+')';
      }
      return s;
    }
    function unitParamsHtml(u){
      const chips=[];
      if(u.rooms!=null&&u.rooms!=='') chips.push('<span><b>BR</b>'+u.rooms+'</span>');
      if(u.baths!=null) chips.push('<span><b>Bath</b>'+u.baths+'</span>');
      if(u.area_sqft!=null) chips.push('<span><b>Area</b>'+Math.round(u.area_sqft).toLocaleString('en-US')+' sqft</span>');
      if(u.pps!=null) chips.push('<span><b>AED/sqft</b>'+Math.round(u.pps).toLocaleString('en-US')+'</span>');
      if(u.balcony_area!=null) chips.push('<span><b>Balcony</b>'+u.balcony_area+' m²</span>');
      if(u.furnishing) chips.push('<span><b>Furn</b>'+String(u.furnishing).replace(/_/g,' ')+'</span>');
      if(u.parking) chips.push('<span><b>Park</b>'+u.parking+'</span>');
      if(u.renovated===true) chips.push('<span><b>Renov</b>yes</span>');
      if(u.tenant_free===true) chips.push('<span><b>Vacant</b>yes</span>');
      else if(u.tenant_free===false) chips.push('<span><b>Tenant</b>yes</span>');
      if(!chips.length) return '';
      return '<div class="unit-params">'+chips.join('')+'</div>';
    }
    function shortA(a){ a=String(a||''); return a.length>32?a.slice(0,30)+'…':a; }
    function roomsLabelOf(rooms){
      const r=String(rooms==null?'':rooms).trim();
      if(!r) return 'лот';
      if(/studio/i.test(r)) return 'Studio';
      return r+' BR';
    }
    /** Compact: «1 BR» / «1, 2» / «All» */
    function roomsFilterLabel(sel){
      if(!sel || !sel.length) return 'All';
      const sorted=sel.slice().sort(function(a,b){
        const na=Number(a), nb=Number(b);
        if(Number.isFinite(na)&&Number.isFinite(nb)) return na-nb;
        return String(a).localeCompare(String(b));
      });
      const avail=availableRooms();
      if(avail.length && sorted.length===avail.length && avail.every(function(r){ return sorted.indexOf(String(r))>=0; })){
        return 'All';
      }
      const nums=[], rest=[];
      sorted.forEach(function(r){
        const s=String(r);
        if(/studio/i.test(s)) rest.push('Studio');
        else if(Number.isFinite(Number(s))) nums.push(s);
        else rest.push(roomsLabelOf(s));
      });
      const parts=[];
      if(nums.length===1) parts.push(nums[0]+' BR');
      else if(nums.length>1) parts.push(nums.join(', '));
      rest.forEach(function(x){ parts.push(x); });
      return parts.join(', ') || 'All';
    }
    function roomsFilterSelected(){
      if(roomsFilter==null) return null;
      if(Array.isArray(roomsFilter)) return roomsFilter.map(String);
      return [String(roomsFilter)];
    }
    function roomMatchesFilter(u){
      const sel=roomsFilterSelected();
      if(sel==null) return true;
      return sel.indexOf(String(u.rooms||''))>=0;
    }
    function availableRooms(){
      const set={};
      (data[tab]||[]).forEach(function(f){
        (f.rows||[]).forEach(function(u){
          const r=String(u.rooms==null?'':u.rooms).trim();
          if(r) set[r]=true;
        });
      });
      return Object.keys(set).sort(function(a,b){
        const na=Number(a), nb=Number(b);
        if(Number.isFinite(na)&&Number.isFinite(nb)) return na-nb;
        return a.localeCompare(b);
      });
    }
    function ensureRoomsFilter(){
      const avail=availableRooms();
      if(!avail.length){ roomsFilter=null; return; }
      const sel=roomsFilterSelected();
      if(sel==null) return;
      const kept=sel.filter(function(r){ return avail.indexOf(r)>=0; });
      if(kept.length){ roomsFilter=kept; return; }
      roomsFilter = avail.indexOf('1')>=0 ? ['1'] : [avail[0]];
    }
    function floors(){
      ensureRoomsFilter();
      return (data[tab] || []).map(function(f){
        const rows=(f.rows||[]).filter(roomMatchesFilter);
        return Object.assign({}, f, { rows:rows });
      }).filter(function(f){ return (f.rows||[]).length; });
    }
    function renderRoomsFilters(){
      ensureRoomsFilter();
      const avail=availableRooms();
      const sel=roomsFilterSelected();
      const html =
        '<button type="button" class="tab-room'+(sel==null?' is-on':'')+'" data-rooms="all">All</button>' +
        avail.map(function(r){
          const on=sel!=null && sel.indexOf(String(r))>=0;
          return '<button type="button" class="tab-room'+(on?' is-on':'')+'" data-rooms="'+r+'" aria-pressed="'+(on?'true':'false')+'">'+roomsLabelOf(r)+'</button>';
        }).join('');
      document.querySelectorAll('[data-rooms-filters]').forEach(function(el){
        el.innerHTML=html;
        el.querySelectorAll('.tab-room').forEach(function(btn){
          btn.onclick=function(){
            const v=btn.getAttribute('data-rooms');
            if(v==='all'){
              roomsFilter=null;
            } else {
              let cur=roomsFilterSelected();
              if(cur==null) cur=[];
              const i=cur.indexOf(String(v));
              if(i>=0){
                cur=cur.slice(0,i).concat(cur.slice(i+1));
                roomsFilter = cur.length ? cur : null;
              } else {
                roomsFilter = cur.concat([String(v)]);
              }
            }
            floorId=null; unitIdx=0;
            try{ closeUnitDetails(); }catch(e){}
            mount();
            updateHeroMobTitle();
          };
        });
      });
      syncMobDropdowns();
    }
    function closeAllMobDd(except){
      document.querySelectorAll('.mob-dd.is-open').forEach(function(dd){
        if(except && dd===except) return;
        dd.classList.remove('is-open');
        const btn=dd.querySelector('.mob-dd-btn');
        const menu=dd.querySelector('.mob-dd-menu');
        if(btn) btn.setAttribute('aria-expanded','false');
        if(menu) menu.hidden=true;
      });
    }
    function setMobDdOpen(dd, open){
      if(!dd) return;
      if(open) closeAllMobDd(dd);
      dd.classList.toggle('is-open', !!open);
      const btn=dd.querySelector('.mob-dd-btn');
      const menu=dd.querySelector('.mob-dd-menu');
      if(btn) btn.setAttribute('aria-expanded', open?'true':'false');
      if(menu) menu.hidden=!open;
    }
    function syncMobDropdowns(){
      const purposeBtn=document.getElementById('mobPurposeBtn');
      if(purposeBtn) purposeBtn.textContent = tab==='rent' ? 'for-rent' : 'for-sale';
      document.querySelectorAll('#mobPurposeMenu .mob-dd-opt').forEach(function(opt){
        const on=opt.getAttribute('data-tab')===tab;
        opt.classList.toggle('is-on', on);
        opt.setAttribute('aria-selected', on?'true':'false');
      });
      ensureRoomsFilter();
      const avail=availableRooms();
      const sel=roomsFilterSelected();
      const roomsBtn=document.getElementById('mobRoomsBtn');
      if(roomsBtn) roomsBtn.textContent=roomsFilterLabel(sel);
      const menu=document.getElementById('mobRoomsMenu');
      if(!menu) return;
      const allOn=sel==null;
      let html='<button type="button" class="mob-dd-opt'+(allOn?' is-on':'')+'" data-rooms="all" role="option" aria-selected="'+(allOn?'true':'false')+'"><span class="mob-dd-check" aria-hidden="true">✓</span>All</button>';
      avail.forEach(function(r){
        const on=sel!=null && sel.indexOf(String(r))>=0;
        html+='<button type="button" class="mob-dd-opt'+(on?' is-on':'')+'" data-rooms="'+r+'" role="option" aria-selected="'+(on?'true':'false')+'"><span class="mob-dd-check" aria-hidden="true">✓</span>'+roomsLabelOf(r)+'</button>';
      });
      menu.innerHTML=html;
      menu.querySelectorAll('.mob-dd-opt').forEach(function(opt){
        opt.onclick=function(e){
          e.preventDefault();
          e.stopPropagation();
          const v=opt.getAttribute('data-rooms');
          if(v==='all'){
            roomsFilter=null;
            setMobDdOpen(document.getElementById('mobRoomsDd'), false);
          } else {
            let cur=roomsFilterSelected();
            if(cur==null) cur=[];
            const i=cur.indexOf(String(v));
            if(i>=0){
              cur=cur.slice(0,i).concat(cur.slice(i+1));
              roomsFilter = cur.length ? cur : null;
            } else {
              roomsFilter = cur.concat([String(v)]);
            }
          }
          floorId=null; unitIdx=0;
          try{ closeUnitDetails(); }catch(err){}
          mount();
          updateHeroMobTitle();
        };
      });
    }
    (function bindMobDropdowns(){
      const purposeDd=document.getElementById('mobPurposeDd');
      const roomsDd=document.getElementById('mobRoomsDd');
      const purposeBtn=document.getElementById('mobPurposeBtn');
      const roomsBtn=document.getElementById('mobRoomsBtn');
      if(purposeBtn && purposeDd){
        purposeBtn.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          setMobDdOpen(purposeDd, !purposeDd.classList.contains('is-open'));
        });
      }
      if(roomsBtn && roomsDd){
        roomsBtn.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          setMobDdOpen(roomsDd, !roomsDd.classList.contains('is-open'));
        });
      }
      document.querySelectorAll('#mobPurposeMenu .mob-dd-opt').forEach(function(opt){
        opt.addEventListener('click', function(e){
          e.preventDefault();
          e.stopPropagation();
          const next=opt.getAttribute('data-tab');
          if(!next || next===tab){ setMobDdOpen(purposeDd, false); return; }
          tab=next;
          document.querySelectorAll('.tab[data-tab]').forEach(function(x){
            x.classList.toggle('is-on', x.getAttribute('data-tab')===tab);
          });
          floorId=null; unitIdx=0;
          try{ closeUnitDetails(); }catch(err){}
          setMobDdOpen(purposeDd, false);
          mount();
          updateHeroMobTitle();
        });
      });
      document.addEventListener('click', function(){ closeAllMobDd(); });
      document.addEventListener('keydown', function(e){
        if(e.key==='Escape') closeAllMobDd();
      });
    })();
    function curFloor(){ return floors().find(f=>f.id===floorId) || floors()[0]; }
    function buildingFloorsTotal(){
      const t = Number(data.buildingFloors);
      if (Number.isFinite(t) && t > 0) return t;
      const maxF = Math.max(0, ...floors().map((f) => Number(f.floor)).filter((n) => Number.isFinite(n)));
      return maxF || 1;
    }
    /** Same bands as floor_segment / dealEnrichment: high ≥66%, low ≤33%, else mid */
    function floorBand(floorNum){
      const f = Number(floorNum);
      const total = buildingFloorsTotal();
      if (!Number.isFinite(f) || f < 0) return 'mid';
      const pct = (f - 1) / Math.max(total - 1, 1);
      if (pct >= 0.66) return 'high';
      if (pct <= 0.33) return 'low';
      return 'mid';
    }
    function floorsByBand(){
      const order = ['high', 'mid', 'low'];
      const labels = {
        high: { title: 'Высокие', en: 'High', color: 'high' },
        mid: { title: 'Средние', en: 'Mid', color: 'mid' },
        low: { title: 'Нижние', en: 'Low', color: 'low' },
      };
      const buckets = { high: [], mid: [], low: [] };
      for (const f of floors()) {
        const band = f.id === 'na' ? 'mid' : floorBand(f.floor);
        buckets[band].push(f);
      }
      return order
        .filter((k) => buckets[k].length)
        .map((k) => ({
          key: k,
          ...labels[k],
          rows: buckets[k],
          units: buckets[k].reduce((s, f) => s + (f.rows || []).length, 0),
        }));
    }
    function rebuildStack(){
      // floors already high→low; keep units order within floor
      stack = floors().flatMap((f) => (f.rows || []).map((u, i) => ({ u, f, unitIdx: i })));
    }
    function photoSize(url, kind){
      const u=String(url||'');
      if(!u) return '';
      if(kind==='thumb') return u.replace(/\\/\\d+x\\d+\\.(jpe?g|webp|png)(\\?.*)?$/i,'/668x452.$1$2');
      return u.replace(/\\/\\d+x\\d+\\.(jpe?g|webp|png)(\\?.*)?$/i,'/1312x894.$1$2');
    }

    function highlightFloors(){
      floorsEl.querySelectorAll('.floor-btn').forEach(b=>b.classList.toggle('is-on', b.getAttribute('data-f')===floorId));
      const on = floorsEl.querySelector('.floor-btn.is-on');
      if (on) on.scrollIntoView({ block:'nearest', behavior:'smooth' });
    }

    function selectStack(i, opts){
      opts = opts || {};
      if (!stack.length) return;
      const next = Math.max(0, Math.min(stack.length - 1, i));
      const changed = next !== stackIdx || floorId !== stack[next].f.id || unitIdx !== stack[next].unitIdx;
      const dir = next - stackIdx;
      if (changed && dir !== 0 && !opts.silent) playScrollSound(dir);
      stackIdx = next;
      floorId = stack[stackIdx].f.id;
      unitIdx = stack[stackIdx].unitIdx;
      stageEl.querySelectorAll('.unit-card').forEach((el) => {
        el.classList.toggle('is-on', +el.getAttribute('data-s') === stackIdx);
      });
      highlightFloors();
      const hint = stageEl.querySelector('.stage-hint');
      if (hint) hint.classList.toggle('is-hide', stackIdx > 0);
      if (opts.scroll) {
        const card = stageEl.querySelector('.unit-card[data-s="'+stackIdx+'"]');
        if (card) {
          syncingScroll = true;
          card.scrollIntoView({ behavior: opts.instant ? 'auto' : 'smooth', block: 'start' });
          setTimeout(() => { syncingScroll = false; }, 420);
        }
      }
      if (changed && !opts.skipDetail) {
        renderDetail();
        if (!voiceMuted()) scheduleUnitVoice(stack[stackIdx].u, stack[stackIdx].f);
      }
      try{ updateMobBrokerDock(); }catch(e){}
    }

    function renderFloors(){
      const fl = floors();
      if (!fl.length){
        floorsEl.innerHTML='<div style="padding:8px;color:var(--muted);font-size:11px;text-align:center">нет этажей</div>';
        return;
      }
      if (!floorId || !fl.some(f=>f.id===floorId)) floorId = fl[0].id;
      const segs = floorsByBand();
      floorsEl.innerHTML = segs.map((seg) => {
        return '<div class="floor-seg floor-seg--'+seg.key+'">' +
          seg.rows.map((f) =>
            '<button type="button" class="floor-btn'+(f.id===floorId?' is-on':'')+'" data-f="'+f.id+'" title="'+seg.title+'"><strong>'+f.label+'</strong><span>'+f.rows.length+'</span></button>'
          ).join('') +
        '</div>';
      }).join('');
      floorsEl.querySelectorAll('.floor-btn').forEach(btn=>{
        btn.onclick=()=>{
          const id = btn.getAttribute('data-f');
          const idx = stack.findIndex((s) => s.f.id === id);
          if (idx >= 0) selectStack(idx, { scroll: true });
        };
      });
    }

    function unitCardHtml(item, sIdx){
      const u = item.u, f = item.f;
      const photos=(u.photos&&u.photos.length?u.photos:(u.photo?[u.photo]:[])).slice(0,24);
      return '<article class="unit-card'+(sIdx===stackIdx?' is-on':'')+'" data-s="'+sIdx+'" data-f="'+f.id+'">' +
        '<div class="stage-meta">' +
          '<span class="floor-pill">Floor '+f.label+'</span>' +
          '<h2>'+(u.rooms||'')+' BR'+(u.unit_number?' · #'+u.unit_number:'')+(u.is_view?' · VIEW':'')+'</h2>' +
          '<div class="price">'+fmtP(u.price,tab)+'</div>' +
          unitParamsHtml(u) +
          '<div class="unit-quick-actions">' +
            cheaperBtnHtml(u, sIdx) +
            '<button type="button" class="unit-details-btn" data-s="'+sIdx+'" aria-label="Unit details">Unit details</button>' +
          '</div>' +
        '</div>' +
        (photos.length
          ? '<div class="photos-grid">' +
              '<div class="photos-row">' +
                '<div class="photos-main">' +
                  '<img src="'+photoSize(photos[0],'hero')+'" alt="" loading="'+(sIdx<3?'eager':'lazy')+'" decoding="async" data-main="1" />' +
                  (photos.length>1?'<span class="photos-count">1 / '+photos.length+'</span>':'') +
                '</div>' +
                pluginCtaHtml(u) +
              '</div>' +
              (photos.length>1
                ? '<div class="photos-thumbs">' +
                    photos.map((ph,i)=>'<img src="'+photoSize(ph,'thumb')+'" alt="" loading="lazy" decoding="async" data-i="'+i+'" data-full="'+photoSize(ph,'hero')+'" class="'+(i===0?'is-on':'')+'" />').join('') +
                  '</div>'
                : '') +
            '</div>'
          : '<div class="photos-grid"><div class="photos-row"><div class="stage-empty" style="min-height:160px">Нет фото</div>'+pluginCtaHtml(u)+'</div></div>') +
        swipeChatWrapHtml(u, { kind:'card', sIdx:sIdx }) +
      '</article>';
    }

    function renderStage(){
      rebuildStack();
      if (!stack.length){
        stageEl.innerHTML='<div class="stage-empty">Нет лотов под фильтр</div>';
        return;
      }
      // restore index from floor/unit if possible
      const found = stack.findIndex((s) => s.f.id === floorId && s.unitIdx === unitIdx);
      stackIdx = found >= 0 ? found : 0;
      floorId = stack[stackIdx].f.id;
      unitIdx = stack[stackIdx].unitIdx;

      if (feedObserver) { feedObserver.disconnect(); feedObserver = null; }

      stageEl.innerHTML =
        '<div class="stage-hint'+(stackIdx>0?' is-hide':'')+'">↓ скролл — следующий этаж вниз</div>' +
        '<div class="stage-feed" id="stage-feed">' +
          stack.map((item, i) => unitCardHtml(item, i)).join('') +
        '</div>';

      const feed = stageEl.querySelector('#stage-feed');
      stageEl.querySelectorAll('.unit-card').forEach((card) => {
        const thumbs = card.querySelector('.photos-thumbs');
        const main = card.querySelector('img[data-main]');
        const countEl = card.querySelector('.photos-count');
        if (thumbs && main) {
          let lastThumbI = 0;
          function setMainFromThumb(img, { playSound } = {}) {
            const i = +img.getAttribute('data-i');
            if (img.classList.contains('is-on')) return;
            main.src = img.getAttribute('data-full') || img.src;
            if (countEl) countEl.textContent = (i + 1) + ' / ' + thumbs.querySelectorAll('img').length;
            thumbs.querySelectorAll('img').forEach((el) => el.classList.toggle('is-on', el === img));
            if (playSound) playScrollSound(i > lastThumbI ? 1 : -1);
            lastThumbI = i;
          }
          thumbs.addEventListener('click', (e) => {
            const img = e.target.closest('img[data-i]');
            if (!img) return;
            setMainFromThumb(img, { playSound: false });
          });
          /* Hover (mouse only) — swap main image + tick; touch keeps click/tap */
          thumbs.querySelectorAll('img[data-i]').forEach((img) => {
            img.addEventListener('pointerenter', (e) => {
              if (e.pointerType && e.pointerType !== 'mouse') return;
              setMainFromThumb(img, { playSound: true });
            });
          });
        }
        const detailsBtn = card.querySelector('.unit-details-btn');
        if (detailsBtn) {
          detailsBtn.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();
            const i = +detailsBtn.getAttribute('data-s');
            openUnitDetails(Number.isFinite(i) ? i : stackIdx);
          };
        }
        const cheaperBtn = card.querySelector('.unit-cheaper-btn:not([disabled])');
        if (cheaperBtn) {
          cheaperBtn.onclick = function(e){
            e.preventDefault();
            e.stopPropagation();
            const from = +cheaperBtn.getAttribute('data-s');
            const to = +cheaperBtn.getAttribute('data-to');
            if (Number.isFinite(to)) selectStack(to, { scroll:true });
            else jumpToCheaper(Number.isFinite(from) ? from : stackIdx);
          };
        }
      });

      feedObserver = new IntersectionObserver((entries) => {
        if (syncingScroll) return;
        unlockAudio();
        let best = null, bestRatio = 0;
        entries.forEach((en) => {
          if (en.isIntersecting && en.intersectionRatio > bestRatio) {
            bestRatio = en.intersectionRatio;
            best = en.target;
          }
        });
        if (!best || bestRatio < 0.45) return;
        const i = +best.getAttribute('data-s');
        if (Number.isFinite(i) && i !== stackIdx) selectStack(i, { skipDetail: false });
      }, { root: feed, threshold: [0.45, 0.6, 0.75] });

      stageEl.querySelectorAll('.unit-card').forEach((card) => feedObserver.observe(card));

      // jump to current without animation on first paint
      const card = stageEl.querySelector('.unit-card[data-s="'+stackIdx+'"]');
      if (card) {
        syncingScroll = true;
        card.scrollIntoView({ behavior: 'auto', block: 'start' });
        requestAnimationFrame(() => { syncingScroll = false; });
      }
      bindAllSwipeChats(stageEl);
    }
    function fmPx(n){
      if(n==null||!Number.isFinite(Number(n))) return '—';
      const v=Number(n);
      return v>=1e6?(v/1e6).toFixed(2)+'M':Math.round(v).toLocaleString('en-US');
    }
    function unitChangePct(u){
      if(u.price_change_pct!=null&&Number.isFinite(Number(u.price_change_pct))) return Number(u.price_change_pct);
      const d=u.signal&&u.signal.delta_pct;
      return d!=null&&Number.isFinite(Number(d))?Number(d):0;
    }
    /** Palm Beach floors: ad_history; building-page: signal.steps / timeline */
    function priceHistoryPoints(u){
      const out=[];
      const pushPt=function(day, price, agency, source, active){
        if(price==null||!Number.isFinite(Number(price))||Number(price)<=0) return;
        const d=String(day||'').slice(0,10);
        if(!d) return;
        const last=out[out.length-1];
        if(last && last.day===d && Number(last.price)===Number(price)){
          if(agency && agency!=='Unknown' && agency!=='—') last.agency=agency;
          return;
        }
        out.push({day:d, price:Number(price), agency:agency||'', source:source||'', active:!!active});
      };
      const hist=(u && u.ad_history)||[];
      if(hist.length){
        hist.slice().sort(function(a,b){ return String(a.day).localeCompare(String(b.day)); }).forEach(function(h){
          pushPt(h.day, h.price, h.agency, h.source, h.active);
        });
        return out;
      }
      const s=u&&u.signal;
      const src=(s&&s.steps&&s.steps.length)?s.steps:(s&&s.timeline)||[];
      src.slice().sort(function(a,b){ return String(a.d||a.day||'').localeCompare(String(b.d||b.day||'')); }).forEach(function(t){
        let agency=t.agency||'';
        if(!agency||agency==='—'||agency==='transaction'){
          agency=(t.broker&&t.broker!=='—'&&t.broker!=='original')?t.broker:'';
        }
        pushPt(t.d||t.day, t.p!=null?t.p:t.price, agency, t.source, false);
      });
      const ask=Number(u&&u.price);
      if(Number.isFinite(ask)&&ask>0){
        const last=out[out.length-1];
        if(!last||Math.abs(last.price-ask)>500){
          const day=last&&last.day?last.day:(new Date().toISOString().slice(0,10));
          pushPt(day, ask, '', 'ask', true);
        }
      }
      return out;
    }
    function priceHistoryHtml(u){
      const pts=priceHistoryPoints(u);
      if(pts.length<1) return '';
      const first=pts[0].price;
      const last=pts[pts.length-1].price;
      const totalAbs=last-first;
      const totalPct=first?Math.round((last-first)/first*1000)/10:0;
      const changed=Math.abs(totalPct)>=0.5 || Math.abs(unitChangePct(u))>=0.5;
      if(pts.length<2 && !changed) return '';

      const prices=pts.map(function(p){ return p.price; });
      let ymin=Math.min.apply(null, prices), ymax=Math.max.apply(null, prices);
      ymin=Math.min(ymin, first); ymax=Math.max(ymax, first);
      if(ymax<=ymin){ ymin=ymin*0.97; ymax=ymax*1.03; }
      const pad=(ymax-ymin)*0.16; ymin-=pad; ymax+=pad;
      const W=320, H=124, L=38, R=12, T=16, B=24;
      const iw=W-L-R, ih=H-T-B;
      const t0=Date.parse(pts[0].day), t1=Date.parse(pts[pts.length-1].day);
      const span=Math.max(864e5, (t1||0)-(t0||0));
      const xAt=function(day){
        const t=Date.parse(day);
        if(Number.isNaN(t)||Number.isNaN(t0)) return L;
        return L+((t-t0)/span)*iw;
      };
      const yAt=function(p){ return T+ih-((p-ymin)/(ymax-ymin||1))*ih; };
      const down=totalPct< -0.5, up=totalPct>0.5;
      const stroke=down?'#f87171':(up?'#4ade80':'#38bdf8');
      const uid=String(u.permit_number||u.permit||u.unit_number||'x').replace(/[^a-zA-Z0-9]/g,'_');
      const fillId='pxFill_'+uid;
      const deltaId='pxDelta_'+uid;

      const coords=pts.map(function(p){ return {x:xAt(p.day), y:yAt(p.price), price:p.price, day:p.day}; });
      function smoothLine(cs){
        if(!cs.length) return '';
        if(cs.length===1) return 'M'+cs[0].x.toFixed(1)+' '+cs[0].y.toFixed(1);
        if(cs.length===2) return 'M'+cs[0].x.toFixed(1)+' '+cs[0].y.toFixed(1)+' L'+cs[1].x.toFixed(1)+' '+cs[1].y.toFixed(1);
        let d='M'+cs[0].x.toFixed(1)+' '+cs[0].y.toFixed(1);
        for(let i=0;i<cs.length-1;i++){
          const p0=cs[i===0?i:i-1], p1=cs[i], p2=cs[i+1], p3=cs[i+2]||p2;
          const cp1x=p1.x+(p2.x-p0.x)/6;
          const cp1y=p1.y+(p2.y-p0.y)/6;
          const cp2x=p2.x-(p3.x-p1.x)/6;
          const cp2y=p2.y-(p3.y-p1.y)/6;
          d+=' C'+cp1x.toFixed(1)+' '+cp1y.toFixed(1)+' '+cp2x.toFixed(1)+' '+cp2y.toFixed(1)+' '+p2.x.toFixed(1)+' '+p2.y.toFixed(1);
        }
        return d;
      }
      const line=smoothLine(coords);
      const firstX=coords[0].x, lastX=coords[coords.length-1].x;
      const yFirst=yAt(first), yLast=yAt(last);
      const baseY=T+ih;
      const areaUnder=line+' L'+lastX.toFixed(1)+' '+baseY.toFixed(1)+' L'+firstX.toFixed(1)+' '+baseY.toFixed(1)+' Z';
      const deltaBand=line+' L'+lastX.toFixed(1)+' '+yFirst.toFixed(1)+' L'+firstX.toFixed(1)+' '+yFirst.toFixed(1)+' Z';

      const yTicks=[ymin+(ymax-ymin)*0.12, (ymin+ymax)/2, ymax-(ymax-ymin)*0.12];
      const grid=yTicks.map(function(v){
        const yy=yAt(v).toFixed(1);
        return '<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#1e2a38" stroke-width="1"/>'+
          '<text x="'+(L-4)+'" y="'+(Number(yy)+3)+'" fill="#6b7c91" font-size="8" text-anchor="end">'+fmPx(v)+'</text>';
      }).join('');

      const dots=coords.map(function(c,i){
        const on=i===coords.length-1, start=i===0;
        const r=on?4.2:(start?3.4:2.3);
        const fill=on?stroke:(start?'#f5d76e':'#94a3b8');
        return '<circle cx="'+c.x.toFixed(1)+'" cy="'+c.y.toFixed(1)+'" r="'+r+'" fill="'+fill+'" stroke="#0a0e14" stroke-width="1.2"><title>'+c.day+' · '+fmPx(c.price)+'</title></circle>';
      }).join('');

      const midX=((firstX+lastX)/2);
      const midY=((yFirst+yLast)/2);
      const callout = Math.abs(totalAbs)>=1
        ? ('<rect x="'+(midX-36).toFixed(1)+'" y="'+(midY-10).toFixed(1)+'" width="72" height="18" rx="6" fill="'+(down?'#450a0a':(up?'#052e16':'#0c4a6e'))+'" stroke="'+stroke+'" stroke-width="1" opacity="0.95"/>'+
           '<text x="'+midX.toFixed(1)+'" y="'+(midY+3).toFixed(1)+'" fill="'+stroke+'" font-size="9" font-weight="800" text-anchor="middle">'+(down?'↓ ':up?'↑ ':'')+fmPx(Math.abs(totalAbs))+'</text>')
        : '';

      const steps=[];
      pts.forEach(function(p,i){
        if(i===0) return;
        const prev=pts[i-1];
        if(Number(prev.price)===Number(p.price)) return;
        const delta=p.price-prev.price;
        const pctStep=prev.price?Math.round(delta/prev.price*1000)/10:null;
        const fromFirst=first?Math.round((p.price-first)/first*1000)/10:null;
        steps.push({day:p.day, price:p.price, prev:prev.price, agency:p.agency, delta:delta, pct:pctStep, fromFirst:fromFirst});
      });
      const stepsDesc=steps.slice().reverse();

      const cls=Math.abs(totalPct)<0.5?'flat':(totalPct<0?'down':'up');
      const arrow=totalPct< -0.5?'↓':(totalPct>0.5?'↑':'→');
      const kpi=
        '<div class="px-kpi">'+
          '<div><div class="lbl">от первоначальной</div><div class="path">'+fmPx(first)+' → '+fmPx(last)+'</div></div>'+
          '<div><div class="big '+cls+'">'+arrow+' '+Math.abs(totalPct)+'%</div><span class="sub">итог vs старт</span></div>'+
        '</div>'+
        '<div class="px-delta '+cls+'">'+
          '<span class="px-delta-k">Итоговая разница</span>'+
          '<span class="px-delta-v">'+arrow+' '+fmPx(Math.abs(totalAbs))+' AED <em>('+(totalPct>0?'+':'')+totalPct+'%)</em></span>'+
        '</div>';

      const chart=
        '<div class="px-chart-wrap"><svg class="px-chart" viewBox="0 0 '+W+' '+H+'" width="100%" height="124" preserveAspectRatio="xMidYMid meet">'+
          '<defs>'+
            '<linearGradient id="'+fillId+'" x1="0" y1="0" x2="0" y2="1">'+
              '<stop offset="0%" stop-color="'+stroke+'" stop-opacity="0.18"/>'+
              '<stop offset="100%" stop-color="'+stroke+'" stop-opacity="0.01"/>'+
            '</linearGradient>'+
            '<linearGradient id="'+deltaId+'" x1="0" y1="0" x2="0" y2="1">'+
              '<stop offset="0%" stop-color="'+stroke+'" stop-opacity="'+(down||up?'0.55':'0.25')+'"/>'+
              '<stop offset="100%" stop-color="'+stroke+'" stop-opacity="'+(down||up?'0.12':'0.05')+'"/>'+
            '</linearGradient>'+
          '</defs>'+
          grid+
          '<path d="'+areaUnder+'" fill="url(#'+fillId+')"/>'+
          '<path d="'+deltaBand+'" fill="url(#'+deltaId+')" stroke="'+stroke+'" stroke-opacity="0.35" stroke-width="0.5"/>'+
          '<line x1="'+firstX.toFixed(1)+'" y1="'+yFirst.toFixed(1)+'" x2="'+lastX.toFixed(1)+'" y2="'+yFirst.toFixed(1)+'" stroke="'+stroke+'" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7"/>'+
          '<path d="'+line+'" fill="none" stroke="'+stroke+'" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>'+
          dots+callout+
          '<text x="'+L+'" y="'+(H-5)+'" fill="#7b8ea3" font-size="8">'+(pts[0].day||'').slice(2)+'</text>'+
          '<text x="'+(W-R)+'" y="'+(H-5)+'" fill="#7b8ea3" font-size="8" text-anchor="end">'+(pts[pts.length-1].day||'').slice(2)+'</text>'+
        '</svg></div>';

      const stepHtml=stepsDesc.map(function(s, idx){
        const c=s.delta<0?'down':(s.delta>0?'up':'same');
        const delta='<span class="delta '+c+'">'+(s.delta<0?'↓':'↑')+fmPx(Math.abs(s.delta))+(s.pct!=null?(' · '+(s.pct>0?'+':'')+s.pct+'%'):'')+'</span>';
        const vs0=(s.fromFirst!=null)?(' · vs старт '+(s.fromFirst>0?'+':'')+s.fromFirst+'%'):'';
        return '<div class="px-step'+(idx===0?' is-first':'')+'">'+
          '<span class="d">'+(s.day||'').slice(2)+'</span>'+
          '<div><div class="p">'+fmPx(s.price)+'</div><div class="from">'+fmPx(s.prev)+' → '+fmPx(s.price)+vs0+'</div></div>'+
          delta+
          (s.agency && s.agency!=='Unknown'?'<span class="ag">'+String(s.agency).replace(/</g,'')+'</span>':'')+
        '</div>';
      }).join('')||'<div class="px-step"><span class="d">—</span><div class="p">нет смен цены</div></div>';

      return '<div class="px-box">'+kpi+chart+
        '<div class="px-steps-h"><b>Изменения цены</b><span>новые сверху · обратная хронология</span></div>'+
        '<div class="px-steps">'+stepHtml+'</div>'+
      '</div>';
    }
    function srcTag(s){
      s=String(s||'');
      if(!s) return '—';
      return s.replace('property_finder','PF').replace('bayut','Bayut').replace('dld','DLD').replace('transaction','DLD');
    }
    function priceMovementHtml(u){
      const pts=priceHistoryPoints(u);
      const flat=Math.abs(unitChangePct(u))<0.5;
      const hasHist=pts.length>1;
      if(!pts.length){
        return '<div class="px-flat">Нет точек цены</div>';
      }
      if(flat && !hasHist){
        return '<div class="px-flat">без изменений</div>';
      }
      const body=priceHistoryHtml(u);
      if(!body){
        return '<div class="px-flat">без изменений</div>';
      }
      let head='';
      if(pts.length>=2){
        const first=pts[0].price, last=pts[pts.length-1].price;
        const pct=first?Math.round((last-first)/first*1000)/10:0;
        head='<div style="margin-bottom:.15rem;font-size:.72rem;color:var(--muted)">динамика ask · '+(pct<0?'падение':'рост')+' от старта</div>';
      }
      return head+body;
    }
    function listingHistoryHtml(u){
      const s=u.signal;
      const listers=(s&&s.listers||[]).slice(0,10);
      const events=(s&&(s.events&&s.events.length?s.events:s.steps)||[]).slice(0,14);
      if(!listers.length && !events.length){
        return '<div class="sig-sec"><h3>Listing history</h3><p class="sig-empty">Нет истории размещений</p></div>';
      }
      const nAg=listers.length || new Set(events.map(e=>(e.agency||'') )).size;
      let body='';
      if(listers.length){
        body='<table class="htable"><thead><tr><th>Agency</th><th>Src</th><th>Price</th><th>First</th><th>Last</th></tr></thead><tbody>' +
          listers.map(L=>{
            const priceTxt=(L.min==null&&L.max==null)?'—':(L.min===L.max?fmtP(L.min,tab):fmtP(L.min,tab)+'–'+fmtP(L.max,tab));
            return '<tr><td><b>'+shortA(L.agency||'—')+'</b><div class="muted">'+(L.broker&&L.broker!=='—'?L.broker:'')+'</div></td>' +
              '<td>'+(L.sources||[]).map(src=>'<span class="src">'+srcTag(src)+'</span>').join(' ')+'</td>' +
              '<td class="amt">'+priceTxt+'</td>' +
              '<td class="muted">'+(L.from||'')+'</td>' +
              '<td class="muted">'+(L.to||'')+'</td></tr>';
          }).join('') +
          '</tbody></table>';
      } else {
        body='<table class="htable"><thead><tr><th>Date</th><th>Broker / agency</th><th>Src</th><th>Price</th></tr></thead><tbody>' +
          events.map(t=>
            '<tr><td class="muted">'+(t.d||'')+'</td><td><b>'+(t.broker&&t.broker!=='—'?t.broker:'—')+'</b>'+(t.agency&&t.agency!=='—'?' · '+shortA(t.agency):'')+'</td><td><span class="src">'+srcTag(t.source)+'</span></td><td class="amt">'+fmtP(t.p,tab)+'</td></tr>'
          ).join('') +
          '</tbody></table>';
      }
      return '<div class="sig-sec"><h3>Listing history<span class="delta">'+nAg+' agencies</span></h3>'+body+'</div>';
    }
    function unitLabel(u,f){
      return (u.rooms||'')+' BR'+(u.unit_number?' · #'+u.unit_number:'')+' · Fl. '+f.label;
    }
    function unitKey(u){
      return String(u.permit_number||u.url||(u.unit_number+'|'+u.price)||Math.random());
    }
    function viewRank(u){
      const b=String(u.view_band||'');
      if(['marina','sea','water','panoramic','palm'].includes(b)) return 3;
      if(u.is_view) return 2;
      if(b && b!=='none' && b!=='unknown') return 1;
      return 0;
    }
    function bandRank(band){
      return band==='high'?2:band==='mid'?1:0;
    }
    function viewLabel(u){
      if(u.view && u.view!=='No view') return u.view;
      return u.is_view ? 'View' : 'No view';
    }
    /**
     * Sell-my-home cheaper (cvh_1br_floors_sell_my_home.html → cheaperInSegment):
     * same rooms + same floor_segment (high/mid/low) · compare by ask AED only.
     * Step to closest cheaper ask; at segment min → STOP (no ladder to lower floors).
     */
    function fmSaveAed(n){
      if(n==null||!Number.isFinite(Number(n))) return '—';
      return Math.round(Number(n)).toLocaleString('ru-RU');
    }
    function nextCheaperStackIdx(fromIdx){
      const cur=stack[fromIdx];
      if(!cur) return { idx:-1, saveAed:null, end:true };
      const rooms=String(cur.u.rooms||'');
      const price=Number(cur.u.price);
      const band=floorBand(cur.u.floor);
      const myKey=unitKey(cur.u);
      if(!rooms || !Number.isFinite(price) || price<=0) return { idx:-1, saveAed:null, end:true };
      // same as cheaperInSegment: same band, ask < current, pick closest cheaper (max ask among cheaper)
      const list=stack.map(function(s,i){
        return { i:i, u:s.u, price:Number(s.u.price), rooms:String(s.u.rooms||''), band:floorBand(s.u.floor) };
      }).filter(function(s){
        return s.rooms===rooms
          && s.band===band
          && unitKey(s.u)!==myKey
          && Number.isFinite(s.price) && s.price>0
          && s.price<price;
      });
      if(!list.length) return { idx:-1, saveAed:null, end:true };
      list.sort(function(a,b){ return b.price-a.price; });
      const t=list[0];
      return { idx:t.i, saveAed:Math.round(price-t.price), end:false };
    }
    function cheapestInSegmentMark(u){
      const rooms=roomsLabelOf(u&&u.rooms);
      const band=floorBand(u&&u.floor);
      const segEn=band==='high'?'high floor':(band==='mid'?'mid floor':'low floor');
      return 'Самый дешёвый '+rooms+' в сегменте '+segEn+' по цене за юнит';
    }
    function cheaperBtnHtml(u, sIdx){
      const n=nextCheaperStackIdx(sIdx);
      if(n.end || n.idx<0){
        const mark=cheapestInSegmentMark(u);
        return '<button type="button" class="unit-cheaper-btn is-end" data-s="'+sIdx+'" disabled title="'+mark+'">'+mark+'</button>';
      }
      const rooms=roomsLabelOf(u.rooms);
      const saveTxt=fmSaveAed(n.saveAed);
      const label='Есть дешевле по '+rooms+' на <b>'+saveTxt+' AED</b>';
      const tip='Sell-my-home · тот же floor_segment · '+rooms+' · клик → следующий дешевле';
      return '<button type="button" class="unit-cheaper-btn" data-s="'+sIdx+'" data-to="'+n.idx+'" title="'+tip+'">'+label+'</button>';
    }
    function jumpToCheaper(fromIdx){
      const base=fromIdx!=null?fromIdx:stackIdx;
      const n=nextCheaperStackIdx(base);
      if(n.idx<0){
        try{ playScrollSound(-1); }catch(e){}
        return false;
      }
      selectStack(n.idx, { scroll:true });
      return true;
    }

    function findCheaperAlts(u){
      const rooms=String(u.rooms||'');
      const price=Number(u.price);
      if(!rooms || !Number.isFinite(price) || price<=0) return { strict:[], soft:[] };
      const myBand=floorBand(u.floor);
      const myKey=unitKey(u);
      // sell-my-home: same floor_segment + same rooms + cheaper ask only
      const strict=stack
        .map((s,i)=>({u:s.u,f:s.f,sIdx:i}))
        .filter((s)=>unitKey(s.u)!==myKey && String(s.u.rooms||'')===rooms && floorBand(s.u.floor)===myBand && Number(s.u.price)>0 && Number(s.u.price)<price)
        .sort((a,b)=>Number(b.u.price)-Number(a.u.price))
        .slice(0,3);
      return { strict, soft:[] };
    }

    /** CVH sell-my-home: all cheaper asks in same rooms + floor_segment */
    function cheaperInSegmentAll(u){
      const rooms=String(u.rooms||'');
      const price=Number(u.price);
      const band=floorBand(u.floor);
      const myKey=unitKey(u);
      if(!rooms || !Number.isFinite(price) || price<=0) return [];
      return stack
        .map(function(s,i){ return { u:s.u, f:s.f, sIdx:i, price:Number(s.u.price) }; })
        .filter(function(s){
          return unitKey(s.u)!==myKey
            && String(s.u.rooms||'')===rooms
            && floorBand(s.u.floor)===band
            && Number.isFinite(s.price) && s.price>0
            && s.price<price;
        })
        .map(function(s){
          s._saveAed=Math.round(price-s.price);
          return s;
        })
        .sort(function(a,b){ return b._saveAed-a._saveAed; });
    }
    function segmentPeers(u){
      const rooms=String(u.rooms||'');
      const band=floorBand(u.floor);
      return stack.filter(function(s){
        return String(s.u.rooms||'')===rooms && floorBand(s.u.floor)===band && Number(s.u.price)>0;
      });
    }
    function buildSegmentMetricChart(u, metric){
      const peers=segmentPeers(u);
      const val=function(x){
        if(metric==='pps'){
          const p=Number(x.pps);
          if(Number.isFinite(p)&&p>0) return p;
          const pr=Number(x.price), a=Number(x.area_sqft);
          if(Number.isFinite(pr)&&pr>0&&Number.isFinite(a)&&a>0) return pr/a;
          return null;
        }
        const p=Number(x.price);
        return Number.isFinite(p)&&p>0?p:null;
      };
      const curY=val(u);
      if(curY==null) return '';
      const cheapSet=new Set(cheaperInSegmentAll(u).map(function(x){ return unitKey(x.u); }));
      const units=peers.map(function(s){ return s.u; }).filter(function(x){ return val(x)!=null; });
      if(units.length<2) return '';
      const W=360,H=160,pad={l:42,r:10,t:22,b:24};
      const xs=units.map(function(x){ return Number(x.floor)||0; });
      const ys=units.map(val);
      let xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
      let ymin=Math.min.apply(null,ys), ymax=Math.max.apply(null,ys);
      if(xmax<=xmin){ xmin-=1; xmax+=1; }
      const py=(ymax-ymin)*0.14||ymax*0.05; ymin=Math.max(0,ymin-py); ymax=ymax+py;
      const x=function(f){ return pad.l+((f-xmin)/(xmax-xmin||1))*(W-pad.l-pad.r); };
      const y=function(v){ return pad.t+(H-pad.t-pad.b)-((v-ymin)/(ymax-ymin||1))*(H-pad.t-pad.b); };
      const fmtAxis=function(v){
        if(metric==='pps') return Math.round(v).toLocaleString('en-US');
        if(v>=1e6) return (v/1e6).toFixed(2)+'M';
        return Math.round(v/1000)+'k';
      };
      let grid='';
      for(let k=0;k<=3;k++){
        const vv=ymin+(ymax-ymin)*k/3; const yy=y(vv);
        grid+='<line x1="'+pad.l+'" y1="'+yy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+yy.toFixed(1)+'" stroke="#1e2a38"/>'+
          '<text x="'+(pad.l-4)+'" y="'+(yy+3).toFixed(1)+'" fill="#6b7c91" font-size="8" text-anchor="end">'+fmtAxis(vv)+'</text>';
      }
      const uniqF=[].concat(xs).filter(function(v,i,a){ return a.indexOf(v)===i; }).sort(function(a,b){ return a-b; });
      const step=Math.max(1, Math.ceil(uniqF.length/6));
      let xlab='';
      uniqF.forEach(function(f,i){
        if(i%step && i && i!==uniqF.length-1) return;
        xlab+='<text x="'+x(f).toFixed(1)+'" y="'+(H-6)+'" fill="#6b7c91" font-size="8" text-anchor="middle">'+f+'</text>';
      });
      const dots=units.map(function(uu){
        const on=unitKey(uu)===unitKey(u);
        const ch=cheapSet.has(unitKey(uu));
        const r=on?5:(ch?3.2:2.2);
        const fill=on?'#38bdf8':(ch?'#fbbf24':'#f0a0a0');
        const op=on||ch?'1':'.55';
        return '<circle cx="'+x(Number(uu.floor)||0).toFixed(1)+'" cy="'+y(val(uu)).toFixed(1)+'" r="'+r+'" fill="'+fill+'" opacity="'+op+'" stroke="#0a1218" stroke-width="'+(on?1.2:0.5)+'"/>';
      }).join('');
      const cx=x(Number(u.floor)||0), cy=y(curY);
      const marker='<line x1="'+cx.toFixed(1)+'" y1="'+pad.t+'" x2="'+cx.toFixed(1)+'" y2="'+(pad.t+(H-pad.t-pad.b))+'" stroke="rgba(56,189,248,.35)" stroke-dasharray="3 3"/>'+
        '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="7" fill="none" stroke="#38bdf8" stroke-width="2"/>'+
        '<text x="'+cx.toFixed(1)+'" y="'+(cy-10).toFixed(1)+'" fill="#38bdf8" font-size="10" font-weight="800" text-anchor="middle">'+(u.unit_number||'unit')+' · '+fmtAxis(curY)+'</text>';
      const title=metric==='pps'?'AED / sqft · сегмент этажей':'Цена за объект · AED';
      return '<div class="ux-chart-wrap"><div class="ux-chart-l">'+title+'</div>'+
        '<svg viewBox="0 0 '+W+' '+H+'" width="100%" xmlns="http://www.w3.org/2000/svg">'+
        grid+dots+marker+xlab+'</svg></div>';
    }
    function unitKpiMeta(u,f){
      const band=floorBand(u.floor);
      const bandRu=band==='high'?'высокие':(band==='mid'?'средние':'нижние');
      const rooms=roomsLabelOf(u.rooms);
      const mo=marketOfferFor(u);
      const face=dealFace(u);
      const cheap=cheaperInSegmentAll(u);
      const best=cheap[0];
      const pvm=u.pvm_pct!=null&&Number.isFinite(Number(u.pvm_pct))?Number(u.pvm_pct):null;
      const pvs=u.pvs_pct!=null&&Number.isFinite(Number(u.pvs_pct))?Number(u.pvs_pct):null;
      const vs=pvm!=null?pvm:pvs;
      let verd='Ask около рынка';
      let verdCls='warn';
      if(vs!=null){
        if(vs>=8){ verd='Ask выше рынка — риск долгой продажи'; verdCls='bad'; }
        else if(vs<=-5){ verd='Ask выглядит конкурентно'; verdCls='ok'; }
        else { verd='Ask около медианы / fair'; verdCls='warn'; }
      } else if(face && face.tone==='over'){ verd=face.shortLabel||verd; verdCls='bad'; }
      else if(face && face.tone==='under'){ verd=face.shortLabel||verd; verdCls='ok'; }
      const pctCell=function(v){
        if(v==null) return '<span class="v">—</span>';
        const cls=v>=8?'bad':(v<=-5?'good':'sand');
        return '<span class="v '+cls+'">'+(v>0?'+':'')+v+'%</span>';
      };
      const area=u.area_sqft!=null?Math.round(Number(u.area_sqft)).toLocaleString('en-US')+' sqft':'—';
      const exp=u.exp!=null?u.exp:(u.exposure_days!=null?u.exposure_days:null);
      const bestTxt=cheap.length?'нет':'да';
      const bestHint=cheap.length?(' · '+cheap.length+' лучше · до −'+fmSaveAed(best._saveAed)):'';
      const kv=
        '<div class="ux-kv">'+
          '<div><div class="l">Ask</div><div class="v sand">'+fmtP(u.price,tab)+'</div></div>'+
          '<div><div class="l">AED/sqft</div><div class="v">'+(u.pps!=null?Math.round(u.pps).toLocaleString('en-US'):'—')+'</div></div>'+
          '<div><div class="l">Vs market</div>'+pctCell(pvm)+'</div>'+
          '<div><div class="l">Vs similar</div>'+pctCell(pvs)+'</div>'+
          '<div><div class="l">Fair / offer</div><div class="v good">'+(mo&&mo.offer!=null?fmtP(mo.offer,tab):'—')+'</div></div>'+
          '<div><div class="l">Сегмент</div><div class="v">'+rooms+' · '+bandRu+'</div></div>'+
          '<div><div class="l">Area</div><div class="v">'+area+'</div></div>'+
          '<div><div class="l">Exposure</div><div class="v">'+(exp!=null?(exp+'d'):'—')+'</div></div>'+
          '<div class="ux-kv-best"><div class="l">Лучший в сегменте</div><div class="v">'+(bestTxt+bestHint)+'</div></div>'+
        '</div>';
      return { band, bandRu, rooms, mo, face, cheap, best, pvm, pvs, verd, verdCls, area, exp, kv };
    }
    function unitKpiPanelHtml(u,f){
      const m=unitKpiMeta(u,f);
      return '<div class="ux-anal ux-anal--kpi" id="uxAnal">' +
        '<div class="ux-anal-head">' +
          '<span class="ux-badge '+m.verdCls+'">'+m.verd+'</span>' +
        '</div>' +
        m.kv +
      '</div>';
    }
    function unitValuationFullHtml(u,f){
      const m=unitKpiMeta(u,f);
      const charts=buildSegmentMetricChart(u,'pps')+buildSegmentMetricChart(u,'price');
      const cheapRows=m.cheap.slice(0,10).map(function(x){
        return '<tr>'+
          '<td><button type="button" class="ux-jump" data-s="'+x.sIdx+'">#'+(x.u.unit_number||'—')+'</button></td>'+
          '<td>fl.'+(x.u.floor!=null?x.u.floor:(x.f&&x.f.label)||'—')+'</td>'+
          '<td>'+fmtP(x.u.price,tab)+'</td>'+
          '<td>'+(x.u.pps!=null?Math.round(x.u.pps).toLocaleString('en-US'):'—')+'</td>'+
          '<td class="save">−'+fmSaveAed(x._saveAed)+'</td>'+
          '<td>'+(x.u.exp!=null?x.u.exp:(x.u.exposure_days!=null?x.u.exposure_days:'—'))+'</td>'+
        '</tr>';
      }).join('') || '<tr><td colspan="6">Лучший в сегменте — выгоднее в этом floor segment нет</td></tr>';
      const pts=priceHistoryPoints(u);
      const histRows=pts.length
        ? pts.slice().reverse().slice(0,16).map(function(h){
            return '<tr><td>'+(h.day||'')+'</td><td>'+fmtP(h.price,tab)+'</td><td>'+String(h.agency||'—').replace(/</g,'')+'</td><td>'+srcTag(h.source)+'</td><td>'+(h.active?'active':'')+'</td></tr>';
          }).join('')
        : '<tr><td colspan="5">Нет точек истории · exposure '+(m.exp!=null?m.exp:'—')+'d</td></tr>';
      return '<div class="ux-anal ux-anal--full">' +
        '<div class="ux-anal-head"><span class="ux-badge '+m.verdCls+'">'+m.verd+'</span></div>' +
        m.kv +
        (charts
          ? ('<div class="ux-anal-sec"><h3>Графики · AED/sqft и цена</h3>'+charts+
             '<p class="ux-anal-note">Жёлтые — лучше по цене в сегменте · синий — выбранный</p></div>')
          : '') +
        '<div class="ux-anal-sec"><h3>Лучший в сегменте · '+m.bandRu+' <span>('+m.cheap.length+')</span></h3>' +
          '<table class="ux-table"><thead><tr><th>Unit</th><th>Floor</th><th>Ask</th><th>AED/sqft</th><th>Save</th><th>Exp</th></tr></thead><tbody>'+cheapRows+'</tbody></table>' +
        '</div>' +
        '<div class="ux-anal-sec"><h3>История размещения · ask</h3>' +
          '<table class="ux-table"><thead><tr><th>Date</th><th>Ask</th><th>Agency</th><th>Src</th><th></th></tr></thead><tbody>'+histRows+'</tbody></table>' +
        '</div>' +
        '<div class="ux-anal-sec"><h3>Listing history · agencies</h3>'+listingHistoryHtml(u)+'</div>' +
      '</div>';
    }
    function unitCostAnalysisHtml(u,f){
      return unitKpiPanelHtml(u,f);
    }

    function recommendHtml(u){
      const rooms=roomsLabelOf(u.rooms);
      const band=floorBand(u.floor);
      const bandRu=band==='high'?'высокие':band==='mid'?'средние':'нижние';
      const {strict}=findCheaperAlts(u);
      const rows=strict;
      if(!rows.length){
        return '<div class="reco"><div class="reco-h">Рекомендатор</div>' +
          '<p class="reco-empty">'+cheapestInSegmentMark(u)+'</p></div>';
      }
      const head='Лучший в сегменте · '+rooms+' · сегмент '+bandRu+' (floor_segment)';
      return '<div class="reco"><div class="reco-h">Рекомендатор</div>' +
        '<p class="reco-empty" style="margin-bottom:8px">'+head+'</p>' +
        '<div class="reco-list">' +
        rows.map((s)=>{
          const saveAed=Math.round(Number(u.price)-Number(s.u.price));
          const ph=(s.u.photos&&s.u.photos[0])||s.u.photo||'';
          const vb=floorBand(s.u.floor);
          return '<button type="button" class="reco-item" data-s="'+s.sIdx+'">' +
            (ph?'<img src="'+photoSize(ph,'thumb')+'" alt="" loading="lazy"/>':'<div></div>') +
            '<div><div class="t">'+(s.u.rooms||'')+' BR'+(s.u.unit_number?' · #'+s.u.unit_number:'')+' · Fl '+s.f.label+'</div>' +
            '<div class="m">'+vb+' · '+viewLabel(s.u)+'</div></div>' +
            '<div class="p">'+fmtP(s.u.price,tab)+'<span class="save">−'+fmSaveAed(saveAed)+' AED</span></div>' +
          '</button>';
        }).join('') +
        '</div></div>';
    }
    function monitorStore(){
      try { return JSON.parse(localStorage.getItem('refty_price_watch')||'{}')||{}; }
      catch(e){ return {}; }
    }
    function setMonitor(key, row){
      const m=monitorStore();
      if(row) m[key]=row; else delete m[key];
      localStorage.setItem('refty_price_watch', JSON.stringify(m));
    }
    function dldVsMedPct(kind){
      const rows=((data.pps&&data.pps[kind])||[]).map(p=>Number(p.med_pps)).filter(v=>v>0);
      if(rows.length<2) return null;
      const sorted=rows.slice().sort((a,b)=>a-b);
      const med=sorted[Math.floor(sorted.length/2)];
      const last=rows[rows.length-1];
      if(!med) return null;
      return Math.round(((last-med)/med)*1000)/10;
    }
    function roundOffer(n, isRent){
      if(!Number.isFinite(n)||n<=0) return null;
      if(isRent) return Math.round(n/1000)*1000;
      if(n>=5e6) return Math.round(n/50000)*50000;
      if(n>=1e6) return Math.round(n/10000)*10000;
      return Math.round(n/1000)*1000;
    }
    /** Fair from PvM (priority) + PvS, then DLD drop vs period median */
    function marketOfferFor(u){
      const ask=Number(u.price);
      if(!Number.isFinite(ask)||ask<=0) return null;
      const pvm=Number(u.pvm_pct);
      const pvs=Number(u.pvs_pct);
      const hasM=Number.isFinite(pvm);
      const hasS=Number.isFinite(pvs);
      if(!hasM && !hasS) return null;
      const fairM=hasM ? ask/(1+pvm/100) : null;
      const fairS=hasS ? ask/(1+pvs/100) : null;
      // Priority: price vs market 75% · price vs similar 25% (if both)
      let fair, blend;
      if(hasM && hasS){
        fair=fairM*0.75 + fairS*0.25;
        blend='75% vs market + 25% vs similar';
      } else if(hasM){
        fair=fairM;
        blend='vs market only';
      } else {
        fair=fairS;
        blend='vs similar only (нет vs market)';
      }
      const dldDrop=dldVsMedPct(tab);
      const dropApplied=(dldDrop!=null && dldDrop<0) ? dldDrop : 0;
      const raw=fair*(1+dropApplied/100);
      const isRent=String(tab).includes('rent');
      const offer=roundOffer(raw, isRent);
      const vsAsk=ask? Math.round(((offer-ask)/ask)*1000)/10 : null;
      const series=((data.pps&&data.pps[tab])||[]);
      const lastPps=series.length?Number(series[series.length-1].med_pps):null;
      const sorted=series.map(p=>Number(p.med_pps)).filter(v=>v>0).sort((a,b)=>a-b);
      const medPps=sorted.length?sorted[Math.floor(sorted.length/2)]:null;
      return {
        ask, pvm: hasM?pvm:null, pvs: hasS?pvs:null,
        fairM, fairS, fair, blend,
        offer, vsAsk,
        dldDrop, dropApplied,
        lastPps, medPps, isRent,
      };
    }
    /* --- swipe-to-chat / pre-view sheet --- */
    const B2B_INBOX_BASE='https://b2b.refty.ai/inbox';
    const SWIPE_CTA='Начать чат с брокером';
    const CONTINUE_CTA='Продолжить чат';
    const CHAT_STARTED_KEY='refty_bldg_chat_started_'+String(data.building||'b').replace(/\\W+/g,'_');
    const CHAT_UNREAD_KEY='refty_bldg_chat_unread_'+String(data.building||'b').replace(/\\W+/g,'_');
    const DEMO_INCOMING_TEXT='Брокер: могу показать сегодня после 17:00. Удобно?';
    let chatChecks={};
    let chatCtx={u:null,f:null,threadId:null,brokerJoinUrl:'',key:null,msgs:[],usedStarters:{}};
    let chatSessions={};
    let chatActiveKey=null;
    let chatDismissedKey=null;
    let demoIncomingTimers={};
    function loadStartedChatKeys(){
      try{ const raw=JSON.parse(localStorage.getItem(CHAT_STARTED_KEY)||'[]'); return Array.isArray(raw)?raw:[]; }
      catch(e){ return []; }
    }
    function markChatStarted(key){
      if(!key) return;
      const list=loadStartedChatKeys();
      if(list.indexOf(key)>=0) return;
      list.push(key);
      try{ localStorage.setItem(CHAT_STARTED_KEY, JSON.stringify(list)); }catch(e){}
    }
    function hasChatStarted(key){
      if(!key) return false;
      if(chatSessions[key]) return true;
      return loadStartedChatKeys().indexOf(key)>=0;
    }
    function loadUnreadMap(){
      try{
        const raw=JSON.parse(localStorage.getItem(CHAT_UNREAD_KEY)||'{}');
        return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
      }catch(e){ return {}; }
    }
    function saveUnreadMap(map){
      try{ localStorage.setItem(CHAT_UNREAD_KEY, JSON.stringify(map||{})); }catch(e){}
    }
    function getUnreadCount(key){
      if(!key) return 0;
      const n=Number(loadUnreadMap()[key]||0);
      return Number.isFinite(n)&&n>0?Math.floor(n):0;
    }
    function setUnreadCount(key, n){
      if(!key) return;
      const map=loadUnreadMap();
      map[key]=Math.max(0, Math.floor(Number(n)||0));
      saveUnreadMap(map);
    }
    function addUnread(key, n){
      if(!key) return;
      setUnreadCount(key, getUnreadCount(key)+Math.max(1, Math.floor(Number(n)||1)));
    }
    function clearUnread(key){
      if(!key) return;
      setUnreadCount(key, 0);
    }
    function seedDemoUnreadForStarted(){
      const keys=loadStartedChatKeys();
      if(!keys.length) return;
      const map=loadUnreadMap();
      let changed=false;
      keys.forEach(function(k){
        if(!(k in map)){ map[k]=1; changed=true; }
      });
      if(changed) saveUnreadMap(map);
    }
    function ensureDemoIncomingMsg(sess){
      if(!sess) return;
      if(!Array.isArray(sess.msgs)) sess.msgs=[];
      const hasIncoming=sess.msgs.some(function(m){
        return m&&m.role==='bot'&&String(m.text||'').indexOf('могу показать')>=0;
      });
      if(!hasIncoming){
        sess.msgs.push({ role:'bot', text:DEMO_INCOMING_TEXT });
      }
    }
    function scheduleDemoIncoming(key){
      if(!key) return;
      if(demoIncomingTimers[key]) return;
      if(getUnreadCount(key)>0) return;
      demoIncomingTimers[key]=setTimeout(function(){
        demoIncomingTimers[key]=null;
        if(document.body.classList.contains('chat-open')&&chatActiveKey===key) return;
        if(getUnreadCount(key)>0) return;
        if(chatSessions[key]) ensureDemoIncomingMsg(chatSessions[key]);
        addUnread(key, 1);
        const cur=stack[stackIdx];
        if(cur) syncChatFab(cur.u, cur.f);
      }, 1600);
    }
    function currentRoomsLabel(){
      return roomsFilterLabel(roomsFilterSelected());
    }
    function updateDeskTrend(){
      const el=document.getElementById('deskTrend');
      if(!el) return;
      const series=((data.pps&&data.pps[tab])||[]).filter(function(p){
        return p && Number(p.med_pps)>0;
      });
      if(series.length<2){
        el.className='desk-trend is-flat';
        el.textContent='—';
        el.title='Мало данных по ask AED/sqft';
        return;
      }
      const last=Number(series[series.length-1].med_pps);
      const prevIdx=Math.max(0, series.length-4);
      const prev=Number(series[prevIdx].med_pps);
      const pct=prev>0 ? ((last-prev)/prev)*100 : 0;
      const abs=Math.abs(pct);
      const rounded=abs>=10 ? Math.round(pct) : Math.round(pct*10)/10;
      const sign=rounded>0?'+':'';
      const arrow=rounded>0.15?'↑':(rounded<-0.15?'↓':'→');
      const cls=rounded>0.15?'is-up':(rounded<-0.15?'is-down':'is-flat');
      el.className='desk-trend '+cls;
      el.textContent=arrow+' '+(rounded>0?sign:'')+rounded+'%';
      const fromM=series[prevIdx].m||'';
      const toM=series[series.length-1].m||'';
      el.title='Ask AED/sqft '+(fromM&&toM?(fromM+' → '+toM):'~3 мес.')+' · медиана сегмента';
    }
    function updateHeroMobTitle(){
      const building=data.building||'Building';
      const label=building+' · '+currentRoomsLabel();
      const el=document.getElementById('heroMobTitle');
      if(el) el.textContent=building;
      const desk=document.getElementById('deskJumpTitle');
      if(desk) desk.textContent=label;
      updateDeskTrend();
    }
    (function bindAnalyticsHeaderToggle(){
      const hero=document.getElementById('hero');
      const bar=document.getElementById('heroMobBar');
      const btn=document.getElementById('deskJumpAnalytics');
      if(!hero) return;
      function isMob(){ return window.matchMedia('(max-width:1100px)').matches; }
      function isOpen(){ return hero.classList.contains('is-open'); }
      function setOpen(open){
        hero.classList.toggle('is-open', !!open);
        if(bar) bar.setAttribute('aria-expanded', open?'true':'false');
        if(btn) btn.setAttribute('aria-expanded', open?'true':'false');
        if(isMob()) return;
        const target=open
          ? (document.getElementById('heroCore')||hero)
          : (document.getElementById('deskHead')||document.getElementById('deskChrome')||btn);
        if(!target) return;
        try{ target.scrollIntoView({ behavior:'smooth', block:'start' }); }
        catch(e){ try{ target.scrollIntoView(true); }catch(err){} }
      }
      function toggle(e){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        setOpen(!isOpen());
      }
      if(bar){
        bar.addEventListener('click', toggle);
        bar.setAttribute('aria-expanded','false');
      }
      if(btn){
        btn.addEventListener('click', toggle);
        btn.setAttribute('aria-expanded','false');
      }
    })();
    function tenantHint(u){
      if(u&&u.tenant_free===true) return {cls:'good', text:'Без арендаторов', title:'tenant_free=true'};
      if(u&&u.tenant_free===false) return {cls:'warn', text:'С арендатором', title:'tenant_free=false'};
      return {cls:'', text:'Арендаторы: неизвестно', title:'нет tenant_free'};
    }
    function bargainHint(u){
      const pvm=u&&u.pvm_pct!=null?Number(u.pvm_pct):null;
      const exp=u&&u.exp!=null?Number(u.exp):(u&&u.exposure_days!=null?Number(u.exposure_days):0);
      let reason='';
      if(pvm!=null) reason='ask '+(pvm>0?'+':'')+pvm+'% vs market';
      if(pvm==null){
        if(exp>=90) return {cls:'warn', text:'Торг уместен', title:'exposure '+exp+'d · нет PvM'};
        return {cls:'', text:'Торг: уточнить', title:'нет PvM'};
      }
      if(pvm>=8 || (pvm>=5 && exp>=60)) return {cls:'warn', text:'Торг уместен', title:reason+(exp?(' · '+exp+'d'):'')};
      if(pvm>=3) return {cls:'warn', text:'Выше рынка', title:reason};
      if(pvm<=-5) return {cls:'good', text:'Ниже рынка', title:reason};
      return {cls:'info', text:'Цена близка к рынку', title:reason||'±3%'};
    }
    function viewingHint(u){
      if(u&&u.tenant_free===true) return {cls:'info', text:'Показ: сегодня–завтра', title:'vacant · обычно быстрый показ'};
      if(u&&u.tenant_free===false) return {cls:'note', text:'Показ по записи', title:'с арендатором · согласовать слот'};
      return {cls:'info', text:'Показ по записи', title:'обычно сегодня–завтра'};
    }
    function chatContinueBtnHtml(u, unread){
      const n=Number(unread)||0;
      const has=n>0;
      const aria=has
        ? (CONTINUE_CTA+' · '+n+' входящ'+(n===1?'ее':'их'))
        : CONTINUE_CTA;
      return '<button type="button" class="chat-continue-btn'+(has?' has-incoming':'')+'" data-continue-chat aria-label="'+aria+'">' +
        '<span>'+CONTINUE_CTA+'</span>' +
        (has?'<span class="chat-continue-incoming">'+n+' входящ'+(n===1?'ее':'их')+'</span>':'') +
        '<span class="chat-continue-badge" aria-hidden="true">'+(n>9?'9+':String(n||''))+'</span>' +
      '</button>';
    }
    function swipeChatWrapHtml(u, opts){
      opts=opts||{};
      const kind=opts.kind==='card'?'card':(opts.kind==='dock'?'dock':'desk');
      const key=u?unitKey(u):null;
      const started=!!(key&&hasChatStarted(key));
      const unread=started?getUnreadCount(key):0;
      const ph=(u&&u.photos&&u.photos[0])||(u&&u.photo)||'';
      const sAttr=opts.sIdx!=null?(' data-s="'+opts.sIdx+'"'):'';
      const cheaper=opts.sIdx!=null?cheaperBtnHtml(u, opts.sIdx):(kind==='desk'?cheaperBtnHtml(u, stackIdx):'');
      const quick=kind==='desk'?'<div class="unit-quick-actions" style="margin:0 0 .45rem">'+cheaper+'</div>':'';
      if(started){
        return '<div class="swipe-chat-wrap swipe-chat-wrap--'+kind+' is-continue"'+sAttr+'>' +
          quick +
          chatContinueBtnHtml(u, unread) +
        '</div>';
      }
      return '<div class="swipe-chat-wrap swipe-chat-wrap--'+kind+'"'+sAttr+'>' +
        quick +
        '<div class="uni-celeb-stage" aria-hidden="true"></div>' +
        '<div class="swipe-chat" role="button" aria-label="Свайпните вправо — '+SWIPE_CTA+'">' +
          '<div class="swipe-chat-fill"></div>' +
          '<div class="swipe-chat-label">'+SWIPE_CTA+'</div>' +
          '<div class="swipe-chat-thumb">' +
            '<div class="mark-mini"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1a222d"/><path fill="#3ecfcf" d="M18 40V24h6.2c5.4 0 8.6 2.6 8.6 7.2 0 4.7-3.2 7.3-8.6 7.3H18zm4.1-3.5h2c2.9 0 4.5-1.3 4.5-3.8S27 29 24.1 29h-2v7.5z"/><path fill="#5ee4a8" d="M36.2 40l7.4-16h4.5l7.4 16h-4.4l-1.3-3.1H42l-1.3 3.1h-4.5zm7.6-6.5h4.2l-2.1-5-2.1 5z"/></svg></div>' +
          '</div>' +
          '<div class="swipe-chat-end" aria-hidden="true">'+(ph?'<img src="'+ph+'" alt=""/>':'')+'</div>' +
        '</div>' +
      '</div>';
    }
    function bindContinueChatButtons(root, u, f){
      (root||document).querySelectorAll('[data-continue-chat]').forEach(function(btn){
        btn.onclick=function(){
          chatDismissedKey=null;
          openPreViewChat(u,f);
        };
      });
    }
    function syncChatFab(u,f){
      const key=u?unitKey(u):null;
      const started=!!(key&&hasChatStarted(key));
      const unread=started?getUnreadCount(key):0;
      document.body.classList.remove('has-chat-fab');
      document.querySelectorAll('.chat-continue-btn').forEach(function(btn){
        const n=unread;
        const has=started && n>0;
        btn.classList.toggle('has-incoming', has);
        const aria=has
          ? (CONTINUE_CTA+' · '+n+' входящ'+(n===1?'ее':'их'))
          : CONTINUE_CTA;
        btn.setAttribute('aria-label', aria);
        let incoming=btn.querySelector('.chat-continue-incoming');
        let badge=btn.querySelector('.chat-continue-badge');
        if(has){
          if(!incoming){
            incoming=document.createElement('span');
            incoming.className='chat-continue-incoming';
            btn.appendChild(incoming);
          }
          incoming.textContent=n+' входящ'+(n===1?'ее':'их');
          if(!badge){
            badge=document.createElement('span');
            badge.className='chat-continue-badge';
            badge.setAttribute('aria-hidden','true');
            btn.appendChild(badge);
          }
          badge.textContent=n>9?'9+':String(n);
        } else {
          if(incoming) incoming.remove();
          if(badge) badge.textContent='';
        }
        if(started&&u){
          btn.onclick=function(){
            chatDismissedKey=null;
            openPreViewChat(u,f);
          };
        }
      });
    }
    function maybeAutoOpenDesktopChat(u,f){
      // Chat already started → show «Продолжить чат» bar, do not auto-open panel.
      if(!u||!f) return;
      syncChatFab(u,f);
    }
    function updateMobBrokerDock(){
      updateHeroMobTitle();
      const dock=document.getElementById('mobBrokerDock');
      const thread=document.getElementById('mobBrokerDockThread');
      const swipeHost=document.getElementById('mobBrokerDockSwipe');
      if(!dock||!swipeHost) return;
      if(thread){ thread.innerHTML=''; thread.hidden=true; }
      const cur=stack[stackIdx];
      if(!cur){
        swipeHost.innerHTML='';
        syncChatFab(null,null);
        return;
      }
      const u=cur.u, f=cur.f;
      syncChatFab(u,f);
      swipeHost.innerHTML=swipeChatWrapHtml(u, { kind:'dock', sIdx:stackIdx });
      bindAllSwipeChats(swipeHost);
      bindContinueChatButtons(swipeHost, u, f);
      try{ maybeAutoOpenDesktopChat(u,f); }catch(e){}
    }
    function newChatThreadId(u){
      const base=(u&&(u.permit_number||u.unit_number||'unit'))+'-'+Date.now().toString(36);
      return 'thr_'+String(base).replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,48);
    }
    function buildBrokerJoinUrl(u,f,threadId){
      const params=new URLSearchParams();
      params.set('tab','property');
      if(u&&u.unit_number) params.set('unit',String(u.unit_number));
      if(u&&u.permit_number) params.set('permit',String(u.permit_number));
      if(data.building) params.set('building',String(data.building));
      const floorVal=(u&&u.floor!=null&&u.floor!=='')?u.floor:(f&&f.label!=null?f.label:null);
      if(floorVal!=null&&floorVal!=='') params.set('floor',String(floorVal));
      if(u&&u.rooms!=null&&u.rooms!=='') params.set('rooms',String(u.rooms));
      if(threadId) params.set('thread',String(threadId));
      if(u&&u.url) params.set('url',String(u.url));
      return B2B_INBOX_BASE+'?'+params.toString();
    }
    function buildChatMessage(u,f){
      const bldg=data.building||'';
      const label=unitLabel(u,f);
      const price=u&&u.price!=null?fmtP(u.price,tab):'';
      const link=u&&u.url?u.url:'';
      const tenant=tenantHint(u).text;
      const bargain=bargainHint(u);
      let msg='Здравствуйте! Я инвестор, у меня есть свой брокер — комиссия через Refty.\\n';
      msg+='Интересует: '+bldg+' · '+label+(price?(' · '+price):'')+'\\n';
      msg+='Можно посмотреть квартиру сегодня?\\n';
      msg+='Контекст: '+tenant+' · '+bargain.text+(bargain.title?(' ('+bargain.title+')'):'')+'\\n';
      if(link) msg+='Ссылка: '+link;
      return msg;
    }
    function fillBrokerInviteUi(joinUrl){
      const linkEl=document.getElementById('chatBrokerJoinUrl');
      const copyBtn=document.getElementById('chatBrokerJoinCopy');
      if(linkEl){
        linkEl.textContent=joinUrl||B2B_INBOX_BASE+'?tab=property';
        linkEl.setAttribute('title', joinUrl||'');
      }
      if(copyBtn){
        copyBtn.textContent='Копировать';
        copyBtn.classList.remove('is-ok');
      }
    }
    function preViewPoints(u){
      return chatStarterPoints(u);
    }
    /** Стартовые chips как в прототипе — property-relevant */
    function chatStarterPoints(u){
      const v=viewingHint(u), t=tenantHint(u), b=bargainHint(u);
      const viewAns=u&&u.tenant_free===true
        ? 'Да, обычно можно сегодня–завтра — квартира свободна. Подтвердите слот.'
        : (u&&u.tenant_free===false
          ? 'Показ по записи: согласуем с арендатором. Часто удаётся на сегодня–завтра.'
          : 'Обычно показ сегодня–завтра по записи. Уточним слот у брокера.');
      const tenantAns=t.text+(t.title?(' · '+t.title):'')+'.';
      const bargainAns=b.text+(b.title?(' · '+b.title):'')+'. Комиссия через Refty.';
      return [
        {id:'expensive', q:'А что объект такой дорогой?', a:'Не дорогой, бери — завтра ещё дороже.'},
        {id:'hello', q:'Здравствуйте!', a:'Здравствуйте! Чем могу помочь по этому лоту?'},
        {id:'today', q:'Можно посмотреть сегодня?', a:viewAns},
        {id:'forsale', q:'Ещё продаётся?', a:'Да, лот активен. Можем уточнить актуальный статус у брокера.'},
        {id:'bargain', q:'Торг уместен?', a:bargainAns},
        {id:'tenants', q:'Есть арендаторы?', a:tenantAns},
        {id:'commission', q:'Комиссия через Refty?', a:'Да · я инвестор со своим брокером — комиссия через Refty.'}
      ];
    }
    function microUnitLabel(u,f){
      const num=u&&u.unit_number?('#'+u.unit_number):(u&&u.rooms!=null?(u.rooms+'BR'):'лот');
      const fl=f&&f.label!=null?('Fl.'+f.label):((u&&u.floor!=null)?('Fl.'+u.floor):'');
      const pr=u&&u.price!=null?fmtP(u.price,tab):'';
      return {num:num, fl:fl, pr:pr, line:[num,fl,pr].filter(Boolean).join(' · ')};
    }
    function chatSnippet(s){
      const msgs=(s&&s.msgs)||[];
      for(let i=msgs.length-1;i>=0;i--){
        if(msgs[i]&&msgs[i].text) return String(msgs[i].text).replace(/\\s+/g,' ').slice(0,72);
      }
      return 'Нет сообщений';
    }
    function chatTimeLabel(s){
      if(s&&s.openedAt){
        try{
          const d=new Date(s.openedAt);
          return d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
        }catch(e){}
      }
      return 'сейчас';
    }
    function persistActiveChat(){
      if(!chatActiveKey||!chatSessions[chatActiveKey]) return;
      const s=chatSessions[chatActiveKey];
      s.checks=Object.assign({}, chatChecks);
      s.usedStarters=Object.assign({}, (chatCtx&&chatCtx.usedStarters)||{});
      if(chatCtx){
        s.msgs=Array.isArray(chatCtx.msgs)?chatCtx.msgs.slice():[];
        s.brokerJoinUrl=chatCtx.brokerJoinUrl||s.brokerJoinUrl;
        s.threadId=chatCtx.threadId||s.threadId;
      }
    }
    function syncChatEmptyState(){
      const th=document.getElementById('chatThread');
      const empty=document.getElementById('chatEmpty');
      if(!th) return;
      const has=!!(chatCtx&&chatCtx.msgs&&chatCtx.msgs.length);
      th.classList.toggle('has-msgs', has);
      if(empty){
        if(has) empty.setAttribute('hidden','');
        else empty.removeAttribute('hidden');
      }
    }
    function appendChatBubble(role, text, opts){
      opts=opts||{};
      const th=document.getElementById('chatThread');
      if(!th) return;
      const d=document.createElement('div');
      if(opts.kind==='file'){
        d.className='chat-bubble file';
        d.innerHTML='<div class="chat-file-card">' +
          '<span class="chat-file-ico" aria-hidden="true">📎</span>' +
          '<div class="chat-file-meta">' +
            '<b>'+(opts.fileName||'Анализ для переговоров.html')+'</b>' +
            '<span>'+(opts.fileHint||'HTML · comps · vs рынок · история цены')+'</span>' +
            '<button type="button" class="chat-file-dl" data-pack="'+(opts.packKey||'')+'">Скачать</button>' +
          '</div></div>';
        const dl=d.querySelector('.chat-file-dl');
        if(dl) dl.onclick=function(){ downloadNegoPackByKey(opts.packKey); };
      } else {
        d.className='chat-bubble '+role;
        d.textContent=text;
      }
      th.appendChild(d);
      if(!opts.skipStore && chatCtx){
        if(!Array.isArray(chatCtx.msgs)) chatCtx.msgs=[];
        const row={role:role, text:text};
        if(opts.kind==='file'){
          row.kind='file';
          row.fileName=opts.fileName||'';
          row.fileHint=opts.fileHint||'';
          row.packKey=opts.packKey||'';
        }
        chatCtx.msgs.push(row);
        if(role==='bot'){
          const chatOpen=document.body.classList.contains('chat-open');
          const viewing=chatActiveKey===chatCtx.key;
          if(!chatOpen||!viewing){
            addUnread(chatCtx.key, 1);
            const cur=stack[stackIdx];
            if(cur) syncChatFab(cur.u, cur.f);
          }
        }
      }
      syncChatEmptyState();
      th.scrollTop=th.scrollHeight;
      renderChatRail();
    }
    function renderThreadMsgs(msgs){
      const th=document.getElementById('chatThread');
      if(!th) return;
      th.innerHTML='<p class="chat-empty" id="chatEmpty">В этом чате еще нет сообщений</p>';
      (msgs||[]).forEach(function(m){
        if(m&&m.kind==='file'){
          const d=document.createElement('div');
          d.className='chat-bubble file';
          d.innerHTML='<div class="chat-file-card">' +
            '<span class="chat-file-ico" aria-hidden="true">📎</span>' +
            '<div class="chat-file-meta">' +
              '<b>'+(m.fileName||'Анализ для переговоров.html')+'</b>' +
              '<span>'+(m.fileHint||'HTML · comps · vs рынок · история цены')+'</span>' +
              '<button type="button" class="chat-file-dl" data-pack="'+(m.packKey||'')+'">Скачать</button>' +
            '</div></div>';
          const dl=d.querySelector('.chat-file-dl');
          if(dl) dl.onclick=function(){ downloadNegoPackByKey(m.packKey); };
          th.appendChild(d);
        } else {
          const d=document.createElement('div');
          d.className='chat-bubble '+(m.role||'bot');
          d.textContent=m.text||'';
          th.appendChild(d);
        }
      });
      syncChatEmptyState();
      th.scrollTop=th.scrollHeight;
    }
    function renderChatRail(){
      const body=document.getElementById('chatListBody');
      if(!body) return;
      const keys=Object.keys(chatSessions);
      if(!keys.length){
        body.innerHTML='<p class="chat-list-empty">Откройте лот и начните чат с брокером</p>';
        return;
      }
      body.innerHTML=keys.map(function(k){
        const s=chatSessions[k];
        const u=s.u, f=s.f;
        const micro=microUnitLabel(u,f);
        const broker=(u&&u.broker&&u.broker!=='—')?u.broker:(u&&u.agency)||'Брокер';
        const ph=(u&&u.photos&&u.photos[0])||(u&&u.photo)||'';
        const on=k===chatActiveKey?' is-on':'';
        const thumb=ph
          ? '<img src="'+ph+'" alt=""/>'
          : '<span class="ph">'+(u&&u.unit_number?String(u.unit_number).slice(-2):(u&&u.rooms!=null?String(u.rooms):'·'))+'</span>';
        const title=broker;
        const sub=micro.line+(data.building?(' · '+data.building):'');
        const snip=chatSnippet(s);
        const time=chatTimeLabel(s);
        return '<button type="button" class="chat-list-row'+on+'" data-key="'+String(k).replace(/"/g,'&quot;')+'">'
          +'<span class="chat-list-thumb">'+thumb+'</span>'
          +'<span class="chat-list-main">'
            +'<span class="chat-list-title"><i class="dot" aria-hidden="true"></i>'+title+'</span>'
            +'<span class="chat-list-sub">'+sub+'</span>'
            +'<span class="chat-list-snip">'+snip+'</span>'
          +'</span>'
          +'<span class="chat-list-time">'+time+'</span>'
          +'</button>';
      }).join('');
      body.querySelectorAll('.chat-list-row').forEach(function(btn){
        btn.onclick=function(){
          const k=btn.getAttribute('data-key');
          if(!k||k===chatActiveKey) return;
          switchChatSession(k);
        };
      });
    }
    function renderStarters(u){
      const box=document.getElementById('chatStarters');
      if(!box) return;
      const points=chatStarterPoints(u);
      const used=(chatCtx&&chatCtx.usedStarters)||{};
      box.innerHTML=points.map(function(p){
        const on=!!used[p.id];
        return '<button type="button" class="chat-starter'+(on?' is-used':'')+'" data-id="'+p.id+'">'+p.q+'</button>';
      }).join('');
      box.querySelectorAll('.chat-starter').forEach(function(btn){
        btn.onclick=function(){
          const id=btn.getAttribute('data-id');
          const p=points.find(function(x){return x.id===id;});
          if(!p||!chatCtx) return;
          if(chatCtx.usedStarters[id]) return;
          chatCtx.usedStarters[id]=true;
          chatChecks[id]=true;
          renderStarters(u);
          appendChatBubble('me', p.q);
          setTimeout(function(){ appendChatBubble('bot', p.a); }, 220);
        };
      });
    }
    function paintActiveChatSession(){
      if(!chatCtx||!chatCtx.u) return;
      const u=chatCtx.u, f=chatCtx.f;
      chatChecks=Object.assign({}, chatCtx.checks||{});
      fillBrokerInviteUi(chatCtx.brokerJoinUrl);
      const micro=microUnitLabel(u,f);
      const broker=(u.broker&&u.broker!=='—')?u.broker:(u.agency||'Брокер');
      const ph=(u.photos&&u.photos[0])||u.photo||'';
      const nameEl=document.getElementById('chatConvName');
      if(nameEl) nameEl.textContent=broker;
      const statusEl=document.getElementById('chatConvStatus');
      if(statusEl) statusEl.textContent='offline';
      const hintEl=document.getElementById('chatConvHint');
      if(hintEl) hintEl.textContent='Пригласили в чат · ожидаем · пока можете задать вопросы';
      const av=document.getElementById('chatConvAvatar');
      if(av){
        const initials=(broker||'R').trim().split(/\\s+/).map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
        av.textContent=initials||'R';
      }
      const priceEl=document.getElementById('chatCtxPrice');
      if(priceEl) priceEl.textContent=u.price!=null?fmtP(u.price,tab):'—';
      const ctxName=document.getElementById('chatCtxName');
      if(ctxName){
        const label=(data.building||'')+' · '+unitLabel(u,f);
        ctxName.textContent=label;
        ctxName.href=u.url||'#';
        if(!u.url) ctxName.removeAttribute('href');
      }
      const thumb=document.getElementById('chatCtxThumb');
      if(thumb){
        thumb.innerHTML=ph
          ? '<img src="'+ph+'" alt=""/>'
          : '<span class="ph">'+(u.unit_number?String(u.unit_number).slice(-2):'·')+'</span>';
      }
      renderThreadMsgs(chatCtx.msgs||[]);
      renderStarters(u);
      renderChatRail();
      const wa=document.getElementById('chatWaLink');
      if(wa){
        wa.href='https://wa.me/?text='+encodeURIComponent(buildChatMessage(u,f)+'\\n\\nБрокеру: '+(chatCtx.brokerJoinUrl||''));
      }
      const input=document.getElementById('chatInput');
      if(input) input.value='';
    }
    function switchChatSession(key){
      if(!chatSessions[key]) return;
      persistActiveChat();
      chatActiveKey=key;
      chatCtx=chatSessions[key];
      paintActiveChatSession();
    }
    function openPreViewChat(u,f){
      const sheet=document.getElementById('chatSheet');
      if(!sheet||!u) return;
      const key=unitKey(u);
      persistActiveChat();
      markChatStarted(key);
      chatDismissedKey=null;
      if(demoIncomingTimers[key]){ clearTimeout(demoIncomingTimers[key]); demoIncomingTimers[key]=null; }
      if(!chatSessions[key]){
        const threadId=newChatThreadId(u);
        const brokerJoinUrl=buildBrokerJoinUrl(u,f,threadId);
        chatSessions[key]={
          key:key, u:u, f:f, threadId:threadId, brokerJoinUrl:brokerJoinUrl,
          checks:{}, usedStarters:{}, msgs:[], openedAt:Date.now()
        };
      } else {
        chatSessions[key].u=u;
        chatSessions[key].f=f;
      }
      if(getUnreadCount(key)>0) ensureDemoIncomingMsg(chatSessions[key]);
      clearUnread(key);
      chatActiveKey=key;
      chatCtx=chatSessions[key];
      paintActiveChatSession();
      sheet.classList.add('is-on');
      sheet.setAttribute('aria-hidden','false');
      document.body.classList.add('chat-open');
      injectExpensiveDemoIfNeeded();
      try{ playChatConfetti(); }catch(e){}
      try{ updateMobBrokerDock(); }catch(e){}
    }
    function closePreViewChat(){
      const sheet=document.getElementById('chatSheet');
      if(!sheet) return;
      persistActiveChat();
      if(chatActiveKey) chatDismissedKey=chatActiveKey;
      const closedKey=chatActiveKey;
      sheet.classList.remove('is-on');
      sheet.setAttribute('aria-hidden','true');
      document.body.classList.remove('chat-open');
      try{ updateMobBrokerDock(); }catch(e){}
      if(closedKey) scheduleDemoIncoming(closedKey);
    }
    const negoPackCache={};
    function unitExposureDays(u){
      const exp=u&&u.exp!=null?Number(u.exp):(u&&u.exposure_days!=null?Number(u.exposure_days):NaN);
      return Number.isFinite(exp)&&exp>=0?Math.round(exp):null;
    }
    function collectNegoPeers(u, limit){
      limit=limit||10;
      const rooms=String(u.rooms||'');
      const myKey=unitKey(u);
      const myBand=floorBand(u.floor);
      const myPrice=Number(u.price)||0;
      const myPps=Number(u.pps)||0;
      const pool=stack
        .map(function(s,i){ return {u:s.u,f:s.f,sIdx:i}; })
        .filter(function(s){
          return unitKey(s.u)!==myKey
            && String(s.u.rooms||'')===rooms
            && floorBand(s.u.floor)===myBand
            && Number.isFinite(Number(s.u.price))
            && Number(s.u.price)>0;
        });
      pool.sort(function(a,b){
        const ap=Number(a.u.pps)||0, bp=Number(b.u.pps)||0;
        if(myPps>0 && ap>0 && bp>0){
          const da=Math.abs(ap-myPps), db=Math.abs(bp-myPps);
          if(da!==db) return da-db;
        }
        return Math.abs(Number(a.u.price)-myPrice)-Math.abs(Number(b.u.price)-myPrice);
      });
      return pool.slice(0, limit);
    }
    function segmentPpsStats(u, peers){
      const vals=[Number(u.pps)].concat(peers.map(function(p){ return Number(p.u.pps); }))
        .filter(function(v){ return Number.isFinite(v)&&v>0; })
        .sort(function(a,b){ return a-b; });
      if(!vals.length) return { med:null, vsMed:null, n:0 };
      const med=vals[Math.floor(vals.length/2)];
      const mine=Number(u.pps);
      const vsMed=(Number.isFinite(mine)&&mine>0&&med)
        ? Math.round(((mine-med)/med)*1000)/10
        : null;
      return { med:med, vsMed:vsMed, n:vals.length };
    }
    function escNego(s){
      return String(s==null?'':s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
    }
    function buildNegoAnalysisPack(u,f){
      const peers=collectNegoPeers(u, 10);
      const band=floorBand(u.floor);
      const bandRu=band==='high'?'высокие':band==='mid'?'средние':'нижние';
      const ppsSeg=segmentPpsStats(u, peers);
      const pts=priceHistoryPoints(u);
      const mo=marketOfferFor(u);
      const exp=unitExposureDays(u);
      const photos=((u.photos&&u.photos.length)?u.photos:(u.photo?[u.photo]:[])).slice(0,4);
      const hist=pts.slice(-6).map(function(p){
        return { day:p.day, price:p.price, agency:p.agency||'' };
      });
      let histPct=null;
      if(pts.length>=2){
        const first=pts[0].price, last=pts[pts.length-1].price;
        if(first) histPct=Math.round((last-first)/first*1000)/10;
      }
      return {
        building:data.building||'',
        label:unitLabel(u,f),
        price:u.price,
        pps:u.pps,
        rooms:u.rooms,
        floor:f&&f.label!=null?f.label:u.floor,
        band:band,
        bandRu:bandRu,
        view:viewLabel(u),
        broker:u.broker||'',
        agency:u.agency||'',
        permit:u.permit_number||'',
        url:u.url||'',
        exp:exp,
        photos:photos,
        peers:peers.map(function(p){
          return {
            label:unitLabel(p.u,p.f),
            price:p.u.price,
            pps:p.u.pps,
            floor:p.f&&p.f.label,
            view:viewLabel(p.u),
            exp:unitExposureDays(p.u),
            save:u.price?Math.round((1-Number(p.u.price)/Number(u.price))*1000)/10:null
          };
        }),
        ppsSeg:ppsSeg,
        hist:hist,
        histPct:histPct,
        mo:mo?{ offer:mo.offer, vsAsk:mo.vsAsk, pvm:mo.pvm, pvs:mo.pvs, dldDrop:mo.dldDrop }:null,
        createdAt:new Date().toISOString()
      };
    }
    function buildNegoAnalysisHtml(pack){
      const photoHtml=(pack.photos||[]).map(function(src){
        const u=photoSize(src,'thumb')||src;
        return '<img src="'+escNego(u)+'" alt="" style="width:88px;height:66px;object-fit:cover;border-radius:8px;border:1px solid #333"/>';
      }).join('');
      const peerRows=(pack.peers||[]).map(function(p,i){
        return '<tr>' +
          '<td>'+(i+1)+'</td>' +
          '<td>'+escNego(p.label)+'</td>' +
          '<td>'+escNego(fmtP(p.price,tab))+'</td>' +
          '<td>'+(p.pps!=null?Math.round(p.pps).toLocaleString('en-US'):'—')+'</td>' +
          '<td>'+escNego(p.view||'')+'</td>' +
          '<td>'+(p.exp!=null?(p.exp+'d'):'—')+'</td>' +
          '<td>'+(p.save!=null?((p.save>0?'−':'+')+Math.abs(p.save)+'%'):'—')+'</td>' +
          '</tr>';
      }).join('');
      const histRows=(pack.hist||[]).map(function(h){
        return '<tr><td>'+escNego(h.day)+'</td><td>'+escNego(fmtP(h.price,tab))+'</td><td>'+escNego(h.agency||'')+'</td></tr>';
      }).join('');
      const vsMed=pack.ppsSeg&&pack.ppsSeg.vsMed!=null
        ? ((pack.ppsSeg.vsMed>0?'+':'')+pack.ppsSeg.vsMed+'% к медиане сегмента')
        : '—';
      const expLine=pack.exp!=null
        ? ('Не продаётся <b>'+pack.exp+' дней</b> (exposure / DOM)')
        : 'Дней на рынке: нет данных';
      const offerLine=pack.mo
        ? ('Fair/offer ≈ <b>'+escNego(fmtP(pack.mo.offer,tab))+'</b>'+(pack.mo.vsAsk!=null?(' · '+(pack.mo.vsAsk>0?'+':'')+pack.mo.vsAsk+'% к ask'):'') +
          (pack.mo.pvm!=null?(' · vs market '+pctTxt(pack.mo.pvm)):'') +
          (pack.mo.pvs!=null?(' · vs similar '+pctTxt(pack.mo.pvs)):''))
        : 'Нет vs market / vs similar';
      return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Отчёт для переговоров · '+escNego(pack.label)+'</title>' +
        '<style>body{font:14px/1.45 system-ui,sans-serif;background:#0b1620;color:#e8eef2;margin:0;padding:28px}' +
        'h1{font-size:1.35rem;margin:0 0 6px}h2{font-size:1rem;margin:22px 0 8px;color:#d8c3a5}' +
        '.sub{color:#8aa3ad;margin:0 0 16px}.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}' +
        '.kpi{background:#122029;border:1px solid #2a3a45;border-radius:12px;padding:10px 12px;min-width:120px}' +
        '.kpi b{display:block;font-size:1.05rem;color:#f5e6c8}.kpi span{font-size:11px;color:#8aa3ad;text-transform:uppercase;letter-spacing:.04em}' +
        'table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #24323c;padding:7px 6px;text-align:left}' +
        'th{color:#8aa3ad;font-size:11px;text-transform:uppercase}.photos{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}' +
        '.tag{display:inline-block;padding:3px 8px;border-radius:999px;background:rgba(251,191,36,.15);color:#fde68a;font-size:12px;font-weight:700}' +
        '</style></head><body>' +
        '<p class="tag">Refty · отчёт для переговоров с брокером</p>' +
        '<h1>'+escNego(pack.building)+' · '+escNego(pack.label)+'</h1>' +
        '<p class="sub">Сегмент: '+escNego(pack.bandRu)+' этажи · вид '+escNego(pack.view)+' · comps ≈ '+(pack.peers||[]).length+'</p>' +
        (photoHtml?'<div class="photos">'+photoHtml+'</div>':'') +
        '<div class="kpis">' +
          '<div class="kpi"><span>Ask</span><b>'+escNego(fmtP(pack.price,tab))+'</b></div>' +
          '<div class="kpi"><span>AED/sqft</span><b>'+(pack.pps!=null?Math.round(pack.pps).toLocaleString('en-US'):'—')+'</b></div>' +
          '<div class="kpi"><span>Med сегмента</span><b>'+(pack.ppsSeg&&pack.ppsSeg.med!=null?Math.round(pack.ppsSeg.med).toLocaleString('en-US'):'—')+'</b></div>' +
          '<div class="kpi"><span>Vs med</span><b>'+escNego(vsMed)+'</b></div>' +
          '<div class="kpi"><span>DOM</span><b>'+(pack.exp!=null?(pack.exp+'d'):'—')+'</b></div>' +
        '</div>' +
        '<p>'+expLine+'</p>' +
        '<p>'+offerLine+'</p>' +
        '<h2>~'+(pack.peers||[]).length+' comps · тот же '+escNego(String(pack.rooms||''))+' BR · '+escNego(pack.bandRu)+'</h2>' +
        (peerRows
          ? '<table><thead><tr><th>#</th><th>Лот</th><th>Ask</th><th>AED/sqft</th><th>Вид</th><th>DOM</th><th>Δ</th></tr></thead><tbody>'+peerRows+'</tbody></table>'
          : '<p class="sub">Нет peers в сегменте</p>') +
        '<h2>История цены по объекту</h2>' +
        (pack.histPct!=null?'<p class="sub">Динамика от старта: '+(pack.histPct>0?'+':'')+pack.histPct+'%</p>':'') +
        (histRows
          ? '<table><thead><tr><th>Дата</th><th>Цена</th><th>Agency</th></tr></thead><tbody>'+histRows+'</tbody></table>'
          : '<p class="sub">Нет точек истории</p>') +
        '<p class="sub" style="margin-top:28px">Сгенерировано Refty · '+escNego((pack.createdAt||'').slice(0,19).replace('T',' '))+' · для переговоров, не оферта</p>' +
        '</body></html>';
    }
    function downloadNegoHtml(html, fileName){
      const blob=new Blob([html],{type:'text/html;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=fileName||'refty-nego-report.html';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 800);
    }
    function downloadNegoPackByKey(packKey){
      const cached=negoPackCache[packKey];
      if(!cached) return;
      downloadNegoHtml(cached.html, cached.fileName);
    }
    function sendNegoReportToChat(){
      if(!chatCtx||!chatCtx.u) return;
      const u=chatCtx.u, f=chatCtx.f;
      const pack=buildNegoAnalysisPack(u,f);
      const html=buildNegoAnalysisHtml(pack);
      const slug=(data.building||'unit').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
      const unitBit=(u.unit_number||u.permit_number||'lot');
      const fileName='refty_nego_'+slug+'_'+String(unitBit).replace(/[^a-zA-Z0-9_-]/g,'_')+'.html';
      const packKey='nego_'+unitKey(u)+'_'+Date.now();
      negoPackCache[packKey]={ html:html, fileName:fileName, pack:pack };
      const expBit=pack.exp!=null?(' · не продаётся '+pack.exp+' дн.'):'';
      const compsBit=' · '+(pack.peers||[]).length+' comps в сегменте «'+pack.bandRu+'»';
      const ppsBit=pack.ppsSeg&&pack.ppsSeg.vsMed!=null
        ? (' · AED/sqft '+(pack.ppsSeg.vsMed>0?'+':'')+pack.ppsSeg.vsMed+'% к med сегмента')
        : '';
      const msg='Отправил отчёт для переговоров: '+(pack.building?pack.building+' · ':'')+pack.label+compsBit+ppsBit+expBit;
      appendChatBubble('me', msg);
      appendChatBubble('me', msg, {
        kind:'file',
        fileName:fileName,
        fileHint:(pack.peers||[]).length+' comps · AED/sqft · история · DOM '+ (pack.exp!=null?(pack.exp+'d'):'—'),
        packKey:packKey
      });
      downloadNegoHtml(html, fileName);
      const chip=document.getElementById('chatNegoFileBtn');
      if(chip) chip.classList.add('is-sent');
      setTimeout(function(){
        appendChatBubble('bot', 'Приняли отчёт. Брокер ещё offline — увидит comps, AED/sqft и DOM, как зайдёт. Комиссия через Refty.');
      }, 320);
    }
    function injectExpensiveDemoIfNeeded(){
      if(!chatCtx||chatCtx.demoExpensive) return;
      if(chatCtx.msgs&&chatCtx.msgs.length) { chatCtx.demoExpensive=true; return; }
      chatCtx.demoExpensive=true;
      if(!chatCtx.usedStarters) chatCtx.usedStarters={};
      chatCtx.usedStarters.expensive=true;
      if(chatCtx.u) renderStarters(chatCtx.u);
      appendChatBubble('me', 'А что объект такой дорогой?');
      setTimeout(function(){
        appendChatBubble('bot', 'Не дорогой, бери — завтра ещё дороже.');
      }, 450);
    }
    function playChatConfetti(){
      const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
      if(reduced) return;
      const panel=document.querySelector('#chatSheet .chat-sheet-panel');
      if(!panel) return;
      let stage=panel.querySelector('.chat-confetti-stage');
      if(!stage){
        stage=document.createElement('div');
        stage.className='chat-confetti-stage';
        stage.setAttribute('aria-hidden','true');
        panel.appendChild(stage);
      }
      stage.innerHTML='';
      const canvas=document.createElement('canvas');
      stage.appendChild(canvas);
      const dpr=Math.min(window.devicePixelRatio||1, 2);
      const w=stage.clientWidth||panel.clientWidth||320;
      const h=stage.clientHeight||170;
      canvas.width=Math.floor(w*dpr);
      canvas.height=Math.floor(h*dpr);
      canvas.style.width=w+'px';
      canvas.style.height=h+'px';
      const ctx=canvas.getContext('2d');
      if(!ctx) return;
      ctx.scale(dpr, dpr);
      const colors=['#f9a8d4','#5eead4','#fcd34d','#a5b4fc','#86efac','#fda4af','#7dd3fc'];
      const parts=[];
      const cx=w*0.55, cy=28;
      for(let i=0;i<48;i++){
        const ang=(-Math.PI*0.15)-Math.random()*Math.PI*0.7;
        const sp=2.2+Math.random()*4.8;
        parts.push({
          x:cx+(Math.random()-0.5)*40,
          y:cy+Math.random()*10,
          vx:Math.cos(ang)*sp*(Math.random()>0.5?1:-1)*0.55 + (Math.random()-0.5)*1.4,
          vy:Math.sin(ang)*sp - (1.2+Math.random()*2.2),
          w:3+Math.random()*4,
          h:5+Math.random()*7,
          rot:Math.random()*Math.PI,
          vr:(Math.random()-0.5)*0.28,
          color:colors[i%colors.length],
          life:1
        });
      }
      const t0=performance.now();
      function frame(now){
        const t=(now-t0)/1000;
        ctx.clearRect(0,0,w,h);
        let alive=0;
        for(let i=0;i<parts.length;i++){
          const p=parts[i];
          p.vy+=0.14;
          p.x+=p.vx;
          p.y+=p.vy;
          p.rot+=p.vr;
          p.life=Math.max(0, 1-t/1.05);
          if(p.life<=0 || p.y>h+12) continue;
          alive++;
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha=Math.min(1, p.life*1.35);
          ctx.fillStyle=p.color;
          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          ctx.restore();
        }
        if(alive>0 && t<1.1) requestAnimationFrame(frame);
        else { stage.innerHTML=''; }
      }
      requestAnimationFrame(frame);
    }
    function playUnicornCelebrate(thenFn, anchorEl){
      const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
      let finished=false;
      const finish=function(){
        if(finished) return;
        finished=true;
        if(typeof thenFn==='function') thenFn();
      };
      if(reduced){ finish(); return; }
      const wrap=anchorEl&&anchorEl.closest?anchorEl.closest('.swipe-chat-wrap'):null;
      let stage=(wrap&&wrap.querySelector('.uni-celeb-stage'))||null;
      if(!stage && wrap){
        stage=document.createElement('div');
        stage.className='uni-celeb-stage';
        stage.setAttribute('aria-hidden','true');
        const track=wrap.querySelector('.swipe-chat');
        if(track) wrap.insertBefore(stage, track);
        else wrap.appendChild(stage);
      }
      if(!stage){ finish(); return; }
      let layer=stage.querySelector('.uni-celeb');
      if(!layer){
        layer=document.createElement('div');
        layer.className='uni-celeb';
        layer.setAttribute('aria-hidden','true');
        stage.appendChild(layer);
      }
      /* Classic unicorn only — no picker / variants */
      const tones=['','tone-sea','tone-sand'];
      const sparkN=7;
      layer.innerHTML='';
      layer.className='uni-celeb is-on';
      const glow=document.createElement('div');
      glow.className='uni-celeb-glow';
      layer.appendChild(glow);
      const ring=document.createElement('div');
      ring.className='uni-celeb-ring';
      layer.appendChild(ring);
      const uni=document.createElement('div');
      uni.className='uni-celeb-uni';
      uni.textContent='🦄';
      layer.appendChild(uni);
      for(let i=0;i<sparkN;i++){
        const s=document.createElement('span');
        s.className='uni-celeb-spark'+(tones[i%tones.length]?' '+tones[i%tones.length]:'');
        const ang=(-Math.PI*0.85)+(Math.PI*1.7)*(i/Math.max(1,sparkN-1))+((Math.random()-0.5)*0.25);
        const dist=22+Math.random()*34;
        s.style.setProperty('--dx', Math.cos(ang)*dist+'px');
        s.style.setProperty('--dy', (Math.sin(ang)*dist*0.75-12)+'px');
        s.style.animationDelay=(0.04+Math.random()*0.22)+'s';
        layer.appendChild(s);
      }
      const clear=function(){
        layer.classList.remove('is-on');
        layer.className='uni-celeb';
        layer.innerHTML='';
        finish();
      };
      const t=setTimeout(clear, 1100);
      uni.addEventListener('animationend', function(){
        clearTimeout(t);
        clear();
      }, { once:true });
    }
    function bindSwipeChatEl(track, onDone){
      const thumb=track.querySelector('.swipe-chat-thumb');
      const fill=track.querySelector('.swipe-chat-fill');
      const label=track.querySelector('.swipe-chat-label');
      if(!thumb||track.dataset.bound) return;
      track.dataset.bound='1';
      let dragging=false, startX=0, base=0, max=0, done=false;
      function metrics(){ max=Math.max(0, track.clientWidth - thumb.offsetWidth - 10); }
      function setX(x, animate){
        x=Math.max(0, Math.min(max, x));
        if(animate){ thumb.style.transition='transform .22s ease'; fill.style.transition='width .22s ease'; }
        else { thumb.style.transition='none'; fill.style.transition='none'; }
        thumb.style.transform='translateX('+x+'px)';
        if(fill) fill.style.width=(x+thumb.offsetWidth/2)+'px';
        return x;
      }
      function onDown(clientX){
        if(done) return;
        dragging=true; metrics();
        startX=clientX; base=0;
        const m=thumb.style.transform&&thumb.style.transform.match(/translateX\\(([-\\d.]+)px\\)/);
        if(m) base=parseFloat(m[1])||0;
      }
      function onMove(clientX){
        if(!dragging||done) return;
        setX(base+(clientX-startX), false);
      }
      function onUp(){
        if(!dragging||done) return;
        dragging=false; metrics();
        const m=thumb.style.transform&&thumb.style.transform.match(/translateX\\(([-\\d.]+)px\\)/);
        const x=m?parseFloat(m[1])||0:0;
        if(x>=max*0.82){
          setX(max, true);
          done=true;
          track.classList.add('is-done');
          if(label) label.textContent='Запрос отправлен';
          try{ playScrollSound(1); }catch(e){}
          if(typeof onDone==='function') onDone();
          setTimeout(function(){
            done=false; track.classList.remove('is-done');
            if(label) label.textContent=SWIPE_CTA;
            setX(0, true);
          }, 1600);
        } else {
          setX(0, true);
        }
      }
      thumb.addEventListener('pointerdown', function(e){
        e.preventDefault(); e.stopPropagation();
        thumb.setPointerCapture(e.pointerId);
        onDown(e.clientX);
      });
      thumb.addEventListener('pointermove', function(e){ onMove(e.clientX); });
      thumb.addEventListener('pointerup', onUp);
      thumb.addEventListener('pointercancel', onUp);
      metrics(); setX(0,false);
    }
    function bindAllSwipeChats(root){
      (root||document).querySelectorAll('.swipe-chat-wrap').forEach(function(wrap){
        const track=wrap.querySelector('.swipe-chat');
        if(!track) return;
        bindSwipeChatEl(track, function(){
          const sAttr=wrap.getAttribute('data-s');
          let u=null, f=null;
          if(sAttr!=null && sAttr!==''){
            const i=+sAttr;
            if(stack[i]){ u=stack[i].u; f=stack[i].f; selectStack(i, { silent:true, skipDetail:false }); }
          } else {
            const cur=stack[stackIdx];
            if(cur){ u=cur.u; f=cur.f; }
          }
          if(!u) return;
          playUnicornCelebrate(function(){ openPreViewChat(u,f); }, wrap);
        });
      });
    }
    (function bindChatSheetUi(){
      const close=document.getElementById('chatSheetClose');
      const closeMob=document.getElementById('chatSheetCloseMob');
      const sheet=document.getElementById('chatSheet');
      const joinCopy=document.getElementById('chatBrokerJoinCopy');
      const form=document.getElementById('chatInputForm');
      const input=document.getElementById('chatInput');
      if(close) close.onclick=closePreViewChat;
      if(closeMob) closeMob.onclick=closePreViewChat;
      if(sheet) sheet.addEventListener('click', function(e){ if(e.target===sheet) closePreViewChat(); });
      if(joinCopy) joinCopy.onclick=function(){
        const url=chatCtx.brokerJoinUrl||(document.getElementById('chatBrokerJoinUrl')||{}).textContent||'';
        if(!url) return;
        const done=function(){
          joinCopy.textContent='OK';
          joinCopy.classList.add('is-ok');
          setTimeout(function(){ joinCopy.textContent='Invite'; joinCopy.classList.remove('is-ok'); }, 1400);
        };
        if(navigator.clipboard&&navigator.clipboard.writeText){
          navigator.clipboard.writeText(url).then(done).catch(function(){});
        }
      };
      function isBayutPfNoChatQuestion(text){
        const t=String(text||'').toLowerCase();
        const hasPortal=/bayut|бают|property\\s*finder|проперти\\s*файндер|\\bpf\\b/.test(t);
        if(!hasPortal) return false;
        return /почему|зачем|нет\\s*чат|не\\s*сделал|не\\s*уме|не\\s*хот|где\\s*чат|такого\\s*чат|как\\s*у\\s*них|чат|chat/.test(t);
      }
      if(form) form.addEventListener('submit', function(e){
        e.preventDefault();
        if(!chatCtx||!chatCtx.u) return;
        const text=((input&&input.value)||'').trim();
        if(!text) return;
        appendChatBubble('me', text);
        if(input) input.value='';
        const botReply=isBayutPfNoChatQuestion(text)
          ? 'А Bayut с Property Finder — они тупенькие и ничего не хотят 🙂 Поэтому ты такой умный и прекрасный, что здесь. Пиши вопросы — брокер ещё offline, мы уже ждём.'
          : 'Приняли. Брокер увидит сообщение · комиссия через Refty. Пока offline — можете спрашивать, ответим как зайдёт.';
        setTimeout(function(){
          appendChatBubble('bot', botReply);
        }, 280);
      });
      const negoBtn=document.getElementById('chatNegoFileBtn');
      const attachBtn=document.getElementById('chatAttachBtn');
      function onNegoClick(e){
        if(e) e.preventDefault();
        sendNegoReportToChat();
      }
      if(negoBtn) negoBtn.onclick=onNegoClick;
      if(attachBtn) attachBtn.onclick=onNegoClick;
      document.addEventListener('keydown', function(e){
        if(e.key==='Escape' && document.body.classList.contains('chat-open')) closePreViewChat();
      });
    })();

    function pluginListingHref(listingUrl){
      const base='https://refty.ai/?ref=24WNXAJP';
      if(!listingUrl) return base+'#extension';
      return base+'&listing='+encodeURIComponent(String(listingUrl))+'#extension';
    }
    function pluginCtaHtml(u){
      const href=pluginListingHref(u && u.url);
      return '<a class="plugin-cta" href="'+href+'" target="_blank" rel="noopener noreferrer" title="Refty browser extension">' +
        '<span class="plugin-cta-k">Refty plugin</span>' +
        '<span class="plugin-cta-t">Установи плагин и перейди на original ad</span>' +
        '<span class="plugin-cta-go">Открыть →</span>' +
      '</a>';
    }
    function originalAdHtml(u){
      if(!u||!u.url) return '';
      const href=pluginListingHref(u.url);
      return '<p class="original-ad-wrap"><a class="original-ad" href="'+href+'" target="_blank" rel="noopener noreferrer" title="Open via Refty plugin">Original ad</a></p>';
    }
    function actionsChatHtml(u,f){
      const watching=!!monitorStore()[unitKey(u)];
      const broker=u.broker&&u.broker!=='—' ? u.broker : 'брокером';
      const mo=marketOfferFor(u);
      const offerHint=mo
        ? ('≈ '+fmtP(mo.offer,tab)+(mo.vsAsk!=null?' · '+(mo.vsAsk>0?'+':'')+mo.vsAsk+'% к ask':''))
        : 'Нужен vs market или vs similar';
      const ppsBit=ppsRelLine(u);
      const face=dealFace(u);
      const tag=overpriceTag(u);
      return '<div class="act-chat" id="act-chat" data-key="'+String(unitKey(u)).replace(/"/g,'&quot;')+'">' +
        '<div class="act-chat-head">' +
          '<div class="act-avatar tone-'+face.tone+'" title="'+face.label+'">'+face.emoji+'</div>' +
          '<div><b>Refty AI <span class="act-face">'+face.emoji+'</span></b><span>'+unitLabel(u,f)+' · '+fmtP(u.price,tab)+' · <b>'+face.shortLabel+'</b></span></div>' +
          tgVoiceBtnHtml(face) +
          '<i class="act-dot" title="online"></i>' +
          '<button type="button" class="detail-close-mob" id="detailCloseMob" aria-label="Закрыть детали">✕</button>' +
        '</div>' +
        '<div class="act-thread" id="act-thread">' +
          unitKpiPanelHtml(u,f) +
          '<div class="act-block act-block--price">' +
            '<div class="act-block-h">Изменение цены · price drop</div>' +
            priceMovementHtml(u) +
          '</div>' +
          '<div class="act-block act-block--valuate">' +
            '<div class="act-block-h">Оценка объекта</div>' +
            '<button type="button" class="ux-valuate-btn" id="uxValuateBtn" aria-haspopup="dialog" aria-controls="uxValOverlay">' +
              'Открыть полную оценку' +
            '</button>' +
          '</div>' +
          '<div class="act-block act-block--unit">' +
            '<div class="act-block-h">Объект</div>' +
            '<div class="act-msg bot" style="max-width:100%;margin:0"><span class="meta">Refty AI '+face.emoji+'</span>' +
              'Лот <b>'+unitLabel(u,f)+'</b> · '+fmtP(u.price,tab)+
              ' · '+marketSimilarLine(u)+(ppsBit?' · '+ppsBit:'')+' · вид <b>'+viewLabel(u)+'</b> · '+(u.broker||'—')+
              (tag?' · <b>'+tag+'</b>':'')+
              '.<br/>'+unitParamsHtml(u)+
              face.emoji+' '+face.shortLabel+'.' +
              originalAdHtml(u) +
            '</div>' +
          '</div>' +
          '<div class="act-block act-block--reco">' +
            '<div class="act-block-h">Рекомендатор</div>' +
            recommendHtml(u) +
          '</div>' +
          '<div class="act-opts" id="act-opts">' +
            '<button type="button" class="act-opt act-opt--offer" data-act="offer">' +
              '<span class="ot">💰 Оффер + Refty плагин</span>' +
              '<span class="od">Рыночная цена · поиск ×10 · бронь в 1 клик · '+offerHint+'</span>' +
            '</button>' +
            '<button type="button" class="act-opt" data-act="leadchat">' +
              '<span class="ot">🦴 Off-market запрос брокерам</span>' +
              '<span class="od">Скрытые офферы по зданию · invite брокерам с нужным BR</span>' +
            '</button>' +
            '<button type="button" class="act-opt" data-act="invite">' +
              '<span class="ot">🔗 Инвайт для брокера</span>' +
              '<span class="od">B2B inbox · юнит + thread · открыть / скопировать</span>' +
            '</button>' +
            '<button type="button" class="act-opt" data-act="watch">' +
              '<span class="ot">'+(watching?'✓ Уже на мониторинге':'🔔 Следить за ценой')+'</span>' +
              '<span class="od">Алерт, если цена упадёт или вырастет</span>' +
            '</button>' +
            '<button type="button" class="act-opt" data-act="chat">' +
              '<span class="ot">💬 Off-market по этому лоту</span>' +
              '<span class="od">Бриф инвестора + invite брокеру · '+broker+'</span>' +
            '</button>' +
            '<button type="button" class="act-opt" data-act="viewing">' +
              '<span class="ot">📅 Забронировать в 1 клик</span>' +
              '<span class="od">Все квартиры через нашего бота — без звонков брокеру</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        swipeChatWrapHtml(u, { kind:'desk' }) +
      '</div>';
    }
    function bindActionsChat(u,f){
      const root=detailEl.querySelector('#act-chat');
      const thread=detailEl.querySelector('#act-thread');
      const opts=detailEl.querySelector('#act-opts');
      if(!root||!thread) return;
      const voiceBtn=root.querySelector('#act-voice');
      if(voiceBtn){
        // Stop bubble so document onUserGesture does not flush voicePending and
        // set is-playing before this click's onclick (which would mute instead of play).
        voiceBtn.addEventListener('pointerdown', function(e){
          e.stopPropagation();
          unlockAudio();
          markVoiceGesture({ skipPending: true });
        }, { capture: true, passive: true });
        voiceBtn.onclick=()=>{
          unlockAudio();
          markVoiceGesture({ skipPending: true });
          if (voiceMuted()) {
            setVoiceMuted(false);
            playUnitVoiceNow(u, f);
            return;
          }
          const speaking = !!(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending));
          if (voiceBtn.classList.contains('is-playing') && speaking) {
            setVoiceMuted(true);
            cancelUnitVoice();
            return;
          }
          playUnitVoiceNow(u, f);
        };
      }
      scheduleUnitVoice(u,f);
      const key=unitKey(u);
      const label=unitLabel(u,f);
      const priceTxt=fmtP(u.price,tab);

      root.querySelectorAll('.reco-item[data-s]').forEach((btn)=>{
        btn.onclick=()=>{
          const i=+btn.getAttribute('data-s');
          if(Number.isFinite(i)) selectStack(i, { scroll:true });
        };
      });
      root.querySelectorAll('.ux-jump[data-s]').forEach((btn)=>{
        btn.onclick=()=>{
          const i=+btn.getAttribute('data-s');
          if(Number.isFinite(i)) selectStack(i, { scroll:true });
        };
      });

      (function bindValuationModal(){
        const overlay=document.getElementById('uxValOverlay');
        const body=document.getElementById('uxValBody');
        const dialog=document.getElementById('uxValDialog');
        const openBtn=root.querySelector('#uxValuateBtn');
        if(!overlay||!body||!openBtn) return;
        function closeVal(){
          if(overlay.hidden) return;
          overlay.hidden=true;
          overlay.setAttribute('aria-hidden','true');
          document.body.classList.remove('ux-val-open');
          body.innerHTML='';
        }
        function openVal(){
          body.innerHTML=unitValuationFullHtml(u,f);
          overlay.hidden=false;
          overlay.setAttribute('aria-hidden','false');
          document.body.classList.add('ux-val-open');
          body.querySelectorAll('.ux-jump[data-s]').forEach(function(btn){
            btn.onclick=function(){
              const i=+btn.getAttribute('data-s');
              closeVal();
              if(Number.isFinite(i)) selectStack(i, { scroll:true });
            };
          });
          try{ if(dialog) dialog.focus(); }catch(e){}
          const x=overlay.querySelector('.ux-val-x');
          try{ if(x) x.focus(); }catch(e){}
        }
        openBtn.onclick=function(e){ e.preventDefault(); openVal(); };
        overlay.querySelectorAll('[data-ux-val-dismiss]').forEach(function(el){
          el.onclick=function(){ closeVal(); };
        });
        if(!overlay._uxValEsc){
          overlay._uxValEsc=true;
          document.addEventListener('keydown', function(e){
            if(e.key==='Escape' && overlay && !overlay.hidden){
              e.preventDefault();
              closeVal();
            }
          });
        }
      })();

      if(!opts) return;

      function addBot(html){
        const el=document.createElement('div');
        el.className='act-msg bot';
        el.innerHTML='<span class="meta">Refty AI</span>'+html;
        thread.appendChild(el);
        el.scrollIntoView({block:'nearest', behavior:'smooth'});
        return el;
      }
      function addUser(text){
        const el=document.createElement('div');
        el.className='act-msg user';
        el.textContent=text;
        thread.appendChild(el);
      }
      function disableOpts(active){
        opts.querySelectorAll('.act-opt').forEach(b=>{
          b.disabled=true;
          b.classList.toggle('is-on', b.getAttribute('data-act')===active);
        });
      }

      const PLUGIN_INVITE='https://refty.ai/invite?ref=24WNXAJP';
      function invitePitchHtml(){
        return '<div class="act-invite">' +
          '<b>Установи плагин Refty</b>' +
          '<p>Ищи объекты на порталах <b>в 10 раз быстрее</b> и бронируй все квартиры через нашего бота <b>в 1 клик</b> — без прямого общения с брокерами.</p>' +
          '<a class="act-invite-go" href="'+PLUGIN_INVITE+'" target="_blank" rel="noopener noreferrer">Открыть invite →</a>' +
        '</div>';
      }
      function brokerInvitePitchHtml(joinUrl){
        const url=joinUrl||(B2B_INBOX_BASE+'?tab=property');
        return '<div class="act-invite">' +
          '<b>Инвайт для брокера</b>' +
          '<p>Внутренняя ссылка в B2B inbox — брокер заходит в чат по юниту и thread.</p>' +
          '<p class="act-invite-url">'+url+'</p>' +
          '<a class="act-invite-go" href="'+url+'" target="_blank" rel="noopener noreferrer">Открыть инвайт →</a>' +
          '<button type="button" class="act-invite-copy-btn" id="act-broker-invite-copy">Копировать ссылку</button>' +
        '</div>';
      }

      opts.addEventListener('click', (e)=>{
        const btn=e.target.closest('.act-opt[data-act]');
        if(!btn||btn.disabled) return;
        const act=btn.getAttribute('data-act');

        if(act==='leadchat'){
          addUser('Off-market запрос брокерам здания');
          disableOpts('leadchat');
          const rooms=String(u.rooms||'1');
          const view=viewLabel(u);
          const purpose=String(tab).includes('rent')?'for-rent':'for-sale';
          const text='Off-market: интересует '+rooms+' BR в '+data.building+(u.unit_number?(' · #'+u.unit_number):'')+' · вид '+view+'. Готов смотреть / бронировать быстро.';
          addBot(
            'Откроем <b>off-market запрос</b> брокерам здания с '+rooms+' BR. Заполни форму ниже или отправь как есть.'
          );
          setTimeout(function(){
            if(window.reftyPrefillBuildingLead){
              window.reftyPrefillBuildingLead({ purpose:purpose, rooms:rooms, view:view, text:text });
            }
            if(window.reftyBuildingRoomPost){
              window.reftyBuildingRoomPost({ role:'investor', text:text, me:true, scroll:false });
            }
            const el=document.getElementById('building-room') || document.getElementById('building-under');
            if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
            closeUnitDetails();
          }, 200);
          return;
        }

        if(act==='invite'){
          addUser('Инвайт для брокера');
          disableOpts('invite');
          const threadId=newChatThreadId(u);
          const joinUrl=buildBrokerJoinUrl(u,f,threadId);
          chatCtx={u:u,f:f,threadId:threadId,brokerJoinUrl:joinUrl};
          fillBrokerInviteUi(joinUrl);
          const box=addBot(
            'Ссылка для брокера (вход в чат):' +
            brokerInvitePitchHtml(joinUrl)
          );
          const copyBtn=box.querySelector('#act-broker-invite-copy');
          if(copyBtn){
            copyBtn.onclick=function(){
              const url=chatCtx.brokerJoinUrl||joinUrl;
              const done=function(){
                copyBtn.textContent='Скопировано';
                copyBtn.classList.add('is-ok');
                setTimeout(function(){
                  copyBtn.textContent='Копировать ссылку';
                  copyBtn.classList.remove('is-ok');
                },1600);
              };
              if(navigator.clipboard&&navigator.clipboard.writeText){
                navigator.clipboard.writeText(url).then(done).catch(function(){
                  try{ window.prompt('Скопируй ссылку', url); }catch(e){}
                  done();
                });
              } else {
                try{ window.prompt('Скопируй ссылку', url); }catch(e){}
                done();
              }
            };
          }
          return;
        }

        if(act==='offer'){
          addUser('Предложи рыночную цену и дай плагин');
          disableOpts('offer');
          const mo=marketOfferFor(u);
          if(!mo){
            addBot('Не могу посчитать оффер: нет vs market и vs similar по лоту.'+invitePitchHtml());
            return;
          }
          const dropTxt=mo.dldDrop==null
            ? 'нет ряда DLD'
            : ((mo.dldDrop>0?'+':'')+mo.dldDrop+'% vs med AED/sqft');
          const appliedTxt=mo.dropApplied<0
            ? ('учтено падение DLD <b>'+mo.dropApplied+'%</b>')
            : 'падения DLD нет — оффер без доп. скидки';
          const box=addBot(
            '<b>Рыночный оффер: '+fmtP(mo.offer,tab)+'</b>' +
            (mo.vsAsk!=null?' <span class="act-ok">('+(mo.vsAsk>0?'+':'')+mo.vsAsk+'% к ask)</span>':'') +
            '<br/><br/>Как посчитали (приоритет vs market):' +
            '<br/>1) Ask <b>'+fmtP(mo.ask,tab)+'</b>' +
            '<br/>2) vs market '+pctTxt(mo.pvm)+' → fair <b>'+(mo.fairM!=null?fmtP(roundOffer(mo.fairM, mo.isRent),tab):'—')+'</b>' +
            '<br/>3) vs similar '+pctTxt(mo.pvs)+' → fair <b>'+(mo.fairS!=null?fmtP(roundOffer(mo.fairS, mo.isRent),tab):'—')+'</b>' +
            '<br/>4) Blend <b>'+mo.blend+'</b> → <b>'+fmtP(roundOffer(mo.fair, mo.isRent),tab)+'</b>' +
            '<br/>5) DLD AED/sqft: last '+(mo.lastPps!=null?Math.round(mo.lastPps):'—')+
              ' · med '+(mo.medPps!=null?Math.round(mo.medPps):'—')+' · '+dropTxt +
            '<br/>6) '+appliedTxt+' → <b>'+fmtP(mo.offer,tab)+'</b>' +
            invitePitchHtml() +
            '<div class="act-form">' +
              '<label>Отправить оффер через бота (без прямого общения с брокером)</label>' +
              '<input type="tel" id="act-offer-phone" placeholder="WhatsApp +971 …" />' +
              '<button type="button" class="act-go" id="act-offer-go">Отправить оффер ботом</button>' +
            '</div>'
          );
          const go=box.querySelector('#act-offer-go');
          if(go) go.onclick=()=>{
            const phone=(box.querySelector('#act-offer-phone').value||'').trim();
            if(!phone){ addBot('Нужен WhatsApp — куда вернуть ответ.'); return; }
            addUser('Отправь оффер '+fmtP(mo.offer,tab)+' · '+phone);
            addBot(
              'Бот отправляет оффер <b>'+fmtP(mo.offer,tab)+'</b> по '+label+' без твоего прямого общения с брокером.' +
              '<br/>Ответ придёт на <b>'+phone+'</b>. <span class="act-ok">Оффер в очереди</span>' +
              invitePitchHtml()
            );
          };
          return;
        }

        if(act==='watch'){
          addUser('Поставь на мониторинг цены');
          disableOpts('watch');
          const already=!!monitorStore()[key];
          if(already){
            setMonitor(key, null);
            addBot('Снял <b>'+label+'</b> с мониторинга. Можешь снова включить, выбрав лот заново.');
            return;
          }
          setMonitor(key, {
            permit:u.permit_number||null,
            unit:u.unit_number||null,
            building:data.building,
            price:u.price,
            purpose:tab,
            at:new Date().toISOString(),
            url:u.url||null,
            broker:u.broker||null,
          });
          addBot(
            'Готово. Слежу за <b>'+label+'</b> · сейчас <b>'+priceTxt+'</b>.<br/>' +
            'Пришлю сигнал, если цена изменится (падение или рост).<br/>' +
            '<span class="act-ok">Мониторинг включён · сохранено в этом браузере</span>'
          );
          return;
        }

        if(act==='chat'){
          addUser('Off-market запрос по лоту');
          disableOpts('chat');
          addBot('Открываю <b>off-market запрос</b> по лоту '+label+' — бриф инвестора (комиссия через Refty) + invite брокеру.');
          setTimeout(function(){ openPreViewChat(u,f); }, 120);
          return;
        }

        if(act==='viewing'){
          addUser('Забронировать показ через бота');
          disableOpts('viewing');
          const box=addBot(
            'Забронируем показ по <b>'+label+'</b>. Бот согласует слот с агентством.' +
            '<div class="act-form">' +
              '<label>Когда удобно</label>' +
              '<select id="act-when">' +
                '<option value="today">Сегодня после 16:00</option>' +
                '<option value="tomorrow">Завтра утро</option>' +
                '<option value="weekend">Выходные</option>' +
                '<option value="any">Любой ближайший слот</option>' +
              '</select>' +
              '<label>WhatsApp для подтверждения</label><input type="tel" id="act-vphone" placeholder="+971 …" />' +
              '<button type="button" class="act-go" id="act-view-go">Забронировать</button>' +
            '</div>'
          );
          box.querySelector('#act-view-go').onclick=()=>{
            const when=box.querySelector('#act-when');
            const whenTxt=when.options[when.selectedIndex].text;
            const phone=(box.querySelector('#act-vphone').value||'').trim();
            if(!phone){ addBot('Нужен WhatsApp — пришлю подтверждение слота.'); return; }
            addUser(whenTxt+' · '+phone);
            addBot(
              'Заявка на показ отправлена боту.<br/>' +
              'Лот: <b>'+label+'</b> · '+whenTxt+' · брокер '+(u.broker||'—')+'.<br/>' +
              'Подтверждение придёт на <b>'+phone+'</b>. <span class="act-ok">Показ в бронировании</span>'
            );
          };
        }
      });
    }

    function openUnitDetails(sIdx){
      if(sIdx!=null && stack[sIdx]){
        selectStack(sIdx, { silent:true, skipDetail:false });
      } else {
        renderDetail();
      }
      document.body.classList.add('detail-open');
      const bd=document.getElementById('detailBackdrop');
      if(bd){ bd.hidden=false; bd.setAttribute('aria-hidden','false'); }
      try{ detailEl.scrollTop=0; }catch(e){}
    }
    function closeUnitDetails(){
      document.body.classList.remove('detail-open');
      const bd=document.getElementById('detailBackdrop');
      if(bd){ bd.hidden=true; bd.setAttribute('aria-hidden','true'); }
    }
    function isMobileDetailMode(){
      return window.matchMedia && window.matchMedia('(max-width:1100px)').matches;
    }

    function renderDetail(){
      const f = curFloor();
      const u = f && f.rows[unitIdx];
      if (!u){ detailEl.className='detail empty'; detailEl.textContent='Выбери лот'; return; }
      detailEl.className='detail';
      detailEl.innerHTML = actionsChatHtml(u,f);
      bindActionsChat(u,f);
      bindAllSwipeChats(detailEl);
      bindContinueChatButtons(detailEl, u, f);
      syncChatFab(u,f);
      detailEl.querySelectorAll('.unit-cheaper-btn:not([disabled])').forEach(function(btn){
        btn.onclick=function(e){
          e.preventDefault();
          e.stopPropagation();
          const to=+btn.getAttribute('data-to');
          if(Number.isFinite(to)) selectStack(to, { scroll:true });
          else jumpToCheaper(stackIdx);
        };
      });
      const closeBtn=document.getElementById('detailCloseMob');
      if(closeBtn) closeBtn.onclick=function(e){ e.preventDefault(); e.stopPropagation(); closeUnitDetails(); };
    }

    function mount(resetFloor){
      renderRoomsFilters();
      if (resetFloor!==false) renderFloors();
      else {
        floorsEl.querySelectorAll('.floor-btn').forEach(b=>b.classList.toggle('is-on', b.getAttribute('data-f')===floorId));
      }
      renderStage();
      renderDetail();
      updateHeroMobTitle();
      try{ updateMobBrokerDock(); }catch(e){}
    }

    document.querySelectorAll('.tab[data-tab]').forEach(t=>{
      t.onclick=()=>{
        tab=t.getAttribute('data-tab');
        document.querySelectorAll('.tab[data-tab]').forEach(x=>x.classList.toggle('is-on',x.getAttribute('data-tab')===tab));
        floorId=null; unitIdx=0; closeUnitDetails(); mount();
      };
    });
    (function bindDetailSheetUi(){
      const bd=document.getElementById('detailBackdrop');
      if(bd) bd.addEventListener('click', function(){ closeUnitDetails(); });
      document.addEventListener('keydown', function(e){
        if(e.key!=='Escape') return;
        if(document.body.classList.contains('chat-open')) return;
        if(document.body.classList.contains('detail-open')) closeUnitDetails();
      });
      window.addEventListener('resize', function(){
        if(!isMobileDetailMode() && document.body.classList.contains('detail-open')){
          closeUnitDetails();
        }
        try{
          const cur=stack[stackIdx];
          if(cur) syncChatFab(cur.u, cur.f);
          else syncChatFab(null,null);
        }catch(e){}
      });
    })();
    try{ seedDemoUnreadForStarted(); }catch(e){}
    (function syncStickyTabsHeight(){
      function apply(){
        const root=document.documentElement;
        const mobile=window.matchMedia('(max-width:1100px)').matches;
        if(mobile){
          const mob=document.getElementById('heroMobTop');
          if(!mob) return;
          const h=Math.ceil(mob.getBoundingClientRect().height);
          if(h>0) root.style.setProperty('--mob-head-h', h+'px');
          return;
        }
        const chrome=document.getElementById('deskChrome') || document.querySelector('.workspace-tabs');
        if(!chrome) return;
        const h=Math.ceil(chrome.getBoundingClientRect().height);
        if(h>0) root.style.setProperty('--tabs-h', h+'px');
      }
      apply();
      window.addEventListener('resize', apply);
      try{
        if(typeof ResizeObserver!=='undefined'){
          const chrome=document.getElementById('deskChrome') || document.querySelector('.workspace-tabs');
          const mob=document.getElementById('heroMobTop');
          if(chrome) new ResizeObserver(apply).observe(chrome);
          if(mob) new ResizeObserver(apply).observe(mob);
        }
      }catch(e){}
    })();
    (function introCountdown24h(){
      const els=document.querySelectorAll('[data-intro-countdown]');
      if(!els.length) return;
      const KEY='refty_intro_deadline_mg2_b';
      const DAY=24*60*60*1000;
      function pad(n){ return String(n).padStart(2,'0'); }
      function getEnd(){
        try{
          const raw=localStorage.getItem(KEY);
          const n=raw?Number(raw):NaN;
          if(Number.isFinite(n) && n>Date.now()) return n;
          const end=Date.now()+DAY;
          localStorage.setItem(KEY, String(end));
          return end;
        }catch(e){ return Date.now()+DAY; }
      }
      const end=getEnd();
      const iso=new Date(end).toISOString();
      els.forEach(function(el){ el.setAttribute('datetime', iso); });
      function tick(){
        const left=Math.max(0, end-Date.now());
        if(left<=0){
          els.forEach(function(el){
            el.textContent='00:00:00';
            el.classList.add('is-ended');
            el.title='Intro-окно закрыто';
          });
          return;
        }
        const s=Math.floor(left/1000);
        const text=pad(Math.floor(s/3600))+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60);
        els.forEach(function(el){ el.textContent=text; });
        setTimeout(tick, 1000);
      }
      tick();
    })();
    const reftyGoogleAuth=(function googleAuthMock(){
      const KEY='refty_google_auth_mg2_b';
      const demo={ name:'Alex Marina', email:'alex.marina@gmail.com', initials:'AM' };
      const overlay=document.getElementById('gauthOverlay');
      const dialog=document.getElementById('gauthDialog');
      let pendingOk=null;
      let lastFocus=null;
      let signingIn=false;
      function read(){
        try{
          const raw=localStorage.getItem(KEY);
          if(!raw) return null;
          const u=JSON.parse(raw);
          if(u && u.email) return u;
        }catch(e){}
        return null;
      }
      function write(u){
        try{
          if(u) localStorage.setItem(KEY, JSON.stringify(u));
          else localStorage.removeItem(KEY);
        }catch(e){}
      }
      function paint(user){
        document.querySelectorAll('[data-auth-slot]').forEach(function(slot){
          const profile=slot.querySelector('[data-auth-profile]');
          const btn=slot.querySelector('[data-auth-google]');
          if(user){
            slot.classList.add('is-in');
            if(profile) profile.hidden=false;
            if(btn) btn.setAttribute('aria-hidden','true');
            const av=slot.querySelector('[data-auth-avatar]');
            const nm=slot.querySelector('[data-auth-name]');
            const em=slot.querySelector('[data-auth-email]');
            if(av) av.textContent=user.initials||'?';
            if(nm) nm.textContent=user.name||'User';
            if(em) em.textContent=user.email||'';
          } else {
            slot.classList.remove('is-in');
            if(profile) profile.hidden=true;
            if(btn) btn.removeAttribute('aria-hidden');
          }
        });
      }
      function closePopup(){
        if(!overlay || overlay.hidden) return;
        overlay.hidden=true;
        overlay.setAttribute('aria-hidden','true');
        document.body.classList.remove('gauth-open');
        pendingOk=null;
        if(lastFocus && typeof lastFocus.focus==='function'){
          try{ lastFocus.focus(); }catch(e){}
        }
        lastFocus=null;
      }
      function openPopup(onOk){
        if(!overlay){
          if(typeof onOk==='function') onOk(demo);
          return;
        }
        pendingOk=typeof onOk==='function' ? onOk : null;
        lastFocus=document.activeElement;
        overlay.hidden=false;
        overlay.setAttribute('aria-hidden','false');
        document.body.classList.add('gauth-open');
        const cont=document.getElementById('gauthContinue');
        const acc=document.getElementById('gauthAccount');
        if(cont) cont.classList.remove('is-loading');
        if(acc) acc.disabled=false;
        const focusEl=document.getElementById('gauthAccount') || dialog;
        try{ if(focusEl) focusEl.focus(); }catch(e){}
      }
      function completeSignIn(){
        if(signingIn) return;
        signingIn=true;
        const cb=pendingOk;
        pendingOk=null;
        const cont=document.getElementById('gauthContinue');
        const acc=document.getElementById('gauthAccount');
        if(cont) cont.classList.add('is-loading');
        if(acc) acc.disabled=true;
        setTimeout(function(){
          write(demo);
          paint(demo);
          if(cont) cont.classList.remove('is-loading');
          if(acc) acc.disabled=false;
          signingIn=false;
          closePopup();
          if(typeof cb==='function') cb(demo);
        }, 420);
      }
      function ensureAuth(onOk){
        if(read()){
          if(typeof onOk==='function') onOk(read());
          return;
        }
        openPopup(onOk);
      }
      paint(read());
      if(overlay){
        overlay.querySelectorAll('[data-gauth-dismiss]').forEach(function(el){
          el.addEventListener('click', function(){ if(!signingIn) closePopup(); });
        });
        overlay.querySelectorAll('[data-gauth-continue]').forEach(function(el){
          el.addEventListener('click', function(e){ e.preventDefault(); completeSignIn(); });
        });
        document.addEventListener('keydown', function(e){
          if(e.key==='Escape' && overlay && !overlay.hidden){
            if(signingIn) return;
            e.preventDefault();
            closePopup();
          }
        });
      }
      document.querySelectorAll('[data-auth-google]').forEach(function(btn){
        btn.addEventListener('click', function(){ ensureAuth(function(){}); });
      });
      document.querySelectorAll('[data-auth-out]').forEach(function(btn){
        btn.addEventListener('click', function(){ write(null); paint(null); });
      });
      return { read:read, ensureAuth:ensureAuth, openPopup:openPopup };
    })();
    (function silentOfferClicks(){
      const overlay=document.getElementById('tariffsOverlay');
      const dialog=document.getElementById('tariffsDialog');
      let lastFocus=null;
      function closeTariffs(){
        if(!overlay || overlay.hidden) return;
        overlay.hidden=true;
        overlay.setAttribute('aria-hidden','true');
        document.body.classList.remove('tariffs-open');
        if(lastFocus && typeof lastFocus.focus==='function'){
          try{ lastFocus.focus(); }catch(e){}
        }
        lastFocus=null;
      }
      function openTariffs(){
        if(!overlay){
          window.location.href='/pricing_silent_v1_higgsfield';
          return;
        }
        lastFocus=document.activeElement;
        overlay.hidden=false;
        overlay.setAttribute('aria-hidden','false');
        document.body.classList.add('tariffs-open');
        try{ if(dialog) dialog.focus(); }catch(e){}
        const x=overlay.querySelector('.tariffs-x');
        try{ if(x) x.focus(); }catch(e){}
      }
      ['tarif-chip-silent','tarif-chip-silent-mob'].forEach(function(id){
        const el=document.getElementById(id);
        if(el) el.addEventListener('click', function(e){ e.preventDefault(); openTariffs(); });
      });
      if(overlay){
        overlay.querySelectorAll('[data-tariffs-dismiss]').forEach(function(el){
          el.addEventListener('click', closeTariffs);
        });
        document.addEventListener('keydown', function(e){
          if(e.key==='Escape' && overlay && !overlay.hidden){
            e.preventDefault();
            closeTariffs();
          }
        });
        overlay.querySelectorAll('[data-tarif-pick]').forEach(function(btn){
          btn.addEventListener('click', function(){
            const pick=btn.getAttribute('data-tarif-pick')||'silent';
            reftyGoogleAuth.ensureAuth(function(){
              window.location.href='/pricing_silent_v1_higgsfield#'+encodeURIComponent(pick);
            });
          });
        });
      }
    })();

    (function mobAppDockNav(){
      const dock=document.getElementById('mobAppDock');
      const sheet=document.getElementById('mobAiSheet');
      const input=document.getElementById('mobAiInput');
      const go=document.getElementById('mobAiGo');
      const deskSearch=document.getElementById('deskSearchDubai');
      const B2B_INBOX='https://b2b.refty.ai/inbox';
      function closeAi(){
        if(!sheet || sheet.hidden) return;
        sheet.hidden=true;
        sheet.setAttribute('aria-hidden','true');
        document.body.classList.remove('mob-ai-open');
      }
      function openAi(){
        if(window.matchMedia('(max-width:1100px)').matches && sheet){
          sheet.hidden=false;
          sheet.setAttribute('aria-hidden','false');
          document.body.classList.add('mob-ai-open');
          setTimeout(function(){ try{ if(input) input.focus(); }catch(e){} }, 60);
          return;
        }
        if(deskSearch){
          try{ deskSearch.focus(); }catch(e){}
        }
      }
      function runAi(){
        const q=((input && input.value) || (deskSearch && deskSearch.value) || '').trim();
        if(deskSearch && input && input.value) deskSearch.value=input.value;
        closeAi();
        if(!q){ openAi(); return; }
        reftyGoogleAuth.ensureAuth(function(){
          try{ console.info('[refty-ai-search]', q); }catch(e){}
        });
      }
      if(sheet){
        sheet.querySelectorAll('[data-mob-ai-dismiss]').forEach(function(el){
          el.addEventListener('click', closeAi);
        });
        if(input) input.addEventListener('keydown', function(e){
          if(e.key==='Enter'){ e.preventDefault(); runAi(); }
        });
        if(go) go.addEventListener('click', runAi);
        document.addEventListener('keydown', function(e){
          if(e.key==='Escape' && sheet && !sheet.hidden){ e.preventDefault(); closeAi(); }
        });
      }
      if(dock){
        try{
          if(typeof ResizeObserver!=='undefined'){
            new ResizeObserver(function(){
              const h=Math.ceil(dock.getBoundingClientRect().height);
              if(h>0) document.documentElement.style.setProperty('--mob-nav-h', h+'px');
            }).observe(dock);
          }
        }catch(e){}
        dock.addEventListener('click', function(e){
          const btn=e.target.closest('[data-mob-nav]');
          if(!btn) return;
          const nav=btn.getAttribute('data-mob-nav');
          if(nav==='ai'){ openAi(); return; }
          if(nav==='profile'){ reftyGoogleAuth.ensureAuth(function(){}); return; }
          if(nav==='inbox'){
            const openChat=document.querySelector('.chat-continue-btn, [data-chat-open]');
            if(openChat){ openChat.click(); return; }
            window.open(B2B_INBOX, '_blank', 'noopener');
            return;
          }
          if(nav==='collections'){
            const reviews=document.getElementById('reviews') || document.querySelector('.longread');
            if(reviews){
              try{ reviews.scrollIntoView({ behavior:'smooth', block:'start' }); }catch(err){}
            }
          }
        });
      }
    })();

    /* Desktop: sticky Marina Gate chrome; .page-below only after last/lowest floor. */
    (function deskFloorGate(){
      const mq = window.matchMedia('(min-width:1101px)');
      const host = document.querySelector('.desk-sticky-host');
      const pageBelow = document.getElementById('pageBelow');
      if (!host || !floorsEl) return;
      let unlockedSticky = false;

      function isDesktop(){ return mq.matches; }

      function lowestFloorId(){
        const fl = floors();
        if (!fl.length) return null;
        return fl[fl.length - 1].id;
      }

      function lastFloorBtn(){
        const last = lowestFloorId();
        if (last == null) return null;
        const id = String(last);
        const buttons = floorsEl.querySelectorAll('.floor-btn[data-f]');
        for (let i = 0; i < buttons.length; i++) {
          if (String(buttons[i].getAttribute('data-f')) === id) return buttons[i];
        }
        /* floors() is high→low; last rendered button = lowest floor */
        return buttons.length ? buttons[buttons.length - 1] : null;
      }

      function floorsAtBottom(){
        const max = floorsEl.scrollHeight - floorsEl.clientHeight;
        /* Rail fits all floors → require last floor selected (not auto-unlock). */
        if (max <= 2) return false;
        return floorsEl.scrollTop >= max - 8;
      }

      function lastFloorInView(){
        const btn = lastFloorBtn();
        if (!btn || !floorsEl.clientHeight) return false;
        const er = floorsEl.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        return br.bottom <= er.bottom + 4 && br.top >= er.top - 4;
      }

      function lowestSelected(){
        const last = lowestFloorId();
        return last != null && String(floorId) === String(last);
      }

      function gateOpen(){
        if (!isDesktop()) return true;
        if (unlockedSticky) return true;
        return floorsAtBottom() || lowestSelected() || lastFloorInView();
      }

      function deskPinned(){
        const r = host.getBoundingClientRect();
        return r.top <= 2 && r.bottom > 64;
      }

      function maxScrollLocked(){
        const top = host.getBoundingClientRect().top + window.scrollY;
        return Math.max(0, top + host.offsetHeight - window.innerHeight);
      }

      function clampDocScroll(){
        if (!isDesktop() || gateOpen()) return;
        if (!deskPinned()) return;
        const maxY = maxScrollLocked();
        if (window.scrollY > maxY + 1) {
          window.scrollTo(0, maxY);
        }
      }

      function syncPageBelowA11y(open){
        if (!pageBelow) return;
        if (open) {
          pageBelow.removeAttribute('inert');
          pageBelow.removeAttribute('aria-hidden');
        } else {
          pageBelow.setAttribute('inert', '');
          pageBelow.setAttribute('aria-hidden', 'true');
        }
      }

      function syncBody(){
        const open = isDesktop() && gateOpen();
        if (open) unlockedSticky = true;
        document.body.classList.toggle('desk-below-open', open);
        syncPageBelowA11y(open || !isDesktop());
      }

      function onFloorsProgress(){
        syncBody();
        clampDocScroll();
      }

      floorsEl.addEventListener('scroll', onFloorsProgress, { passive: true });

      const _sel = selectStack;
      selectStack = function(i, opts){
        _sel(i, opts);
        onFloorsProgress();
      };

      const _mount = mount;
      mount = function(resetFloor){
        _mount(resetFloor);
        onFloorsProgress();
      };

      window.addEventListener('scroll', function(){
        if (!isDesktop()) return;
        clampDocScroll();
        syncBody();
      }, { passive: true });

      window.addEventListener('wheel', function(e){
        if (!isDesktop() || gateOpen()) return;
        if (e.deltaY <= 0) return;
        if (!deskPinned()) return;
        /* Keep document on desk; push overflow into floors rail first */
        const max = floorsEl.scrollHeight - floorsEl.clientHeight;
        if (max > 2 && floorsEl.scrollTop < max - 2) {
          e.preventDefault();
          floorsEl.scrollTop += e.deltaY;
          onFloorsProgress();
          return;
        }
        if (!gateOpen()) {
          e.preventDefault();
          clampDocScroll();
        }
      }, { passive: false });

      /* Block deep-links into reviews until last floor unlocked */
      function guardHash(){
        if (!isDesktop() || gateOpen()) return;
        const h = (location.hash || '').toLowerCase();
        if (!h) return;
        if (h === '#reviews' || h === '#reviews-longread' || h === '#pagebelow' || h.indexOf('#review') === 0) {
          try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
          try { host.scrollIntoView({ block: 'start' }); } catch (err2) {}
        }
      }
      window.addEventListener('hashchange', guardHash);
      guardHash();

      if (pageBelow) {
        pageBelow.addEventListener('focusin', function(){
          if (!isDesktop() || gateOpen()) return;
          try {
            host.scrollIntoView({ block: 'start' });
          } catch (err) {}
        });
      }

      mq.addEventListener('change', function(){
        if (!mq.matches) unlockedSticky = false;
        onFloorsProgress();
      });
      onFloorsProgress();
    })();

    mount();
  })();
  </script>
</body>
</html>`;
}

module.exports = { renderSplitDeskHtml };
