/* =========================================================
   ALI PLAST — оболочка приложения: сайдбар, верхняя панель,
   маршрутизация, проверка прав, общие действия
   ========================================================= */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  AP.pages = {};
  AP.page = (key, def) => (AP.pages[key] = def);

  /* ---------- Тема: сама — тёмная с 18:00, светлая с 8:00; вручную — до следующего переключения ---------- */
  const OVR = 'ap.themeOverride';
  AP.theme = () => document.documentElement.getAttribute('data-theme') || 'light';
  AP.themeAuto = (d = new Date()) => (d.getHours() >= 8 && d.getHours() < 18 ? 'light' : 'dark');
  AP.nextThemeSwitch = (d = new Date()) => { const t = new Date(d), h = d.getHours(); if (h < 8) t.setHours(8, 0, 0, 0); else if (h < 18) t.setHours(18, 0, 0, 0); else { t.setDate(t.getDate() + 1); t.setHours(8, 0, 0, 0); } return t.getTime(); };
  AP.themeWanted = () => { try { const o = JSON.parse(localStorage.getItem(OVR) || 'null'); if (o && o.until > Date.now()) return o.theme; } catch (e) { /* без хранилища — по времени */ } return AP.themeAuto(); };
  AP.themeTip = () => (AP.theme() === 'dark' ? 'Тёмная тема' : 'Светлая тема') + (AP.theme() === AP.themeAuto() ? ' · по времени' : ' · вручную до ' + (AP.themeAuto() === 'light' ? '18:00' : '8:00')) + '\nСама: тёмная с 18:00, светлая с 8:00';
  AP.applyTheme = function (t, origin) {
    const root = document.documentElement;
    if (AP.theme() === t) return;
    const flip = () => {
      root.setAttribute('data-theme', t);
      document.querySelectorAll('[data-act=theme], [data-theme-toggle]').forEach((b) => { b.innerHTML = String(I(t === 'dark' ? 'sun' : 'moon')); b.setAttribute('data-tip', AP.themeTip()); });
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) {
      // «волна» новой темы расходится от кнопки (или сверху, если тема сменилась по времени)
      const x = origin ? origin.x : innerWidth / 2, y = origin ? origin.y : 0;
      const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(flip);
      vt.ready.then(() => root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: origin ? 700 : 1200, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
    } else { root.classList.add('theme-fade'); flip(); setTimeout(() => root.classList.remove('theme-fade'), 700); }
  };
  AP.toggleTheme = function (origin) {
    const t = AP.theme() === 'dark' ? 'light' : 'dark';
    try { if (t === AP.themeAuto()) localStorage.removeItem(OVR); else localStorage.setItem(OVR, JSON.stringify({ theme: t, until: AP.nextThemeSwitch() })); } catch (e) { /* без хранилища */ }
    AP.applyTheme(t, origin);
  };
  AP.startThemeClock = () => setInterval(() => { const w = AP.themeWanted(); if (w !== AP.theme()) AP.applyTheme(w); }, 30000);

  /* ---------- Маршрут ---------- */
  AP.route = function () {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
    const q = Object.fromEntries(new URLSearchParams(qs || ''));
    return { key: seg[0] || '', id: seg[1] || null, q };
  };
  AP.go = (hash) => { if (location.hash === hash) AP.render(); else location.hash = hash; };
  AP.setQuery = function (patch) {
    const r = AP.route();
    const q = Object.assign({}, r.q, patch);
    Object.keys(q).forEach((k) => (q[k] === '' || q[k] == null) && delete q[k]);
    const s = new URLSearchParams(q).toString();
    AP.go('#/' + r.key + (r.id ? '/' + r.id : '') + (s ? '?' + s : ''));
  };
  AP.homeKey = () => (AP.can('dashboard') ? 'dashboard' : AP.can('scales') ? 'scales' : AP.SECTIONS.find((s) => AP.can(s.key)).key);

  /* ---------- Каркас ---------- */
  function shell() {
    document.body.innerHTML = String(html`
      <div class="app">
        <aside class="sidebar sb-auto" id="sidebar"></aside>
        <div class="main">
          <header class="topbar" id="topbar"></header>
          <main class="content" id="view"></main>
        </div>
      </div>
      <nav class="bnav" id="bnav" aria-label="Быстрые разделы"></nav>
      <div id="routebar"></div>
      <div class="nav-scrim" data-act="nav-close"></div>`);
  }

  function sidebar(active) {
    const u = AP.user;
    const groups = [];
    AP.SECTIONS.forEach((s) => {
      if (!AP.can(s.key)) return;
      let g = groups.find((x) => x.name === s.group);
      if (!g) groups.push((g = { name: s.group, items: [] }));
      g.items.push(s);
    });
    const counts = sideCounts();
    const fixed = AP.userWorkshop();
    const scope = AP.scope();
    const SCOPES = [['all', 'Все цеха', 'Все'], ['w1', 'Цех №1', 'Ц1'], ['w2', 'Цех №2', 'Ц2']];
    // в свёрнутом сайдбаре вместо переключателя виден только значок текущего цеха
    const mini = fixed !== 'all'
      ? html`<span class="sb-scope-mini" aria-hidden="true"><i style="background:var(--${fixed})"></i>${AP.workshop(fixed).short}</span>`
      : html`<span class="sb-scope-mini" aria-hidden="true">${SCOPES.find(([k]) => k === scope)[2]}</span>`;
    const scopeBox = fixed !== 'all'
      ? html`<div class="sb-scope">${mini}<div class="lock" data-tip="Начальник цеха видит только свой цех" data-tip-pos="right"><i style="background:var(--${fixed})"></i><b class="full">${AP.wsName(fixed)}</b><b class="short">${AP.workshop(fixed).short}</b><span class="right muted fs-12" style="color:var(--ink-300)">только свой цех</span></div></div>`
      : html`<div class="sb-scope" role="group" aria-label="Цех">${mini}${SCOPES.map(([k, t, sh]) => html`<button class="${scope === k ? 'on' : ''}" data-act="scope" data-v="${k}"><span class="full">${t}</span><span class="short">${sh}</span></button>`)}</div>`;
    const prevNav = UI.$('#sidebar .sb-nav');
    const keepScroll = prevNav ? prevNav.scrollTop : 0; // при переходе в раздел список не прыгает наверх
    UI.$('#sidebar').innerHTML = String(html`<div class="sb-in">
      <a class="sb-brand" href="#/${AP.homeKey()}">${UI.logoMark(38)}<span><b>ALI PLAST</b><small>Chirchiq · учёт</small></span></a>
      ${scopeBox}
      <nav class="sb-nav">${groups.map((g) => html`<div class="sb-group"><span>${g.name}</span>${g.items.map((s) => html`
        <a class="sb-link ${active === s.key ? 'active' : ''}" href="#/${s.key}" data-tip="${s.title}" data-tip-pos="right" data-tip-rail="1">${I(s.icon)}<span>${s.title}</span>${s.directorOnly ? html`<span class="sb-lock" data-tip="Только директор" data-tip-pos="right">${I('lock', 'sb-lock')}</span>` : counts[s.key] ? html`<span class="sb-count ${counts[s.key].bad ? 'bad' : ''}">${counts[s.key].n}</span>` : ''}</a>`)}</div>`)}</nav>
      <div class="sb-user">${UI.avatar(u.name, u.id)}<div class="who"><b>${u.name}</b><small>${u.title}</small></div><button class="btn btn-icon btn-sm" data-act="logout" data-tip="Выйти" data-tip-pos="right" aria-label="Выйти">${I('logout')}</button></div></div>`);
    const nav = UI.$('#sidebar .sb-nav');
    nav.scrollTop = keepScroll;
    const act = nav.querySelector('.sb-link.active');
    if (act) { const a = act.getBoundingClientRect(), n = nav.getBoundingClientRect(); if (a.top < n.top || a.bottom > n.bottom) act.scrollIntoView({ block: 'nearest' }); }
    nav.addEventListener('scroll', sbEdges, { passive: true });
    sbEdges();
  }
  // мягкое затухание у края списка, пока его можно прокрутить дальше — пункт не выглядит обрезанным
  function sbEdges() {
    const nav = UI.$('#sidebar .sb-nav');
    if (!nav) return;
    nav.classList.toggle('more-up', nav.scrollTop > 2);
    nav.classList.toggle('more-down', nav.scrollTop + nav.clientHeight < nav.scrollHeight - 2);
  }
  addEventListener('resize', sbEdges, { passive: true });
  function sideCounts() {
    const c = {};
    const vis = AP.db.orders.filter(AP.orderVisible);
    const n = vis.filter((o) => ['new', 'layout', 'waiting'].includes(AP.orderStatus(o))).length;
    if (n) c.orders = { n };
    const prod = vis.filter((o) => ['queue', 'production'].includes(AP.orderStatus(o))).length;
    if (prod) c.production = { n: prod };
    const acc = AP.db.units.filter((u) => u.status === 'produced' && u.type !== 'pallet' && AP.inScope(u.workshop)).length;
    if (acc) c.warehouse = { n: acc };
    const ap = AP.db.approvals.filter((a) => a.status === 'pending').length;
    if (ap && AP.flag('approve')) c.audit = { n: ap, bad: true };
    const low = AP.db.materials.filter((m) => AP.stock()[m.id].total < m.min).length;
    if (low) c.stock = { n: low, bad: true };
    return c;
  }

  function topbar(sec, title) {
    const alerts = AP.alerts();
    const off = AP.offline();
    UI.$('#topbar').innerHTML = String(html`
      <button class="btn btn-icon burger" data-act="nav-open" aria-label="Меню">${I('menu')}</button>
      <div class="crumbs"><small>${sec ? sec.group : ''}</small><b>${title}</b></div>
      <div class="spacer"></div>
      <label class="tb-search input-icon">${I('search')}<input class="input" id="gsearch" placeholder="Заказ, клиент или QR (AP-000123)" autocomplete="off"><kbd>/</kbd></label>
      <button class="btn btn-icon tb-find" data-act="search" aria-label="Поиск">${I('search')}</button>
      <span class="conn ${off ? 'off' : ''}" data-tip="${off ? 'Нет связи: взвешивания сохраняются на месте и догрузятся позже' : 'Весы и сканеры на связи'}"><i></i><span>${off ? 'Офлайн · ' + AP.pendingSync() + ' в очереди' : 'Весы на связи'}</span></span>
      <button class="btn btn-icon bell ${AP.capCount(alerts.length).length > 2 ? 'bell-wide' : ''}" data-act="alerts" data-tip="Уведомления" aria-label="Уведомления${alerts.length ? ': ' + alerts.length : ''}">${I('bell')}${alerts.length ? html`<span class="bell-n">${AP.capCount(alerts.length)}</span>` : ''}</button>
      <button class="btn btn-icon" data-act="theme" data-tip="${AP.themeTip()}" aria-label="Сменить тему">${I(AP.theme() === 'dark' ? 'sun' : 'moon')}</button>`);
  }

  /* ---------- Нижняя навигация на телефоне ---------- */
  const BNAV = { director: ['dashboard', 'orders', 'production', 'findash'], shop: ['dashboard', 'scales', 'production', 'qr'], operator: ['scales', 'qr'], storekeeper: ['dashboard', 'warehouse', 'stock', 'qr'], sales: ['dashboard', 'orders', 'clients', 'debts'], accountant: ['dashboard', 'money', 'debts', 'reports'] };
  const SHORT = { dashboard: 'Сводка', findash: 'Финансы', orders: 'Заказы', clients: 'Клиенты', production: 'Цех', scales: 'Весы', qr: 'QR', stock: 'Сырьё', warehouse: 'Склад', money: 'Касса', debts: 'Долги', cost: 'Себест.', staff: 'Люди', reports: 'Отчёты', refs: 'Справ.', users: 'Права', audit: 'Журнал' };
  function bnav(active, counts) {
    const pref = (BNAV[AP.user.role] || []).filter((k) => AP.can(k));
    const items = pref.concat(AP.SECTIONS.map((s) => s.key).filter((k) => AP.can(k) && !pref.includes(k))).slice(0, 4);
    UI.$('#bnav').innerHTML = String(html`<div style="display:contents">${items.map((k) => html`<a href="#/${k}" class="${k === active ? 'on' : ''}">${I(AP.SECTIONS.find((s) => s.key === k).icon)}<span>${SHORT[k]}</span>${counts[k] ? html`<span class="cnt">${AP.capCount(counts[k].n)}</span>` : ''}</a>`)}<button type="button" data-act="nav-open" class="${items.includes(active) ? '' : 'on'}">${I('menu')}<span>Меню</span></button></div>`);
  }
  let lastKey = null;
  function routeBar() { const b = UI.$('#routebar'); if (!b) return; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }

  /* ---------- Отрисовка страницы ---------- */
  AP.render = function () {
    const r = AP.route();
    let key = r.key;
    if (!key || !AP.pages[key]) key = AP.homeKey();
    const sec = AP.SECTIONS.find((s) => s.key === key);
    const page = AP.pages[key];
    sidebar(key);
    bnav(key, sideCounts());
    const view = UI.$('#view');
    const changed = key !== lastKey;
    lastKey = key;
    if (changed) routeBar();
    if (!AP.can(key)) {
      topbar(sec, sec ? sec.title : '');
      view.innerHTML = String(html`<div class="page ${changed ? 'enter' : ''}">${lockedView(key)}</div>`);
      return;
    }
    const title = typeof page.title === 'function' ? page.title(r) : page.title || (sec && sec.title);
    topbar(sec, title);
    // свежий контейнер на каждую отрисовку — обработчики страниц не накапливаются
    // при переходе в другой раздел — плавное появление блоков, при фильтрах и вкладках — без анимации
    view.innerHTML = String(html`<div class="page ${changed ? 'enter' : ''}">${page.render(r)}</div>`);
    UI.enhance(view);
    if (page.mount) page.mount(view.firstElementChild, r);
    UI.drawCharts(view);
    document.title = title + ' · ALI PLAST';
  };
  function lockedView(key) {
    const fin = key === 'findash';
    return html`<div class="locked"><div><div class="ic">${I('lock')}</div><h2>${fin ? 'Финансовый дашборд закрыт' : 'Нет доступа к разделу'}</h2>
      <p>${fin ? 'По ТЗ (п. 4.11) общий финансовый дашборд виден только директору. Выдать на него права нельзя.' : 'Права на этот раздел выдаёт директор в разделе «Пользователи и права».'}</p>
      <a class="btn btn-primary mt-16" href="#/${AP.homeKey()}">${I('arrowLeft')}На главную</a></div></div>`;
  }

  /* обновить страницу и открытую карточку после изменений */
  AP.refresh = function () {
    AP.render();
    const d = AP._drawer;
    if (d) { AP._drawer = null; UI.closeTop(); d.fn.apply(null, d.args); }
  };
  AP.trackDrawer = (fn, args, el, baseHash) => {
    AP._drawer = { fn, args };
    const prev = el._onClose;
    el._onClose = () => { if (prev) prev(); if (AP._drawer && AP._drawer.fn === fn) AP._drawer = null; if (baseHash && AP.route().id) history.replaceState(null, '', baseHash); };
  };

  /* ---------- Офлайн-режим (ТЗ 5.4, 9.2) ---------- */
  AP.offline = () => sessionStorage.getItem('ap.offline') === '1';
  AP.pendingSync = () => AP.db.units.filter((u) => u.pendingSync).length + AP.db.defects.filter((d) => d.pendingSync).length;
  AP.setOffline = function (v) {
    sessionStorage.setItem('ap.offline', v ? '1' : '0');
    if (!v) {
      const n = AP.pendingSync();
      AP.db.units.forEach((u) => delete u.pendingSync);
      AP.db.defects.forEach((d) => delete d.pendingSync);
      if (n) { AP.audit('Синхронизация после восстановления связи', 'sync', null, 'Догружено взвешиваний: ' + n); UI.toast('Связь восстановлена', 'Догружено в общую базу: ' + n + ' ' + F.plural(n, 'взвешивание', 'взвешивания', 'взвешиваний')); }
      AP.save();
    }
  };

  /* ---------- Общие обработчики ---------- */
  function alertsPop(btn) {
    const old = UI.$('.pop');
    if (old) { old.remove(); return; }
    const list = AP.alerts();
    const p = document.createElement('div');
    p.className = 'pop';
    const ICON_C = { bad: 'var(--bad)', warn: 'var(--warn)', info: 'var(--info)' };
    p.innerHTML = String(html`<div class="pop-h"><b>Уведомления</b><span class="badge ${list.length ? 'b-bad' : 'b-ok'}">${list.length}</span></div>
      <div class="pop-b"><ul class="list">${list.length ? list.slice(0, 40).map((a) => html`<li class="click" data-href="${a.href}"><span style="color:${ICON_C[a.lvl]}">${I(a.icon, 'icon-20')}</span><div class="grow"><b class="fs-13">${a.title}</b><div class="fs-12 muted">${a.kind} · ${a.text}</div></div></li>`) : html`<li>${UI.empty('Всё спокойно', 'Нет предупреждений по вашему участку', 'check')}</li>`}</ul></div>`);
    document.body.appendChild(p);
    const r = btn.getBoundingClientRect();
    p.style.top = r.bottom + 8 + 'px';
    p.style.right = Math.max(8, innerWidth - r.right) + 'px';
    setTimeout(() => document.addEventListener('click', function off(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', off); } }), 0);
  }

  function globalSearch(q) {
    q = q.trim();
    if (!q) return;
    const code = UI.parseCode(q);
    if (code && AP.can('qr')) return AP.go('#/qr/' + code);
    const ql = q.toLowerCase();
    const o = AP.db.orders.find((x) => x.no.toLowerCase() === ql || x.no.toLowerCase().replace('зк-', '') === ql);
    if (o && AP.can('orders') && AP.orderVisible(o)) return AP.openOrder(o.id);
    const c = AP.db.clients.find((x) => x.name.toLowerCase().includes(ql) && AP.clientVisible(x));
    if (c && AP.can('clients')) return AP.openClient(c.id);
    if (AP.can('orders')) return AP.go('#/orders?q=' + encodeURIComponent(q));
    UI.toast('Ничего не найдено', q, 'warn');
  }

  function searchModal() {
    const m = UI.modal({
      title: 'Поиск', sub: 'Номер заказа, клиент или код с этикетки',
      body: html`<div class="input-icon">${I('search')}<input class="input input-lg" id="msearch" placeholder="ЗК-1056, Fresh Market, AP-000123" autocomplete="off" enterkeyhint="search"></div>${AP.can('qr') ? html`<a class="btn btn-secondary btn-block mt-12" href="#/qr">${I('scan')}Сканировать QR-код</a>` : ''}`,
      foot: html`<button class="btn btn-ghost" data-close>Закрыть</button><button class="btn btn-primary" data-go>${I('search')}Найти</button>`,
    });
    const inp = m.querySelector('#msearch');
    setTimeout(() => inp.focus(), 80);
    const go = () => { const v = inp.value; UI.closeTop(); globalSearch(v); };
    m.querySelector('[data-go]').onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }

  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      const hr = e.target.closest('[data-href]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'logout') { AP.logout(); location.replace('index.html'); }
        else if (act === 'theme') { const r = a.getBoundingClientRect(); UI.hideTip(); AP.toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
        else if (act === 'search') searchModal();
        else if (act === 'scope') { AP.setScope(a.dataset.v); AP.render(); }
        else if (act === 'alerts') { e.stopPropagation(); alertsPop(a); }
        else if (act === 'nav-open') document.body.classList.add('nav-open');
        else if (act === 'nav-close') document.body.classList.remove('nav-open');
        else if (act === 'open-order') AP.openOrder(a.dataset.id);
        else if (act === 'open-client') AP.openClient(a.dataset.id);
        else if (act === 'open-unit') AP.openUnit(a.dataset.id);
        else return;
        e.preventDefault();
        return;
      }
      if (hr && !e.target.closest('a,button,input,select,textarea,label')) {
        const pop = UI.$('.pop'); if (pop) pop.remove();
        const h = hr.dataset.href;
        if (h.startsWith('#')) { UI.closeAll(); AP.go(h); }
      }
      if (e.target.closest('.sb-link')) document.body.classList.remove('nav-open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { const s = UI.$('#gsearch'); if (s) { e.preventDefault(); s.focus(); } }
      if (e.key === 'Enter' && e.target.id === 'gsearch') globalSearch(e.target.value);
    });
    addEventListener('hashchange', () => { UI.closeAll(); UI.closeSelect(); document.body.classList.remove('nav-open'); AP._drawer = null; AP.render(); window.scrollTo(0, 0); });
    // если данные поменяли в другой вкладке — перечитываем
    addEventListener('storage', (e) => { if (e.key === 'ap.db.v1' && e.newValue) { AP.load(); AP.user = AP.currentUser(); if (!AP.user) location.replace('index.html'); else AP.render(); } });
  }

  /* ---------- Общие элементы страниц ---------- */
  UI.pageHead = (title, sub, actions) => html`<div class="page-head"><div class="ph-text"><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div>${actions ? html`<div class="ph-actions">${actions}</div>` : ''}</div>`;
  UI.tabs = (list, active, param = 'tab') => html`<div class="tabs" role="tablist">${list.filter(Boolean).map(([k, t, n]) => html`<button class="tab ${active === k ? 'on' : ''}" data-tab="${k}" data-param="${param}" role="tab">${t}${n != null ? html`<span class="pill">${n}</span>` : ''}</button>`)}</div>`;
  UI.bindTabs = (el) => UI.$$('[data-tab]', el).forEach((b) => (b.onclick = () => AP.setQuery({ [b.dataset.param]: b.dataset.tab })));
  UI.periodSeg = (val, opts = [['day', 'Сегодня'], ['week', '7 дней'], ['month', '30 дней'], ['q', '90 дней']]) => html`<div class="seg">${opts.map(([k, t]) => html`<button class="${val === k ? 'on' : ''}" data-period="${k}">${t}</button>`)}</div>`;
  UI.bindPeriod = (el) => UI.$$('[data-period]', el).forEach((b) => (b.onclick = () => AP.setQuery({ p: b.dataset.period })));
  AP.periodRange = (p) => {
    const t = AP.d.todayISO();
    const days = { day: 0, week: 6, month: 29, q: 89 }[p] != null ? { day: 0, week: 6, month: 29, q: 89 }[p] : 6;
    const from = AP.d.iso(AP.d.addDays(t, -days));
    const pfrom = AP.d.iso(AP.d.addDays(t, -days * 2 - 1)), pto = AP.d.iso(AP.d.addDays(t, -days - 1));
    return { from, to: t, days: days + 1, pfrom, pto };
  };
  /* дневные ряды за последние n дней */
  AP.dayLabels = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) out.push(AP.d.iso(AP.d.addDays(AP.d.todayISO(), -i))); return out; };
  AP.outputByDay = function (n, ws) {
    return AP.memo('obd:' + n + ws, () => {
      const days = AP.dayLabels(n);
      const ix = Object.fromEntries(days.map((d, i) => [d, i]));
      const r = { days, w1: days.map(() => 0), w2: days.map(() => 0) };
      for (const u of AP.db.units) {
        if (u.type === 'pallet') continue;
        const i = ix[AP.d.dayOf(u.at)];
        if (i != null) r[u.workshop][i] += u.net;
      }
      return r;
    });
  };
  UI.ordersTable = function (list, { money = AP.seeMoney(), compact = false } = {}) {
    if (!list.length) return UI.empty('Заказов нет', 'Под выбранные условия ничего не подходит');
    return html`<div class="table-wrap"><table class="table ${compact ? 'compact' : ''}"><thead><tr><th>Заказ</th><th>Клиент</th><th>Продукция</th><th class="r">Тираж</th><th>Срок</th><th>Статус</th><th style="width:120px">Готово</th>${money ? html`<th class="r">Сумма</th>` : ''}</tr></thead><tbody>
      ${list.map((o) => {
        const p = AP.product(o.productId), st = AP.orderStatus(o), od = AP.isOverdue(o);
        const stage = st === 'production' ? AP.STAGES[AP.currentStage(o)].short : '';
        return html`<tr class="click ${od ? 'row-bad' : ''}" data-act="open-order" data-id="${o.id}">
          <td><span class="cell-title">${o.no}</span>${o.urgent ? html` <span class="chip urgent" data-tip="${o.urgent.reason}">срочно</span>` : ''}<span class="cell-sub">${F.date(o.date)}</span></td>
          <td><span class="cell-title">${AP.client(o.clientId).name}</span><span class="cell-sub">${UI.wsChip(o.workshop)}</span></td>
          <td><span class="fw-7">${p.name}</span><span class="cell-sub">${o.material} · ${o.thick} мкм · ${o.color}${o.logo ? ' · логотип ' + o.inks.length + ' цв.' : ''}</span></td>
          <td class="r nowrap"><b>${p.base === 'кг' ? F.kg(o.qty) : F.num(o.qty)}</b><span class="cell-sub">${p.base === 'кг' ? F.num(AP.unitsCount(p, o.qty)) + ' рул.' : F.kg(AP.kgOf(p, o.qty))}</span></td>
          <td class="nowrap ${od ? 'bad-t fw-8' : ''}">${F.date(o.deadline)}${od ? html`<span class="cell-sub bad-t">просрочен</span>` : ''}</td>
          <td>${AP.statusBadge(st, stage)}</td>
          <td>${UI.progress(AP.orderProgress(o), st === 'closed' || st === 'shipped' ? 'ok' : '', 'sm')}<span class="cell-sub">${F.pct(AP.orderProgress(o) * 100, 0)}</span></td>
          ${money ? html`<td class="r nowrap fw-7">${F.m(AP.orderAmount(o))}</td>` : ''}
        </tr>`;
      })}</tbody></table></div>`;
  };

  /* ---------- Запуск ---------- */
  AP.boot = function () {
    document.documentElement.setAttribute('data-theme', AP.themeWanted());
    AP.startThemeClock();
    AP.load();
    AP.user = AP.currentUser();
    if (!AP.user) { location.replace('index.html'); return; }
    shell();
    bindGlobal();
    AP.render();
    if (UI._printerJustConnected) UI.toast('Принтер Xprinter подключён', 'Кнопка «Печать» отправляет этикетки на принтер через агента');
  };
})();
