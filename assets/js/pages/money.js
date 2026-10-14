/* Финансы: дашборд руководителя, касса/счёт/карта, долги, себестоимость (ТЗ 4.7, 4.8, 4.11, 4.12) */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  const D = AP.d;
  const PAYK = ['bank', 'cash', 'card'];
  const inR = (s, a, b) => { const d = D.dayOf(s); return d >= a && d <= b; };
  const payName = (m) => AP.PAY[m].t;

  function rangeFromQuery(q) {
    if (q.p === 'custom' && q.from && q.to) { const days = D.diffDays(q.to, q.from) + 1; return { from: q.from, to: q.to, days, pfrom: D.iso(D.addDays(q.from, -days)), pto: D.iso(D.addDays(q.from, -1)) }; }
    return AP.periodRange(q.p || 'month');
  }
  function profitIn(a, b) {
    let rev = 0, cogs = 0;
    for (const s of AP.db.shipments) {
      if (!inR(s.date, a, b)) continue;
      const o = AP.order(s.orderId);
      const ec = AP.costFact(o);
      const per = ec.perKg || AP.planPerKg(o).total;
      rev += AP.orderAmount(o, s.qty);
      cogs += AP.sum(s.units.map(AP.unit).filter(Boolean), 'net') * per;
    }
    return { rev, cogs, profit: rev - cogs };
  }

  /* ---------- детализация любой цифры (ТЗ 4.11: «открыть список операций») ---------- */
  function drill(kind, R) {
    let rows = [], title = '', cols = ['Дата', 'Операция', 'Контрагент', 'Способ', 'Сумма'];
    const P = AP.db.payments.filter((p) => inR(p.date, R.from, R.to));
    const E = AP.db.expenses.filter((e) => inR(e.date, R.from, R.to));
    const pRow = (p) => [p.date, 'Поступление' + (p.orderId ? ' · ' + AP.order(p.orderId).no : ' · аванс'), AP.client(p.clientId).name, payName(p.method), p.amount];
    const eRow = (e) => [e.date, AP.EXP_CATS[e.category] + (e.note ? ' · ' + e.note : ''), e.supplierId ? AP.supplier(e.supplierId).name : '—', payName(e.method), -e.amount];
    const [k, v] = kind.split(':');
    if (k === 'income') { title = 'Поступления' + (v ? ': ' + payName(v) : ''); rows = P.filter((p) => !v || p.method === v).map(pRow); }
    else if (k === 'client') { title = 'Поступления от ' + AP.client(v).name; rows = P.filter((p) => p.clientId === v).map(pRow); }
    else if (k === 'exp') { title = 'Расходы' + (v ? ': ' + AP.EXP_CATS[v] : ''); rows = E.filter((e) => !v || e.category === v).map(eRow); }
    else if (k === 'flow') { title = 'Все операции за период'; rows = P.map(pRow).concat(E.map(eRow)); }
    else if (k === 'balance') {
      title = 'Операции: ' + payName(v) + ' (последние 60 дней)';
      const from = D.iso(D.addDays(D.todayISO(), -60));
      rows = AP.db.payments.filter((p) => p.method === v && p.date >= from).map(pRow).concat(AP.db.expenses.filter((e) => e.method === v && e.date >= from).map(eRow), (AP.db.transfers || []).filter((t) => (t.from === v || t.to === v) && t.date >= from).map((t) => [t.date, t.note, '—', payName(t.from) + ' → ' + payName(t.to), t.from === v ? -t.amount : t.amount]));
    } else if (k === 'profit') {
      title = 'Отгрузки за период: выручка и себестоимость'; cols = ['Дата', 'Отгрузка', 'Клиент', 'Себестоимость', 'Выручка'];
      rows = AP.db.shipments.filter((s) => inR(s.date, R.from, R.to)).map((s) => { const o = AP.order(s.orderId); const per = AP.costFact(o).perKg || AP.planPerKg(o).total; return [s.date, s.id + ' · ' + o.no, AP.client(s.clientId).name, F.m(AP.sum(s.units.map(AP.unit).filter(Boolean), 'net') * per), AP.orderAmount(o, s.qty)]; });
    } else if (k === 'recv') {
      title = 'Дебиторская задолженность'; cols = ['Срок оплаты', 'Заказ / отгрузка', 'Клиент', 'Просрочка', 'Остаток'];
      const Rc = AP.receivables();
      rows = Object.values(Rc).flatMap((x) => x.items.map((it) => [it.due, AP.order(it.orderId).no + ' · ' + it.shipmentId, AP.client(x.clientId).name, it.overdue ? it.overdue + ' дн.' : '—', it.left]));
    } else if (k === 'payb') {
      title = 'Кредиторская задолженность'; cols = ['Срок оплаты', 'Партия', 'Поставщик', 'Просрочка', 'Остаток'];
      const Pc = AP.payables();
      rows = Object.values(Pc).flatMap((x) => x.items.map((it) => { const b = AP.db.batches.find((z) => z.id === it.batchId); return [it.due, b.code + ' · ' + AP.material(b.materialId).name, AP.supplier(x.supplierId).name, it.overdue ? it.overdue + ' дн.' : '—', it.left]; })).concat(AP.obligationsOpen().map((o) => [o.due, o.name, '—', '—', o.amount]));
    }
    rows.sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const total = AP.sum(rows, (r) => (typeof r[4] === 'number' ? r[4] : 0));
    const dr = UI.drawer({
      title, sub: (k === 'recv' || k === 'payb' || k === 'balance' ? 'на ' + F.date(D.todayISO()) : F.date(R.from) + ' — ' + F.date(R.to)) + ' · ' + rows.length + ' ' + F.plural(rows.length, 'операция', 'операции', 'операций'),
      body: html`<div class="card"><div class="table-wrap"><table class="table compact"><thead><tr>${cols.map((c, i) => html`<th class="${i === 4 ? 'r' : ''}">${c}</th>`)}</tr></thead><tbody>${rows.slice(0, 400).map((r) => html`<tr><td class="nowrap">${F.date(r[0])}</td><td class="fw-7">${r[1]}</td><td class="fs-13">${r[2]}</td><td class="fs-13">${r[3]}</td><td class="r fw-8 nowrap ${typeof r[4] === 'number' && r[4] < 0 ? 'bad-t' : ''}">${typeof r[4] === 'number' ? F.m(r[4]) : r[4]}</td></tr>`)}</tbody><tfoot><tr><td colspan="4">Итого</td><td class="r">${F.m(total)}</td></tr></tfoot></table></div></div>`,
      foot: html`<button class="btn btn-secondary" data-dx>${I('download')}Выгрузить в Excel</button>`,
    });
    dr.querySelector('[data-dx]').onclick = () => AP.exportCSV('operacii-' + kind.replace(':', '-'), [cols].concat(rows.map((r) => r.map((x, i) => (i === 0 ? F.date(x) : typeof x === 'number' ? Math.round(x) : x)))));
  }

  /* ================= ФИНАНСОВЫЙ ДАШБОРД ================= */
  AP.page('findash', {
    title: 'Финансовый дашборд',
    render(r) {
      if (!AP.isDirector()) return '';
      const R = rangeFromQuery(r.q);
      const P = AP.db.payments.filter((p) => inR(p.date, R.from, R.to));
      const PP = AP.db.payments.filter((p) => inR(p.date, R.pfrom, R.pto));
      const E = AP.db.expenses.filter((e) => inR(e.date, R.from, R.to));
      const EP = AP.db.expenses.filter((e) => inR(e.date, R.pfrom, R.pto));
      const inc = AP.sum(P, 'amount'), incP = AP.sum(PP, 'amount'), exp = AP.sum(E, 'amount'), expP = AP.sum(EP, 'amount');
      const pr = profitIn(R.from, R.to), prP = profitIn(R.pfrom, R.pto);
      const bal = AP.balances();
      const Rc = Object.values(AP.receivables()), Pc = Object.values(AP.payables());
      const recv = AP.sum(Rc, 'total'), recvO = AP.sum(Rc, 'overdue'), payb = AP.sum(Pc, 'total') + AP.sum(AP.obligationsOpen(), 'amount'), paybO = AP.sum(Pc, 'overdue');
      const aging = { current: 0, d30: 0, d60: 0, d60p: 0 }; Rc.forEach((x) => Object.keys(aging).forEach((k) => (aging[k] += x.b[k])));
      // ряды по дням / неделям
      const daily = R.days <= 31;
      const labels = [], tipL = [], vIn = [], vOut = [];
      if (daily) { for (let i = 0; i < R.days; i++) { const d = D.iso(D.addDays(R.from, i)); labels.push(F.dm(d)); tipL.push(F.date(d)); vIn.push(AP.sum(P.filter((p) => p.date === d), 'amount')); vOut.push(AP.sum(E.filter((e) => e.date === d), 'amount')); } }
      else { for (let s = 0; s < R.days; s += 7) { const a = D.iso(D.addDays(R.from, s)), b = D.iso(D.addDays(R.from, Math.min(R.days - 1, s + 6))); labels.push(F.dm(a)); tipL.push(F.date(a) + ' — ' + F.date(b)); vIn.push(AP.sum(P.filter((p) => p.date >= a && p.date <= b), 'amount')); vOut.push(AP.sum(E.filter((e) => e.date >= a && e.date <= b), 'amount')); } }
      const byCat = AP.groupBy(E, 'category');
      const byCl = AP.groupBy(P, 'clientId');
      // прибыль по месяцам
      const months = [];
      for (let i = 3; i >= 0; i--) { const ms = D.monthStart(new Date(D.today().getFullYear(), D.today().getMonth() - i, 1)); const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 0); const pf = profitIn(D.iso(ms), D.iso(me > D.today() ? D.today() : me)); months.push({ label: AP.MONTHS_FULL[ms.getMonth()], v: pf.profit, rev: pf.rev }); }
      const upcoming = Pc.flatMap((x) => x.items.map((it) => ({ due: it.due, name: AP.supplier(x.supplierId).name, amount: it.left, overdue: it.overdue }))).concat(AP.obligationsOpen().map((o) => ({ due: o.due, name: o.name, amount: o.amount, overdue: Math.max(0, D.diffDays(D.todayISO(), o.due)) }))).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 6);
      const per = r.q.p || 'month';
      return html`
        ${UI.pageHead('Финансовый дашборд', 'Деньги предприятия на одной странице. Обновляется сам по оплатам, отгрузкам и расходам. Виден только главному руководителю.', html`
          <span class="badge b-dark plain">${I('lock', 'icon-16')}только для руководителя</span>
          <button class="btn btn-secondary" data-x="csv">${I('download')}Excel</button><button class="btn btn-secondary" data-x="pdf">${I('print')}PDF</button>`)}
        <div class="row mb-16">${UI.periodSeg(per, [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц'], ['q', 'Квартал'], ['custom', 'Период…']])}
          ${per === 'custom' ? html`<input class="input input-sm" type="date" data-f="from" value="${r.q.from || R.from}" style="width:160px"><span class="muted">—</span><input class="input input-sm" type="date" data-f="to" value="${r.q.to || R.to}" style="width:160px"><button class="btn btn-soft btn-sm" data-x="apply">Показать</button>` : ''}
          <span class="muted fw-7 fs-13 right">${F.date(R.from)} — ${F.date(R.to)} · сравнение с ${F.date(R.pfrom)} — ${F.date(R.pto)}</span></div>
        <div class="grid g-5 keep-2">
          ${UI.kpi({ label: 'Поступило', icon: 'arrowDown', value: F.short(inc), unit: 'сум', foot: html`${UI.delta(inc, incP)} к прошлому периоду`, drill: 'income' })}
          ${UI.kpi({ label: 'Расходы', icon: 'arrowUp', value: F.short(exp), unit: 'сум', foot: html`${UI.delta(exp, expP, true)} к прошлому периоду`, drill: 'exp' })}
          ${UI.kpi({ label: 'Денежный поток', icon: 'refresh', value: F.short(inc - exp), unit: 'сум', foot: 'поступления минус расходы', drill: 'flow' })}
          ${UI.kpi({ label: 'Валовая прибыль', icon: 'trendUp', value: F.short(pr.profit), unit: 'сум', foot: html`${UI.delta(pr.profit, prP.profit)} · маржа ${F.pct(pr.rev ? (pr.profit / pr.rev) * 100 : 0, 0)}`, drill: 'profit' })}
          ${UI.kpi({ label: 'Денег всего', icon: 'wallet', value: F.short(bal.total), unit: 'сум', foot: 'касса + счёт + карта на сегодня' })}
        </div>
        <div class="grid g-21 mt-16">
          <div class="card"><div class="card-h"><h3>Поступления и расходы ${daily ? 'по дням' : 'по неделям'}</h3>${UI.legend([{ name: 'Поступления', color: 'var(--s1)' }, { name: 'Расходы', color: 'var(--s4)' }])}</div>
            <div class="card-b">${UI.chart({ type: 'bar', height: 250, labels, tipLabels: tipL, series: [{ name: 'Поступления', color: 'var(--s1)', values: vIn }, { name: 'Расходы', color: 'var(--s4)', values: vOut }], tipFmt: F.money })}</div></div>
          <div class="card"><div class="card-h"><h3>Остатки денег</h3><span class="sub">на сегодня</span></div><div class="card-b stack" style="gap:10px">
            ${PAYK.map((m) => html`<div class="machine" style="cursor:pointer" data-drill="balance:${m}"><div class="m-ic" style="background:color-mix(in srgb, ${AP.PAY[m].c} 14%, transparent);color:${AP.PAY[m].c}">${I(AP.PAY[m].icon)}</div><div class="grow"><b class="fs-13">${{ cash: 'Касса (наличные)', bank: 'Расчётный счёт', card: 'Корпоративная карта' }[m]}</b><span class="cell-sub">нажмите — список операций</span></div><b class="fs-16 nowrap">${F.m(bal[m])}</b></div>`)}
            <div class="row between" style="padding:6px 4px 0"><b>Итого</b><b class="fs-20">${F.money(bal.total)}</b></div></div></div>
        </div>
        <div class="grid g-3 mt-16">
          <div class="card"><div class="card-h"><h3>По видам оплаты</h3></div><div class="card-b">${UI.segBar(PAYK.map((m) => ({ name: payName(m), value: AP.sum(P.filter((p) => p.method === m), 'amount'), color: AP.PAY[m].c })), { fmt: F.short })}
            <div class="row mt-12">${PAYK.map((m) => html`<button class="btn btn-ghost btn-xs" data-drill="income:${m}">${payName(m)} ${I('arrowRight')}</button>`)}</div></div></div>
          <div class="card"><div class="card-h"><h3>Расходы по статьям</h3></div><div class="card-b">${UI.hbars(Object.keys(byCat).map((k) => ({ label: AP.EXP_CATS[k], value: AP.sum(byCat[k], 'amount'), attr: 'data-drill="exp:' + k + '"' })).sort((a, b) => b.value - a.value), { fmt: F.short, color: 'var(--s4)' })}</div></div>
          <div class="card"><div class="card-h"><h3>Поступления по клиентам</h3></div><div class="card-b">${UI.hbars(Object.keys(byCl).map((k) => ({ label: AP.client(k).name, value: AP.sum(byCl[k], 'amount'), attr: 'data-drill="client:' + k + '"' })).sort((a, b) => b.value - a.value).slice(0, 7), { fmt: F.short })}</div></div>
        </div>
        <div class="grid g-3 mt-16">
          <div class="card"><div class="card-h"><h3>Нам должны</h3><button class="btn btn-ghost btn-xs" data-drill="recv">Список ${I('arrowRight')}</button></div><div class="card-b">
            <div class="row between mb-12"><b class="fs-20">${F.money(recv)}</b><span class="badge ${recvO ? 'b-bad' : 'b-ok'}">просрочено ${F.short(recvO)}</span></div>
            ${UI.segBar(AP.AGING.map(([k, t], i) => ({ name: t, value: aging[k], color: 'var(--age-' + i + ')' })), { fmt: F.short })}</div></div>
          <div class="card"><div class="card-h"><h3>Мы должны</h3><button class="btn btn-ghost btn-xs" data-drill="payb">Список ${I('arrowRight')}</button></div><div class="card-b">
            <div class="row between mb-12"><b class="fs-20">${F.money(payb)}</b><span class="badge ${paybO ? 'b-bad' : 'b-ok'}">просрочено ${F.short(paybO)}</span></div>
            <div class="stack" style="gap:8px">${upcoming.map((u) => html`<div class="row between nowrap fs-13"><span class="ellipsis fw-7">${F.dm(u.due)} · ${u.name}</span><b class="nowrap ${u.overdue ? 'bad-t' : ''}">${F.short(u.amount)}</b></div>`)}</div>
            <div class="divider"></div><div class="row between"><span class="text-2 fw-7">Разница (нам − мы)</span><b class="${recv - payb < 0 ? 'bad-t' : 'ok-t'}">${F.short(recv - payb)}</b></div></div></div>
          <div class="card"><div class="card-h"><h3>Валовая прибыль по месяцам</h3></div><div class="card-b">${UI.chart({ type: 'bar', height: 210, labels: months.map((m) => m.label.slice(0, 3)), tipLabels: months.map((m) => m.label + ' · выручка ' + F.short(m.rev)), series: [{ name: 'Прибыль', color: 'var(--s2)', values: months.map((m) => Math.max(0, m.v)) }], tipFmt: F.money, padL: 44 })}</div></div>
        </div>`;
    },
    mount(el, r) {
      if (!AP.isDirector()) return;
      UI.bindPeriod(el);
      const R = rangeFromQuery(r.q);
      UI.$$('[data-drill]', el).forEach((b) => (b.onclick = () => drill(b.dataset.drill, R)));
      const ap = UI.$('[data-x=apply]', el); if (ap) ap.onclick = () => AP.setQuery({ p: 'custom', from: UI.$('[data-f=from]', el).value, to: UI.$('[data-f=to]', el).value });
      UI.$('[data-x=pdf]', el).onclick = () => { AP.audit('Выгрузка финансового дашборда в PDF', 'export', null, F.date(R.from) + ' — ' + F.date(R.to)); AP.save(); window.print(); };
      UI.$('[data-x=csv]', el).onclick = () => {
        const P = AP.db.payments.filter((p) => inR(p.date, R.from, R.to)), E = AP.db.expenses.filter((e) => inR(e.date, R.from, R.to)), bal = AP.balances();
        const rows = [['Финансовый дашборд', F.date(R.from) + ' — ' + F.date(R.to)], [], ['Показатель', 'Сумма, сум'], ['Поступило', Math.round(AP.sum(P, 'amount'))]].concat(PAYK.map((m) => ['  ' + payName(m), Math.round(AP.sum(P.filter((p) => p.method === m), 'amount'))]), [['Расходы', Math.round(AP.sum(E, 'amount'))]], Object.keys(AP.EXP_CATS).map((k) => ['  ' + AP.EXP_CATS[k], Math.round(AP.sum(E.filter((e) => e.category === k), 'amount'))]), [['Касса', Math.round(bal.cash)], ['Расчётный счёт', Math.round(bal.bank)], ['Корпоративная карта', Math.round(bal.card)], [], ['Дата', 'Операция', 'Контрагент', 'Способ', 'Сумма']], P.map((p) => [F.date(p.date), 'Поступление', AP.client(p.clientId).name, payName(p.method), p.amount]), E.map((e) => [F.date(e.date), AP.EXP_CATS[e.category], e.supplierId ? AP.supplier(e.supplierId).name : '', payName(e.method), -e.amount]));
        AP.exportCSV('fin-dashboard-' + R.from + '-' + R.to, rows);
      };
    },
  });

  /* ================= КАССА, СЧЁТ, КАРТА ================= */
  function balanceRow(m, from) {
    const ops = AP.db.payments.filter((p) => p.method === m && p.date >= from).map((p) => ({ at: p.at, t: 'Поступление · ' + AP.client(p.clientId).name + (p.orderId ? ' · ' + AP.order(p.orderId).no : ''), v: p.amount }))
      .concat(AP.db.expenses.filter((e) => e.method === m && e.date >= from).map((e) => ({ at: e.at, t: AP.EXP_CATS[e.category] + (e.supplierId ? ' · ' + AP.supplier(e.supplierId).name : '') + (e.note ? ' · ' + e.note : ''), v: -e.amount })),
        (AP.db.transfers || []).filter((x) => (x.from === m || x.to === m) && x.date >= from).map((x) => ({ at: x.at, t: x.note, v: x.from === m ? -x.amount : x.amount })))
      .sort((a, b) => (a.at < b.at ? -1 : 1));
    let bal = AP.balances(D.iso(D.addDays(from, -1)))[m];
    ops.forEach((o) => { bal += o.v; o.bal = bal; });
    return ops.reverse();
  }
  function opsTab(m) {
    const ops = balanceRow(m, D.iso(D.addDays(D.todayISO(), -45)));
    return html`<div class="card"><div class="table-wrap"><table class="table compact"><thead><tr><th>Когда</th><th>Операция</th><th class="r">Приход</th><th class="r">Расход</th><th class="r">Остаток</th></tr></thead><tbody>
      ${ops.slice(0, 150).map((o) => html`<tr><td class="nowrap">${F.dt(o.at)}</td><td class="fs-13">${o.t}</td><td class="r ok-t fw-7">${o.v > 0 ? F.m(o.v) : ''}</td><td class="r bad-t fw-7">${o.v < 0 ? F.m(-o.v) : ''}</td><td class="r fw-8">${F.m(o.bal)}</td></tr>`)}</tbody></table></div></div>`;
  }
  function cashTab() {
    const days = AP.dayLabels(14).reverse();
    const today = D.todayISO();
    const closes = Object.fromEntries(AP.db.cashCloses.map((c) => [c.date, c]));
    return html`<div class="row mb-16"><span class="muted fw-7">Касса: остаток на конец дня и сверка с реальной суммой</span>${AP.can('money', 2) && !closes[today] ? html`<button class="btn btn-primary right" data-x="close">${I('check')}Закрыть день (сверка)</button>` : closes[today] ? html`<span class="badge b-ok right">день закрыт</span>` : ''}</div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>День</th><th class="r">На начало</th><th class="r">Приход</th><th class="r">Расход</th><th class="r">На конец (программа)</th><th class="r">Пересчитано</th><th class="r">Расхождение</th></tr></thead><tbody>
      ${days.map((d) => { const b0 = AP.balances(D.iso(D.addDays(d, -1))).cash, b1 = AP.balances(d).cash; const inn = AP.sum(AP.db.payments.filter((p) => p.method === 'cash' && p.date === d), 'amount'); const c = closes[d]; return html`<tr class="${c && c.diff ? 'row-warn' : ''}"><td class="fw-7">${F.date(d)}${d === today ? html` <span class="badge b-brand sm">сегодня</span>` : ''}</td><td class="r">${F.m(b0)}</td><td class="r ok-t">${F.m(inn)}</td><td class="r bad-t">${F.m(inn - (b1 - b0))}</td><td class="r fw-8">${F.m(b1)}</td><td class="r">${c ? F.m(c.actual) : html`<span class="muted">—</span>`}</td><td class="r fw-8 ${c && c.diff ? 'bad-t' : 'ok-t'}">${c ? (c.diff ? F.m(c.diff) : '0') : ''}${c && c.note ? html`<span class="cell-sub">${c.note}</span>` : ''}</td></tr>`; })}
      </tbody></table></div></div>`;
  }

  function payDialog(pre = {}) {
    const clients = AP.db.clients;
    const m = UI.modal({
      title: 'Внести поступление', sub: 'Оплата привязывается к заказу — долг пересчитается сам. Можно частично или авансом.',
      body: html`<form class="form-grid" id="payF">
        <div class="field full"><label>Клиент</label><select class="select" name="c">${UI.options(clients.map((c) => [c.id, c.name]), pre.c || clients[0].id)}</select></div>
        <div class="field full"><label>Заказ</label><select class="select" name="o"></select></div>
        <div class="field"><label>Сумма, сум <span class="req">*</span></label><input class="input input-lg" name="amount" type="number" min="1" step="1000"></div>
        <div class="field"><label>Дата</label><input class="input input-lg" type="date" name="date" value="${D.todayISO()}"></div>
        <div class="field full"><label>Вид оплаты</label><div class="seg" style="display:flex">${PAYK.map((k, i) => html`<label class="check" style="flex:1;justify-content:center;padding:6px"><input type="radio" name="method" value="${k}" ${i === 0 ? raw('checked') : ''}>${payName(k)}</label>`)}</div></div>
        <div class="field full"><label>Комментарий</label><input class="input" name="note" placeholder="№ платёжки, кто принёс наличные…"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>${I('check')}Записать</button>`,
    });
    const f = m.querySelector('#payF');
    const fill = () => {
      const os = AP.ordersOf(f.c.value).filter((o) => !['closed', 'cancelled'].includes(AP.orderStatus(o))).slice().reverse();
      f.o.innerHTML = String(html`<option value="">Аванс без привязки к заказу</option>${os.map((o) => { const dbt = AP.orderDebt(o); return html`<option value="${o.id}" data-debt="${Math.round(dbt)}">${o.no} · ${AP.STATUSES[AP.orderStatus(o)].t}${dbt ? ' · долг ' + F.m(dbt) : ' · сумма ' + F.m(AP.orderAmount(o))}</option>`; })}`);
      if (pre.o) f.o.value = pre.o;
      const opt = f.o.selectedOptions[0];
      f.amount.value = opt && opt.dataset.debt && +opt.dataset.debt > 0 ? opt.dataset.debt : '';
    };
    f.c.onchange = () => { pre.o = null; fill(); };
    f.o.onchange = () => { const opt = f.o.selectedOptions[0]; if (opt && +opt.dataset.debt > 0) f.amount.value = opt.dataset.debt; };
    fill();
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f), amount = parseFloat(d.amount);
      if (!(amount > 0)) return f.amount.closest('.field').classList.add('is-invalid');
      const method = f.querySelector('input[name=method]:checked').value;
      const p = { id: 'ПЛ-' + String(AP.seq('ПЛ-')).padStart(4, '0'), date: d.date, at: d.date === D.todayISO() ? new Date().toISOString() : new Date(D.parse(d.date).getTime() + 12 * 3600e3).toISOString(), clientId: d.c, orderId: d.o || null, amount, method, by: AP.user.id, note: d.note };
      AP.db.payments.push(p);
      AP.audit('Поступление оплаты', 'payment', p.orderId || p.clientId, (p.orderId ? AP.order(p.orderId).no + ' · ' : 'аванс · ') + F.money(amount) + ' · ' + payName(method));
      AP.save(); UI.closeTop(); UI.toast('Поступление записано', F.money(amount) + ' · ' + payName(method)); AP.refresh();
    };
  }
  function expDialog(pre = {}) {
    const m = UI.modal({
      title: 'Внести расход',
      body: html`<form class="form-grid" id="expF">
        <div class="field"><label>Статья</label><select class="select" name="cat">${UI.options(Object.entries(AP.EXP_CATS), pre.cat || 'raw')}</select></div>
        <div class="field"><label>Поставщик</label><select class="select" name="s">${UI.options(AP.db.suppliers.map((s) => [s.id, s.name]), pre.s, '—')}</select></div>
        <div class="field"><label>Сумма, сум <span class="req">*</span></label><input class="input input-lg" name="amount" type="number" min="1" step="1000" value="${pre.amount ? Math.round(pre.amount) : ''}"></div>
        <div class="field"><label>Дата</label><input class="input input-lg" type="date" name="date" value="${D.todayISO()}"></div>
        <div class="field full"><label>Чем оплачено</label><div class="seg" style="display:flex">${PAYK.map((k) => html`<label class="check" style="flex:1;justify-content:center;padding:6px"><input type="radio" name="method" value="${k}" ${k === (pre.method || 'bank') ? raw('checked') : ''}>${payName(k)}</label>`)}</div></div>
        <div class="field full"><label>Комментарий</label><input class="input" name="note" value="${pre.note || ''}"></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Записать</button>`,
    });
    const f = m.querySelector('#expF');
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(f), amount = parseFloat(d.amount);
      if (!(amount > 0)) return f.amount.closest('.field').classList.add('is-invalid');
      const method = f.querySelector('input[name=method]:checked').value;
      const e = { id: 'РС-' + String(AP.seq('РС-')).padStart(4, '0'), date: d.date, at: new Date().toISOString(), category: d.cat, amount, method, supplierId: d.s || null, note: d.note, by: AP.user.id };
      AP.db.expenses.push(e);
      if (pre.ob) { const ob = AP.db.obligations.find((x) => x.id === pre.ob); if (ob) ob.paid = true; }
      AP.audit('Расход', 'expense', e.id, AP.EXP_CATS[e.category] + ' · ' + F.money(amount) + ' · ' + payName(method) + (e.supplierId ? ' · ' + AP.supplier(e.supplierId).name : ''));
      AP.save(); UI.closeTop(); UI.toast('Расход записан', F.money(amount)); AP.refresh();
    };
  }
  AP.payDialog = payDialog; AP.expDialog = expDialog;

  AP.page('money', {
    title: 'Касса, счёт, карта',
    render(r) {
      const tab = r.q.tab || 'in';
      const bal = AP.balances();
      const R = AP.periodRange(r.q.p || 'month');
      let body;
      if (tab === 'in' || tab === 'out') {
        const isIn = tab === 'in';
        let list = (isIn ? AP.db.payments : AP.db.expenses).filter((x) => inR(x.date, R.from, R.to));
        if (r.q.m) list = list.filter((x) => x.method === r.q.m);
        list = list.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
        body = html`<div class="row mb-16">${UI.periodSeg(r.q.p || 'month')}<div class="seg">${[['', 'Все']].concat(PAYK.map((k) => [k, payName(k)])).map(([k, t]) => html`<button class="${(r.q.m || '') === k ? 'on' : ''}" data-m="${k}">${t}</button>`)}</div>
          ${AP.can('money', 2) ? html`<button class="btn btn-primary right" data-x="${isIn ? 'pay' : 'exp'}">${I('plus')}${isIn ? 'Внести поступление' : 'Внести расход'}</button>` : ''}</div>
          <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>${isIn ? 'Клиент / заказ' : 'Статья'}</th><th>Вид оплаты</th><th>Кто внёс</th><th class="r">Сумма</th></tr></thead><tbody>
          ${list.slice(0, 200).map((x) => html`<tr><td class="nowrap">${F.dt(x.at)}</td><td>${isIn ? html`<span class="cell-title">${AP.client(x.clientId).name}</span><span class="cell-sub">${x.orderId ? html`<a href="#" data-act="open-order" data-id="${x.orderId}">${AP.order(x.orderId).no}</a>` : 'аванс'}${x.note ? ' · ' + x.note : ''}</span>` : html`<span class="cell-title">${AP.EXP_CATS[x.category]}</span><span class="cell-sub">${x.supplierId ? AP.supplier(x.supplierId).name + ' · ' : ''}${x.note || ''}</span>`}</td><td><span class="row nowrap" style="gap:6px"><i class="dot" style="background:${AP.PAY[x.method].c}"></i>${payName(x.method)}</span></td><td class="muted fs-13">${(AP.userById(x.by) || {}).name || '—'}</td><td class="r fw-8 nowrap ${isIn ? '' : 'bad-t'}">${isIn ? '' : '−'}${F.m(x.amount)}</td></tr>`)}
          </tbody><tfoot><tr><td colspan="4">Итого за период · ${list.length} ${F.plural(list.length, 'операция', 'операции', 'операций')}</td><td class="r">${F.m(AP.sum(list, 'amount'))}</td></tr></tfoot></table></div></div>`;
      } else if (tab === 'cash') body = cashTab();
      else body = opsTab(tab);
      return html`${UI.pageHead('Касса, расчётный счёт, корпоративная карта', 'Каждое поступление — с клиентом, заказом, суммой, датой, видом оплаты и тем, кто его внёс')}
        <div class="grid g-4 keep-2 mb-16">${PAYK.map((m) => UI.kpi({ label: { cash: 'Касса', bank: 'Расчётный счёт', card: 'Корпоративная карта' }[m], icon: AP.PAY[m].icon, value: F.short(bal[m]), unit: 'сум', foot: 'остаток на сейчас', href: '#/money?tab=' + m }))}${UI.kpi({ label: 'Всего денег', icon: 'wallet', value: F.short(bal.total), unit: 'сум', foot: 'касса + счёт + карта' })}</div>
        ${UI.tabs([['in', 'Поступления'], ['out', 'Расходы'], ['cash', 'Касса: сверка'], ['bank', 'Расчётный счёт'], ['card', 'Корп. карта']], tab)}${body}`;
    },
    mount(el, r) {
      UI.bindTabs(el); UI.bindPeriod(el);
      UI.$$('[data-m]', el).forEach((b) => (b.onclick = () => AP.setQuery({ m: b.dataset.m })));
      const pb = UI.$('[data-x=pay]', el); if (pb) pb.onclick = () => payDialog();
      const eb = UI.$('[data-x=exp]', el); if (eb) eb.onclick = () => expDialog();
      const cb = UI.$('[data-x=close]', el);
      if (cb) cb.onclick = async () => {
        const exp = AP.balances().cash;
        const r2 = await UI.prompt('Закрыть день по кассе', 'По программе в кассе ' + F.money(exp) + '. Пересчитайте наличные и введите фактическую сумму.', { extra: html`<div class="field"><label>Пересчитано, сум</label><input class="input input-lg" name="actual" type="number" value="${Math.round(exp)}"></div>`, label: 'Комментарий', required: false, ok: 'Закрыть день' });
        if (!r2) return;
        const actual = parseFloat(r2.actual) || 0, diff = actual - exp;
        if (Math.abs(diff) > 0.5 && (!r2.comment || r2.comment.length < 5)) return UI.toast('Есть расхождение', 'При расхождении комментарий обязателен', 'bad');
        AP.db.cashCloses.push({ date: D.todayISO(), expected: exp, actual, diff, by: AP.user.id, note: r2.comment });
        AP.audit('Закрытие дня по кассе', 'cash', D.todayISO(), 'Программа ' + F.money(exp) + ' · факт ' + F.money(actual) + (diff ? ' · расхождение ' + F.money(diff) : ''));
        AP.save(); UI.toast(diff ? 'День закрыт с расхождением' : 'День закрыт', diff ? F.money(diff) : 'касса сходится', diff ? 'warn' : 'ok'); AP.render();
      };
      void r;
    },
  });

  /* ================= ДОЛГИ ================= */
  function recvAt(day) {
    let s = 0;
    for (const o of AP.db.orders) {
      const sh = AP.shipmentsOf(o.id).filter((x) => x.date <= day);
      if (!sh.length) continue;
      const amt = AP.sum(sh, (x) => AP.orderAmount(o, x.qty));
      const paid = AP.sum(AP.paymentsOf(o.id).filter((p) => p.date <= day), 'amount');
      if (amt - paid > 1000) s += amt - paid;
    }
    return s;
  }
  function payAt(day) {
    let s = 0;
    for (const sp of AP.db.suppliers) {
      const b = AP.sum(AP.db.batches.filter((x) => x.supplierId === sp.id && x.date <= day), (x) => x.qty * x.price);
      const p = AP.sum(AP.db.expenses.filter((x) => x.supplierId === sp.id && x.date <= day), 'amount');
      if (b - p > 0) s += b - p;
    }
    return s;
  }

  function recvTab(q) {
    const R = AP.receivables();
    const rows = AP.db.clients.filter(AP.clientVisible).map((c) => ({ c, d: R[c.id] })).filter((x) => x.d.total > 0 || x.d.advance > 1000);
    const sort = q.sort || 'sum';
    rows.sort((a, b) => (sort === 'days' ? b.d.maxDays - a.d.maxDays : b.d.total - a.d.total));
    const tot = AP.sum(rows, (x) => x.d.total), od = AP.sum(rows, (x) => x.d.overdue), adv = AP.sum(rows, (x) => x.d.advance);
    const ag = { current: 0, d30: 0, d60: 0, d60p: 0 }; rows.forEach((x) => Object.keys(ag).forEach((k) => (ag[k] += x.d.b[k])));
    const over = rows.filter((x) => x.c.limit && x.d.total > x.c.limit).length;
    return html`<div class="grid g-4 keep-2 mb-16">${UI.kpi({ label: 'Нам должны', icon: 'scale2', value: F.short(tot), unit: 'сум', foot: rows.filter((x) => x.d.total).length + ' клиентов' })}${UI.kpi({ label: 'Просрочено', icon: 'alert', value: F.short(od), unit: 'сум', foot: tot ? F.pct((od / tot) * 100, 0) + ' от долга' : '' })}${UI.kpi({ label: 'Авансы клиентов', icon: 'coins', value: F.short(adv), unit: 'сум', foot: 'предоплаты, ещё не отгружено' })}${UI.kpi({ label: 'Превышен лимит', icon: 'shield', value: over, foot: 'клиентов' })}</div>
      <div class="card mb-16"><div class="card-h"><h3>Возраст долга</h3></div><div class="card-b">${UI.segBar(AP.AGING.map(([k, t], i) => ({ name: t, value: ag[k], color: 'var(--age-' + i + ')' })))}</div></div>
      <div class="card"><div class="card-h"><h3>Должники</h3><div class="seg">${[['sum', 'По сумме'], ['days', 'По просрочке']].map(([k, t]) => html`<button class="${sort === k ? 'on' : ''}" data-sort="${k}">${t}</button>`)}</div><button class="btn btn-ghost btn-sm" data-x="xrecv">${I('download')}Excel</button></div>
      <div class="table-wrap mt-8"><table class="table"><thead><tr><th>Клиент</th><th>Менеджер</th><th class="r">Долг</th><th class="r">Просрочено</th>${AP.AGING.map(([, t]) => html`<th class="r">${t}</th>`)}<th>Лимит</th><th></th></tr></thead><tbody>
      ${rows.map(({ c, d }) => html`<tr class="click ${q.c === c.id ? 'row-warn' : d.overdue ? 'row-bad' : ''}" data-act="open-client" data-id="${c.id}"><td><span class="cell-title">${c.name}</span><span class="cell-sub">${d.items.length} ${F.plural(d.items.length, 'отгрузка', 'отгрузки', 'отгрузок')}${d.advance > 1000 ? ' · аванс ' + F.short(d.advance) : ''}</span></td><td class="fs-13">${(AP.userById(c.managerId) || {}).name || '—'}</td><td class="r fw-8 nowrap">${F.m(d.total)}</td><td class="r nowrap ${d.overdue ? 'bad-t fw-8' : 'muted'}">${d.overdue ? F.m(d.overdue) : '—'}${d.maxDays ? html`<span class="cell-sub">${d.maxDays} дн.</span>` : ''}</td>${AP.AGING.map(([k]) => html`<td class="r ${d.b[k] ? '' : 'muted'}">${d.b[k] ? F.short(d.b[k]) : '—'}</td>`)}<td>${c.limit ? html`<span class="badge sm ${d.total > c.limit ? 'b-bad' : 'b-ok'}">${d.total > c.limit ? 'превышен' : 'в лимите'}</span><span class="cell-sub">${F.short(c.limit)}</span>` : '—'}</td><td class="r">${d.overdue ? html`<button class="btn btn-ghost btn-xs" data-remind="${c.id}">${I('send')}Напомнить</button>` : ''}</td></tr>`)}
      </tbody></table></div></div>`;
  }
  function paybTab() {
    const P = AP.payables();
    const rows = AP.db.suppliers.map((s) => ({ s, d: P[s.id] }));
    const tot = AP.sum(rows, (x) => x.d.total), od = AP.sum(rows, (x) => x.d.overdue);
    const obl = AP.obligationsOpen();
    const cal = rows.flatMap((x) => x.d.items.map((it) => ({ due: it.due, name: x.s.name, what: AP.material(AP.db.batches.find((b) => b.id === it.batchId).materialId).name, amount: it.left, overdue: it.overdue, s: x.s.id }))).concat(obl.map((o) => ({ due: o.due, name: o.name, what: AP.EXP_CATS[o.category], amount: o.amount, overdue: Math.max(0, D.diffDays(D.todayISO(), o.due)), ob: o.id, cat: o.category })))
      .filter((x) => D.diffDays(x.due, D.todayISO()) <= 21).sort((a, b) => (a.due < b.due ? -1 : 1));
    const can = AP.can('money', 2);
    return html`<div class="grid g-4 keep-2 mb-16">${UI.kpi({ label: 'Мы должны поставщикам', icon: 'scale2', value: F.short(tot), unit: 'сум' })}${UI.kpi({ label: 'Просрочено', icon: 'alert', value: F.short(od), unit: 'сум' })}${UI.kpi({ label: 'Прочие обязательства', icon: 'file', value: F.short(AP.sum(obl, 'amount')), unit: 'сум', foot: 'аренда, свет, налоги' })}${UI.kpi({ label: 'К оплате за 7 дней', icon: 'calendar', value: F.short(AP.sum(cal.filter((x) => D.diffDays(x.due, D.todayISO()) <= 7), 'amount')), unit: 'сум' })}</div>
      <div class="grid g-12">
        <div class="card"><div class="card-h"><h3>График платежей</h3><span class="sub">просроченные и ближайшие 3 недели</span></div><div class="card-b flush"><ul class="list">${cal.map((x) => html`<li><div class="avatar" style="background:${x.overdue ? 'var(--bad)' : D.diffDays(x.due, D.todayISO()) <= 3 ? 'var(--warn)' : 'var(--ink-600)'};font-size:11px;line-height:1;text-align:center">${F.dm(x.due).replace(' ', '\n')}</div><div class="grow" style="min-width:0"><b class="fs-13 ellipsis" style="display:block">${x.name}</b><span class="fs-12 ${x.overdue ? 'bad-t fw-7' : 'muted'}">${x.what}${x.overdue ? ' · просрочено ' + x.overdue + ' дн.' : ''}</span></div><b class="nowrap">${F.short(x.amount)}</b>${can ? html`<button class="btn btn-ghost btn-xs" data-paysup="${x.s || ''}" data-ob="${x.ob || ''}" data-cat="${x.cat || 'raw'}" data-amt="${x.amount}" data-note="${x.ob ? x.name : 'Оплата поставщику'}">Оплатить</button>` : ''}</li>`)}</ul></div></div>
        <div class="card"><div class="card-h"><h3>Поставщики</h3></div><div class="table-wrap"><table class="table"><thead><tr><th>Поставщик</th><th class="r">Долг</th><th class="r">Просрочено</th><th>Отсрочка</th>${AP.AGING.map(([, t]) => html`<th class="r">${t}</th>`)}</tr></thead><tbody>${rows.map(({ s, d }) => html`<tr class="${d.overdue ? 'row-bad' : ''}"><td><span class="cell-title">${s.name}</span><span class="cell-sub">${s.what} · ${s.contact}</span></td><td class="r fw-8">${F.m(d.total)}</td><td class="r ${d.overdue ? 'bad-t fw-8' : 'muted'}">${d.overdue ? F.m(d.overdue) : '—'}</td><td>${s.payDays} дн.</td>${AP.AGING.map(([k]) => html`<td class="r ${d.b[k] ? '' : 'muted'}">${d.b[k] ? F.short(d.b[k]) : '—'}</td>`)}</tr>`)}</tbody></table></div></div>
      </div>`;
  }
  function summaryTab() {
    const pts = [];
    for (let i = 3; i >= 1; i--) { const me = new Date(D.today().getFullYear(), D.today().getMonth() - i + 1, 0); pts.push({ l: F.date(D.iso(me)), d: D.iso(me) }); }
    pts.push({ l: 'Сегодня', d: D.todayISO() });
    const rv = pts.map((p) => recvAt(p.d)), pv = pts.map((p) => payAt(p.d));
    const R = Object.values(AP.receivables()), P = Object.values(AP.payables());
    const recv = AP.sum(R, 'total'), payb = AP.sum(P, 'total') + AP.sum(AP.obligationsOpen(), 'amount');
    return html`<div class="grid g-3 mb-16">${UI.kpi({ label: 'Нам должны', icon: 'arrowDown', value: F.short(recv), unit: 'сум', foot: 'просрочено ' + F.short(AP.sum(R, 'overdue')) })}${UI.kpi({ label: 'Мы должны', icon: 'arrowUp', value: F.short(payb), unit: 'сум', foot: 'просрочено ' + F.short(AP.sum(P, 'overdue')) })}${UI.kpi({ label: 'Разница', icon: 'scale2', value: F.short(recv - payb), unit: 'сум', foot: recv > payb ? 'нам должны больше' : 'мы должны больше' })}</div>
      <div class="card"><div class="card-h"><h3>Динамика долгов на конец месяца</h3>${UI.legend([{ name: 'Нам должны (дебиторка)', color: 'var(--s1)' }, { name: 'Мы должны поставщикам', color: 'var(--s4)' }])}</div><div class="card-b">${UI.chart({ type: 'bar', height: 260, labels: pts.map((p) => p.l), series: [{ name: 'Дебиторка', color: 'var(--s1)', values: rv }, { name: 'Кредиторка', color: 'var(--s4)', values: pv }], tipFmt: F.money })}</div></div>`;
  }
  function actTab(q) {
    const who = q.c || q.s || AP.db.clients.filter(AP.clientVisible)[0].id;
    const isSup = !!AP.supplier(who) && !AP.client(who);
    const from = q.from || D.iso(D.addDays(D.todayISO(), -90)), to = q.to || D.todayISO();
    let ops = [];
    if (isSup) {
      ops = AP.db.batches.filter((b) => b.supplierId === who).map((b) => ({ d: b.date, doc: 'Приход ' + b.code + ' · ' + AP.material(b.materialId).name, dt: 0, kt: b.qty * b.price }))
        .concat(AP.db.expenses.filter((e) => e.supplierId === who).map((e) => ({ d: e.date, doc: 'Оплата ' + e.id + ' · ' + payName(e.method), dt: e.amount, kt: 0 })));
    } else {
      ops = AP.db.shipments.filter((s) => s.clientId === who).map((s) => ({ d: s.date, doc: 'Отгрузка ' + s.id + ' · ' + AP.order(s.orderId).no + ' · ' + s.doc, dt: AP.orderAmount(AP.order(s.orderId), s.qty), kt: 0 }))
        .concat(AP.db.payments.filter((p) => p.clientId === who).map((p) => ({ d: p.date, doc: 'Оплата ' + p.id + ' · ' + payName(p.method), dt: 0, kt: p.amount })));
    }
    ops.sort((a, b) => (a.d < b.d ? -1 : 1));
    const sign = isSup ? -1 : 1;
    const open = AP.sum(ops.filter((o) => o.d < from), (o) => o.dt - o.kt) * sign;
    const list = ops.filter((o) => o.d >= from && o.d <= to);
    let bal = open;
    list.forEach((o) => { bal += (o.dt - o.kt) * sign; o.bal = bal; });
    const name = isSup ? AP.supplier(who).name : AP.client(who).name;
    const opts = AP.db.clients.filter(AP.clientVisible).map((c) => [c.id, 'Клиент: ' + c.name]).concat(AP.flag('ownClientsOnly') ? [] : AP.db.suppliers.map((s) => [s.id, 'Поставщик: ' + s.name]));
    AP._act = { name, from, to, open, list, bal, isSup };
    return html`<div class="row mb-16"><select class="select" data-f="who" style="max-width:380px">${UI.options(opts, who)}</select><input class="input input-sm" type="date" data-f="from" value="${from}" style="width:160px"><span class="muted">—</span><input class="input input-sm" type="date" data-f="to" value="${to}" style="width:160px"><button class="btn btn-soft btn-sm" data-x="actgo">Сформировать</button><button class="btn btn-primary btn-sm right" data-x="actprint">${I('print')}Печать акта</button></div>
      <div class="card"><div class="card-h"><h3>Акт сверки: ${name}</h3><span class="sub">${F.date(from)} — ${F.date(to)}</span></div><div class="table-wrap mt-8"><table class="table compact"><thead><tr><th>Дата</th><th>Документ</th><th class="r">${isSup ? 'Оплачено нами' : 'Отгружено (дебет)'}</th><th class="r">${isSup ? 'Получено от них' : 'Оплачено (кредит)'}</th><th class="r">Сальдо</th></tr></thead><tbody>
        <tr><td></td><td class="fw-8">Сальдо на начало</td><td></td><td></td><td class="r fw-8">${F.m(open)}</td></tr>
        ${list.map((o) => html`<tr><td>${F.date(o.d)}</td><td>${o.doc}</td><td class="r">${o.dt ? F.m(o.dt) : ''}</td><td class="r">${o.kt ? F.m(o.kt) : ''}</td><td class="r fw-7">${F.m(o.bal)}</td></tr>`)}
      </tbody><tfoot><tr><td></td><td>Сальдо на конец · ${bal > 0 ? (isSup ? 'мы должны' : 'клиент должен') : bal < 0 ? (isSup ? 'переплата поставщику' : 'аванс клиента') : 'расчёты закрыты'}</td><td class="r">${F.m(AP.sum(list, 'dt'))}</td><td class="r">${F.m(AP.sum(list, 'kt'))}</td><td class="r">${F.m(bal)}</td></tr></tfoot></table></div></div>`;
  }

  AP.page('debts', {
    title: 'Долги',
    render(r) {
      const tab = r.q.tab || 'recv';
      const own = AP.flag('ownClientsOnly') && !AP.isDirector();
      const body = { recv: recvTab, payables: paybTab, summary: summaryTab, act: actTab }[tab] || recvTab;
      return html`${UI.pageHead('Дебиторская и кредиторская задолженность', own ? 'Долги ваших клиентов. Полную картину видит главный руководитель.' : 'Собирается сама из заказов, отгрузок, приходов сырья и платежей — вручную вести не нужно')}
        ${UI.tabs([['recv', 'Нам должны'], own ? null : ['payables', 'Мы должны'], own ? null : ['summary', 'Общая картина'], ['act', 'Акт сверки']], tab)}${body(r.q)}`;
    },
    mount(el, r) {
      UI.bindTabs(el);
      UI.$$('[data-sort]', el).forEach((b) => (b.onclick = () => AP.setQuery({ sort: b.dataset.sort })));
      UI.$$('[data-remind]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const c = AP.client(b.dataset.remind), mgr = AP.userById(c.managerId); AP.audit('Напоминание о просроченной оплате', 'client', c.id, c.name + ' → ' + (mgr ? mgr.name : 'менеджеру')); AP.save(); UI.toast('Напоминание отправлено', (mgr ? mgr.name : 'Менеджер') + ' увидит его в уведомлениях · в будущем — в Telegram', 'info'); }));
      UI.$$('[data-paysup]', el).forEach((b) => (b.onclick = () => expDialog({ s: b.dataset.paysup, ob: b.dataset.ob, cat: b.dataset.cat, amount: +b.dataset.amt, note: b.dataset.note })));
      const xr = UI.$('[data-x=xrecv]', el);
      if (xr) xr.onclick = () => { const R = AP.receivables(); AP.exportCSV('debitorka-' + D.todayISO(), [['Клиент', 'Менеджер', 'Долг', 'Просрочено', 'Дней', 'Не просрочено', 'До 30', '31–60', '60+', 'Лимит']].concat(AP.db.clients.filter(AP.clientVisible).filter((c) => R[c.id].total).map((c) => { const d = R[c.id]; return [c.name, (AP.userById(c.managerId) || {}).name, Math.round(d.total), Math.round(d.overdue), d.maxDays, Math.round(d.b.current), Math.round(d.b.d30), Math.round(d.b.d60), Math.round(d.b.d60p), c.limit]; }))); };
      const go = UI.$('[data-x=actgo]', el);
      if (go) {
        go.onclick = () => { const w = UI.$('[data-f=who]', el).value; AP.setQuery({ c: AP.client(w) ? w : '', s: AP.client(w) ? '' : w, from: UI.$('[data-f=from]', el).value, to: UI.$('[data-f=to]', el).value }); };
        UI.$('[data-f=who]', el).onchange = go.onclick;
        UI.$('[data-x=actprint]', el).onclick = () => {
          const a = AP._act;
          UI.printDoc('Акт сверки ' + a.name, `<h1>Акт сверки взаимных расчётов</h1><div>между ${AP.esc(AP.db.company.name)} и ${AP.esc(a.name)} за период ${F.date(a.from)} — ${F.date(a.to)}</div>
            <table><tr><th>Дата</th><th>Документ</th><th class="r">Дебет</th><th class="r">Кредит</th><th class="r">Сальдо</th></tr><tr><td></td><td><b>Сальдо на начало</b></td><td></td><td></td><td class="r">${F.m(a.open)}</td></tr>${a.list.map((o) => `<tr><td>${F.date(o.d)}</td><td>${AP.esc(o.doc)}</td><td class="r">${o.dt ? F.m(o.dt) : ''}</td><td class="r">${o.kt ? F.m(o.kt) : ''}</td><td class="r">${F.m(o.bal)}</td></tr>`).join('')}<tr><td></td><td><b>Сальдо на конец</b></td><td></td><td></td><td class="r"><b>${F.m(a.bal)}</b></td></tr></table>
            <div class="sign"><div>От ${AP.esc(AP.db.company.name)}</div><div>От ${AP.esc(a.name)}</div></div>`);
          AP.audit('Печать акта сверки', 'act', null, a.name); AP.save();
        };
      }
      void r;
    },
  });

  /* ================= СЕБЕСТОИМОСТЬ ================= */
  function costDrawer(o) {
    const ec = AP.orderEconomics(o), p = AP.product(o.productId);
    const rows = AP.COST_PARTS.map(([k, t]) => ({ t, plan: ec.plan[k], fact: ec.fact.kg ? ec.fact[k] / ec.fact.kg : 0 }));
    UI.drawer({
      title: 'Себестоимость ' + o.no, sub: p.name + ' · ' + AP.client(o.clientId).name,
      body: html`<div class="grid g-4 keep-2 mb-16"><div class="card kpi"><div class="k-label">План, сум/кг</div><div class="k-value">${F.m(ec.plan.total)}</div></div><div class="card kpi"><div class="k-label">Факт, сум/кг</div><div class="k-value">${F.m(ec.fact.perKg)}</div><div class="k-foot"><span class="delta ${ec.factVsPlan > 0.01 ? 'down' : 'up'}">${ec.factVsPlan > 0 ? '+' : ''}${F.num(ec.factVsPlan * 100, 1)}%</span></div></div><div class="card kpi"><div class="k-label">Выручка (отгружено)</div><div class="k-value">${F.short(ec.revenue)}</div></div><div class="card kpi"><div class="k-label">Прибыль</div><div class="k-value ${ec.profit < 0 ? 'bad-t' : ''}">${F.short(ec.profit)}</div><div class="k-foot">маржа ${F.pct(ec.margin * 100, 0)}</div></div></div>
        <div class="card mb-16"><div class="card-h"><h3>Из чего складывается, сум/кг</h3>${UI.legend([{ name: 'План', color: 'var(--s1)' }, { name: 'Факт', color: 'var(--s4)' }])}</div><div class="card-b">${UI.chart({ type: 'bar', height: 230, labels: rows.map((x) => x.t.split(' ')[0]), tipLabels: rows.map((x) => x.t), series: [{ name: 'План', color: 'var(--s1)', values: rows.map((x) => x.plan) }, { name: 'Факт', color: 'var(--s4)', values: rows.map((x) => x.fact) }], tipFmt: (v) => F.m(v) + ' сум/кг' })}
          <table class="table compact mt-12"><thead><tr><th>Статья</th><th class="r">План</th><th class="r">Факт</th><th class="r">Разница</th></tr></thead><tbody>${rows.map((x) => html`<tr><td class="fw-7">${x.t}</td><td class="r">${F.m(x.plan)}</td><td class="r">${F.m(x.fact)}</td><td class="r fw-8 ${x.fact - x.plan > 0.5 ? 'bad-t' : 'ok-t'}">${x.fact - x.plan > 0 ? '+' : ''}${F.m(x.fact - x.plan)}</td></tr>`)}</tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>Брак и отходы</h3></div><div class="card-b"><dl class="dl"><dt>Брак</dt><dd>${F.kg(ec.fact.defectKg)} · ${ec.fact.kg ? F.pct((ec.fact.defectKg / ec.fact.kg) * 100) : '—'} (норма ${F.pct(p.defect)})</dd><dt>Стоимость брака</dt><dd>${F.money(ec.fact.defectCost)}</dd><dt>Выпущено годной</dt><dd>${F.kg(ec.fact.kg)}</dd></dl></div></div>`,
    });
  }
  AP.page('cost', {
    title: 'Себестоимость',
    render(r) {
      const by = r.q.by || 'order';
      const orders = AP.db.orders.filter((o) => AP.orderVisible(o) && AP.producedKg(o) > 0).slice().reverse();
      const eco = orders.map((o) => ({ o, e: AP.orderEconomics(o) }));
      const from30 = D.iso(D.addDays(D.todayISO(), -29));
      const pr30 = profitIn(from30, D.todayISO());
      const wPlan = AP.sum(eco, (x) => x.e.plan.total * x.e.fact.kg), wFact = AP.sum(eco, (x) => x.e.fact.total), kgAll = AP.sum(eco, (x) => x.e.fact.kg);
      let body;
      if (by === 'order') {
        body = html`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Продукция</th><th class="r">Выпущено</th><th class="r">План, сум/кг</th><th class="r">Факт, сум/кг</th><th class="r">Откл.</th><th class="r">Выручка</th><th class="r">Прибыль</th><th class="r">Маржа</th></tr></thead><tbody>
          ${eco.map(({ o, e }) => html`<tr class="click ${e.factVsPlan > 0.04 ? 'row-warn' : ''}" data-cost="${o.id}"><td><b>${o.no}</b><span class="cell-sub">${AP.client(o.clientId).name}</span></td><td class="fs-13">${AP.product(o.productId).name}</td><td class="r nowrap">${F.kg(e.fact.kg)}</td><td class="r">${F.m(e.plan.total)}</td><td class="r fw-7">${F.m(e.fact.perKg)}</td><td class="r fw-8 ${e.factVsPlan > 0.01 ? 'bad-t' : 'ok-t'}">${e.factVsPlan > 0 ? '+' : ''}${F.num(e.factVsPlan * 100, 1)}%</td><td class="r">${e.revenue ? F.short(e.revenue) : '—'}</td><td class="r fw-8 ${e.profit < 0 ? 'bad-t' : ''}">${e.revenue ? F.short(e.profit) : '—'}</td><td class="r">${e.revenue ? F.pct(e.margin * 100, 0) : '—'}</td></tr>`)}
        </tbody></table></div></div>`;
      } else {
        const key = { client: (x) => x.o.clientId, product: (x) => x.o.productId, ws: (x) => x.o.workshop }[by];
        const name = { client: (k) => AP.client(k).name, product: (k) => AP.product(k).name, ws: (k) => AP.wsName(k) }[by];
        const g = AP.groupBy(eco.filter((x) => x.e.revenue), key);
        const rows = Object.keys(g).map((k) => ({ k, name: name(k), rev: AP.sum(g[k], (x) => x.e.revenue), pr: AP.sum(g[k], (x) => x.e.profit) })).sort((a, b) => b.pr - a.pr);
        body = html`<div class="grid g-2"><div class="card"><div class="card-h"><h3>Прибыль</h3></div><div class="card-b">${UI.hbars(rows.map((x) => ({ label: x.name, value: Math.max(0, x.pr), extra: F.pct(x.rev ? (x.pr / x.rev) * 100 : 0, 0) })), { fmt: F.short, color: 'var(--s2)' })}</div></div>
          <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>${{ client: 'Клиент', product: 'Продукция', ws: 'Цех' }[by]}</th><th class="r">Выручка</th><th class="r">Прибыль</th><th class="r">Маржа</th></tr></thead><tbody>${rows.map((x) => html`<tr><td class="fw-7">${x.name}</td><td class="r">${F.short(x.rev)}</td><td class="r fw-8">${F.short(x.pr)}</td><td class="r">${F.pct(x.rev ? (x.pr / x.rev) * 100 : 0, 0)}</td></tr>`)}</tbody></table></div></div></div>`;
      }
      return html`${UI.pageHead('Себестоимость и прибыль', 'Плановая — при приёме заказа по рецептуре и нормам, фактическая — по реальным списаниям, выработке и браку')}
        <div class="grid g-4 keep-2 mb-16">${UI.kpi({ label: 'Плановая, средняя', icon: 'calc', value: F.m(kgAll ? wPlan / kgAll : 0), unit: 'сум/кг' })}${UI.kpi({ label: 'Фактическая, средняя', icon: 'calc', value: F.m(kgAll ? wFact / kgAll : 0), unit: 'сум/кг', foot: html`${UI.delta(wFact, wPlan, true)} к плану` })}${UI.kpi({ label: 'Валовая прибыль, 30 дней', icon: 'trendUp', value: F.short(pr30.profit), unit: 'сум', foot: 'выручка ' + F.short(pr30.rev) })}${UI.kpi({ label: 'Маржа, 30 дней', icon: 'percent', value: F.num(pr30.rev ? (pr30.profit / pr30.rev) * 100 : 0, 1), unit: '%' })}</div>
        <div class="row mb-16"><div class="seg">${[['order', 'По заказам'], ['client', 'По клиентам'], ['product', 'По продукции'], ['ws', 'По цехам']].map(([k, t]) => html`<button class="${by === k ? 'on' : ''}" data-by="${k}">${t}</button>`)}</div><span class="muted fs-13 fw-7">Жёлтым — заказы, где факт дороже плана больше чем на 4%</span></div>${body}`;
    },
    mount(el) {
      UI.$$('[data-by]', el).forEach((b) => (b.onclick = () => AP.setQuery({ by: b.dataset.by })));
      UI.$$('[data-cost]', el).forEach((b) => (b.onclick = () => costDrawer(AP.order(b.dataset.cost))));
    },
  });
})();
