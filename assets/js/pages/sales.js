/* Заказы и клиенты (ТЗ 3, 4.1, 4.2) */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  const D = AP.d;
  AP.act = AP.act || {};
  const TERMS = { post: 'Отсрочка', pre50: 'Предоплата 50%', pre100: 'Предоплата 100%' };
  const termsText = (o) => (o.terms === 'post' ? 'Отсрочка ' + o.payDays + ' дн. после отгрузки' : o.terms === 'pre50' ? 'Предоплата 50%, остаток ' + o.payDays + ' дн. после отгрузки' : 'Предоплата 100%');

  /* ---------- действия с заказом ---------- */
  const A = AP.act;
  const hist = (o, text) => { o.history = o.history || []; o.history.push({ ts: new Date().toISOString(), user: AP.user.name, text }); AP.audit(text, 'order', o.id, o.no); };
  A.approveMaket = (o) => { o.maket = Object.assign(o.maket || {}, { approved: true, approvedAt: new Date().toISOString(), by: AP.user.id }); hist(o, 'Макет согласован с клиентом'); AP.save(); UI.toast('Макет согласован', o.no + ' можно ставить в очередь'); };
  A.queueOrder = (o, mid) => {
    const m = AP.machine(mid);
    o.task = { machineId: mid, queuedAt: new Date().toISOString(), startedAt: null, by: AP.user.id };
    if (m.type === 'extrusion') o.route.extrusion = mid;
    hist(o, 'Задание поставлено в очередь → ' + m.name);
    AP.save(); UI.toast('Задание в очереди', o.no + ' → ' + m.name);
  };
  A.startOrder = (o) => {
    const sh = AP.shortage(o);
    if (sh.length) { UI.toast('Не хватает сырья', sh.map((x) => AP.material(x.m).name).join(', '), 'bad'); return false; }
    o.task.startedAt = new Date().toISOString();
    hist(o, 'Запуск производства на ' + AP.machine(o.task.machineId).name);
    AP.save(); UI.toast('Производство запущено', o.no); return true;
  };
  /* выработка на этапе: автосписание сырья и красок по рецептуре (ТЗ 8.1) */
  A.registerOutput = (o, stage, kg, operatorId, comment) => {
    const p = AP.product(o.productId);
    const now = new Date();
    const shift = now.getHours() >= 8 && now.getHours() < 20 ? 'A' : 'B';
    const mid = o.route[stage];
    const out = { id: 'out' + AP.seq('out'), date: D.todayISO(), at: now.toISOString(), shift, workshop: o.workshop, machineId: mid, operatorId, orderId: o.id, stage, kg: Math.round(kg * 10) / 10, by: AP.user.id };
    AP.db.outputs.push(out);
    o.progress[stage] = (o.progress[stage] || 0) + kg;
    const lines = [];
    if (stage === 'extrusion') p.recipe.forEach(([m, perKg]) => lines.push([m, kg * perKg]));
    if (stage === 'print') { o.inks.forEach((m) => lines.push([m, kg * AP.db.settings.inkPerColorKg * (o.coverage || 1)])); lines.push(['solvent', kg * AP.db.settings.solventPerKg * o.inks.length]); }
    lines.forEach(([m, q]) => {
      const used = AP.consume(m, o.workshop, q);
      AP.db.writeoffs.push({ id: 'wo' + AP.seq('wo'), at: now.toISOString(), orderId: o.id, workshop: o.workshop, materialId: m, qty: q, norm: q, source: 'auto', stage, outputId: out.id, batchId: used[0] && used[0].batchId, price: AP.material(m).price });
    });
    hist(o, 'Выработка: ' + AP.STAGES[stage].t + ' ' + F.kg(kg) + (lines.length ? ' · списано ' + lines.map(([m, q]) => AP.material(m).name + ' ' + F.num(q, 1)).join(', ') : '') + (comment ? ' · ' + comment : ''));
    AP.save();
  };
  A.makePurchaseRequests = (o, sh) => {
    let n = 0;
    for (const x of sh) {
      if (AP.db.purchaseRequests.some((r) => r.materialId === x.m && r.status !== 'received')) continue;
      const m = AP.material(x.m);
      const qty = Math.ceil((x.lack * 1.3) / (m.pack ? m.pack.qty : 10)) * (m.pack ? m.pack.qty : 10);
      AP.db.purchaseRequests.unshift({ id: 'ЗЯ-' + String(AP.seq('ЗЯ-')).padStart(4, '0'), date: D.todayISO(), materialId: x.m, qty, orderId: o.id, status: 'new', by: AP.user.id, note: 'Для ' + o.no + ': не хватает ' + AP.fmtMat(x.m, x.lack) });
      AP.audit('Заявка на закупку', 'purchase', x.m, m.name + ' · ' + AP.fmtMat(x.m, qty) + ' · для ' + o.no);
      n++;
    }
    return n;
  };

  /* ---------- список заказов ---------- */
  AP.page('orders', {
    title: 'Заказы',
    render(r) {
      const q = r.q;
      const all = AP.db.orders.filter(AP.orderVisible).slice().reverse();
      const counts = {};
      all.forEach((o) => { const s = AP.orderStatus(o); counts[s] = (counts[s] || 0) + 1; });
      let list = all;
      if (q.st) list = list.filter((o) => AP.orderStatus(o) === q.st);
      else if (q.view !== 'all') list = list.filter((o) => AP.orderStatus(o) !== 'closed');
      if (q.c) list = list.filter((o) => o.clientId === q.c);
      if (q.late) list = list.filter(AP.isOverdue);
      if (q.q) { const s = q.q.toLowerCase(); list = list.filter((o) => (o.no + ' ' + AP.client(o.clientId).name + ' ' + AP.product(o.productId).name + ' ' + o.notes).toLowerCase().includes(s)); }
      const clients = AP.db.clients.filter(AP.clientVisible);
      return html`
        ${UI.pageHead('Заказы', 'Весь путь заказа: от заявки клиента до погрузки. Статус двигается сам — по весам, складу и оплатам.', html`
          <button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>
          ${AP.can('orders', 2) ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Новый заказ</button>` : ''}`)}
        <div class="pipeline mb-16">${AP.STATUS_ORDER.map((k) => html`<button class="pipe ${q.st === k ? 'on' : ''}" data-st="${k}" data-tip="${AP.STATUSES[k].t}"><span><i class="dot" style="background:currentColor"></i>${AP.STATUSES[k].s}</span><b>${counts[k] || 0}</b></button>`)}</div>
        <div class="card">
          <div class="card-h" style="padding-bottom:14px">
            <div class="input-icon grow" style="max-width:340px">${I('search')}<input class="input" data-f="q" placeholder="Номер, клиент, продукция…" value="${q.q || ''}"></div>
            <select class="select" data-f="c" aria-label="Клиент" style="max-width:260px">${UI.options(clients.map((c) => [c.id, c.name]), q.c, 'Все клиенты')}</select>
            <label class="switch"><input type="checkbox" data-f="late" ${q.late ? raw('checked') : ''}>Только просроченные</label>
            <div class="seg right"><button class="${q.view !== 'all' ? 'on' : ''}" data-view="">Активные</button><button class="${q.view === 'all' ? 'on' : ''}" data-view="all">Все, включая закрытые</button></div>
          </div>
          ${UI.ordersTable(list)}
          <div class="card-f muted fs-12">Показано: ${list.length} из ${all.length}${q.st ? ' · фильтр: ' + AP.STATUSES[q.st].t : ''}${q.st || q.c || q.q || q.late ? html` · <a href="#/orders">сбросить</a>` : ''}</div>
        </div>`;
    },
    mount(el, r) {
      UI.$$('[data-st]', el).forEach((b) => (b.onclick = () => AP.setQuery({ st: r.q.st === b.dataset.st ? '' : b.dataset.st })));
      UI.$$('[data-view]', el).forEach((b) => (b.onclick = () => AP.setQuery({ view: b.dataset.view, st: '' })));
      const qi = UI.$('[data-f=q]', el);
      let t;
      qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { AP.setQuery({ q: qi.value }); setTimeout(() => { const n = UI.$('[data-f=q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 350); };
      UI.$('[data-f=c]', el).onchange = (e) => AP.setQuery({ c: e.target.value });
      UI.$('[data-f=late]', el).onchange = (e) => AP.setQuery({ late: e.target.checked ? '1' : '' });
      const nb = UI.$('[data-x=new]', el);
      if (nb) nb.onclick = () => AP.newOrder();
      UI.$('[data-x=export]', el).onclick = () => {
        const rows = [['Заказ', 'Дата', 'Клиент', 'Продукция', 'Тираж', 'Ед.', 'Вес, кг', 'Срок', 'Цех', 'Статус', 'Готово, %'].concat(AP.seeMoney() ? ['Цена', 'Сумма'] : [])];
        AP.db.orders.filter(AP.orderVisible).forEach((o) => { const p = AP.product(o.productId); rows.push([o.no, F.date(o.date), AP.client(o.clientId).name, p.name, o.qty, p.base, Math.round(AP.kgOf(p, o.qty)), F.date(o.deadline), AP.wsName(o.workshop), AP.STATUSES[AP.orderStatus(o)].t, Math.round(AP.orderProgress(o) * 100)].concat(AP.seeMoney() ? [o.price, Math.round(AP.orderAmount(o))] : [])); });
        AP.exportCSV('zakazy-' + D.todayISO(), rows);
      };
      if (r.id) AP.openOrder(r.id, true);
      if (r.q.new && AP.can('orders', 2)) { history.replaceState(null, '', '#/orders'); AP.newOrder(); }
    },
  });

  /* ---------- карточка заказа ---------- */
  function journey(o) {
    const st = AP.orderStatus(o);
    const units = AP.unitsOf(o.id);
    const ships = AP.shipmentsOf(o.id);
    const pays = AP.paymentsOf(o.id);
    const firstU = units.length ? units.reduce((a, b) => (a.at < b.at ? a : b)) : null;
    const stocked = units.filter((u) => u.stockAt);
    const steps = [
      ['new', 'Заказ принят', o.created],
      o.logo ? ['layout', 'Макет согласован', o.maket && o.maket.approved ? o.maket.approvedAt : null] : null,
      ['queue', 'Задание в цехе', o.task && o.task.queuedAt],
      ['production', 'Производство', o.task && o.task.startedAt],
      ['ready', 'Взвешено, есть QR', firstU && firstU.at],
      ['stock', 'Принято на склад', stocked.length ? stocked.reduce((a, b) => (a.stockAt > b.stockAt ? a : b)).stockAt : null],
      ['shipped', 'Отгружено', ships.length ? ships[ships.length - 1].at : null],
      ['closed', 'Оплачено и закрыто', st === 'closed' && pays.length ? pays[pays.length - 1].at : null],
    ].filter(Boolean);
    // шаг «сейчас» — где заказ находится; пройденные — те, у которых уже есть факт (время)
    const NOW_STEP = { new: 'new', layout: 'layout', waiting: 'queue', queue: 'queue', production: 'production', ready: 'stock', stock: 'shipped', partial: 'shipped', shipped: 'closed' };
    return html`<ul class="timeline">${steps.map(([k, t, at]) => {
      const now = NOW_STEP[st] === k;
      const done = !!at && !now;
      return html`<li class="${done ? 'done' : now ? 'now' : ''}"><i></i><b>${t}</b><small>${at ? F.dt(at) : now ? (st === 'partial' ? 'частично: ' + F.pct((AP.shippedQty(o) / o.qty) * 100, 0) : st === 'waiting' ? 'ждёт сырьё' : 'сейчас') : '—'}</small></li>`;
    })}</ul>`;
  }

  function stagesBlock(o) {
    const p = AP.product(o.productId);
    const need = AP.kgOf(p, o.qty);
    const cur = AP.currentStage(o);
    const started = o.task && o.task.startedAt;
    return html`<div class="stack" style="gap:12px">${AP.stagesOf(o).map((s) => {
      const done = s === 'pack' ? AP.producedKg(o) : o.progress[s] || 0;
      const f = Math.min(1, done / need);
      return html`<div><div class="row between fs-13" style="margin-bottom:5px"><span class="fw-7 row nowrap" style="gap:8px">${I(AP.STAGES[s].icon, 'icon-16')}${AP.STAGES[s].t}${started && s === cur && f < 0.98 ? html`<span class="badge b-info sm">сейчас</span>` : ''}</span><span class="muted fw-7 nowrap">${F.kg(done)} из ${F.kg(need)} · ${AP.machine(o.route[s]).name}</span></div>${UI.progress(f, f >= 0.98 ? 'ok' : '', 'sm')}</div>`;
    })}</div>`;
  }

  function materialsBlock(o) {
    const wo = AP.writeoffsOf(o.id);
    const st = AP.stock();
    if (!wo.length) {
      const lines = AP.recipeLines(o, AP.kgOf(AP.product(o.productId), o.qty));
      return html`<table class="table compact"><thead><tr><th>Сырьё по рецептуре</th><th class="r">Нужно</th><th class="r">На складах</th><th></th></tr></thead><tbody>${lines.map((l) => {
        const have = st[l.m].total, ok = have >= l.qty;
        return html`<tr><td class="fw-7">${AP.material(l.m).name}</td><td class="r nowrap">${AP.fmtMat(l.m, l.qty)}</td><td class="r nowrap">${AP.fmtMat(l.m, have)}</td><td class="r">${ok ? html`<span class="badge b-ok sm">хватает</span>` : html`<span class="badge b-bad sm">не хватает ${F.num(l.qty - have, 1)}</span>`}</td></tr>`;
      })}</tbody></table>`;
    }
    const g = AP.groupBy(wo, 'materialId');
    const rows = Object.keys(g).map((m) => ({ label: AP.material(m).name, fact: AP.sum(g[m], 'qty'), norm: AP.sum(g[m], 'norm'), unit: AP.material(m).unit }));
    return html`${UI.normFact(rows.filter((r) => r.unit === 'кг'))}${rows.filter((r) => r.unit !== 'кг').length ? html`<div class="fs-12 muted mt-12">${rows.filter((r) => r.unit !== 'кг').map((r) => r.label + ': ' + F.num(r.fact, 1) + ' ' + r.unit).join(' · ')}</div>` : ''}`;
  }

  AP.openOrder = function (id, fromRoute) {
    const o = AP.order(id);
    if (!o || !AP.orderVisible(o)) { UI.toast('Заказ не найден', 'Возможно, он относится к другому цеху', 'warn'); return; }
    const p = AP.product(o.productId), c = AP.client(o.clientId);
    const st = AP.orderStatus(o);
    const money = AP.seeMoney();
    const units = AP.unitsOf(o.id);
    const ships = AP.shipmentsOf(o.id);
    const pays = AP.paymentsOf(o.id);
    const sh = AP.shortage(o);
    const canEdit = AP.can('orders', 2);
    const canProd = AP.can('production', 2) && AP.inUserScope(o.workshop);
    const debt = AP.orderDebt(o), adv = AP.receivableItems(o).advance;
    const histItems = AP.db.audit.filter((a) => a.entityId === o.id || (a.details && a.details.indexOf(o.no) === 0)).slice(-14).reverse();
    const ec = money && AP.can('cost') ? AP.orderEconomics(o) : null;
    const byStatus = AP.groupBy(units, 'status');

    const actions = [];
    if (st === 'layout' && canEdit) actions.push(html`<button class="btn btn-primary" data-o="maket">${I('check')}Макет согласован</button>`);
    if (sh.length && canEdit) actions.push(html`<button class="btn btn-soft" data-o="request">${I('layers')}Заявка на закупку</button>`);
    if ((st === 'new' || (st === 'waiting' && !o.task)) && canProd) actions.push(html`<button class="btn btn-primary" data-o="queue">${I('clipboard')}Поставить в очередь</button>`);
    if (st === 'queue' && canProd) actions.push(html`<button class="btn btn-primary" data-o="start">${I('play')}Запустить</button>`);
    if (st === 'production' && canProd) {
      const cs = AP.currentStage(o);
      actions.push(cs === 'pack' ? html`<a class="btn btn-primary" href="#/scales?order=${o.id}">${I('scale')}К весам</a>` : html`<button class="btn btn-primary" data-o="output">${I('plus')}Отметить выработку</button>`);
    }
    if (['stock', 'partial', 'ready'].includes(st) && AP.can('warehouse', 2)) actions.push(html`<a class="btn btn-primary" href="#/warehouse?tab=load&order=${o.id}">${I('truck')}Оформить отгрузку</a>`);
    if (canEdit) actions.push(html`<button class="btn btn-secondary" data-o="repeat">${I('repeat')}Повторить заказ</button>`);
    if (AP.isDirector() && !['shipped', 'closed'].includes(st)) actions.push(html`<button class="btn btn-ghost" data-o="urgent">${I('zap')}${o.urgent ? 'Снять срочность' : 'Срочно, вне очереди'}</button>`);
    actions.push(html`<button class="btn btn-ghost" data-o="print">${I('print')}Заказ-наряд</button>`);

    const body = html`
      ${o.urgent ? html`<div class="alert alert-bad mb-16">${I('zap')}<div class="grow"><b>Срочный заказ — вне очереди</b><small>Решение: ${o.urgent.name} · ${F.dt(o.urgent.at)} · ${o.urgent.reason}</small></div></div>` : ''}
      ${sh.length ? html`<div class="alert alert-warn mb-16">${I('layers')}<div class="grow"><b>Не хватает сырья для запуска</b><small>${sh.map((x) => AP.material(x.m).name + ': нужно ' + AP.fmtMat(x.m, x.need) + ', есть ' + AP.fmtMat(x.m, x.have)).join(' · ')}</small></div></div>` : ''}
      ${o.maket && !o.maket.approved ? html`<div class="alert alert-info mb-16">${I('palette')}<div class="grow"><b>Макет на согласовании у клиента</b><small>${o.maket.file} · отправлен ${F.dt(o.maket.sent)}${o.notes ? ' · ' + o.notes : ''}</small></div></div>` : ''}
      <div class="grid g-2">
        <div class="card"><div class="card-b"><dl class="dl">
          <dt>Клиент</dt><dd>${AP.can('clients') ? html`<a href="#" data-act="open-client" data-id="${c.id}">${c.name}</a>` : c.name}</dd>
          <dt>Продукция</dt><dd>${p.name}</dd>
          <dt>Материал</dt><dd>${o.material} · ${o.size} · ${o.thick} мкм · ${o.color}</dd>
          <dt>Печать</dt><dd>${o.logo ? html`логотип, ${o.inks.length} цв.: ${o.inks.map((m) => html`<span class="row nowrap" style="display:inline-flex;gap:4px;margin-right:8px"><i class="dot" style="background:${AP.material(m).color}"></i>${AP.material(m).name.replace('Краска флексо ', '')}</span>`)}${o.maket ? html`<br><span class="muted fs-12">${I('file', 'icon-16')} ${o.maket.file}</span>` : ''}` : 'без печати'}</dd>
          <dt>Тираж</dt><dd>${AP.fmtQty(p, o.qty)}<br><span class="muted fs-12">${AP.unitsCount(p, o.qty)} ${p.unit.name === 'мешок' ? 'мешков' : p.unit.name === 'коробка' ? 'коробок' : 'рулонов'}${p.pack ? ' · ' + p.pack.pcs + ' шт в ' + p.pack.name : ''}</span></dd>
          <dt>Срок</dt><dd class="${AP.isOverdue(o) ? 'bad-t' : ''}">${F.date(o.deadline)}${AP.isOverdue(o) ? ' · просрочен' : ''}</dd>
          ${money ? html`<dt>Цена</dt><dd>${F.money(o.price)} за ${p.base === 'кг' ? 'кг' : '1000 шт'}</dd><dt>Сумма</dt><dd>${F.money(AP.orderAmount(o))}</dd>` : ''}
          <dt>Оплата</dt><dd>${termsText(o)}</dd>
          <dt>Цех</dt><dd>${UI.wsChip(o.workshop)}</dd>
        </dl></div></div>
        <div class="card"><div class="card-h"><h3>Путь заказа</h3>${AP.statusBadge(st)}</div><div class="card-b">${journey(o)}</div></div>
      </div>
      <div class="grid g-2 mt-16">
        <div class="card"><div class="card-h"><h3>Этапы производства</h3></div><div class="card-b">${stagesBlock(o)}</div></div>
        <div class="card"><div class="card-h"><h3>Сырьё и краски</h3><span class="sub">${AP.writeoffsOf(o.id).length ? 'факт против нормы' : 'потребность по рецептуре'}</span></div><div class="card-b">${materialsBlock(o)}</div></div>
      </div>
      <div class="card mt-16"><div class="card-h"><h3>Упаковочные единицы с QR</h3><span class="sub">${units.length} ед. · ${F.kg(AP.producedKg(o))} · ${AP.fmtQty(p, AP.producedQty(o), { kg: false })}</span>
        ${units.length && AP.can('qr') ? html`<a class="btn btn-ghost btn-sm" href="#/qr?order=${o.id}">Все ${I('arrowRight')}</a>` : ''}</div>
        <div class="card-b">${units.length ? html`<div class="row mb-12">${['produced', 'stock', 'shipped'].map((k) => html`<span class="badge ${{ produced: 'b-teal', stock: 'b-cyan', shipped: 'b-ok' }[k]}">${{ produced: 'Произведено', stock: 'На складе', shipped: 'Отгружено' }[k]}: ${(byStatus[k] || []).length}</span>`)}</div>
          <div class="row" style="gap:6px">${units.slice(-18).map((u) => html`<button class="chip ghost mono" data-act="open-unit" data-id="${u.id}" style="border:0;cursor:pointer">${u.id}</button>`)}</div>` : html`<span class="muted">Единицы появятся после взвешивания готовой продукции на весах цеха.</span>`}</div></div>
      ${money ? html`<div class="grid g-2 mt-16">
        <div class="card"><div class="card-h"><h3>Отгрузки</h3><span class="sub">${F.pct((AP.shippedQty(o) / o.qty) * 100, 0)} тиража</span></div><div class="card-b flush">${ships.length ? html`<table class="table compact"><tbody>${ships.map((s) => html`<tr><td><b>${s.id}</b><span class="cell-sub">${F.dt(s.at)} · ${s.truck}</span></td><td class="r">${AP.fmtQty(p, s.qty)}</td><td class="r fw-7">${F.m(AP.orderAmount(o, s.qty))}</td></tr>`)}</tbody></table>` : html`<div class="card-b muted">Отгрузок ещё не было</div>`}</div></div>
        <div class="card"><div class="card-h"><h3>Оплаты</h3>${debt > 0 ? html`<span class="badge b-warn">долг ${F.money(debt)}</span>` : adv > 1000 ? html`<span class="badge b-info">аванс ${F.money(adv)}</span>` : html`<span class="badge b-ok">нет долга</span>`}</div><div class="card-b flush">${pays.length ? html`<table class="table compact"><tbody>${pays.map((x) => html`<tr><td>${F.date(x.date)}</td><td><span class="row nowrap" style="gap:6px"><i class="dot" style="background:${AP.PAY[x.method].c}"></i>${AP.PAY[x.method].t}</span></td><td class="r fw-7">${F.m(x.amount)}</td></tr>`)}</tbody></table>` : html`<div class="card-b muted">Оплат пока нет</div>`}</div></div>
      </div>` : ''}
      ${ec ? html`<div class="card mt-16"><div class="card-h"><h3>Себестоимость и прибыль</h3><span class="sub">план при приёме заказа · факт по списаниям и выработке</span></div><div class="card-b">
        <div class="grid g-4 keep-2"><div><div class="muted fs-12 fw-7">План, сум/кг</div><b class="fs-16">${F.m(ec.plan.total)}</b></div><div><div class="muted fs-12 fw-7">Факт, сум/кг</div><b class="fs-16">${ec.fact.kg ? F.m(ec.fact.perKg) : '—'}</b> ${ec.fact.kg ? html`<span class="delta ${ec.factVsPlan > 0.01 ? 'down' : 'up'}">${ec.factVsPlan > 0 ? '+' : ''}${F.num(ec.factVsPlan * 100, 1)}%</span>` : ''}</div><div><div class="muted fs-12 fw-7">Плановая прибыль</div><b class="fs-16">${F.short(ec.planProfit)}</b></div><div><div class="muted fs-12 fw-7">Прибыль по отгруженному</div><b class="fs-16 ${ec.profit < 0 ? 'bad-t' : ''}">${ec.revenue ? F.short(ec.profit) + ' · ' + F.pct(ec.margin * 100, 0) : '—'}</b></div></div>
      </div></div>` : ''}
      <div class="card mt-16"><div class="card-h"><h3>История изменений</h3><span class="sub">из журнала действий</span></div><div class="card-b flush"><ul class="list">${histItems.map((a) => html`<li><span class="avatar sm" style="background:${AP.avatarColor(a.uid || a.user)}">${AP.initials(a.user)}</span><div class="grow"><b class="fs-13">${a.action}</b><div class="fs-12 muted">${a.user} · ${F.dt(a.ts)}${a.details && a.details !== o.no ? ' · ' + a.details.replace(o.no + ' · ', '') : ''}</div></div></li>`)}</ul></div></div>`;

    const dr = UI.drawer({ title: o.no + ' · ' + c.name, sub: p.name + ' · создан ' + F.dt(o.created), body, foot: html`${actions}`, head: html`<span class="avatar lg" style="background:var(--${o.workshop === 'w1' ? 's1' : 's2'})">${I('clipboard')}</span>` });
    AP.trackDrawer(AP.openOrder, [id], dr, fromRoute ? '#/orders' : null);
    const on = (k, fn) => { const b = dr.querySelector('[data-o=' + k + ']'); if (b) b.onclick = fn; };
    on('maket', () => { A.approveMaket(o); AP.refresh(); });
    on('request', () => { const n = A.makePurchaseRequests(o, sh); AP.save(); UI.toast(n ? 'Заявка на закупку создана' : 'Заявки уже есть', n ? 'Видна в разделе «Склад сырья» → «Заявки»' : 'по этим позициям заявки уже в работе', n ? 'ok' : 'info'); AP.refresh(); });
    on('queue', () => queueDialog(o));
    on('start', () => { if (A.startOrder(o)) AP.refresh(); });
    on('output', () => AP.outputDialog(o));
    on('repeat', () => AP.newOrder({ from: o }));
    on('urgent', async () => {
      if (o.urgent) { o.urgent = null; hist(o, 'Срочность снята'); AP.save(); AP.refresh(); return; }
      const r = await UI.prompt('Срочный заказ', 'Заказ встанет первым в очереди цеха. Укажите причину — она будет видна начальнику цеха.', { label: 'Причина', ok: 'Сделать срочным' });
      if (!r) return;
      o.urgent = { by: AP.user.id, name: AP.user.name, reason: r.comment, at: new Date().toISOString() };
      hist(o, 'Срочный заказ, вне очереди: ' + r.comment); AP.save(); AP.refresh();
    });
    on('print', () => printWorkOrder(o));
  };

  function queueDialog(o) {
    const ms = AP.db.machines.filter((m) => m.workshop === o.workshop && m.type === 'extrusion');
    const m = UI.modal({
      title: 'Поставить в очередь', sub: o.no + ' · ' + AP.product(o.productId).name,
      body: html`<div class="stack" style="gap:10px">${ms.map((x, i) => { const st = AP.machineState(x.id), q = AP.db.orders.filter((z) => z.task && !z.task.startedAt && z.task.machineId === x.id).length; return html`<label class="machine" style="cursor:pointer"><input type="radio" name="m" value="${x.id}" ${i === 0 ? raw('checked') : ''}><div class="grow"><b>${x.name}</b><span class="cell-sub">${x.note} · ${x.cap} кг/ч · в очереди: ${q}</span></div><span class="badge sm ${st.s === 'run' ? 'b-ok' : st.s === 'down' ? 'b-bad' : ''}">${st.t}</span></label>`; })}</div>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Поставить</button>`,
    });
    m.querySelector('[data-ok]').onclick = () => { const v = m.querySelector('input[name=m]:checked').value; UI.closeTop(); A.queueOrder(o, v); AP.refresh(); };
  }

  AP.outputDialog = function (o) {
    const stage = AP.currentStage(o);
    const p = AP.product(o.productId);
    const need = AP.kgOf(p, o.qty) * (1 + (stage === 'extrusion' ? (p.waste + p.defect) / 100 : p.defect / 200));
    const left = Math.max(0, need - (o.progress[stage] || 0));
    const mid = o.route[stage];
    const ops = AP.db.employees.filter((e) => e.machine === mid && e.active !== false);
    const m = UI.modal({
      title: 'Выработка: ' + AP.STAGES[stage].t, sub: o.no + ' · ' + AP.machine(mid).name,
      body: html`<form class="form-grid"><div class="field"><label>Выработано, кг</label><input class="input input-lg" name="kg" type="number" step="0.1" min="0.1" value="${Math.round(left)}"><span class="hint">Осталось по заданию ≈ ${F.kg(left)}</span></div>
        <div class="field"><label>Оператор</label><select class="select" name="op">${UI.options(ops.map((e) => [e.id, e.name + ' · смена ' + e.shift]))}</select></div>
        <div class="field full"><div class="alert alert-info">${I('info')}<div class="grow"><b>Списание сработает автоматически</b><small>${stage === 'extrusion' ? 'Гранулят и мастербатч по рецептуре: ' + p.recipe.map(([mm, k]) => AP.material(mm).name + ' ' + F.num(k * 100, 1) + '%').join(', ') : stage === 'print' ? 'Краски: ' + o.inks.map((x) => AP.material(x).name).join(', ') + ' и растворитель' : 'Для резки сырьё не списывается — фиксируется выработка'}</small></div></div></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Записать</button>`,
    });
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(m.querySelector('form'));
      const kg = parseFloat(d.kg);
      if (!(kg > 0)) return UI.toast('Укажите вес', '', 'warn');
      UI.closeTop(); A.registerOutput(o, stage, kg, d.op); UI.toast('Выработка записана', F.kg(kg) + ' · сырьё списано по рецептуре'); AP.refresh();
    };
  };

  function printWorkOrder(o) {
    const p = AP.product(o.productId), c = AP.client(o.clientId);
    const lines = AP.recipeLines(o, AP.kgOf(p, o.qty));
    UI.printDoc('Заказ-наряд ' + o.no, `<h1>Заказ-наряд ${o.no}</h1><div class="grid"><div><b>Клиент:</b> ${AP.esc(c.name)}<br><b>Продукция:</b> ${AP.esc(p.name)}<br><b>Материал:</b> ${o.material}, ${o.size}, ${o.thick} мкм, ${o.color}<br><b>Печать:</b> ${o.logo ? 'логотип, ' + o.inks.length + ' цв. (' + o.inks.map((m) => AP.material(m).name).join(', ') + ')' : 'без печати'}</div><div><b>Тираж:</b> ${AP.fmtQty(p, o.qty)}<br><b>Упаковка:</b> ${p.unit.name}${p.unit.pcs ? ' по ' + F.num(p.unit.pcs) + ' шт' : ''}<br><b>Срок:</b> ${F.date(o.deadline)}<br><b>Цех:</b> ${AP.wsName(o.workshop)}${o.urgent ? '<br><b>СРОЧНО:</b> ' + AP.esc(o.urgent.reason) : ''}</div></div>
      <h2>Маршрут</h2><table><tr><th>Этап</th><th>Станок</th><th>Отметка о выполнении</th></tr>${AP.stagesOf(o).map((s) => `<tr><td>${AP.STAGES[s].t}</td><td>${AP.machine(o.route[s]).name}</td><td></td></tr>`).join('')}</table>
      <h2>Сырьё по рецептуре (с нормой отходов ${p.waste}%)</h2><table><tr><th>Материал</th><th class="r">Количество</th></tr>${lines.map((l) => `<tr><td>${AP.material(l.m).name}</td><td class="r">${AP.fmtMat(l.m, l.qty)}</td></tr>`).join('')}</table>
      <div class="sign"><div>Начальник цеха</div><div>Мастер смены</div></div>`);
  }

  /* ---------- новый заказ ---------- */
  AP.newOrder = function (opts = {}) {
    const from = opts.from;
    const clients = AP.db.clients.filter(AP.clientVisible);
    const c0 = from ? AP.client(from.clientId) : opts.clientId ? AP.client(opts.clientId) : clients[0];
    const p0 = from ? AP.product(from.productId) : AP.product(c0.products[0]);
    const inks = AP.db.materials.filter((m) => m.kind === 'ink');
    const money = AP.seeMoney();
    const m = UI.modal({
      size: 'lg', title: from ? 'Повторный заказ' : 'Новый заказ', sub: from ? 'Параметры взяты из ' + from.no + ' — проверьте тираж и срок' : 'Программа сама посчитает сырьё по рецептуре и сравнит с остатками',
      body: html`<form class="form-grid" id="of">
        <div class="field"><label>Клиент <span class="req">*</span></label><select class="select" name="clientId">${UI.options(clients.map((c) => [c.id, c.name]), c0.id)}</select></div>
        <div class="field"><label>Продукция <span class="req">*</span></label><select class="select" name="productId">${UI.options(AP.db.products.map((p) => [p.id, p.name]), p0.id)}</select></div>
        <div class="field"><label>Тираж <span class="req">*</span></label><div class="input-group"><input class="input" name="qty" type="number" min="1" step="1" value="${from ? from.qty : ''}" placeholder="например 100000"><span class="addon" data-unit>шт</span></div><span class="hint" data-qtyhint></span></div>
        <div class="field"><label>Срок готовности <span class="req">*</span></label><input class="input" name="deadline" type="date" value="${D.iso(D.addDays(D.todayISO(), 10))}"></div>
        <div class="field"><label>Толщина, мкм</label><input class="input" name="thick" type="number" min="5" value="${from ? from.thick : p0.thick}"></div>
        <div class="field"><label>Цвет плёнки</label><input class="input" name="color" value="${from ? from.color : p0.color}"></div>
        ${money ? html`<div class="field"><label>Цена, сум</label><div class="input-group"><input class="input" name="price" type="number" min="0" step="100" value="${from ? from.price : p0.price}"><span class="addon" data-punit>за 1000 шт</span></div></div>` : ''}
        <div class="field"><label>Условия оплаты</label><select class="select" name="terms">${UI.options(Object.entries(TERMS), from ? from.terms : c0.terms)}</select></div>
        <div class="form-section">Печать</div>
        <div class="field full" data-printbox><label class="switch"><input type="checkbox" name="logo" ${from && from.logo ? raw('checked') : ''}>Печать логотипа клиента</label>
          <div class="row mt-8" data-inks>${inks.map((x) => html`<label class="check"><input type="checkbox" name="ink_${x.id}" ${(from ? from.inks : c0.inks || []).includes(x.id) ? raw('checked') : ''}><i class="dot" style="background:${x.color};outline:1px solid var(--border)"></i>${x.name.replace('Краска флексо ', '')}</label>`)}</div>
          <div class="row mt-8"><input class="input" type="file" name="maket" accept=".pdf,.ai,.cdr,.png,.jpg" style="max-width:360px;padding-top:7px"><span class="hint">Макет прикрепляется к заказу; после согласования с клиентом нажмите «Макет согласован»</span></div></div>
        <div class="field full"><label>Примечание</label><input class="input" name="notes" value="${from ? from.notes : ''}" placeholder="Пожелания клиента, упаковка, доставка"></div>
        ${AP.isDirector() ? html`<div class="field full"><label class="switch"><input type="checkbox" name="urgent">Срочный заказ — поставить вне очереди</label><input class="input mt-8" name="urgentReason" placeholder="Причина срочности (видна цеху)"></div>` : ''}
        <div class="full" data-calc></div>
      </form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Создать заказ</button>`,
    });
    const form = m.querySelector('#of');
    const recalc = () => {
      const d = UI.formData(form);
      const p = AP.product(d.productId);
      form.querySelector('[data-unit]').textContent = p.base;
      const pu = form.querySelector('[data-punit]'); if (pu) pu.textContent = p.base === 'кг' ? 'за кг' : 'за 1000 шт';
      form.querySelector('[data-printbox]').style.display = p.printable ? '' : 'none';
      form.querySelector('[data-inks]').style.opacity = d.logo ? 1 : 0.45;
      const qty = parseFloat(d.qty) || 0;
      const box = form.querySelector('[data-calc]');
      if (!qty) { box.innerHTML = String(html`<div class="alert alert-info">${I('calc')}<div class="grow"><b>Укажите тираж</b><small>Посчитаем вес, количество упаковок, сырьё и плановую прибыль</small></div></div>`); form.querySelector('[data-qtyhint]').textContent = ''; return; }
      form.querySelector('[data-qtyhint]').textContent = AP.fmtQty(p, qty) + ' · ' + AP.unitsCount(p, qty) + ' ' + p.unit.name + (AP.unitsCount(p, qty) > 1 ? '(-ов)' : '');
      const tmp = { productId: p.id, qty, logo: p.printable && d.logo, inks: inks.filter((x) => d['ink_' + x.id]).map((x) => x.id), coverage: 1 };
      const lines = AP.recipeLines(tmp, AP.kgOf(p, qty));
      const st = AP.stock();
      const plan = AP.planPerKg(tmp);
      const amount = p.base === 'кг' ? qty * (+d.price || p.price) : (qty / 1000) * (+d.price || p.price);
      const cost = plan.total * AP.kgOf(p, qty);
      const lack = lines.filter((l) => st[l.m].total < l.qty);
      box.innerHTML = String(html`<div class="card tint"><div class="card-b">
        <div class="grid g-4 keep-2" style="gap:10px;margin-bottom:14px"><div><div class="muted fs-12 fw-7">Вес тиража</div><b class="fs-16">${F.kg(AP.kgOf(p, qty))}</b></div><div><div class="muted fs-12 fw-7">Упаковок</div><b class="fs-16">${AP.unitsCount(p, qty)} ${p.unit.name}</b></div>
          ${money ? html`<div><div class="muted fs-12 fw-7">Сумма заказа</div><b class="fs-16">${F.short(amount)}</b></div><div><div class="muted fs-12 fw-7">Плановая прибыль</div><b class="fs-16 ${amount - cost < 0 ? 'bad-t' : 'ok-t'}">${F.short(amount - cost)} · ${F.pct(((amount - cost) / amount) * 100, 0)}</b></div>` : ''}</div>
        <table class="table compact"><thead><tr><th>Сырьё по рецептуре</th><th class="r">Нужно</th><th class="r">Остаток</th><th></th></tr></thead><tbody>${lines.map((l) => html`<tr><td class="fw-7">${AP.material(l.m).name}</td><td class="r nowrap">${AP.fmtMat(l.m, l.qty)}</td><td class="r nowrap">${AP.fmtMat(l.m, st[l.m].total)}</td><td class="r">${st[l.m].total >= l.qty ? html`<span class="badge b-ok sm">хватает</span>` : html`<span class="badge b-bad sm">не хватает</span>`}</td></tr>`)}</tbody></table>
        ${lack.length ? html`<div class="alert alert-warn mt-12">${I('alert')}<div class="grow"><b>Не хватает: ${lack.map((l) => AP.material(l.m).name).join(', ')}</b><small>При создании заказа программа сформирует заявку на закупку, статус будет «Ожидает сырьё»</small></div></div>` : ''}
      </div></div>`);
    };
    form.addEventListener('input', recalc);
    form.addEventListener('change', (e) => {
      if (e.target.name === 'clientId') {
        const c = AP.client(e.target.value);
        form.productId.value = c.products[0];
        form.terms.value = c.terms;
        inks.forEach((x) => (form['ink_' + x.id].checked = (c.inks || []).includes(x.id)));
        form.logo.checked = !!(c.inks && AP.product(c.products[0]).printable);
      }
      if (e.target.name === 'productId') {
        const p = AP.product(e.target.value);
        form.thick.value = p.thick; form.color.value = p.color;
        if (form.price) form.price.value = p.price;
      }
      recalc();
    });
    recalc();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(form);
      const p = AP.product(d.productId), c = AP.client(d.clientId);
      const qty = parseFloat(d.qty);
      if (!(qty > 0)) { form.qty.closest('.field').classList.add('is-invalid'); form.qty.focus(); return; }
      const n = AP.seq('o');
      const file = form.maket.files && form.maket.files[0];
      const logo = p.printable && !!d.logo;
      const o = {
        id: 'o' + n, no: 'ЗК-' + (1000 + n), clientId: c.id, productId: p.id, qty, created: new Date().toISOString(), date: D.todayISO(), deadline: d.deadline,
        workshop: p.workshop, material: p.material, size: p.size, thick: +d.thick || p.thick, color: d.color || p.color,
        logo, inks: logo ? inks.filter((x) => d['ink_' + x.id]).map((x) => x.id) : [], coverage: 1, price: money ? +d.price || p.price : p.price,
        terms: d.terms, payDays: c.payDays, progress: {}, history: [], k: { power: 1, labor: 1 }, managerId: c.managerId, notes: d.notes || '',
        route: { extrusion: p.workshop === 'w1' ? 'm1' : 'm6', print: 'm8', cut: p.workshop === 'w1' ? 'm3' : p.id === 'p4' ? 'm10' : 'm9', pack: p.workshop === 'w1' ? 'm5' : 'm11' },
        task: null, maket: logo ? { file: file ? file.name : 'maket_' + (1000 + n) + '.pdf', approved: false, sent: new Date().toISOString() } : null,
        urgent: d.urgent ? { by: AP.user.id, name: AP.user.name, reason: d.urgentReason || 'Решение директора', at: new Date().toISOString() } : null,
      };
      AP.db.orders.push(o);
      AP.audit(from ? 'Создан повторный заказ' : 'Создан заказ', 'order', o.id, o.no + ' · ' + c.name + ' · ' + p.name + (from ? ' · по образцу ' + from.no : ''));
      AP.save();
      const sh = AP.shortage(o);
      const nReq = sh.length ? A.makePurchaseRequests(o, sh) : 0;
      AP.save();
      UI.closeTop();
      UI.toast('Заказ ' + o.no + ' создан', nReq ? 'Не хватает сырья — сформирована заявка на закупку' : 'Статус: ' + AP.STATUSES[AP.orderStatus(o)].t, nReq ? 'warn' : 'ok');
      if (AP.route().key !== 'orders') AP.go('#/orders'); else AP.render();
      setTimeout(() => AP.openOrder(o.id), 50);
    };
  };

  /* ---------- клиенты ---------- */
  AP.page('clients', {
    title: 'Клиенты',
    render(r) {
      const q = r.q;
      const R = AP.receivables();
      let list = AP.db.clients.filter(AP.clientVisible);
      if (q.g) list = list.filter((c) => c.group === q.g);
      if (q.q) { const s = q.q.toLowerCase(); list = list.filter((c) => [c.name, c.inn, c.phone, c.contact, c.address, c.email, c.type, c.group].join(' ').toLowerCase().includes(s)); }
      const money = AP.seeMoney();
      const groups = [...new Set(AP.db.clients.map((c) => c.group))];
      return html`
        ${UI.pageHead('Клиенты', 'База клиентов с историей заказов, отгрузок и оплат. Логотипы и обычные параметры пакетов — в карточке, чтобы повторный заказ занимал минуту.', html`
          <button class="btn btn-secondary" data-x="export">${I('download')}Excel</button>
          ${AP.can('clients', 2) ? html`<button class="btn btn-primary" data-x="new">${I('plus')}Новый клиент</button>` : ''}`)}
        ${AP.flag('ownClientsOnly') && !AP.isDirector() ? html`<div class="alert alert-info mb-16">${I('info')}<div class="grow"><b>Показаны только ваши клиенты</b><small>Менеджер видит клиентов и долги, где он ответственный</small></div></div>` : ''}
        <div class="card">
          <div class="card-h" style="padding-bottom:14px">
            <div class="input-icon grow" style="max-width:380px">${I('search')}<input class="input" data-f="q" placeholder="Поиск по любому полю: название, ИНН, телефон…" value="${q.q || ''}"></div>
            <div class="seg">${[['', 'Все']].concat(groups.map((g) => [g, g])).map(([k, t]) => html`<button class="${(q.g || '') === k ? 'on' : ''}" data-g="${k}">${t}</button>`)}</div>
          </div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Клиент</th><th>Контакт</th><th>Менеджер</th><th class="r">Заказов</th><th>Последний</th>${money ? html`<th class="r">Долг</th><th>Лимит</th>` : ''}</tr></thead><tbody>
          ${list.map((c) => {
            const os = AP.ordersOf(c.id), last = os[os.length - 1], d = R[c.id], mgr = AP.userById(c.managerId);
            return html`<tr class="click ${money && d.overdue ? 'row-warn' : ''}" data-act="open-client" data-id="${c.id}">
              <td><span class="cell-title">${c.name}</span><span class="cell-sub">${c.type} · ${c.group}${c.inn ? ' · ИНН ' + c.inn : ''}</span></td>
              <td><span class="fw-7">${c.contact}</span><span class="cell-sub">${c.phone}</span></td>
              <td>${mgr ? html`<span class="row nowrap" style="gap:8px">${UI.avatar(mgr.name, mgr.id, 'sm')}<span class="fs-13 fw-7">${mgr.name.split(' ')[0]}</span></span>` : '—'}</td>
              <td class="r fw-7">${os.length}</td>
              <td>${last ? html`<span class="fw-7">${last.no}</span><span class="cell-sub">${F.date(last.date)}</span>` : '—'}</td>
              ${money ? html`<td class="r nowrap"><b>${d.total ? F.m(d.total) : '—'}</b>${d.overdue ? html`<span class="cell-sub bad-t">просрочено ${d.maxDays} дн.</span>` : ''}</td>
              <td style="width:130px">${c.limit ? html`${UI.progress(Math.min(1, d.total / c.limit), d.total > c.limit ? 'bad' : d.total > c.limit * 0.8 ? 'warn' : 'ok', 'sm')}<span class="cell-sub">${F.short(c.limit)}</span>` : html`<span class="muted fs-12">предоплата</span>`}</td>` : ''}
            </tr>`;
          })}</tbody></table></div></div>`;
    },
    mount(el, r) {
      const qi = UI.$('[data-f=q]', el);
      let t;
      qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { AP.setQuery({ q: qi.value }); setTimeout(() => { const n = UI.$('[data-f=q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); }, 350); };
      UI.$$('[data-g]', el).forEach((b) => (b.onclick = () => AP.setQuery({ g: b.dataset.g })));
      const nb = UI.$('[data-x=new]', el); if (nb) nb.onclick = () => clientForm();
      UI.$('[data-x=export]', el).onclick = () => {
        const R = AP.receivables();
        const rows = [['Клиент', 'Тип', 'Группа', 'ИНН', 'Банк', 'Р/с', 'Адрес', 'Телефон', 'Контакт', 'E-mail', 'Менеджер', 'Заказов'].concat(AP.seeMoney() ? ['Долг', 'Просрочено', 'Лимит'] : [])];
        AP.db.clients.filter(AP.clientVisible).forEach((c) => rows.push([c.name, c.type, c.group, c.inn, c.bank, c.account, c.address, c.phone, c.contact, c.email, (AP.userById(c.managerId) || {}).name, AP.ordersOf(c.id).length].concat(AP.seeMoney() ? [Math.round(R[c.id].total), Math.round(R[c.id].overdue), c.limit] : [])));
        AP.exportCSV('klienty-' + D.todayISO(), rows);
      };
      if (r.id) AP.openClient(r.id, true);
    },
  });

  AP.openClient = function (id, fromRoute) {
    const c = AP.client(id);
    if (!c || !AP.clientVisible(c)) return UI.toast('Клиент недоступен', '', 'warn');
    const money = AP.seeMoney();
    const d = AP.clientDebt(id);
    const os = AP.ordersOf(id).slice().reverse();
    const ships = AP.db.shipments.filter((s) => s.clientId === id).slice().reverse();
    const pays = AP.db.payments.filter((p) => p.clientId === id).slice().reverse();
    const mgr = AP.userById(c.managerId);
    const usual = c.products.map((pid) => AP.product(pid));
    const body = html`
      ${money && d.overdue ? html`<div class="alert alert-bad mb-16">${I('alert')}<div class="grow"><b>Просрочка оплаты ${d.maxDays} дн. — ${F.money(d.overdue)}</b><small>При оформлении отгрузки программа предупредит; решение принимает директор</small></div></div>` : ''}
      <div class="grid g-2">
        <div class="card"><div class="card-h"><h3>Реквизиты</h3></div><div class="card-b"><dl class="dl">
          <dt>Тип</dt><dd>${c.type} · ${c.group}</dd>${c.inn ? html`<dt>ИНН</dt><dd>${c.inn}</dd>` : ''}${c.bank ? html`<dt>Банк</dt><dd>${c.bank}</dd><dt>Р/с</dt><dd class="mono">${c.account}</dd>` : ''}
          <dt>Адрес</dt><dd>${c.address}</dd><dt>Контакт</dt><dd>${c.contact}<br><span class="muted">${c.phone}${c.email ? ' · ' + c.email : ''}</span></dd>
          <dt>Менеджер</dt><dd>${mgr ? mgr.name : '—'}</dd><dt>Условия</dt><dd>${TERMS[c.terms]}${c.terms !== 'pre100' ? ', ' + c.payDays + ' дн.' : ''}</dd>
        </dl></div></div>
        <div class="card"><div class="card-h"><h3>Обычные параметры</h3><span class="sub">для повторных заказов</span></div><div class="card-b stack" style="gap:10px">
          ${usual.map((p) => html`<div class="row nowrap"><span class="chip ghost">${p.material}</span><div class="grow"><b class="fs-13">${p.name}</b><div class="fs-12 muted">${p.size} · ${p.thick} мкм · ${p.color}</div></div></div>`)}
          ${c.logos.length ? c.logos.map((l) => html`<div class="row nowrap"><span class="chip ghost">${I('image')}</span><div class="grow"><b class="fs-13">${l.name}</b><div class="fs-12 muted">${l.note} · ${(c.inks || []).map((m) => AP.material(m).name.replace('Краска флексо ', '')).join(', ')}</div></div></div>`) : html`<div class="muted fs-13">Логотипов нет — пакеты без печати</div>`}
        </div></div>
      </div>
      ${money ? html`<div class="card mt-16"><div class="card-h"><h3>Взаиморасчёты</h3>${c.limit ? html`<span class="sub">лимит ${F.money(c.limit)}</span>` : ''}</div><div class="card-b">
        <div class="grid g-4 keep-2 mb-16"><div><div class="muted fs-12 fw-7">Долг</div><b class="fs-16">${F.money(d.total)}</b></div><div><div class="muted fs-12 fw-7">Просрочено</div><b class="fs-16 ${d.overdue ? 'bad-t' : ''}">${F.money(d.overdue)}</b></div><div><div class="muted fs-12 fw-7">Аванс</div><b class="fs-16">${F.money(d.advance)}</b></div><div><div class="muted fs-12 fw-7">Оплачено всего</div><b class="fs-16">${F.short(AP.sum(pays, 'amount'))}</b></div></div>
        ${d.total ? UI.segBar(AP.AGING.map(([k, t], i) => ({ name: t, value: d.b[k], color: 'var(--age-' + i + ')' }))) : ''}
        ${d.items.length ? html`<table class="table compact mt-12"><thead><tr><th>Заказ / отгрузка</th><th>Срок оплаты</th><th class="r">Остаток долга</th></tr></thead><tbody>${d.items.map((it) => html`<tr><td><a href="#" data-act="open-order" data-id="${it.orderId}">${AP.order(it.orderId).no}</a> · ${it.shipmentId}</td><td class="${it.overdue ? 'bad-t fw-7' : ''}">${F.date(it.due)}${it.overdue ? ' · ' + it.overdue + ' дн.' : ''}</td><td class="r fw-7">${F.m(it.left)}</td></tr>`)}</tbody></table>` : ''}
      </div></div>` : ''}
      <div class="card mt-16"><div class="card-h"><h3>Заказы</h3><span class="sub">${os.length}</span></div>${UI.ordersTable(os.slice(0, 12), { compact: true })}</div>
      ${money ? html`<div class="grid g-2 mt-16">
        <div class="card"><div class="card-h"><h3>Отгрузки</h3></div><div class="card-b flush"><table class="table compact"><tbody>${ships.slice(0, 8).map((s) => html`<tr><td><b>${s.id}</b><span class="cell-sub">${F.date(s.date)} · ${AP.order(s.orderId).no}</span></td><td class="r">${F.kg(s.kg)}</td></tr>`)}</tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>Оплаты</h3></div><div class="card-b flush"><table class="table compact"><tbody>${pays.slice(0, 8).map((x) => html`<tr><td>${F.date(x.date)}<span class="cell-sub">${x.orderId ? AP.order(x.orderId).no : 'аванс'}</span></td><td>${AP.PAY[x.method].t}</td><td class="r fw-7">${F.m(x.amount)}</td></tr>`)}</tbody></table></div></div>
      </div>` : ''}`;
    const foot = html`${AP.can('orders', 2) ? html`<button class="btn btn-primary" data-c="order">${I('plus')}Новый заказ</button>${os.length ? html`<button class="btn btn-secondary" data-c="repeat">${I('repeat')}Повторить последний</button>` : ''}` : ''}
      ${AP.can('debts') && money ? html`<a class="btn btn-ghost" href="#/debts?tab=act&c=${c.id}">${I('file')}Акт сверки</a>` : ''}
      ${AP.can('clients', 2) ? html`<button class="btn btn-ghost" data-c="edit">${I('edit')}Изменить</button>` : ''}`;
    const dr = UI.drawer({ title: c.name, sub: c.type + ' · клиент с ' + F.date(c.created), body, foot, head: UI.avatar(c.name, c.id, 'lg') });
    AP.trackDrawer(AP.openClient, [id], dr, fromRoute ? '#/clients' : null);
    const on = (k, fn) => { const b = dr.querySelector('[data-c=' + k + ']'); if (b) b.onclick = fn; };
    on('order', () => AP.newOrder({ clientId: c.id }));
    on('repeat', () => AP.newOrder({ from: AP.ordersOf(c.id).slice(-1)[0] }));
    on('edit', () => clientForm(c));
  };

  function clientForm(c) {
    const isNew = !c;
    c = c || { name: '', type: 'ООО', group: 'Опт', inn: '', bank: '', account: '', address: '', phone: '+998 ', contact: '', email: '', managerId: AP.user.id, terms: 'post', payDays: 14, limit: 30e6, products: ['p1'], logos: [] };
    const mgrs = AP.db.users.filter((u) => ['director', 'sales'].includes(u.role));
    const m = UI.modal({
      size: 'lg', title: isNew ? 'Новый клиент' : 'Изменить клиента',
      body: html`<form class="form-grid">
        <div class="field full"><label>Название <span class="req">*</span></label><input class="input" name="name" value="${c.name}" placeholder="ООО «…»"></div>
        <div class="field"><label>Тип</label><select class="select" name="type">${UI.options(['ООО', 'ИП', 'ЧП', 'Физ. лицо'].map((x) => [x, x]), c.type)}</select></div>
        <div class="field"><label>Группа</label><select class="select" name="group">${UI.options(['Сети', 'Опт', 'Производство', 'Розница'].map((x) => [x, x]), c.group)}</select></div>
        <div class="field"><label>ИНН</label><input class="input" name="inn" value="${c.inn}" inputmode="numeric"></div>
        <div class="field"><label>Банк, МФО</label><input class="input" name="bank" value="${c.bank}"></div>
        <div class="field full"><label>Расчётный счёт</label><input class="input mono" name="account" value="${c.account}"></div>
        <div class="field full"><label>Адрес</label><input class="input" name="address" value="${c.address}"></div>
        <div class="field"><label>Контактное лицо</label><input class="input" name="contact" value="${c.contact}"></div>
        <div class="field"><label>Телефон</label><input class="input" name="phone" value="${c.phone}" inputmode="tel"></div>
        <div class="field"><label>E-mail</label><input class="input" name="email" value="${c.email}" type="email"></div>
        <div class="field"><label>Ответственный менеджер</label><select class="select" name="managerId">${UI.options(mgrs.map((u) => [u.id, u.name + ' · ' + u.title]), c.managerId)}</select></div>
        <div class="field"><label>Условия оплаты</label><select class="select" name="terms">${UI.options(Object.entries(TERMS), c.terms)}</select></div>
        <div class="field"><label>Отсрочка, дней</label><input class="input" name="payDays" type="number" min="0" value="${c.payDays}"></div>
        ${AP.seeMoney() ? html`<div class="field"><label>Лимит долга, сум</label><input class="input" name="limit" type="number" min="0" step="1000000" value="${c.limit}"><span class="hint">При превышении — предупреждение директору</span></div>` : ''}
        <div class="field"><label>Обычная продукция</label><select class="select" name="product">${UI.options(AP.db.products.map((p) => [p.id, p.name]), c.products[0])}</select></div>
      </form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Сохранить</button>`,
    });
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(m.querySelector('form'));
      if (!d.name) return m.querySelector('[name=name]').closest('.field').classList.add('is-invalid');
      const t = isNew ? { id: 'c' + (AP.db.clients.length + 1) + Date.now().toString(36).slice(-3), created: D.todayISO(), logos: [], rel: 1 } : c;
      Object.assign(t, { name: d.name, type: d.type, group: d.group, inn: d.inn, bank: d.bank, account: d.account, address: d.address, contact: d.contact, phone: d.phone, email: d.email, managerId: d.managerId, terms: d.terms, payDays: +d.payDays || 0 });
      if (d.limit != null) t.limit = +d.limit || 0;
      t.products = [d.product].concat((t.products || []).filter((x) => x !== d.product));
      if (isNew) AP.db.clients.push(t);
      AP.audit(isNew ? 'Создан клиент' : 'Изменена карточка клиента', 'client', t.id, t.name);
      AP.save(); UI.closeTop(); UI.toast(isNew ? 'Клиент добавлен' : 'Сохранено', t.name);
      AP.refresh();
    };
  }
})();
