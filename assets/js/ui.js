/* =========================================================
   ALI PLAST — интерфейсные компоненты: иконки, логотип,
   окна, уведомления, графики, QR-коды, печать этикеток
   ========================================================= */
(function () {
  'use strict';
  const AP = window.AP;
  const { html, raw, fmt: F } = AP;
  const UI = (AP.ui = {});

  /* ---------- Иконки (24×24, линия 2px) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    factory: '<path d="M2 21h20"/><path d="M3 21V10l6 4v-4l6 4V4h4l1 17"/><path d="M7 17h1M12 17h1M17 17h1"/>',
    scale: '<path d="M4 20h16"/><path d="M6 20 7.5 9h9L18 20"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0"/><path d="M12 13v3"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v13H5a2 2 0 0 1-2-2V5"/><circle cx="16" cy="13.5" r="1.3"/>',
    scale2: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0Z"/><path d="m19 7-3 7a3 3 0 0 0 6 0Z"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14v4M8 18h.01M12 18h.01"/>',
    id: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11.5" r="2.5"/><path d="M14 10h4M14 14h3M4.5 17a3.5 3.5 0 0 1 7 0"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    log: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    excel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 8 8 8M16 8l-8 8"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    droplet: '<path d="M12 2.7 6.3 8.3a8 8 0 1 0 11.4 0z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.4 1.3 1.4 2.3 2.5 2.7z"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    pallet: '<path d="M2 21h20M4 21v-2h16v2"/><rect x="4" y="11" width="7" height="8"/><rect x="13" y="11" width="7" height="8"/><rect x="8.5" y="3" width="7" height="8"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0M12 20h.01"/>',
    wifiOff: '<path d="M2 2l20 20M8.5 16.1a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 5.2-2.7M2 8.8A15 15 0 0 1 6.3 6.1M16.9 10.4a10 10 0 0 1 2.1 2.2M10.7 5.1A15 15 0 0 1 22 8.8M12 20h.01"/>',
    camera: '<path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z"/><circle cx="12" cy="13" r="3.5"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    bank: '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    recycle: '<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L7.2 9.5M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.2-2.1M14 16l-3 3 3 3M8.3 13.6 7.2 9.5 3.1 10.6M9.3 5.6l1.1-1.9A1.8 1.8 0 0 1 12 2.8a1.8 1.8 0 0 1 1.5.8l3.9 6.9M13.4 9.5l4.1 1.1 1.1-4.1"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2a5.6 5.6 0 0 0 5.4-5.6C22 6 17.5 2 12 2z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    tag: '<path d="M12 2H2v10l9.3 9.3a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7" cy="7" r="1.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    weight: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.9 1.5L2 20h20L19.4 9.5A2 2 0 0 0 17.5 8z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    split: '<path d="M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.2-2.8L3 3M15 9l6-6"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  };
  UI.icons = P;
  UI.icon = (name, cls) => raw('<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>');
  const I = UI.icon;

  /* ---------- Логотип: пакет-майка с радужным переливом плёнки ---------- */
  let logoN = 0;
  UI.logoMark = function (size = 38) {
    const g = 'lg' + ++logoN;
    return raw(`<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-label="ALI PLAST">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FE7F2"/><stop offset=".38" stop-color="#8FA9FF"/><stop offset=".7" stop-color="#C6A2FF"/><stop offset="1" stop-color="#FFB4DB"/></linearGradient></defs>
      <path d="M9 8a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 19 8v3.5q0 6 5 6t5-6V8a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 39 8v31a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z" fill="url(#${g})"/>
      <path d="M14 26q10 5 20 0M15 33q9 3.5 18 0" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M13 7.5v7" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`);
  };

  /* ---------- Мелкие помощники ---------- */
  UI.$ = (sel, root = document) => root.querySelector(sel);
  UI.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  UI.avatar = (name, id, cls = '') => html`<span class="avatar ${cls}" style="background:${AP.avatarColor(id || name)}">${AP.initials(name)}</span>`;
  UI.wsChip = (w) => (w === 'w1' ? html`<span class="chip w1">Цех №1</span>` : w === 'w2' ? html`<span class="chip w2">Цех №2</span>` : w === 'sklad' ? html`<span class="chip wh">Склад</span>` : html`<span class="chip ghost">Оба цеха</span>`);
  UI.money = (v) => (AP.seeMoney() ? F.money(v) : '•••');
  UI.empty = (title, text, icon = 'inbox') => html`<div class="empty">${I(icon)}<b>${title}</b>${text || ''}</div>`;
  UI.options = (list, val, empty) => html`${empty != null ? html`<option value="">${empty}</option>` : ''}${list.map((x) => html`<option value="${x[0]}" ${String(x[0]) === String(val) ? raw('selected') : ''}>${x[1]}</option>`)}`;
  UI.formData = (form) => {
    const d = {};
    new FormData(form).forEach((v, k) => { d[k] = typeof v === 'string' ? v.trim() : v; });
    UI.$$('input[type=checkbox]', form).forEach((c) => { if (c.name) d[c.name] = c.checked; });
    return d;
  };
  UI.kpi = ({ label, value, unit, icon, foot, spark, sparkColor, href, drill, cls = '' }) => html`
    <div class="card kpi ${href || drill ? 'clickable' : ''} ${spark ? 'has-spark' : ''} ${cls}" ${href ? raw(`data-href="${href}"`) : ''} ${drill ? raw(`data-drill="${AP.esc(drill)}"`) : ''}>
      <div class="k-label">${icon ? I(icon) : ''}${label}</div>
      <div class="k-value">${value}${unit ? html`<small>${unit}</small>` : ''}</div>
      ${foot ? html`<div class="k-foot">${foot}</div>` : ''}
      ${spark ? UI.spark(spark, sparkColor) : ''}
    </div>`;
  UI.delta = (cur, prev, invert) => {
    if (!prev) return html`<span class="delta flat">—</span>`;
    const d = (cur / prev - 1) * 100;
    const good = invert ? d < 0 : d > 0;
    if (Math.abs(d) < 0.5) return html`<span class="delta flat">0%</span>`;
    return html`<span class="delta ${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${F.num(Math.abs(d), Math.abs(d) < 10 ? 1 : 0)}%</span>`;
  };
  UI.progress = (f, cls = '', size = '') => html`<div class="progress ${size}"><i class="${cls}" style="width:${Math.max(0, Math.min(100, f * 100)).toFixed(1)}%"></i></div>`;
  /* сумма со знаком и цветом: приход зелёным «+», расход красным «−» */
  UI.signed = (v, fmt = F.m) => (Math.abs(v) < 0.5 ? html`<span class="amt-zero">0</span>` : v > 0 ? html`<span class="amt-in">+${fmt(v)}</span>` : html`<span class="amt-out">−${fmt(-v)}</span>`);

  /* ---------- Выпадающий список в стиле сайта ----------
     Настоящий <select> остаётся в форме (значение, change, FormData), поверх — своя кнопка и меню.
     На телефоне меню открывается «шторкой» снизу, в длинных списках есть поиск. */
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const SEL_PROTO = HTMLSelectElement.prototype;
  let openSel = null;
  function closeSelect(refocus) {
    if (!openSel) return;
    const s = openSel; openSel = null;
    s.menu.remove(); if (s.scrim) s.scrim.remove();
    s.wrap.classList.remove('open');
    s.btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', s.out, true);
    document.removeEventListener('keydown', s.key, true);
    window.removeEventListener('scroll', s.scroll, true);
    window.removeEventListener('resize', s.resize);
    if (refocus) s.btn.focus({ preventScroll: true });
  }
  UI.closeSelect = closeSelect;
  function fieldLabel(wrap) {
    const f = wrap.closest('.field');
    const l = f && f.querySelector(':scope > label');
    if (l) return l.textContent.replace('*', '').trim();
    const s = wrap.querySelector('select');
    return (s && (s.dataset.title || s.getAttribute('aria-label'))) || 'Выберите вариант';
  }
  // пункт списка: необязательная цветная точка (data-dot="b-info"), текст и счётчик справа (data-count)
  function optInner(o) {
    const d = o.dataset;
    return (o.hasAttribute('data-dot') ? '<i class="csel-dot ' + AP.esc(d.dot) + '"></i>' : '') + '<span>' + AP.esc(o.textContent) + '</span>' + (d.count != null ? '<em class="csel-n">' + AP.esc(d.count) + '</em>' : '');
  }
  function openSelect(sel, wrap, btn) {
    if (openSel && openSel.sel === sel) return closeSelect(true);
    closeSelect();
    if (sel.disabled) return;
    UI.hideTip();
    const sheet = matchMedia('(max-width: 720px)').matches;
    const opts = Array.from(sel.options);
    const menu = document.createElement('div');
    menu.className = 'csel-menu' + (sheet ? ' sheet' : '');
    menu.setAttribute('role', 'listbox');
    const searchable = opts.length > 8 && sel.dataset.search !== 'off';
    menu.innerHTML = (sheet ? '<div class="csel-sheet-h"><i></i><b>' + AP.esc(fieldLabel(wrap)) + '</b></div>' : '') + (searchable ? '<div class="csel-search"><input class="input input-sm" placeholder="Поиск…" autocomplete="off"></div>' : '') + '<div class="csel-list"></div>';
    const list = menu.querySelector('.csel-list');
    let act = sel.selectedIndex;
    let shown = [];
    const draw = (q) => {
      const s = (q || '').toLowerCase();
      shown = opts.map((o, i) => [o, i]).filter(([o]) => !s || o.textContent.toLowerCase().includes(s));
      list.innerHTML = shown.length ? shown.map(([o, i]) => (!s && o.hasAttribute('data-sep') ? '<div class="csel-sep" role="separator"></div>' : '') + '<div class="csel-opt' + (i === sel.selectedIndex ? ' sel' : '') + (i === act ? ' act' : '') + (o.disabled ? ' off' : '') + (o.dataset.count === '0' ? ' zero' : '') + '" role="option" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '">' + optInner(o) + CHECK + '</div>').join('') : '<div class="csel-empty">Ничего не найдено</div>';
    };
    draw();
    document.body.appendChild(menu);
    let scrim = null;
    if (sheet) { scrim = document.createElement('div'); scrim.className = 'csel-scrim'; document.body.insertBefore(scrim, menu); scrim.addEventListener('click', () => closeSelect()); }
    const place = () => {
      if (sheet) return;
      const r = wrap.getBoundingClientRect();
      menu.style.minWidth = r.width + 'px';
      const below = innerHeight - r.bottom - 10, above = r.top - 10;
      const h = Math.min(menu.scrollHeight, 480);
      const up = below < Math.min(h, 220) && above > below;
      menu.classList.toggle('up', up);
      menu.style.maxHeight = Math.max(160, Math.min(480, up ? above : below)) + 'px';
      const mh = Math.min(menu.scrollHeight, parseFloat(menu.style.maxHeight));
      menu.style.top = (up ? r.top - mh - 6 : r.bottom + 6) + 'px';
      const w = menu.offsetWidth;
      menu.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
    };
    place();
    const selEl = list.querySelector('.sel');
    if (selEl) selEl.scrollIntoView({ block: 'nearest' });
    const choose = (i) => {
      if (i == null || opts[i].disabled) return;
      const changed = sel.selectedIndex !== i;
      sel.selectedIndex = i;
      closeSelect(!sheet);
      if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    list.addEventListener('click', (e) => { const o = e.target.closest('.csel-opt'); if (o) choose(+o.dataset.i); });
    list.addEventListener('mousemove', (e) => { const o = e.target.closest('.csel-opt'); if (o && +o.dataset.i !== act) { act = +o.dataset.i; list.querySelectorAll('.act').forEach((x) => x.classList.remove('act')); o.classList.add('act'); } });
    const sInp = menu.querySelector('.csel-search input');
    if (sInp) { sInp.addEventListener('input', () => { act = -1; draw(sInp.value); if (shown[0]) { act = shown[0][1]; draw(sInp.value); } }); if (!sheet) setTimeout(() => sInp.focus(), 20); }
    let typed = '', typedT;
    const s = {
      sel, wrap, btn, menu, scrim,
      out: (e) => { if (!menu.contains(e.target) && !wrap.contains(e.target)) closeSelect(); },
      scroll: (e) => { if (!menu.contains(e.target)) closeSelect(); },
      resize: () => closeSelect(),
      key: (e) => {
        const idx = shown.map(([, i]) => i);
        const pos = idx.indexOf(act);
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeSelect(true); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = idx[Math.max(0, Math.min(idx.length - 1, pos + (e.key === 'ArrowDown' ? 1 : -1)))]; draw(sInp ? sInp.value : ''); const a = list.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' }); return; }
        if (e.key === 'Enter') { e.preventDefault(); choose(act); return; }
        if (e.key === 'Tab') { closeSelect(); return; }
        if (!sInp && e.key.length === 1) { clearTimeout(typedT); typed += e.key.toLowerCase(); typedT = setTimeout(() => (typed = ''), 700); const m = opts.findIndex((o) => o.textContent.toLowerCase().startsWith(typed)); if (m >= 0) { act = m; draw(); const a = list.querySelector('.act'); if (a) a.scrollIntoView({ block: 'nearest' }); } }
      },
    };
    openSel = s;
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => { document.addEventListener('mousedown', s.out, true); window.addEventListener('scroll', s.scroll, true); window.addEventListener('resize', s.resize); }, 0);
    document.addEventListener('keydown', s.key, true);
  }
  function buildSelect(sel) {
    const wrap = document.createElement('div');
    wrap.className = 'csel' + (sel.classList.contains('input-sm') ? ' sm' : '') + (sel.classList.contains('input-lg') ? ' lg' : '');
    const st = sel.getAttribute('style');
    if (st) { wrap.setAttribute('style', st); sel.removeAttribute('style'); }
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    wrap.appendChild(btn);
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    const sync = () => {
      const o = sel.options[sel.selectedIndex];
      btn.className = 'csel-btn ' + Array.from(sel.classList).filter((x) => /^lvl-/.test(x)).join(' ');
      btn.innerHTML = o ? optInner(o) : '<span>—</span>';
      btn.disabled = sel.disabled;
      wrap.classList.toggle('disabled', sel.disabled);
    };
    // программная смена значения (select.value = …) тоже обновляет кнопку
    ['value', 'selectedIndex'].forEach((p) => {
      const d = Object.getOwnPropertyDescriptor(SEL_PROTO, p);
      Object.defineProperty(sel, p, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); sync(); } });
    });
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'class'] });
    sel.addEventListener('change', sync);
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openSelect(sel, wrap, btn); });
    btn.addEventListener('keydown', (e) => { if (!openSel && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openSelect(sel, wrap, btn); } });
    sel._csel = { sync };
    sync();
  }
  UI.enhanceSelects = (root = document) => UI.$$('select.select', root).forEach((s) => (s._csel ? s._csel.sync() : buildSelect(s)));

  /* таблицы → карточки на телефоне: подписи столбцов берём из шапки */
  UI.labelTables = (root = document) => UI.$$('table.table:not(.no-stack)', root).forEach((t) => {
    const hs = UI.$$('thead th', t).map((th) => th.textContent.trim());
    if (!hs.length) return;
    UI.$$('tbody tr, tfoot tr', t).forEach((tr) => {
      let ci = 0;
      Array.from(tr.children).forEach((td) => { if (td.dataset.label == null) td.dataset.label = td.colSpan > 1 ? '' : hs[ci] || ''; ci += td.colSpan || 1; });
    });
    t.classList.add('stackable');
  });
  UI.enhance = (root = document) => { UI.enhanceSelects(root); UI.labelTables(root); };

  /* ---------- Уведомления ---------- */
  UI.toast = function (title, text, kind = 'ok') {
    let box = UI.$('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    const ic = { ok: 'check', warn: 'alert', bad: 'alert', info: 'info' }[kind];
    t.innerHTML = String(html`${I(ic)}<div class="grow"><b>${title}</b>${text ? html`<small>${text}</small>` : ''}</div>`);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, kind === 'bad' ? 6000 : 3800);
  };

  /* ---------- Окна ---------- */
  const stack = [];
  function openLayer(node) {
    document.body.appendChild(node);
    stack.push(node);
    document.body.style.overflow = 'hidden';
    UI.enhance(node);
    // на телефоне не открываем клавиатуру сразу — только по нажатию
    if (matchMedia('(pointer: coarse)').matches) return;
    const f = node.querySelector('[autofocus], input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea');
    if (f) setTimeout(() => f.focus(), 40);
  }
  UI.closeTop = function () {
    const n = stack.pop();
    if (n) { if (n._onClose) n._onClose(); n.remove(); }
    if (!stack.length) document.body.style.overflow = '';
  };
  UI.closeAll = () => { while (stack.length) UI.closeTop(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) UI.closeTop(); });

  UI.modal = function ({ title, sub, body, foot, size = '', onClose }) {
    const ov = document.createElement('div');
    ov.className = 'overlay center';
    ov.innerHTML = String(html`<div class="modal ${size}" role="dialog" aria-modal="true">
      <div class="modal-h"><div class="grow"><h2>${title}</h2>${sub ? html`<p>${sub}</p>` : ''}</div><button class="btn btn-icon btn-sm" data-close aria-label="Закрыть">${I('x')}</button></div>
      <div class="modal-b">${body}</div>${foot ? html`<div class="modal-f">${foot}</div>` : ''}</div>`);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) UI.closeTop(); });
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) UI.closeTop(); });
    ov._onClose = onClose;
    openLayer(ov);
    return ov;
  };
  UI.drawer = function ({ title, sub, body, foot, size = '', onClose, head }) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = String(html`<aside class="drawer ${size}" role="dialog" aria-modal="true">
      <div class="drawer-h">${head || ''}<div class="grow"><b>${title}</b>${sub ? html`<small>${sub}</small>` : ''}</div><button class="btn btn-icon" data-close aria-label="Закрыть">${I('x')}</button></div>
      <div class="drawer-b">${body}</div>${foot ? html`<div class="drawer-f">${foot}</div>` : ''}</aside>`);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) UI.closeTop(); });
    ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) UI.closeTop(); });
    ov._onClose = onClose;
    openLayer(ov);
    UI.drawCharts(ov);
    return ov;
  };
  UI.confirm = (title, text, { ok = 'Подтвердить', danger = false } = {}) => new Promise((res) => {
    let done = false;
    const m = UI.modal({
      title, body: html`<p class="text-2">${text}</p>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${ok}</button>`,
      onClose: () => { if (!done) res(false); },
    });
    m.querySelector('[data-ok]').onclick = () => { done = true; UI.closeTop(); res(true); };
  });
  /* окно с обязательным комментарием (исправления, ручной ввод — ТЗ 5.4, 8.3) */
  UI.prompt = (title, text, { label = 'Комментарий', ok = 'Сохранить', required = true, extra = '' } = {}) => new Promise((res) => {
    let done = false;
    const m = UI.modal({
      title, sub: text,
      body: html`<form class="stack" style="gap:12px">${extra}<div class="field"><label>${label}${required ? html` <span class="req">*</span>` : ''}</label><textarea class="textarea" name="comment" placeholder="Опишите причину — запись попадёт в журнал действий"></textarea><span class="hint"></span></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${ok}</button>`,
      onClose: () => { if (!done) res(null); },
    });
    const form = m.querySelector('form');
    const go = () => {
      const d = UI.formData(form);
      if (required && (!d.comment || d.comment.length < 5)) { const f = form.querySelector('textarea').closest('.field'); f.classList.add('is-invalid'); f.querySelector('.hint').textContent = 'Комментарий обязателен (не короче 5 символов)'; return; }
      done = true; UI.closeTop(); res(d);
    };
    m.querySelector('[data-ok]').onclick = go;
    form.onsubmit = (e) => { e.preventDefault(); go(); };
  });

  /* ---------- Подсказка (tooltip) в стиле сайта ----------
     у элементов с data-tip — над элементом со стрелкой (data-tip-pos="right" — справа),
     у графиков — рядом с курсором */
  let tip, tipFor = null;
  const ensureTip = () => { if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); } return tip; };
  function showTip(text, x, y) {
    const t = ensureTip();
    t.className = 'tip on';
    t.textContent = text;
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 8) top = y - r.height - 14;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  }
  function showTipFor(el) {
    const t = ensureTip();
    t.textContent = el.getAttribute('data-tip');
    const right = el.getAttribute('data-tip-pos') === 'right';
    t.className = 'tip ' + (right ? 'at-right' : 'at-top');
    const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
    let left, top;
    if (right) { left = r.right + 10; top = r.top + r.height / 2 - h / 2; }
    else { left = r.left + r.width / 2 - w / 2; top = r.top - h - 10; if (top < 6) { top = r.bottom + 10; t.className = 'tip'; } }
    t.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + 'px';
    t.style.top = Math.max(6, top) + 'px';
    requestAnimationFrame(() => t.classList.add('on'));
  }
  const hideTip = () => { tipFor = null; if (tip) tip.classList.remove('on'); };
  UI.showTip = showTip; UI.hideTip = hideTip;
  document.addEventListener('mouseover', (e) => {
    let el = e.target.closest && e.target.closest('[data-tip]');
    // подписи разделов в сайдбаре нужны только на сенсорном планшете: с мышью сайдбар сам раскрывается и показывает текст
    if (el && el.dataset.tipRail && !matchMedia('(min-width: 721px) and (max-width: 1080px) and (hover: none)').matches) el = el.parentElement && el.parentElement.closest('[data-tip]:not([data-tip-rail])');
    if (el && el !== tipFor) { tipFor = el; showTipFor(el); }
    else if (!el && tipFor) hideTip();
  });
  document.addEventListener('mouseout', (e) => { if (tipFor && !tipFor.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('scroll', () => tipFor && hideTip(), true);
  document.addEventListener('mousedown', () => tipFor && hideTip(), true);
  /* ---------- Графики (SVG, рисуются по ширине контейнера) ---------- */
  const charts = new Map();
  let chartN = 0;
  UI.chart = function (spec) { const id = 'ch' + ++chartN; charts.set(id, spec); return html`<div class="chart-box" data-chart="${id}" style="min-height:${spec.height || 220}px"></div>`; };
  UI.drawCharts = function (root = document) {
    UI.$$('.chart-box[data-chart]', root).forEach((el) => {
      const spec = charts.get(el.dataset.chart);
      if (!spec) return;
      const w = Math.max(240, el.clientWidth);
      el.innerHTML = '';
      el.appendChild(render(spec, w));
    });
  };
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => UI.drawCharts(), 150); });

  const SVGNS = 'http://www.w3.org/2000/svg';
  const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  function render(spec, W) {
    const H = spec.height || 220;
    const fmtV = spec.fmt || ((v) => F.short(v));
    const pad = { l: spec.padL != null ? spec.padL : 48, r: 12, t: 10, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const n = spec.labels.length;
    const series = spec.series;
    const stacked = spec.type === 'stack';
    let max = 0;
    for (let i = 0; i < n; i++) {
      if (stacked) max = Math.max(max, series.reduce((s, x) => s + (x.values[i] || 0), 0));
      else for (const s of series) max = Math.max(max, s.values[i] || 0);
    }
    if (spec.ref) max = Math.max(max, spec.ref.value);
    // «красивый» шаг сетки: 1–2–2,5–5 × 10ⁿ, чтобы ось не уходила далеко выше данных
    const stepV = niceMax((max || 1) / 4);
    const ticks = Math.max(2, Math.ceil((max * 1.04) / stepV));
    max = stepV * ticks;
    const y = (v) => pad.t + ih - (v / max) * ih;
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('class', 'chart');
    let s = '';
    // сетка
    for (let i = 0; i <= ticks; i++) {
      const v = stepV * i, yy = y(v);
      s += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}"${i === 0 ? ' stroke-width="1.2"' : ''}/>`;
      s += `<text x="${pad.l - 8}" y="${yy + 4}" text-anchor="end">${AP.esc(fmtV(v))}</text>`;
    }
    // подписи оси X (прореживаем)
    const step = Math.max(1, Math.ceil(n / Math.floor(iw / 54)));
    const bw = iw / n;
    for (let i = 0; i < n; i += step) s += `<text x="${pad.l + bw * i + bw / 2}" y="${H - 8}" text-anchor="middle">${AP.esc(spec.labels[i])}</text>`;
    if (spec.type === 'line') {
      const x = (i) => pad.l + bw * i + bw / 2;
      series.forEach((se) => {
        const pts = se.values.map((v, i) => [x(i), y(v || 0)]);
        if (spec.area && series.length === 1) s += `<path d="M${pts[0][0]},${y(0)} ${pts.map((p) => 'L' + p[0] + ',' + p[1]).join(' ')} L${pts[pts.length - 1][0]},${y(0)}Z" fill="${se.color}" opacity=".10"/>`;
        s += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${se.dash ? ' stroke-dasharray="5 4"' : ''}/>`;
      });
    } else {
      const groups = stacked ? 1 : series.length;
      const gap = 2;
      const barW = Math.max(3, Math.min(34, (bw * 0.72 - gap * (groups - 1)) / groups));
      for (let i = 0; i < n; i++) {
        const x0 = pad.l + bw * i + (bw - (barW * groups + gap * (groups - 1))) / 2;
        let acc = 0;
        series.forEach((se, k) => {
          const v = se.values[i] || 0;
          if (v <= 0) return;
          let yTop, yBot, xx;
          if (stacked) { yBot = y(acc); acc += v; yTop = y(acc); xx = x0; if (acc !== v) yBot -= gap; }
          else { yBot = y(0); yTop = y(v); xx = x0 + k * (barW + gap); }
          const h = Math.max(1, yBot - yTop);
          const isTop = !stacked || k === series.length - 1 || series.slice(k + 1).every((z) => !(z.values[i] > 0));
          const r = Math.min(4, barW / 2, h);
          s += isTop
            ? `<path d="M${xx},${yBot} V${yTop + r} Q${xx},${yTop} ${xx + r},${yTop} H${xx + barW - r} Q${xx + barW},${yTop} ${xx + barW},${yTop + r} V${yBot}Z" fill="${se.color}"/>`
            : `<rect x="${xx}" y="${yTop}" width="${barW}" height="${h}" fill="${se.color}"/>`;
        });
      }
    }
    if (spec.ref) {
      const yy = y(spec.ref.value);
      s += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="var(--text-3)" stroke-dasharray="4 4" stroke-width="1.2"/><text x="${W - pad.r}" y="${yy - 6}" text-anchor="end">${AP.esc(spec.ref.label)}</text>`;
    }
    // слой наведения: колонка на каждую точку
    s += `<line class="xh" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--text-3)" stroke-width="1" opacity="0"/>`;
    for (let i = 0; i < n; i++) s += `<rect class="hover-col chart-hover" data-i="${i}" x="${pad.l + bw * i}" y="${pad.t}" width="${bw}" height="${ih}"/>`;
    svg.innerHTML = s;
    const xh = svg.querySelector('.xh');
    svg.addEventListener('mousemove', (e) => {
      const r = e.target.closest('.hover-col');
      if (!r) return;
      const i = +r.dataset.i;
      const xx = pad.l + bw * i + bw / 2;
      if (spec.type === 'line') { xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.setAttribute('opacity', '.5'); }
      const lines = [spec.tipLabels ? spec.tipLabels[i] : spec.labels[i]];
      let tot = 0;
      series.forEach((se) => { const v = se.values[i] || 0; tot += v; lines.push('● ' + se.name + ': ' + (spec.tipFmt || fmtV)(v)); });
      if (stacked && series.length > 1) lines.push('Итого: ' + (spec.tipFmt || fmtV)(tot));
      showTip(lines.join('\n'), e.clientX, e.clientY);
    });
    svg.addEventListener('mouseleave', () => { xh.setAttribute('opacity', '0'); hideTip(); });
    if (spec.onClick) svg.addEventListener('click', (e) => { const r = e.target.closest('.hover-col'); if (r) spec.onClick(+r.dataset.i); });
    if (spec.onClick) svg.style.cursor = 'pointer';
    return svg;
  }
  UI.legend = (items) => html`<div class="legend">${items.map((x) => html`<span><i style="background:${x.color}"></i>${x.name}${x.value != null ? html` · <b>${x.value}</b>` : ''}</span>`)}</div>`;

  /* Спарклайн для KPI */
  UI.spark = function (values, color = 'var(--s1)') {
    if (!values || values.length < 2) return '';
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const W = 96, H = 34;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / (max - min || 1)) * (H - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    return raw(`<svg class="k-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d} L${W},${H} L0,${H}Z" fill="${color}" opacity=".10"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
  };

  /* Сегментная полоса (доли целого) + легенда с суммами */
  UI.segBar = function (parts, { fmt = F.money, height = 12, total } = {}) {
    const sum = total || parts.reduce((s, p) => s + p.value, 0) || 1;
    return html`<div class="progress stacked" style="height:${height}px;gap:2px;background:var(--surface-3)">
      ${parts.filter((p) => p.value > 0).map((p) => html`<i style="width:${((p.value / sum) * 100).toFixed(2)}%;background:${p.color}" data-tip="${p.name + ': ' + fmt(p.value) + ' (' + F.pct((p.value / sum) * 100) + ')'}"></i>`)}
    </div>
    <div class="donut-legend mt-12">${parts.map((p) => html`<div class="row"><span class="row nowrap" style="gap:8px"><i class="dot" style="background:${p.color};border-radius:3px"></i><span class="text-2 fw-7">${p.name}</span></span><span><b>${fmt(p.value)}</b> <span class="muted fs-12">${F.pct((p.value / sum) * 100, 0)}</span></span></div>`)}</div>`;
  };

  /* Горизонтальные полосы (рейтинг): одна величина — один цвет */
  UI.hbars = function (rows, { fmt = F.money, color = 'var(--s1)', max, onClickAttr } = {}) {
    const m = max || Math.max(...rows.map((r) => r.value), 1);
    return html`<div class="stack" style="gap:10px">${rows.map((r) => html`
      <div ${r.attr ? raw(r.attr) : ''} style="${r.attr ? 'cursor:pointer' : ''}">
        <div class="row between nowrap fs-13" style="margin-bottom:5px"><span class="fw-7 ellipsis">${r.label}</span><span class="fw-8 nowrap num">${fmt(r.value)}${r.extra ? html` <span class="muted fw-7">${r.extra}</span>` : ''}</span></div>
        <div class="progress" style="height:8px"><i style="width:${((r.value / m) * 100).toFixed(1)}%;background:${r.color || color}"></i>${r.marker != null ? '' : ''}</div>
      </div>`)}</div>`;
  };

  /* Норма против факта: полоса факта и риска нормы */
  UI.normFact = function (rows, { unit = 'кг' } = {}) {
    const m = Math.max(...rows.map((r) => Math.max(r.norm, r.fact)), 1) * 1.08;
    return html`<div class="stack" style="gap:12px">${rows.map((r) => {
      const d = r.norm ? (r.fact / r.norm - 1) * 100 : 0;
      const cls = d > 3 ? 'bad-t' : d < -1 ? 'ok-t' : 'muted';
      return html`<div>
        <div class="row between nowrap fs-13" style="margin-bottom:5px"><span class="fw-7 ellipsis">${r.label}</span><span class="nowrap"><b class="num">${F.num(r.fact, r.fact < 100 ? 1 : 0)} ${unit}</b> <span class="muted">/ норма ${F.num(r.norm, r.norm < 100 ? 1 : 0)}</span> <b class="${cls}">${d > 0 ? '+' : ''}${F.num(d, 1)}%</b></span></div>
        <div style="position:relative;height:10px;border-radius:999px;background:var(--surface-3)">
          <i style="position:absolute;left:0;top:0;bottom:0;width:${((r.fact / m) * 100).toFixed(1)}%;border-radius:999px;background:${d > 3 ? 'var(--s4)' : 'var(--s1)'}"></i>
          <i style="position:absolute;top:-3px;bottom:-3px;width:2px;left:${((r.norm / m) * 100).toFixed(1)}%;background:var(--text);border-radius:2px" data-tip="Норма: ${F.num(r.norm, 1)} ${unit}"></i>
        </div></div>`;
    })}</div>`;
  };

  /* ---------- QR-коды ---------- */
  UI.qrSVG = function (text, { size = 160, margin = 2, color = '#000' } = {}) {
    if (typeof window.qrcode !== 'function') return raw('<div class="muted fs-12">QR-библиотека не загружена</div>');
    const q = window.qrcode(0, 'M');
    q.addData(text); q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + margin},${r + margin}h1v1h-1z`;
    const vb = n + margin * 2;
    return raw(`<svg viewBox="0 0 ${vb} ${vb}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR ${AP.esc(text)}"><rect width="${vb}" height="${vb}" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`);
  };
  // QR ведёт на опубликованный сайт, даже если программа открыта локально — его сканируют телефоном
  const PUBLIC_BASE = 'https://alex22826.github.io/ali-plast/';
  UI.qrUrl = (id) => (/github\.io$/.test(location.hostname) ? location.origin + location.pathname.replace(/[^/]*$/, '') : PUBLIC_BASE) + 'app.html#/qr/' + encodeURIComponent(id);
  UI.parseCode = (s) => { const m = String(s || '').toUpperCase().match(/(AP-\d{6}|PL-\d{4})/); return m ? m[1] : null; };

  /* Этикетка упаковочной единицы (ТЗ 6.2–6.3). Одни и те же строки — на экране и на принтере */
  UI.labelData = function (u) {
    const o = AP.order(u.orderId), p = AP.product(u.productId), c = o ? AP.client(o.clientId) : null;
    const isPallet = u.type === 'pallet';
    const what = isPallet ? 'паллета, ' + AP.childrenOf(u.id).length + ' ед.' : AP.UNIT_TYPES[u.type].toLowerCase() + ' ' + (p.base === 'кг' ? F.kg(u.net) : F.num(u.pcs) + ' шт');
    return {
      code: u.id, content: UI.qrUrl(u.id), title: p.name,
      lines: [
        (o ? 'Заказ ' + o.no + ' · ' : '') + what,
        c ? c.name.replace(/^(ООО|ЧП|ИП)\s*/, '').replace(/[«»]/g, '') : '',
        'Нетто ' + F.num(u.net, 2) + ' / брутто ' + F.num(u.gross, 2) + ' кг',
        AP.wsName(u.workshop) + ' · смена ' + (u.shift === 'A' ? 'А' : 'Б') + ' · ' + F.dt(u.at),
        'CHIRCHIQ ALI PLAST',
      ].filter(Boolean),
    };
  };
  UI.labelHTML = function (u) {
    const L = UI.labelData(u);
    return html`<div class="label-prev">
      <div class="lp-qr">${UI.qrSVG(L.content, { size: 200 })}<div class="lp-no">${L.code}</div></div>
      <div class="lp-txt"><div class="lp-p">${L.title}</div>${L.lines.map((x) => html`<div>${x}</div>`)}</div>
    </div>`;
  };

  /* ---------- Печать этикеток ----------
     Xprinter стоит в Windows на драйвере «Generic / Text Only»: из браузера он получает только текст,
     поэтому печать из браузера выходит «не та». Правильный путь — агент печати на ПК с принтером
     (E:\codeAI\xprinter\start-agent.bat): он шлёт принтеру команды TSPL напрямую. Задание идёт
     в закрытый канал ntfy.sh/xprinter-<ключ>, ответ — в xprinter-<ключ>-done (как у телефона в проекте qr). */
  const NTFY = 'https://ntfy.sh/', PKEY = 'ap.printerKey';
  UI.printerKey = () => { try { return (localStorage.getItem(PKEY) || '').trim(); } catch (e) { return ''; } };
  UI.setPrinterKey = (k) => { try { if (k) localStorage.setItem(PKEY, k); else localStorage.removeItem(PKEY); } catch (e) { /* без хранилища */ } };
  // ключ из ссылки connect-aliplast.bat: app.html#printer=<ключ> — сохраняем и убираем из адреса
  (function () {
    const m = /^#printer=([a-z0-9]{8,64})$/i.exec(location.hash);
    if (!m) return;
    UI.setPrinterKey(m[1].toLowerCase());
    history.replaceState(null, '', location.pathname + location.search + '#/qr');
    UI._printerJustConnected = true;
  })();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function sendPrintJob(job) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const body = JSON.stringify(Object.assign({ id, created: new Date().toISOString(), copies: 1, kind: 'label' }, job));
    for (let a = 0; a < 3; a++) {
      try { const r = await fetch(NTFY + 'xprinter-' + UI.printerKey(), { method: 'POST', body }); if (r.ok) return id; } catch (e) { /* обрыв связи — ещё раз */ }
      await sleep(700);
    }
    throw new Error('Нет связи с сервером печати — проверьте интернет');
  }
  async function waitPrinted(ids, sinceSec, timeoutMs) {
    const left = new Set(ids), res = {};
    const until = Date.now() + timeoutMs;
    while (left.size && Date.now() < until) {
      await sleep(2500);
      try {
        const r = await fetch(NTFY + 'xprinter-' + UI.printerKey() + '-done/json?poll=1&since=' + sinceSec, { cache: 'no-store' });
        for (const line of (await r.text()).split('\n')) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.event !== 'message') continue;
          const rep = JSON.parse(ev.message);
          if (left.has(rep.id)) { res[rep.id] = rep; left.delete(rep.id); }
        }
      } catch (e) { /* связь моргнула — спросим ещё раз */ }
    }
    return { res, missing: [...left] };
  }
  UI.printLabels = async function (units) {
    units = units.filter(Boolean);
    if (!units.length) return;
    if (!UI.printerKey()) { UI.printerSetup(units); return; }
    if (units.length > 10 && !(await UI.confirm('Напечатать ' + units.length + ' этикеток?', 'Задания уйдут на Xprinter по очереди.', { ok: 'Печатать' }))) return;
    const since = Math.floor(Date.now() / 1000) - 5;
    UI.toast('Отправляю на Xprinter', units.length > 1 ? units.length + ' этикеток' : units[0].id, 'info');
    const ids = [];
    try { for (const u of units) ids.push(await sendPrintJob(UI.labelData(u))); }
    catch (e) { UI.toast('Не отправилось', e.message, 'bad'); return; }
    AP.audit('Печать этикеток на Xprinter', 'unit', units[0].id, units.map((u) => u.id).join(', '));
    AP.save();
    const { res, missing } = await waitPrinted(ids, since, 30000 + units.length * 6000);
    const errs = Object.values(res).filter((r) => r.error);
    if (missing.length === ids.length) UI.toast('Агент печати не ответил', 'Запустите на ПК с принтером E:\\codeAI\\xprinter\\start-agent.bat — задания напечатаются, как только он заработает', 'warn');
    else if (errs.length) UI.toast('Ошибка принтера', errs[0].error, 'bad');
    else UI.toast(ids.length > 1 ? 'Напечатано: ' + (ids.length - missing.length) + ' из ' + ids.length : 'Этикетка напечатана', units.length === 1 ? units[0].id : '');
  };

  /* подключение принтера: ключ из printer-key.txt или ссылка connect-aliplast.bat */
  UI.printerSetup = function (units) {
    const has = !!UI.printerKey();
    const m = UI.modal({
      title: 'Принтер этикеток Xprinter', sub: has ? 'Печать подключена через агента на компьютере с принтером' : 'Печать из браузера на этот принтер не работает — подключите агента',
      body: html`<div class="stack" style="gap:14px">
        <div class="alert alert-info">${I('info')}<div class="grow"><b>Почему из браузера печаталось «не то»</b><small>Xprinter стоит в Windows на драйвере «Generic / Text Only». Браузер передаёт через него только текст — QR и рамки теряются, а принтер ждёт свои команды TSPL. Агент печати отправляет этикетку принтеру напрямую.</small></div></div>
        <ol class="text-2 fw-7" style="margin:0;padding-left:20px;line-height:1.7">
          <li>На компьютере с принтером запустите <code>E:\\codeAI\\xprinter\\start-agent.bat</code> и не закрывайте окно.</li>
          <li>Один раз на каждый браузер откройте <code>connect-aliplast.bat</code> — сайт запомнит ключ принтера. Или вставьте ключ из <code>printer-key.txt</code> ниже.</li>
        </ol>
        <div class="field"><label>Ключ принтера</label><input class="input mono" name="k" value="${UI.printerKey()}" placeholder="20 латинских букв и цифр" autocomplete="off" spellcheck="false"></div>
        ${has ? html`<div class="alert alert-ok">${I('check')}<div class="grow"><b>Ключ сохранён в этом браузере</b><small>Этикетки идут на Xprinter. Тексты этикеток проходят через ntfy.sh в закрытом канале — так же, как печать с телефона.</small></div></div>` : ''}
      </div>`,
      foot: html`${units && units.length ? html`<button class="btn btn-ghost" data-browser>${I('print')}Печать через браузер</button>` : ''}${has ? html`<button class="btn btn-ghost" data-off>Отключить</button>` : ''}<button class="btn btn-primary" data-save>${I('check')}${units && units.length ? 'Сохранить и печатать' : 'Сохранить'}</button>`,
    });
    const inp = m.querySelector('[name=k]');
    m.querySelector('[data-save]').onclick = () => {
      const k = inp.value.trim().toLowerCase();
      if (!/^[a-z0-9]{8,64}$/.test(k)) { inp.closest('.field').classList.add('is-invalid'); inp.focus(); return; }
      UI.setPrinterKey(k); UI.closeTop(); UI.toast('Принтер подключён', 'Кнопка «Печать» отправляет этикетки на Xprinter');
      if (units && units.length) UI.printLabels(units);
      if (AP.render && AP.user) AP.render();
    };
    const off = m.querySelector('[data-off]'); if (off) off.onclick = () => { UI.setPrinterKey(''); UI.closeTop(); UI.toast('Принтер отключён в этом браузере', '', 'info'); if (AP.render && AP.user) AP.render(); };
    const br = m.querySelector('[data-browser]'); if (br) br.onclick = () => { UI.closeTop(); UI.browserPrintLabels(units); };
  };

  UI.printerBtn = () => (UI.printerKey() ? html`<button class="btn btn-ghost btn-sm" data-x="printer" data-tip="Этикетки идут на Xprinter через агента печати"><span class="dot" style="background:var(--ok)"></span>Xprinter подключён</button>` : html`<button class="btn btn-soft btn-sm" data-x="printer">${I('print')}Подключить принтер</button>`);
  UI.bindPrinterBtn = (el) => UI.$$('[data-x=printer]', el).forEach((b) => (b.onclick = () => UI.printerSetup()));

  /* запасной путь: печать из браузера (для принтера с полным драйвером), этикетка 100×50 мм */
  UI.browserPrintLabels = function (units) {
    const css = `@page{size:100mm 50mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,sans-serif;color:#000}
      .label-prev{width:100mm;height:50mm;padding:2mm;display:flex;gap:2mm;overflow:hidden;break-inside:avoid}
      .label-prev:not(:last-child){break-after:page}
      .lp-qr{width:38mm;flex:none;text-align:center}.lp-qr svg{width:38mm;height:38mm;display:block}.lp-no{font:700 9pt Arial;margin-top:1mm}
      .lp-txt{flex:1;min-width:0;font-size:9.5pt;line-height:1.3;font-weight:700}.lp-p{font-size:12pt;font-weight:800;line-height:1.15;margin-bottom:1.5mm}`;
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    const doc = fr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Этикетки</title><style>' + css + '</style></head><body>' + units.map((u) => String(UI.labelHTML(u))).join('') + '</body></html>');
    doc.close();
    fr.contentWindow.addEventListener('afterprint', () => setTimeout(() => fr.remove(), 500));
    setTimeout(() => { fr.contentWindow.focus(); fr.contentWindow.print(); }, 300);
  };
  /* Печать документа (накладная, акт сверки, заказ-наряд) */
  UI.printDoc = function (title, bodyHTML) {
    const css = `@page{size:A4;margin:14mm}body{font-family:Manrope,Arial,sans-serif;color:#000;font-size:10.5pt}
      h1{font-size:15pt;margin:0 0 4mm}h2{font-size:11pt;margin:6mm 0 2mm}.muted{color:#555}
      table{width:100%;border-collapse:collapse;margin:3mm 0}th,td{border:1px solid #999;padding:1.6mm 2mm;text-align:left;vertical-align:top}th{background:#eee;font-size:9pt}
      .r{text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm 10mm}.sign{margin-top:14mm;display:grid;grid-template-columns:1fr 1fr;gap:10mm}.sign div{border-top:1px solid #000;padding-top:1mm;font-size:9pt}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:5mm}.brand{font:800 13pt Arial;letter-spacing:.06em}`;
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    const doc = fr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>' + AP.esc(title) + '</title><style>' + css + '</style></head><body><div class="head"><div><div class="brand">CHIRCHIQ ALI PLAST</div><div class="muted">' + AP.esc(AP.db.company.city) + ' · ИНН ' + AP.esc(AP.db.company.inn) + '</div></div><div class="muted">Сформировано: ' + F.dt(new Date().toISOString()) + '<br>' + AP.esc(AP.user ? AP.user.name : '') + '</div></div>' + bodyHTML + '</body></html>');
    doc.close();
    setTimeout(() => { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(() => fr.remove(), 1500); }, 250);
  };

  /* Пауза бесконечных анимаций, когда вкладка скрыта */
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('anim-off', document.hidden));
})();
