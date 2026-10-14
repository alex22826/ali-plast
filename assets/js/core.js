/* =========================================================
   ALI PLAST — ядро: утилиты, хранилище, вход, права, журнал,
   производные расчёты (статусы, остатки, долги, себестоимость)
   ========================================================= */
(function () {
  'use strict';
  const AP = (window.AP = window.AP || {});

  /* ---------- Безопасный HTML ---------- */
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
  function toHTML(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof Raw) return v.s;
    if (Array.isArray(v)) return v.map(toHTML).join('');
    return esc(v);
  }
  AP.esc = esc;
  AP.raw = (s) => new Raw(String(s));
  AP.html = (strings, ...vals) => {
    let out = '';
    strings.forEach((s, i) => { out += s; if (i < vals.length) out += toHTML(vals[i]); });
    return new Raw(out);
  };

  /* ---------- Случайные числа (детерминированные для демо) ---------- */
  AP.rng = function (seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (a1, b1) => a1 + (b1 - a1) * next();
    next.int = (a1, b1) => Math.floor(a1 + (b1 - a1 + 1) * next());
    next.pick = (arr) => arr[Math.floor(next() * arr.length)];
    next.chance = (p) => next() < p;
    return next;
  };

  /* ---------- Даты ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const D = (AP.d = {
    today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; },
    iso(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); },
    todayISO() { return D.iso(D.today()); },
    parse(s) {
      if (s instanceof Date) return s;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
      return new Date(s);
    },
    addDays(dt, n) { const x = new Date(D.parse(dt)); x.setDate(x.getDate() + n); return x; },
    dayOf(s) { return D.iso(D.parse(s)); },
    diffDays(a, b) { return Math.round((D.parse(D.dayOf(a)) - D.parse(D.dayOf(b))) / 86400000); },
    inRange(s, from, to) { const d = D.dayOf(s); return d >= from && d <= to; },
    monthStart(dt) { const x = new Date(D.parse(dt)); x.setDate(1); x.setHours(0, 0, 0, 0); return x; },
  });

  /* ---------- Форматирование ---------- */
  const nf = (d) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  const NF0 = nf(0), NF1 = nf(1), NF2 = nf(2);
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  AP.MONTHS = MONTHS; AP.MONTHS_FULL = MONTHS_FULL;
  const F = (AP.fmt = {
    num(v, d = 0) { return (d === 0 ? NF0 : d === 1 ? NF1 : d === 2 ? NF2 : nf(d)).format(Number(v) || 0); },
    kg(v, d) { const a = Math.abs(v); return F.num(v, d != null ? d : a < 10 ? 2 : a < 100 ? 1 : 0) + ' кг'; },
    t(v) { return F.num(v / 1000, 1) + ' т'; },
    money(v) { return F.num(Math.round(v)) + ' сум'; },
    m(v) { return F.num(Math.round(v)); },
    short(v) {
      const a = Math.abs(v), s = v < 0 ? '−' : '';
      if (a >= 1e9) return s + NF2.format(a / 1e9) + ' млрд';
      if (a >= 1e6) return s + NF1.format(a / 1e6) + ' млн';
      if (a >= 1e3) return s + (a < 1e4 && a % 1000 ? NF1 : NF0).format(a / 1e3) + ' тыс';
      return s + NF0.format(a);
    },
    pct(v, d = 1) { return F.num(v, d) + '%'; },
    date(s) { if (!s) return '—'; const x = D.parse(s); return pad(x.getDate()) + '.' + pad(x.getMonth() + 1) + '.' + x.getFullYear(); },
    dm(s) { if (!s) return '—'; const x = D.parse(s); return x.getDate() + ' ' + MONTHS[x.getMonth()]; },
    dt(s) { if (!s) return '—'; const x = D.parse(s); return pad(x.getDate()) + '.' + pad(x.getMonth() + 1) + ' ' + pad(x.getHours()) + ':' + pad(x.getMinutes()); },
    time(s) { const x = D.parse(s); return pad(x.getHours()) + ':' + pad(x.getMinutes()); },
    ago(s) {
      const m = Math.round((Date.now() - D.parse(s)) / 60000);
      if (m < 1) return 'только что';
      if (m < 60) return m + ' мин назад';
      const h = Math.round(m / 60);
      if (h < 24) return h + ' ч назад';
      const d = Math.round(h / 24);
      return d + ' дн. назад';
    },
    mins(m) { m = Math.round(m); if (m < 60) return m + ' мин'; return Math.floor(m / 60) + ' ч ' + pad(m % 60) + ' мин'; },
    plural(n, one, few, many) {
      const a = Math.abs(n) % 100, b = a % 10;
      if (a > 10 && a < 20) return many;
      if (b > 1 && b < 5) return few;
      if (b === 1) return one;
      return many;
    },
  });

  /* ---------- Хранилище ---------- */
  const DB_KEY = 'ap.db.v1';
  const SESSION_KEY = 'ap.session';
  AP.DB_VERSION = 4;
  let memo = {};

  function shiftDates(obj, deltaDays) {
    // демо-режим: сдвигаем все даты, чтобы данные всегда были «свежими»
    const reD = /^\d{4}-\d{2}-\d{2}$/, reDT = /^\d{4}-\d{2}-\d{2}T/;
    const ms = deltaDays * 86400000;
    (function walk(o) {
      if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { const v = o[i]; if (typeof v === 'string') { if (reD.test(v)) o[i] = D.iso(D.addDays(v, deltaDays)); else if (reDT.test(v)) o[i] = new Date(Date.parse(v) + ms).toISOString(); } else if (v && typeof v === 'object') walk(v); } return; }
      for (const k in o) {
        const v = o[k];
        if (typeof v === 'string') { if (reD.test(v)) o[k] = D.iso(D.addDays(v, deltaDays)); else if (reDT.test(v)) o[k] = new Date(Date.parse(v) + ms).toISOString(); }
        else if (v && typeof v === 'object') walk(v);
      }
    })(obj);
  }

  AP.load = function () {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { db = null; }
    if (!db || db.version !== AP.DB_VERSION) { db = AP.seed(); AP.db = db; persist(); }
    const today = D.todayISO();
    if (db.demo && db.baseDay !== today) {
      shiftDates(db, D.diffDays(today, db.baseDay)); // сдвигает и сам baseDay
      db.baseDay = today;
      AP.db = db; persist();
    }
    // правки демо без сброса данных: «Главный руководитель» → «Директор»
    (db.users || []).forEach((u) => { if (u.title === 'Главный руководитель') u.title = 'Директор'; });
    (db.employees || []).forEach((e) => { if (e.active == null) e.active = true; });
    AP.db = db;
    return db;
  };
  function persist() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(AP.db)); }
    catch (e) { console.warn('Не удалось сохранить данные', e); }
  }
  AP.save = function () { AP.db.rev = (AP.db.rev || 0) + 1; memo = {}; persist(); AP.emit('change'); };
  AP.resetDemo = function () { localStorage.removeItem(DB_KEY); AP.db = AP.seed(); persist(); memo = {}; };
  AP.seq = (k) => (AP.db.counters[k] = (AP.db.counters[k] || 0) + 1);
  AP.memo = function (key, fn) { if (!(key in memo)) memo[key] = fn(); return memo[key]; };
  AP.nextId = function (prefix, pad0 = 4) {
    const c = (AP.db.counters = AP.db.counters || {});
    c[prefix] = (c[prefix] || 0) + 1;
    return prefix + String(c[prefix]).padStart(pad0, '0');
  };

  /* ---------- События ---------- */
  const listeners = {};
  AP.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  AP.emit = (ev, data) => { (listeners[ev] || []).forEach((fn) => fn(data)); };

  /* ---------- Вход / сессия ---------- */
  AP.sha256 = async function (str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  AP.passHash = (login, pass) => AP.sha256(login.trim().toLowerCase() + ':' + pass + ':ali-plast');

  AP.login = async function (login, pass, remember) {
    const db = AP.db || AP.load();
    const l = String(login || '').trim().toLowerCase();
    const u = db.users.find((x) => x.login.toLowerCase() === l);
    const hash = await AP.passHash(l, pass || '');
    if (!u || u.passHash !== hash) {
      AP.audit('Неудачная попытка входа', 'user', u ? u.id : null, 'Логин: ' + l, u || { id: null, name: 'Гость' });
      AP.save();
      return { ok: false, error: 'Неверный логин или пароль' };
    }
    if (!u.active) return { ok: false, error: 'Учётная запись отключена. Обратитесь к директору.' };
    const s = JSON.stringify({ uid: u.id, at: Date.now() });
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, s);
    u.lastLogin = new Date().toISOString();
    AP.audit('Вход в систему', 'user', u.id, '', u);
    AP.save();
    return { ok: true, user: u };
  };
  AP.currentUser = function () {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (Date.now() - s.at > 12 * 3600 * 1000) { AP.logout(true); return null; }
      const u = (AP.db || AP.load()).users.find((x) => x.id === s.uid);
      return u && u.active ? u : null;
    } catch (e) { return null; }
  };
  AP.logout = function (silent) {
    if (!silent && AP.user) { AP.audit('Выход из системы', 'user', AP.user.id, ''); AP.save(); }
    sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY);
  };

  /* ---------- Права доступа (раздел 2 ТЗ) ---------- */
  AP.LEVELS = ['Нет доступа', 'Просмотр', 'Изменение', 'Полный'];
  AP.SECTIONS = [
    { key: 'dashboard', title: 'Сводка', group: 'Главное', icon: 'home' },
    { key: 'findash', title: 'Финансовый дашборд', group: 'Главное', icon: 'chart', directorOnly: true },
    { key: 'orders', title: 'Заказы', group: 'Продажи', icon: 'clipboard' },
    { key: 'clients', title: 'Клиенты', group: 'Продажи', icon: 'users' },
    { key: 'production', title: 'Производство', group: 'Производство', icon: 'factory', scoped: true },
    { key: 'scales', title: 'Весы', group: 'Производство', icon: 'scale', scoped: true },
    { key: 'qr', title: 'QR-коды', group: 'Производство', icon: 'qr', scoped: true },
    { key: 'stock', title: 'Склад сырья', group: 'Склад', icon: 'layers', scoped: true },
    { key: 'warehouse', title: 'Склад ГП и погрузка', group: 'Склад', icon: 'truck' },
    { key: 'money', title: 'Касса, счёт, карта', group: 'Деньги', icon: 'wallet', money: true },
    { key: 'debts', title: 'Долги', group: 'Деньги', icon: 'scale2', money: true },
    { key: 'cost', title: 'Себестоимость', group: 'Деньги', icon: 'calc', money: true },
    { key: 'staff', title: 'Персонал', group: 'Люди', icon: 'id', scoped: true },
    { key: 'reports', title: 'Отчёты', group: 'Аналитика', icon: 'file' },
    { key: 'refs', title: 'Справочники и нормы', group: 'Настройки', icon: 'book' },
    { key: 'users', title: 'Пользователи и права', group: 'Настройки', icon: 'shield' },
    { key: 'audit', title: 'Журнал действий', group: 'Настройки', icon: 'log' },
  ];
  AP.FLAGS = [
    { key: 'money', title: 'Видит цены и суммы', hint: 'цены заказов, оплаты, стоимость сырья' },
    { key: 'manualWeight', title: 'Ручной ввод веса', hint: 'только с обязательным комментарием, пишется в журнал' },
    { key: 'correctWriteoff', title: 'Исправление списаний', hint: 'без права — исправление уходит на утверждение директору' },
    { key: 'approve', title: 'Утверждение операций', hint: 'исправления списаний, отгрузка должнику, корректировки остатков' },
    { key: 'ownClientsOnly', title: 'Только свои клиенты', hint: 'для менеджера по продажам — видит клиентов и долги, где он ответственный' },
  ];
  const P = (lv) => lv; // для читаемости пресетов
  AP.ROLE_PRESETS = {
    director: {
      title: 'Директор', workshop: 'all',
      perms: Object.fromEntries(AP.SECTIONS.map((s) => [s.key, 3])),
      flags: { money: true, manualWeight: true, correctWriteoff: true, approve: true },
    },
    shop: {
      title: 'Начальник цеха',
      perms: { dashboard: P(1), orders: P(1), production: P(2), scales: P(2), qr: P(2), stock: P(1), staff: P(1), reports: P(1), refs: P(1) },
      flags: { manualWeight: true },
    },
    storekeeper: {
      title: 'Кладовщик', workshop: 'all',
      perms: { dashboard: P(1), orders: P(1), scales: P(2), qr: P(2), stock: P(2), warehouse: P(2), refs: P(1) },
      flags: {},
    },
    sales: {
      title: 'Менеджер по продажам', workshop: 'all',
      perms: { dashboard: P(1), orders: P(2), clients: P(2), warehouse: P(1), debts: P(1), reports: P(1), refs: P(1) },
      flags: { money: true, ownClientsOnly: true },
    },
    accountant: {
      title: 'Бухгалтер', workshop: 'all',
      perms: { dashboard: P(1), orders: P(1), clients: P(1), money: P(3), debts: P(2), cost: P(1), reports: P(1), staff: P(1) },
      flags: { money: true },
    },
    operator: {
      title: 'Оператор весов',
      perms: { scales: P(2), qr: P(1) },
      flags: {},
    },
  };

  AP.isDirector = (u = AP.user) => !!u && u.role === 'director';
  AP.level = function (section, u = AP.user) {
    if (!u) return 0;
    if (section === 'findash') return AP.isDirector(u) ? 3 : 0; // ТЗ 4.11: выдать права нельзя
    if (u.role === 'director') return 3;
    return (u.perms && u.perms[section]) || 0;
  };
  AP.can = (section, lvl = 1, u = AP.user) => AP.level(section, u) >= lvl;
  AP.flag = (f, u = AP.user) => !!u && (u.role === 'director' || !!(u.flags && u.flags[f]));
  AP.seeMoney = () => AP.flag('money');

  /* область цехов: ограничение пользователя ∩ переключатель в сайдбаре */
  AP.userWorkshop = (u = AP.user) => (u && u.role !== 'director' && u.workshop && u.workshop !== 'all' ? u.workshop : 'all');
  AP.scope = function () {
    const fixed = AP.userWorkshop();
    if (fixed !== 'all') return fixed;
    return sessionStorage.getItem('ap.scope') || 'all';
  };
  AP.setScope = (s) => sessionStorage.setItem('ap.scope', s);
  AP.inScope = (w) => { const s = AP.scope(); return s === 'all' || !w || w === s; };
  AP.inUserScope = (w) => { const s = AP.userWorkshop(); return s === 'all' || !w || w === s; };

  /* ---------- Журнал действий (нельзя править и удалять) ---------- */
  AP.audit = function (action, entity, entityId, details, u) {
    const usr = u || AP.user || { id: null, name: 'Система' };
    AP.db.audit.push({
      id: 'L' + (AP.db.audit.length + 1).toString(36) + Date.now().toString(36).slice(-4),
      ts: new Date().toISOString(), uid: usr.id, user: usr.name, action, entity, entityId: entityId || null, details: details || '',
    });
  };

  /* ---------- Справочные выборки ---------- */
  const byId = (coll) => AP.memo('id:' + coll, () => Object.fromEntries(AP.db[coll].map((x) => [x.id, x])));
  AP.get = (coll, id) => byId(coll)[id];
  AP.product = (id) => AP.get('products', id);
  AP.client = (id) => AP.get('clients', id);
  AP.material = (id) => AP.get('materials', id);
  AP.machine = (id) => AP.get('machines', id);
  AP.employee = (id) => AP.get('employees', id);
  AP.supplier = (id) => AP.get('suppliers', id);
  AP.order = (id) => AP.get('orders', id);
  AP.unit = (id) => AP.get('units', id);
  AP.userById = (id) => AP.get('users', id);
  AP.workshop = (id) => AP.db.workshops.find((w) => w.id === id);
  AP.wsName = (id) => (id === 'sklad' ? 'Склад' : (AP.workshop(id) || {}).name || '—');

  AP.groupBy = function (arr, key) {
    const m = {};
    for (const x of arr) { const k = typeof key === 'function' ? key(x) : x[key]; (m[k] = m[k] || []).push(x); }
    return m;
  };
  AP.sum = (arr, f) => arr.reduce((s, x) => s + ((typeof f === 'function' ? f(x) : f ? x[f] : x) || 0), 0);
  const idx = (coll, key) => AP.memo('grp:' + coll + ':' + key, () => AP.groupBy(AP.db[coll], key));
  AP.unitsOf = (oid) => (idx('units', 'orderId')[oid] || []).filter((u) => u.type !== 'pallet');
  AP.shipmentsOf = (oid) => idx('shipments', 'orderId')[oid] || [];
  AP.paymentsOf = (oid) => idx('payments', 'orderId')[oid] || [];
  AP.writeoffsOf = (oid) => idx('writeoffs', 'orderId')[oid] || [];
  AP.defectsOf = (oid) => idx('defects', 'orderId')[oid] || [];
  AP.ordersOf = (cid) => idx('orders', 'clientId')[cid] || [];
  AP.childrenOf = (pid) => idx('units', 'parent')[pid] || [];

  /* ---------- Продукция: единицы и пересчёты (раздел 7 ТЗ) ---------- */
  AP.UNIT_TYPES = { box: 'Коробка', sack: 'Мешок', roll: 'Рулон', pallet: 'Паллета' };
  AP.TARE = { box: 0.6, sack: 0.15, roll: 1.2, pallet: 18 };
  AP.unitKg = (p) => (p.base === 'кг' ? p.unit.kg : (p.unit.pcs * p.g) / 1000);
  AP.kgOf = (p, qty) => (p.base === 'кг' ? qty : (qty * p.g) / 1000);
  AP.qtyOfKg = (p, kg) => (p.base === 'кг' ? kg : (kg * 1000) / p.g);
  AP.fmtQty = function (p, qty, opts = {}) {
    if (!p) return '—';
    if (p.base === 'кг') return F.kg(qty) + (opts.units === false ? '' : ' · ' + F.num(qty / p.unit.kg, 0) + ' рул.');
    let s = F.num(qty) + ' шт';
    if (opts.kg !== false) s += ' · ' + F.kg(AP.kgOf(p, qty));
    return s;
  };
  AP.unitsCount = (p, qty) => Math.ceil((p.base === 'кг' ? qty / p.unit.kg : qty / p.unit.pcs) - 1e-9);

  /* ---------- Заказы: суммы, выпуск, отгрузка, статус ---------- */
  AP.orderAmount = (o, qty = o.qty) => { const p = AP.product(o.productId); return p.base === 'кг' ? qty * o.price : (qty / 1000) * o.price; };
  AP.producedQty = (o) => AP.sum(AP.unitsOf(o.id), 'pcs');
  AP.producedKg = (o) => AP.sum(AP.unitsOf(o.id), 'net');
  AP.shippedQty = (o) => AP.sum(AP.unitsOf(o.id).filter((u) => u.status === 'shipped'), 'pcs');
  AP.shippedKg = (o) => AP.sum(AP.unitsOf(o.id).filter((u) => u.status === 'shipped'), 'net');
  AP.paidSum = (o) => AP.sum(AP.paymentsOf(o.id), 'amount');
  AP.shippedAmount = (o) => AP.orderAmount(o, AP.shippedQty(o));

  AP.STATUSES = {
    new: { t: 'Новый', s: 'Новые', c: 'b-brand' },
    layout: { t: 'Согласование макета', s: 'Макет', c: 'b-violet' },
    waiting: { t: 'Ожидает сырьё', s: 'Ждут сырьё', c: 'b-warn' },
    queue: { t: 'В очереди', s: 'В очереди', c: '' },
    production: { t: 'В производстве', s: 'В работе', c: 'b-info' },
    ready: { t: 'Готов', s: 'Готовы', c: 'b-teal' },
    stock: { t: 'На складе', s: 'На складе', c: 'b-cyan' },
    partial: { t: 'Частично отгружен', s: 'Частично', c: 'b-orange' },
    shipped: { t: 'Отгружен', s: 'Отгружены', c: 'b-ok' },
    closed: { t: 'Закрыт', s: 'Закрыты', c: 'b-dark' },
    cancelled: { t: 'Отменён', c: 'b-bad' },
  };
  AP.STATUS_ORDER = ['new', 'layout', 'waiting', 'queue', 'production', 'ready', 'stock', 'partial', 'shipped', 'closed'];
  AP.STAGES = {
    extrusion: { t: 'Выпуск плёнки', short: 'Экструзия', icon: 'flame' },
    print: { t: 'Печать', short: 'Печать', icon: 'droplet' },
    cut: { t: 'Резка и запайка', short: 'Резка', icon: 'scissors' },
    pack: { t: 'Упаковка', short: 'Упаковка', icon: 'box' },
  };
  AP.stagesOf = (o) => { const p = AP.product(o.productId); return p.stages.filter((s) => s !== 'print' || o.logo); };

  /* Статус двигается сам — по фактам из производства, склада и денег (ТЗ 3.2) */
  AP.orderStatus = function (o) {
    return AP.memo('st:' + o.id, () => {
      if (o.cancelled) return 'cancelled';
      const tol = 0.98;
      const shipped = AP.shippedQty(o);
      if (shipped >= o.qty * tol) return AP.orderDebt(o) > 0 ? 'shipped' : 'closed';
      if (shipped > 0) return 'partial';
      const produced = AP.producedQty(o);
      if (produced >= o.qty * tol) return AP.unitsOf(o.id).every((u) => u.status !== 'produced') ? 'stock' : 'ready';
      if (o.task && o.task.startedAt) return 'production';
      if (o.logo && !(o.maket && o.maket.approved)) return 'layout';
      if (AP.shortage(o).length) return 'waiting';
      if (o.task) return 'queue';
      return 'new';
    });
  };
  AP.statusBadge = (st, extra) => AP.html`<span class="badge ${AP.STATUSES[st].c}">${AP.STATUSES[st].t}${extra ? ' · ' + extra : ''}</span>`;
  AP.currentStage = function (o) {
    const st = AP.stagesOf(o);
    const pr = o.progress || {};
    const need = AP.kgOf(AP.product(o.productId), o.qty);
    for (const s of st) { const done = s === 'pack' ? AP.producedKg(o) : pr[s] || 0; if (done < need * 0.98) return s; }
    return st[st.length - 1];
  };
  AP.currentMachine = (o) => o.route && o.route[AP.currentStage(o)];
  AP.orderProgress = (o) => Math.min(1, AP.producedQty(o) / o.qty);
  AP.isOverdue = (o) => { const st = AP.orderStatus(o); return ['shipped', 'closed', 'cancelled'].indexOf(st) < 0 && o.deadline < D.todayISO(); };

  /* ---------- Рецептура и потребность в сырье (ТЗ 4.3, 8) ---------- */
  AP.recipeLines = function (o, kg) {
    const p = AP.product(o.productId);
    const k = 1 + p.waste / 100;
    const lines = p.recipe.map(([m, perKg]) => ({ m, qty: kg * perKg * k, stage: 'extrusion' }));
    if (o.logo && o.inks && o.inks.length) {
      const S = AP.db.settings;
      o.inks.forEach((m) => lines.push({ m, qty: kg * S.inkPerColorKg * (o.coverage || 1) * k, stage: 'print' }));
      lines.push({ m: 'solvent', qty: kg * S.solventPerKg * o.inks.length * k, stage: 'print' });
    }
    const pm = { box: 'box', sack: 'sack', roll: 'core' }[p.unit.type];
    if (pm) lines.push({ m: pm, qty: Math.ceil(kg / AP.unitKg(p)), stage: 'pack' });
    return lines;
  };
  AP.materialNeed = function (o) {
    const p = AP.product(o.productId);
    const left = Math.max(0, o.qty - AP.producedQty(o));
    return AP.recipeLines(o, AP.kgOf(p, left));
  };
  AP.stock = function () {
    return AP.memo('stock', () => {
      const s = {};
      AP.db.materials.forEach((m) => (s[m.id] = { sklad: 0, w1: 0, w2: 0, total: 0 }));
      AP.db.batches.forEach((b) => {
        const r = s[b.materialId]; if (!r) return;
        for (const loc of ['sklad', 'w1', 'w2']) { r[loc] += b.left[loc] || 0; r.total += b.left[loc] || 0; }
      });
      return s;
    });
  };
  AP.shortage = function (o) {
    const st = AP.stock();
    if (o.task && o.task.startedAt) return [];
    const out = [];
    for (const l of AP.materialNeed(o)) {
      const have = (st[l.m] || {}).total || 0;
      if (have + 1e-6 < l.qty) out.push({ m: l.m, need: l.qty, have, lack: l.qty - have });
    }
    return out;
  };
  AP.isLow = (mid, loc) => {
    const m = AP.material(mid), s = AP.stock()[mid];
    if (!loc || loc === 'total') return s.total < m.min;
    return false;
  };
  AP.fmtMat = function (mid, qty) {
    const m = AP.material(mid);
    if (!m) return F.num(qty);
    let s = F.num(qty, m.unit === 'кг' && qty < 100 ? 1 : 0) + ' ' + m.unit;
    if (m.pack) s += ' · ' + F.num(qty / m.pack.qty, 1) + ' ' + m.pack.name;
    return s;
  };

  /* Списание со склада по партиям (FIFO), возвращает использованные партии */
  AP.consume = function (mid, loc, qty) {
    const bs = AP.db.batches.filter((b) => b.materialId === mid).sort((a, b) => (a.date < b.date ? -1 : 1));
    const used = [];
    let rest = qty;
    const take = (l) => {
      for (const b of bs) {
        if (rest <= 1e-9) break;
        const av = b.left[l] || 0;
        if (av <= 0) continue;
        const t = Math.min(av, rest);
        b.left[l] = av - t; rest -= t; used.push({ batchId: b.id, qty: t, loc: l });
      }
    };
    take(loc);
    if (rest > 1e-9 && loc !== 'sklad') take('sklad');
    if (rest > 1e-9 && bs.length) { const b = bs[bs.length - 1]; b.left[loc] = (b.left[loc] || 0) - rest; used.push({ batchId: b.id, qty: rest, loc, negative: true }); rest = 0; }
    return used;
  };

  /* ---------- Себестоимость (ТЗ 4.7) ---------- */
  AP.planPerKg = function (o) {
    const p = AP.product(o.productId);
    const S = AP.db.settings;
    const L = AP.recipeLines(o, 1000); // на тонну, чтобы упаковка считалась корректно
    let materials = 0, inks = 0, pack = 0;
    for (const l of L) {
      const c = (l.qty * AP.material(l.m).price) / 1000;
      if (l.stage === 'print') inks += c; else if (l.stage === 'pack') pack += c; else materials += c;
    }
    const st = AP.stagesOf(o);
    const power = st.reduce((s, x) => s + S.kwhPerKg[x], 0) * S.tariff;
    const labor = st.reduce((s, x) => s + S.laborPerKg[x], 0);
    const r = { materials, inks, pack, power, labor, depr: S.deprPerKg, other: S.overheadPerKg };
    r.total = r.materials + r.inks + r.pack + r.power + r.labor + r.depr + r.other;
    return r;
  };
  AP.COST_PARTS = [['materials', 'Сырьё'], ['inks', 'Краски и растворитель'], ['pack', 'Упаковка'], ['power', 'Электричество'], ['labor', 'Зарплата'], ['depr', 'Износ станков'], ['other', 'Прочие расходы']];
  AP.costFact = function (o) {
    return AP.memo('cf:' + o.id, () => {
      const kg = AP.producedKg(o);
      const S = AP.db.settings;
      const r = { materials: 0, inks: 0, pack: 0, power: 0, labor: 0, depr: 0, other: 0, kg };
      for (const w of AP.writeoffsOf(o.id)) {
        const m = AP.material(w.materialId);
        const c = w.qty * (w.price || m.price);
        if (m.kind === 'ink' || m.kind === 'solvent') r.inks += c; else if (m.kind === 'pack') r.pack += c; else r.materials += c;
      }
      const st = AP.stagesOf(o);
      const k = o.k || { power: 1, labor: 1 };
      r.power = kg * st.reduce((s, x) => s + S.kwhPerKg[x], 0) * S.tariff * k.power;
      r.labor = kg * st.reduce((s, x) => s + S.laborPerKg[x], 0) * k.labor;
      r.depr = kg * S.deprPerKg;
      r.other = kg * S.overheadPerKg;
      r.total = r.materials + r.inks + r.pack + r.power + r.labor + r.depr + r.other;
      r.perKg = kg ? r.total / kg : 0;
      const dKg = AP.sum(AP.defectsOf(o.id).filter((x) => x.kind !== 'waste'), 'kg');
      r.defectKg = dKg;
      r.defectCost = kg ? dKg * ((r.materials + r.inks) / (kg + dKg)) : 0;
      return r;
    });
  };
  AP.orderEconomics = function (o) {
    const p = AP.product(o.productId);
    const plan = AP.planPerKg(o);
    const fact = AP.costFact(o);
    const shippedKg = AP.shippedKg(o);
    const revenue = AP.shippedAmount(o);
    const perKgFact = fact.perKg || plan.total;
    const cogs = shippedKg * perKgFact;
    const fullKg = AP.kgOf(p, o.qty);
    return {
      plan, fact, fullKg,
      planTotal: plan.total * fullKg,
      planProfit: AP.orderAmount(o) - plan.total * fullKg,
      factVsPlan: fact.kg ? fact.perKg / plan.total - 1 : 0,
      revenue, cogs, profit: revenue - cogs,
      margin: revenue ? (revenue - cogs) / revenue : 0,
    };
  };

  /* ---------- Дебиторка: FIFO оплат по отгрузкам (ТЗ 4.12) ---------- */
  AP.receivableItems = function (o) {
    return AP.memo('ri:' + o.id, () => {
      const cl = AP.client(o.clientId);
      const ships = AP.shipmentsOf(o.id).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
      let paid = AP.paidSum(o);
      const items = [];
      for (const s of ships) {
        const amt = AP.orderAmount(o, s.qty);
        const cover = Math.min(paid, amt);
        paid -= cover;
        const left = amt - cover;
        if (left > 1000) { // допуск на округление оплат до 1000 сум
          const due = D.iso(D.addDays(s.date, cl.payDays));
          items.push({ orderId: o.id, shipmentId: s.id, date: s.date, amount: amt, left, due, overdue: Math.max(0, D.diffDays(D.todayISO(), due)) });
        }
      }
      return { items, advance: Math.max(0, paid) };
    });
  };
  AP.orderDebt = (o) => AP.sum(AP.receivableItems(o).items, 'left');
  AP.AGING = [['current', 'Не просрочено'], ['d30', 'До 30 дней'], ['d60', '31–60 дней'], ['d60p', 'Больше 60 дней']];
  AP.agingKey = (d) => (d <= 0 ? 'current' : d <= 30 ? 'd30' : d <= 60 ? 'd60' : 'd60p');
  AP.receivables = function () {
    return AP.memo('recv', () => {
      const res = {};
      for (const c of AP.db.clients) res[c.id] = { clientId: c.id, total: 0, overdue: 0, maxDays: 0, advance: 0, items: [], b: { current: 0, d30: 0, d60: 0, d60p: 0 } };
      for (const o of AP.db.orders) {
        const r = AP.receivableItems(o), x = res[o.clientId];
        x.advance += r.advance;
        for (const it of r.items) {
          x.items.push(it); x.total += it.left;
          x.b[AP.agingKey(it.overdue)] += it.left;
          if (it.overdue > 0) { x.overdue += it.left; x.maxDays = Math.max(x.maxDays, it.overdue); }
        }
      }
      // предоплаты без заказа
      for (const p of AP.db.payments) if (!p.orderId && res[p.clientId]) res[p.clientId].advance += p.amount;
      return res;
    });
  };
  AP.clientDebt = (cid) => AP.receivables()[cid];

  /* ---------- Кредиторка: FIFO оплат поставщикам по приходам ---------- */
  AP.payables = function () {
    return AP.memo('pay', () => {
      const res = {};
      for (const s of AP.db.suppliers) res[s.id] = { supplierId: s.id, total: 0, overdue: 0, maxDays: 0, advance: 0, items: [], b: { current: 0, d30: 0, d60: 0, d60p: 0 } };
      const batches = AP.groupBy(AP.db.batches.filter((b) => b.supplierId), 'supplierId');
      const pays = AP.groupBy(AP.db.expenses.filter((e) => e.supplierId), 'supplierId');
      for (const sid in res) {
        const sup = AP.supplier(sid);
        let paid = AP.sum(pays[sid] || [], 'amount');
        const list = (batches[sid] || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
        for (const b of list) {
          const amt = b.qty * b.price;
          const cover = Math.min(paid, amt);
          paid -= cover;
          const left = amt - cover;
          if (left > 0.5) {
            const due = D.iso(D.addDays(b.date, sup.payDays));
            const od = Math.max(0, D.diffDays(D.todayISO(), due));
            const it = { batchId: b.id, date: b.date, amount: amt, left, due, overdue: od };
            const x = res[sid];
            x.items.push(it); x.total += left; x.b[AP.agingKey(od)] += left;
            if (od > 0) { x.overdue += left; x.maxDays = Math.max(x.maxDays, od); }
          }
        }
        res[sid].advance = Math.max(0, paid);
      }
      return res;
    });
  };
  AP.obligationsOpen = () => AP.db.obligations.filter((x) => !x.paid);

  /* ---------- Деньги: остатки по кассе, счёту, карте (ТЗ 4.8) ---------- */
  AP.PAY = { cash: { t: 'Наличные', c: 'var(--pay-cash)', icon: 'cash' }, bank: { t: 'Безналичные', c: 'var(--pay-bank)', icon: 'bank' }, card: { t: 'Корп. карта', c: 'var(--pay-card)', icon: 'card' } };
  AP.EXP_CATS = { raw: 'Сырьё и материалы', salary: 'Зарплата', power: 'Электричество', rent: 'Аренда', tax: 'Налоги', transport: 'Транспорт и ГСМ', repair: 'Ремонт и запчасти', other: 'Прочие' };
  AP.balances = function (atDay) {
    const day = atDay || D.todayISO();
    return AP.memo('bal:' + day, () => {
      const b = Object.assign({}, AP.db.opening);
      for (const p of AP.db.payments) if (D.dayOf(p.date) <= day) b[p.method] += p.amount;
      for (const e of AP.db.expenses) if (D.dayOf(e.date) <= day) b[e.method] -= e.amount;
      for (const t of AP.db.transfers || []) if (D.dayOf(t.date) <= day) { b[t.from] -= t.amount; b[t.to] += t.amount; }
      b.total = b.cash + b.bank + b.card;
      return b;
    });
  };

  /* ---------- Станки ---------- */
  AP.machineState = function (mid) {
    return AP.memo('ms:' + mid, () => {
      const dt = AP.db.downtimes.find((d) => d.machineId === mid && !d.end);
      if (dt) return { s: 'down', t: 'Простой', since: dt.start, reason: dt.reason, dt };
      const o = AP.db.orders.find((x) => x.task && x.task.startedAt && AP.orderStatus(x) === 'production' && AP.currentMachine(x) === mid);
      if (o) return { s: 'run', t: 'Работает', order: o };
      return { s: 'idle', t: 'Свободен' };
    });
  };

  /* ---------- Уведомления директору (ТЗ 4.10) ---------- */
  AP.alerts = function () {
    return AP.memo('alerts:' + (AP.user ? AP.user.id : '') + AP.scope(), () => {
      const out = [];
      const st = AP.stock();
      const today = D.todayISO();
      const scopeOk = (w) => AP.inScope(w);
      if (AP.can('stock')) {
        for (const m of AP.db.materials) {
          const s = st[m.id];
          if (s.total < m.min) out.push({ lvl: s.total < m.min * 0.5 ? 'bad' : 'warn', kind: 'Сырьё', icon: 'layers', title: 'Мало: ' + m.name, text: 'Остаток ' + AP.fmtMat(m.id, s.total) + ' при минимуме ' + F.num(m.min) + ' ' + m.unit, href: '#/stock' });
        }
      }
      if (AP.can('production')) {
        for (const d of AP.db.downtimes) if (!d.end && scopeOk(AP.machine(d.machineId).workshop)) {
          const mins = (Date.now() - D.parse(d.start)) / 60000;
          if (mins > 20) out.push({ lvl: mins > 45 ? 'bad' : 'warn', kind: 'Станок', icon: 'pause', title: AP.machine(d.machineId).name + ' стоит ' + F.mins(mins), text: d.reason, href: '#/production?tab=down' });
        }
        // брак выше нормы за 7 дней
        const from = D.iso(D.addDays(today, -7));
        for (const o of AP.db.orders) {
          if (!scopeOk(o.workshop)) continue;
          const dk = AP.sum(AP.defectsOf(o.id).filter((x) => x.date >= from && x.kind !== 'waste'), 'kg');
          if (!dk) continue;
          const kg = AP.sum(AP.db.outputs.filter((x) => x.orderId === o.id && x.date >= from && x.stage === 'extrusion'), 'kg') || AP.producedKg(o);
          const norm = AP.product(o.productId).defect;
          const rate = kg ? (dk / kg) * 100 : 0;
          if (rate > norm * 1.25) out.push({ lvl: 'warn', kind: 'Брак', icon: 'alert', title: 'Брак ' + F.pct(rate) + ' по ' + o.no, text: 'Норма ' + F.pct(norm) + ' · ' + AP.wsName(o.workshop), href: '#/production?tab=defects' });
        }
      }
      if (AP.can('orders')) {
        for (const o of AP.db.orders) {
          if (!scopeOk(o.workshop)) continue;
          const s = AP.orderStatus(o);
          if (['shipped', 'closed', 'cancelled', 'stock', 'partial'].includes(s)) continue;
          const left = D.diffDays(o.deadline, today);
          if (left < 0) out.push({ lvl: 'bad', kind: 'Заказ', icon: 'clock', title: o.no + ' просрочен на ' + -left + ' дн.', text: AP.client(o.clientId).name + ' · ' + AP.STATUSES[s].t, href: '#/orders/' + o.id });
          else if (left <= 1 && AP.orderProgress(o) < 0.8) out.push({ lvl: 'warn', kind: 'Заказ', icon: 'clock', title: o.no + ': срок ' + (left ? 'завтра' : 'сегодня'), text: 'Готово ' + F.pct(AP.orderProgress(o) * 100, 0), href: '#/orders/' + o.id });
          if (s === 'waiting') out.push({ lvl: 'warn', kind: 'Заказ', icon: 'layers', title: o.no + ' ждёт сырьё', text: AP.shortage(o).map((x) => AP.material(x.m).name).join(', '), href: '#/orders/' + o.id });
        }
      }
      if (AP.can('debts')) {
        const R = AP.receivables();
        for (const cid in R) {
          const r = R[cid], c = AP.client(cid);
          if (!AP.clientVisible(c)) continue;
          if (r.overdue > 0) out.push({ lvl: r.maxDays > 30 ? 'bad' : 'warn', kind: 'Долг', icon: 'coins', title: c.name + ': просрочка ' + r.maxDays + ' дн.', text: 'Просрочено ' + F.money(r.overdue), href: '#/debts?c=' + cid, money: true });
          if (c.limit && r.total > c.limit) out.push({ lvl: 'bad', kind: 'Лимит', icon: 'alert', title: c.name + ': превышен лимит долга', text: F.money(r.total) + ' при лимите ' + F.money(c.limit), href: '#/debts?c=' + cid, money: true });
        }
        if (AP.flag('money') && !AP.flag('ownClientsOnly')) {
          const PY = AP.payables();
          for (const sid in PY) {
            for (const it of PY[sid].items) {
              const left = D.diffDays(it.due, today);
              if (left < 0) out.push({ lvl: 'bad', kind: 'Платёж', icon: 'bank', title: 'Просрочен платёж: ' + AP.supplier(sid).name, text: F.money(it.left) + ' · срок был ' + F.date(it.due), href: '#/debts?tab=payables', money: true });
              else if (left <= 3) out.push({ lvl: 'info', kind: 'Платёж', icon: 'bank', title: 'Скоро платёж: ' + AP.supplier(sid).name, text: F.money(it.left) + ' до ' + F.date(it.due), href: '#/debts?tab=payables', money: true });
            }
          }
        }
      }
      if (AP.flag('approve')) {
        for (const a of AP.db.approvals) if (a.status === 'pending') out.unshift({ lvl: 'info', kind: 'Утверждение', icon: 'shield', title: a.title, text: a.user + ' · ' + F.dt(a.ts), href: '#/audit?tab=approvals' });
      }
      if (!AP.seeMoney()) return out.filter((a) => !a.money);
      const rank = { bad: 0, warn: 1, info: 2 };
      return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]);
    });
  };

  /* менеджер видит только своих клиентов */
  AP.clientVisible = (c) => !AP.flag('ownClientsOnly') || AP.isDirector() || c.managerId === AP.user.id;
  AP.orderVisible = (o) => AP.inScope(o.workshop) && AP.clientVisible(AP.client(o.clientId));

  /* ---------- Экспорт ---------- */
  AP.exportCSV = function (name, rows) {
    const csv = rows.map((r) => r.map((v) => {
      const s = v == null ? '' : String(v);
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    AP.audit('Выгрузка в Excel', 'export', null, name); AP.save();
  };

  AP.initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  AP.avatarColor = (id) => ['#3D5AFE', '#10B3A3', '#B04CE0', '#E2621B', '#15994A', '#0B92B8', '#DC3B42', '#7B4CE0'][Math.abs([...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0)) % 8];
})();
