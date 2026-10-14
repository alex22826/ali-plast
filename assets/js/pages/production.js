/* Производство, весы и QR-коды (ТЗ 4.5, 5, 6) */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  const D = AP.d;
  const A = AP.act;
  const nowShift = () => { const h = new Date().getHours(); return h >= 8 && h < 20 ? 'A' : 'B'; };
  const SHIFT = { A: 'Смена А (день)', B: 'Смена Б (ночь)', D: 'Дневная' };
  const scopedMachines = () => AP.db.machines.filter((m) => AP.inScope(m.workshop));
  const empName = (id) => (AP.employee(id) || {}).name || '—';

  /* ================= ПРОИЗВОДСТВО ================= */
  const TYPE_ORDER = ['extrusion', 'print', 'cut', 'pack'];
  function laneTasks(m) {
    return AP.db.orders.filter((o) => {
      if (!AP.orderVisible(o)) return false;
      const st = AP.orderStatus(o);
      if (st === 'production') return AP.currentMachine(o) === m.id;
      if ((st === 'queue' || st === 'waiting') && o.task) return o.task.machineId === m.id;
      return false;
    }).sort((a, b) => (AP.orderStatus(a) === 'production' ? -1 : 0) - (AP.orderStatus(b) === 'production' ? -1 : 0) || (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || ((a.task.queuedAt || '') < (b.task.queuedAt || '') ? -1 : 1));
  }
  function taskCard(o) {
    const st = AP.orderStatus(o), p = AP.product(o.productId);
    const stg = AP.currentStage(o);
    const need = AP.kgOf(p, o.qty), done = stg === 'pack' ? AP.producedKg(o) : o.progress[stg] || 0;
    const can = AP.can('production', 2);
    let btn = '';
    if (can && st === 'queue') btn = html`<button class="btn btn-primary btn-xs" data-t="start" data-id="${o.id}">${I('play')}Запустить</button>`;
    else if (can && st === 'production') btn = stg === 'pack' ? html`<a class="btn btn-primary btn-xs" href="#/scales?order=${o.id}">${I('scale')}К весам</a>` : html`<button class="btn btn-soft btn-xs" data-t="out" data-id="${o.id}">${I('plus')}Выработка</button>`;
    else if (can && !o.task) btn = html`<button class="btn btn-soft btn-xs" data-t="queue" data-id="${o.id}">${I('clipboard')}В очередь</button>`;
    return html`<div class="task ${st === 'production' ? 'now' : ''}" data-act="open-order" data-id="${o.id}">
      <div class="t-top"><b class="fs-13">${o.no}</b>${AP.statusBadge(st, st === 'production' ? AP.STAGES[stg].short : '')}${o.urgent ? html`<span class="chip urgent" data-tip="${o.urgent.reason}">${I('zap')}срочно</span>` : ''}</div>
      <div class="t-title">${p.name}</div>
      <div class="t-meta">${AP.client(o.clientId).name} · ${AP.fmtQty(p, o.qty, { kg: true })}</div>
      ${st === 'production' ? html`<div class="mt-8">${UI.progress(done / need, '', 'sm')}</div>` : ''}
      <div class="row between mt-8"><span class="fs-12 ${AP.isOverdue(o) ? 'bad-t fw-8' : 'muted fw-7'}">${I('clock', 'icon-16')} до ${F.dm(o.deadline)}</span>${btn}</div></div>`;
  }

  function queueTab() {
    const ms = scopedMachines().sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (a.workshop < b.workshop ? -1 : 1));
    const free = AP.db.orders.filter((o) => AP.orderVisible(o) && ['new', 'layout', 'waiting'].includes(AP.orderStatus(o)) && !o.task);
    return html`<div class="board">
      <div class="lane"><div class="lane-h"><span class="badge b-brand plain">${free.length}</span><b class="grow">Не распределены</b></div><div class="lane-b">${free.length ? free.map(taskCard) : html`<div class="muted fs-12" style="padding:10px">Все заказы назначены на станки</div>`}</div></div>
      ${ms.map((m) => { const st = AP.machineState(m.id), list = laneTasks(m); return html`<div class="lane">
        <div class="lane-h"><span class="dot" style="background:${st.s === 'run' ? 'var(--ok)' : st.s === 'down' ? 'var(--bad)' : 'var(--border-strong)'}"></span><div class="grow" style="min-width:0"><b class="fs-13 ellipsis" style="display:block">${m.name}</b><span class="fs-12 muted">${AP.wsName(m.workshop)} · ${st.s === 'down' ? 'простой: ' + st.reason : st.t.toLowerCase()}</span></div><span class="badge sm">${list.length}</span></div>
        <div class="lane-b">${list.length ? list.map(taskCard) : html`<div class="muted fs-12" style="padding:10px">Нет заданий</div>`}</div></div>`; })}
    </div>`;
  }

  function outputRecords(from, to) {
    const recs = AP.db.outputs.filter((x) => AP.inScope(x.workshop) && x.date >= from && x.date <= to);
    const units = AP.db.units.filter((u) => u.type !== 'pallet' && AP.inScope(u.workshop) && D.dayOf(u.at) >= from && D.dayOf(u.at) <= to)
      .map((u) => ({ date: D.dayOf(u.at), shift: u.shift, workshop: u.workshop, machineId: AP.order(u.orderId).route.pack, operatorId: u.packerId || u.operatorId, orderId: u.orderId, stage: 'pack', kg: u.net }));
    return recs.concat(units);
  }
  function outputTab(q) {
    const per = q.p || 'week';
    const R = AP.periodRange(per);
    const recs = outputRecords(R.from, R.to);
    const by = q.by || 'machine';
    const keyOf = { shift: (r) => r.date + '|' + r.shift, machine: (r) => r.machineId, operator: (r) => r.operatorId, order: (r) => r.orderId }[by];
    const nameOf = { shift: (k) => { const [d, s] = k.split('|'); return F.date(d) + ' · ' + SHIFT[s]; }, machine: (k) => AP.machine(k).name, operator: (k) => empName(k), order: (k) => { const o = AP.order(k); return o.no + ' · ' + AP.product(o.productId).name; } }[by];
    const g = AP.groupBy(recs, keyOf);
    const rows = Object.keys(g).map((k) => { const r = { k, name: nameOf(k), tot: 0 }; TYPE_ORDER.forEach((s) => { r[s] = AP.sum(g[k].filter((x) => x.stage === s), 'kg'); }); r.tot = r.pack; return r; })
      .sort((a, b) => (by === 'shift' ? (a.k < b.k ? 1 : -1) : b.extrusion + b.pack - (a.extrusion + a.pack)));
    const days = AP.dayLabels(Math.max(7, R.days > 31 ? 30 : R.days));
    const ext = days.map((d) => AP.sum(recs.filter((x) => x.date === d && x.stage === 'extrusion'), 'kg'));
    const pk = days.map((d) => AP.sum(recs.filter((x) => x.date === d && x.stage === 'pack'), 'kg'));
    const tot = (s) => AP.sum(rows, s);
    return html`
      <div class="row mb-16">${UI.periodSeg(per)}<div class="seg">${[['machine', 'По станкам'], ['operator', 'По операторам'], ['shift', 'По сменам'], ['order', 'По заказам']].map(([k, t]) => html`<button class="${by === k ? 'on' : ''}" data-by="${k}">${t}</button>`)}</div><button class="btn btn-secondary btn-sm right" data-x="exp">${I('download')}Excel</button></div>
      <div class="card mb-16"><div class="card-h"><h3>Выпуск плёнки и готовой продукции по дням, кг</h3>${UI.legend([{ name: 'Экструзия (плёнка)', color: 'var(--s1)' }, { name: 'Упаковано (по весам)', color: 'var(--s2)' }])}</div>
        <div class="card-b">${UI.chart({ type: 'bar', height: 220, labels: days.map(F.dm), tipLabels: days.map(F.date), series: [{ name: 'Экструзия', color: 'var(--s1)', values: ext }, { name: 'Упаковано', color: 'var(--s2)', values: pk }], tipFmt: (v) => F.kg(v) })}</div></div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>${{ machine: 'Станок', operator: 'Оператор', shift: 'Смена', order: 'Заказ' }[by]}</th>${TYPE_ORDER.map((s) => html`<th class="r">${AP.STAGES[s].short}, кг</th>`)}</tr></thead>
        <tbody>${rows.map((r) => html`<tr><td class="fw-7">${r.name}</td>${TYPE_ORDER.map((s) => html`<td class="r ${r[s] ? '' : 'muted'}">${r[s] ? F.num(r[s]) : '—'}</td>`)}</tr>`)}</tbody>
        <tfoot><tr><td>Итого за период</td>${TYPE_ORDER.map((s) => html`<td class="r">${F.num(tot(s))}</td>`)}</tr></tfoot></table></div></div>`;
  }

  function defectsTab(q) {
    const per = q.p || 'month';
    const R = AP.periodRange(per);
    const list = AP.db.defects.filter((x) => AP.inScope(x.workshop) && x.date >= R.from).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    const ws = AP.scope() === 'all' ? ['w1', 'w2'] : [AP.scope()];
    const ext = (w) => AP.sum(AP.db.outputs.filter((x) => x.workshop === w && x.stage === 'extrusion' && x.date >= R.from), 'kg');
    const byReason = AP.groupBy(list.filter((x) => x.kind !== 'waste'), 'reason');
    return html`
      <div class="row mb-16">${UI.periodSeg(per)}${AP.can('production', 2) ? html`<button class="btn btn-primary right" data-x="adddef">${I('plus')}Зафиксировать брак</button>` : ''}</div>
      <div class="grid g-21 mb-16">
        <div class="grid ${ws.length > 1 ? 'g-2' : ''}">${ws.map((w) => { const e = ext(w), dk = AP.sum(list.filter((x) => x.workshop === w && x.kind !== 'waste'), 'kg'), wk = AP.sum(list.filter((x) => x.workshop === w && x.kind === 'waste'), 'kg'), pct = e ? (dk / e) * 100 : 0; const norm = w === 'w1' ? 2 : 2.6; return html`<div class="card kpi"><div class="k-label">${I('alert')}${AP.wsName(w)}: брак</div><div class="k-value">${F.num(pct, 1)}<small>%</small></div><div class="k-foot"><span class="badge sm ${pct > norm ? 'b-warn' : 'b-ok'}">норма ≈ ${F.pct(norm)}</span>${F.kg(dk)} брака · ${F.kg(wk)} техотходов</div></div>`; })}</div>
        <div class="card"><div class="card-h"><h3>Причины брака</h3></div><div class="card-b">${UI.hbars(Object.keys(byReason).map((k) => ({ label: k, value: AP.sum(byReason[k], 'kg') })).sort((a, b) => b.value - a.value).slice(0, 6), { fmt: (v) => F.kg(v), color: 'var(--s4)' })}</div></div>
      </div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Цех / станок</th><th>Заказ</th><th>Этап</th><th>Причина</th><th class="r">Вес</th><th>Куда</th></tr></thead><tbody>
        ${list.slice(0, 120).map((x) => html`<tr><td class="nowrap">${F.dt(x.at)}</td><td>${UI.wsChip(x.workshop)}<span class="cell-sub">${AP.machine(x.machineId).name}</span></td><td><a href="#" data-act="open-order" data-id="${x.orderId}">${AP.order(x.orderId).no}</a></td><td>${AP.STAGES[x.stage].short}</td><td><span class="badge sm ${x.kind === 'waste' ? '' : 'b-orange'}">${x.kind === 'waste' ? 'техотходы' : 'брак'}</span> <span class="fs-13">${x.reason}</span></td><td class="r fw-8">${F.kg(x.kg)}</td><td>${x.recycle ? html`<span class="badge b-teal sm">${I('recycle', 'icon-16')}на переработку</span>` : html`<span class="badge sm">утилизация</span>`}${x.pendingSync ? html` <span class="badge b-warn sm">в очереди</span>` : ''}</td></tr>`)}
      </tbody></table></div></div>`;
  }

  function downTab(q) {
    const ms = scopedMachines();
    const cur = AP.db.downtimes.filter((x) => !x.end && AP.inScope(x.workshop));
    const from = D.iso(D.addDays(D.todayISO(), -30));
    const hist = AP.db.downtimes.filter((x) => x.end && AP.inScope(x.workshop) && D.dayOf(x.start) >= from).slice().reverse();
    const mins = (x) => ((x.end ? D.parse(x.end) : Date.now()) - D.parse(x.start)) / 60000;
    const byM = AP.groupBy(hist.concat(cur), 'machineId');
    const byR = AP.groupBy(hist.concat(cur), 'reason');
    return html`
      <div class="row mb-16"><span class="muted fw-7">Сейчас стоят: ${cur.length}</span>${AP.can('production', 2) ? html`<button class="btn btn-danger right" data-x="adddown">${I('pause')}Зафиксировать простой</button>` : ''}</div>
      ${cur.length ? html`<div class="grid g-2 mb-16">${cur.map((x) => html`<div class="card"><div class="card-b row nowrap"><span class="avatar lg pulse" style="background:var(--bad);color:#fff">${I('pause')}</span><div class="grow"><b>${AP.machine(x.machineId).name}</b><div class="fs-13 text-2">${x.reason}</div><div class="fs-12 muted">с ${F.time(x.start)} · ${F.mins(mins(x))}</div></div>${AP.can('production', 2) ? html`<button class="btn btn-success" data-endd="${x.id}">${I('play')}Запустить</button>` : ''}</div></div>`)}</div>` : ''}
      <div class="grid g-2 mb-16">
        <div class="card"><div class="card-h"><h3>Простои за 30 дней по станкам</h3></div><div class="card-b">${UI.hbars(Object.keys(byM).map((k) => ({ label: AP.machine(k).name, value: AP.sum(byM[k], mins), extra: byM[k].length + ' раз' })).sort((a, b) => b.value - a.value), { fmt: (v) => F.mins(v), color: 'var(--s3)' })}</div></div>
        <div class="card"><div class="card-h"><h3>Причины остановок</h3></div><div class="card-b">${UI.hbars(Object.keys(byR).map((k) => ({ label: k, value: AP.sum(byR[k], mins) })).sort((a, b) => b.value - a.value), { fmt: (v) => F.mins(v), color: 'var(--s3)' })}</div></div>
      </div>
      <div class="card"><div class="table-wrap"><table class="table compact"><thead><tr><th>Станок</th><th>Начало</th><th class="r">Длительность</th><th>Причина</th><th>Кто отметил</th></tr></thead><tbody>${hist.slice(0, 60).map((x) => html`<tr><td class="fw-7">${AP.machine(x.machineId).name}</td><td>${F.dt(x.start)}</td><td class="r">${F.mins(mins(x))}</td><td>${x.reason}</td><td class="muted">${(AP.userById(x.by) || {}).name || '—'}</td></tr>`)}</tbody></table></div></div>`;
    void ms;
  }

  function wipTab() {
    const list = AP.db.orders.filter((o) => AP.orderVisible(o) && AP.orderStatus(o) === 'production');
    if (!list.length) return UI.empty('Незавершённого производства нет', 'Сейчас ни один заказ не находится между этапами');
    return html`<div class="card"><div class="card-h"><h3>Незавершённое производство</h3><span class="sub">плёнка и полуфабрикат между этапами: напечатанные и недопечатанные рулоны</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Этап сейчас</th>${TYPE_ORDER.map((s) => html`<th class="r">${AP.STAGES[s].short}, кг</th>`)}<th class="r">НЗП, кг</th><th class="r">≈ рулонов</th></tr></thead><tbody>
      ${list.map((o) => { const pk = AP.producedKg(o), ex = o.progress.extrusion || 0, nzp = Math.max(0, ex - pk); return html`<tr class="click" data-act="open-order" data-id="${o.id}"><td><b>${o.no}</b><span class="cell-sub">${AP.product(o.productId).name}</span></td><td>${AP.statusBadge('production', AP.STAGES[AP.currentStage(o)].short)}</td>${TYPE_ORDER.map((s) => { const v = s === 'pack' ? pk : o.progress[s]; return html`<td class="r ${v ? '' : 'muted'}">${AP.stagesOf(o).includes(s) ? (v ? F.num(v) : '0') : '—'}</td>`; })}<td class="r fw-8">${F.num(nzp)}</td><td class="r">${F.num(nzp / 45)}</td></tr>`; })}
      </tbody></table></div></div>`;
  }

  AP.page('production', {
    title: 'Производство',
    render(r) {
      const tab = r.q.tab || 'queue';
      const nQ = AP.db.orders.filter((o) => AP.orderVisible(o) && ['queue', 'production'].includes(AP.orderStatus(o))).length;
      const nD = AP.db.downtimes.filter((x) => !x.end && AP.inScope(x.workshop)).length;
      const body = { queue: queueTab, output: outputTab, defects: defectsTab, down: downTab, wip: wipTab }[tab] || queueTab;
      return html`${UI.pageHead('Производство', AP.scope() === 'all' ? 'Задания и загрузка станков в обоих цехах' : 'Задания и загрузка станков: ' + AP.wsName(AP.scope()))}
        ${UI.tabs([['queue', 'Очередь заданий', nQ], ['output', 'Выработка'], ['defects', 'Брак и отходы'], ['down', 'Простои', nD || null], ['wip', 'Незавершённое']], tab)}
        ${body(r.q)}`;
    },
    mount(el, r) {
      UI.bindTabs(el); UI.bindPeriod(el);
      UI.$$('[data-by]', el).forEach((b) => (b.onclick = () => AP.setQuery({ by: b.dataset.by })));
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-t]');
        if (!t) return;
        e.stopPropagation(); e.preventDefault();
        const o = AP.order(t.dataset.id);
        if (t.dataset.t === 'start') { if (A.startOrder(o)) AP.render(); }
        else if (t.dataset.t === 'out') AP.outputDialog(o);
        else if (t.dataset.t === 'queue') AP.openOrder(o.id);
      }, true);
      const ex = UI.$('[data-x=exp]', el);
      if (ex) ex.onclick = () => { const R = AP.periodRange(r.q.p || 'week'); AP.exportCSV('vyrabotka-' + R.from + '-' + R.to, [['Дата', 'Смена', 'Цех', 'Станок', 'Оператор', 'Заказ', 'Этап', 'кг']].concat(outputRecords(R.from, R.to).map((x) => [F.date(x.date), x.shift, AP.wsName(x.workshop), AP.machine(x.machineId).name, empName(x.operatorId), AP.order(x.orderId).no, AP.STAGES[x.stage].t, Math.round(x.kg * 10) / 10]))); };
      const ad = UI.$('[data-x=adddef]', el); if (ad) ad.onclick = () => defectDialog();
      const dd = UI.$('[data-x=adddown]', el); if (dd) dd.onclick = () => downDialog();
      UI.$$('[data-endd]', el).forEach((b) => (b.onclick = () => { const x = AP.db.downtimes.find((z) => z.id === b.dataset.endd); x.end = new Date().toISOString(); AP.audit('Станок запущен после простоя', 'machine', x.machineId, AP.machine(x.machineId).name + ' · ' + x.reason + ' · ' + F.mins((Date.now() - D.parse(x.start)) / 60000)); AP.save(); UI.toast('Станок снова в работе', AP.machine(x.machineId).name); AP.render(); }));
      if (r.q.add) { history.replaceState(null, '', '#/production?tab=' + (r.q.tab || 'queue')); if (r.q.tab === 'defects') defectDialog(); if (r.q.tab === 'down') downDialog(); }
    },
  });

  const DEF_REASONS = ['Разнотолщинность плёнки', 'Прожиг / гели в плёнке', 'Обрыв рукава при запуске', 'Смещение печати (приводка)', 'Непропечатка', 'Слабая запайка шва', 'Кривой рез', 'Брак вырубки ручки', 'Технологические отходы (обрезь, запуск)'];
  function defectDialog(pre = {}) {
    const orders = AP.db.orders.filter((o) => AP.orderVisible(o) && ['production', 'ready', 'queue'].includes(AP.orderStatus(o)));
    if (!orders.length) return UI.toast('Нет заказов в работе', 'Брак привязывается к заказу в производстве', 'warn');
    const m = UI.modal({
      title: 'Зафиксировать брак или отходы', sub: 'Вес лучше взять с весов цеха — тогда он не вводится руками',
      body: html`<form class="form-grid">
        <div class="field full"><label>Заказ</label><select class="select" name="orderId">${UI.options(orders.map((o) => [o.id, o.no + ' · ' + AP.product(o.productId).name]), pre.orderId)}</select></div>
        <div class="field"><label>Этап</label><select class="select" name="stage">${UI.options([['extrusion', 'Выпуск плёнки'], ['print', 'Печать'], ['cut', 'Резка и запайка']], 'extrusion')}</select></div>
        <div class="field"><label>Вес, кг</label><input class="input" name="kg" type="number" step="0.1" min="0.1" value="${pre.kg || ''}"></div>
        <div class="field full"><label>Причина</label><select class="select" name="reason">${UI.options(DEF_REASONS.map((x) => [x, x]))}</select></div>
        <div class="field full"><label class="switch"><input type="checkbox" name="recycle" checked>Вернуть на переработку (дробление в гранулу)</label></div>
      </form>`,
      foot: html`<a class="btn btn-ghost" href="#/scales?op=defect">${I('scale')}Взвесить на весах</a><button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Записать</button>`,
    });
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(m.querySelector('form'));
      const kg = parseFloat(d.kg);
      if (!(kg > 0)) return UI.toast('Укажите вес', '', 'warn');
      saveDefect(AP.order(d.orderId), d.stage, kg, d.reason, d.recycle, false);
      UI.closeTop(); AP.render();
    };
  }
  function saveDefect(o, stage, kg, reason, recycle, fromScale) {
    const sh = nowShift();
    const mid = o.route[stage] || o.route.extrusion;
    const x = { id: 'df' + AP.seq('df'), date: D.todayISO(), at: new Date().toISOString(), workshop: o.workshop, machineId: mid, operatorId: AP.db.employees.find((e) => e.machine === mid && e.shift === sh)?.id, orderId: o.id, stage, kg: Math.round(kg * 10) / 10, reason, recycle: !!recycle, kind: /отход/i.test(reason) ? 'waste' : 'defect', fromScale: !!fromScale, by: AP.user.id };
    if (AP.offline()) x.pendingSync = true;
    AP.db.defects.push(x);
    AP.audit(x.kind === 'waste' ? 'Учтены технологические отходы' : 'Зафиксирован брак', 'order', o.id, o.no + ' · ' + F.kg(x.kg) + ' · ' + reason + (fromScale ? ' · вес с весов' : ' · вес введён вручную'));
    AP.save(); UI.toast(x.kind === 'waste' ? 'Отходы учтены' : 'Брак зафиксирован', o.no + ' · ' + F.kg(x.kg));
  }
  const DOWN_REASONS = ['Замена ножа / наладка', 'Нет сырья на участке', 'Перезаправка рукава', 'Плановое обслуживание', 'Отключение электроэнергии', 'Смена печатных форм', 'Поломка намотчика', 'Нет оператора'];
  function downDialog() {
    const ms = scopedMachines().filter((x) => x.type !== 'pack' && AP.machineState(x.id).s !== 'down');
    const m = UI.modal({
      title: 'Простой станка', sub: 'Время пойдёт с текущего момента; директор получит уведомление, если станок стоит долго',
      body: html`<form class="form-grid"><div class="field full"><label>Станок</label><select class="select" name="m">${UI.options(ms.map((x) => [x.id, x.name + ' · ' + AP.wsName(x.workshop)]))}</select></div><div class="field full"><label>Причина</label><select class="select" name="reason">${UI.options(DOWN_REASONS.map((x) => [x, x]))}</select></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-danger" data-ok>${I('pause')}Остановить</button>`,
    });
    m.querySelector('[data-ok]').onclick = () => {
      const d = UI.formData(m.querySelector('form'));
      const mm = AP.machine(d.m);
      AP.db.downtimes.push({ id: 'dt' + AP.seq('dt'), machineId: mm.id, workshop: mm.workshop, start: new Date().toISOString(), end: null, reason: d.reason, by: AP.user.id });
      AP.audit('Простой станка', 'machine', mm.id, mm.name + ' · ' + d.reason);
      AP.save(); UI.closeTop(); UI.toast('Простой зафиксирован', mm.name, 'warn'); AP.render();
    };
  }

  /* ================= ВЕСЫ ================= */
  /*
   * Стабилизация веса (ТЗ 5.4): программа не принимает вес, пока он «скачет».
   * samples — последние показания в кг (шаг ≈100 мс), d — дискретность весов, кг.
   * Окно и допуск — компромисс: длиннее окно → надёжнее, но оператор дольше ждёт.
   */
  AP.scaleStable = function (samples, d) {
    const N = 8; // ≈0,8 секунды показаний
    if (samples.length < N) return false;
    const w = samples.slice(-N);
    const spread = Math.max(...w) - Math.min(...w);
    return spread <= Math.max(d, Math.abs(w[N - 1]) * 0.001);
  };

  const S = { scaleId: null, op: 'goods', orderId: null, unit: null, value: 0, target: 0, samples: [], t0: 0, loaded: false, timer: null, last: null, printNow: false, manual: null };
  const scalesInScope = () => AP.db.scales.filter((s) => (s.workshop === 'sklad' ? AP.can('stock', 2) || AP.isDirector() : AP.inScope(s.workshop)));
  const quant = (v, d) => Math.round(v / d) * d;
  function goodsOrders(scale) {
    return AP.db.orders.filter((o) => AP.orderVisible(o) && o.workshop === scale.workshop && AP.orderStatus(o) === 'production');
  }
  function expectedGoods(o) {
    const p = AP.product(o.productId);
    const left = Math.max(0, AP.kgOf(p, o.qty) - AP.producedKg(o));
    const net = Math.min(AP.unitKg(p), Math.max(left, AP.unitKg(p) * 0.3));
    return { net, tare: AP.TARE[p.unit.type], type: p.unit.type, p };
  }

  function scaleTick() {
    const sc = AP.db.scales.find((x) => x.id === S.scaleId);
    const el = UI.$('#scaleVal');
    if (!el || !sc) { clearInterval(S.timer); S.timer = null; return; }
    const t = (Date.now() - S.t0) / 1000;
    let v = 0;
    if (S.loaded) {
      const amp = Math.max(0.06, S.target * 0.08);
      // груз раскачивается и успокаивается; после ~1,5 с — редкое дрожание на одно деление, как у реальных весов
      const jitter = t < 1.5 ? (Math.random() - 0.5) * sc.d * 4 : Math.random() < 0.06 ? (Math.random() < 0.5 ? -1 : 1) * sc.d * 0.6 : 0;
      v = S.target * (1 - Math.exp(-t / 0.35)) + amp * Math.exp(-t / 0.45) * Math.sin(t * 9) + jitter;
    } else v = (Math.random() - 0.5) * sc.d * 0.3;
    S.value = Math.max(0, quant(v, sc.d));
    S.samples.push(S.value); if (S.samples.length > 40) S.samples.shift();
    const stable = S.loaded && AP.scaleStable(S.samples, sc.d);
    const off = !sc.online;
    el.textContent = F.num(S.value, sc.d < 0.1 ? 2 : 1);
    const stEl = UI.$('#scaleState');
    const state = off ? 'offline' : !S.loaded || S.value < sc.d * 2 ? 'zero' : stable ? 'stable' : 'unstable';
    stEl.className = 'sd-state ' + state;
    stEl.innerHTML = String({ offline: html`${I('wifiOff', 'icon-16')}НЕТ СВЯЗИ С ВЕСАМИ`, zero: html`${I('minus', 'icon-16')}НОЛЬ`, stable: html`${I('check', 'icon-16')}СТАБИЛЬНО`, unstable: html`${I('refresh', 'icon-16')}ВЕС НЕ УСТОЯЛСЯ` }[state]);
    const bars = UI.$('#scaleBars');
    if (bars) { const last = S.samples.slice(-24); const mx = Math.max(...last, 0.01); bars.innerHTML = last.map((x) => `<i style="height:${Math.max(4, (x / mx) * 100)}%"></i>`).join(''); }
    const ok = UI.$('#scaleAccept');
    if (ok) ok.disabled = !(stable && formValid());
    S.stable = stable;
  }
  function formValid() {
    if (S.op === 'goods') return !!S.orderId;
    if (S.op === 'raw') return true;
    return !!S.orderId;
  }

  function weighList(scale) {
    const today = D.todayISO();
    const us = AP.db.units.filter((u) => u.type !== 'pallet' && u.scaleId === scale.id && D.dayOf(u.at) === today).map((u) => ({ at: u.at, kind: AP.UNIT_TYPES[u.type], orderId: u.orderId, net: u.net, gross: u.gross, pcs: u.pcs, who: empName(u.packerId || u.operatorId), id: u.id, manual: u.manual, pending: u.pendingSync, product: u.productId }));
    const ds = AP.db.defects.filter((x) => x.workshop === scale.workshop && x.date === today && x.fromScale).map((x) => ({ at: x.at, kind: x.kind === 'waste' ? 'Отходы' : 'Брак', orderId: x.orderId, net: x.kg, gross: x.kg, who: empName(x.operatorId), pending: x.pendingSync }));
    const bs = AP.db.batches.filter((b) => b.scaleId === scale.id && b.date === today && b.weighedAt).map((b) => ({ at: b.weighedAt, kind: 'Приход сырья', net: b.qty, gross: b.qty, who: AP.material(b.materialId).name }));
    return us.concat(ds, bs).sort((a, b) => (a.at < b.at ? 1 : -1));
  }

  AP.page('scales', {
    title: 'Весы',
    render(r) {
      const list = scalesInScope();
      if (!list.length) return UI.empty('Нет весов в вашем цехе', '');
      if (!S.scaleId || !list.find((x) => x.id === S.scaleId)) S.scaleId = list[0].id;
      if (r.q.order) { const o = AP.order(r.q.order); if (o) { S.scaleId = list.find((x) => x.workshop === o.workshop)?.id || S.scaleId; S.orderId = o.id; S.op = 'goods'; } }
      if (r.q.op) S.op = r.q.op;
      const sc = list.find((x) => x.id === S.scaleId);
      sc.online = true; // весы на месте работают и без интернета — пропадает только связь с сервером
      if (sc.workshop === 'sklad') S.op = 'raw';
      else if (S.op === 'raw') S.op = 'goods';
      const orders = S.op === 'goods' ? goodsOrders(sc) : AP.db.orders.filter((o) => AP.orderVisible(o) && o.workshop === sc.workshop && ['production', 'ready'].includes(AP.orderStatus(o)));
      if (!orders.find((o) => o.id === S.orderId)) S.orderId = orders[0] ? orders[0].id : null;
      const o = S.orderId ? AP.order(S.orderId) : null;
      const ex = o && S.op === 'goods' ? expectedGoods(o) : null;
      const sh = nowShift();
      const ops = AP.db.employees.filter((e) => e.active !== false && e.workshop === sc.workshop && (e.machine && AP.machine(e.machine).type === 'pack' || /Упаков|Мастер|Кладов/.test(e.position)));
      const wl = weighList(sc);
      const mats = AP.db.materials.filter((m) => m.unit === 'кг');
      return html`
        ${UI.pageHead('Весы', 'Вес попадает в программу сам, как только стабилизировался. Ручной ввод — только с правом и комментарием.', html`
          ${list.length > 1 ? html`<div class="seg">${list.map((x) => html`<button class="${x.id === sc.id ? 'on' : ''}" data-scale="${x.id}">${x.name.replace(' · платформенные', '').replace(' · паллетные', '')}</button>`)}</div>` : ''}
          <label class="switch" data-tip="Демо: что будет, если пропадёт интернет"><input type="checkbox" data-x="offline" ${AP.offline() ? raw('checked') : ''}>Нет связи с сервером</label>`)}
        ${AP.offline() ? html`<div class="alert alert-warn mb-16">${I('wifiOff')}<div class="grow"><b>Работаем без связи</b><small>Весы и этикетки продолжают работать. Взвешивания сохраняются на месте (${AP.pendingSync()} в очереди) и догрузятся в общую базу, когда связь вернётся.</small></div></div>` : ''}
        <div class="grid g-21">
          <div class="stack">
            <div class="scale-display">
              <div class="sd-top"><span class="chip" style="background:rgba(255,255,255,.08);color:#fff">${I('scale')}${sc.name}</span>${AP.offline() ? html`<span class="chip" style="background:rgba(251,191,36,.14);color:#FBBF24">${I('wifiOff')}сервер недоступен — сохраняем на месте</span>` : ''}<span>${sc.link}</span><span>Макс ${F.num(sc.max)} кг · d = ${F.num(sc.d, 2)} кг</span><span class="right">${SHIFT[sh]}</span></div>
              <div class="sd-val"><span id="scaleVal">0,00</span><small>кг</small></div>
              <span class="sd-state zero" id="scaleState">НОЛЬ</span>
              <div class="sd-bars" id="scaleBars"></div>
            </div>
            <div class="row">
              <button class="btn btn-secondary btn-lg" data-x="load">${I('box')}Положить груз <span class="muted fs-12">(демо)</span></button>
              <button class="btn btn-ghost btn-lg" data-x="unload">${I('minus')}Снять</button>
              ${AP.flag('manualWeight') ? html`<button class="btn btn-ghost btn-lg" data-x="manual">${I('edit')}Ручной ввод</button>` : ''}
              <button class="btn btn-primary btn-xl right" id="scaleAccept" data-x="accept" disabled>${I('check')}Принять вес</button>
            </div>
            <div class="card"><div class="card-h"><h3>Взвешивания за сегодня</h3><span class="sub">${wl.length}</span></div>
              <div class="table-wrap"><table class="table compact"><thead><tr><th>Время</th><th>Что</th><th>Заказ</th><th class="r">Нетто</th><th class="r">Брутто</th><th>Кто</th><th>QR</th></tr></thead><tbody>
              ${wl.length ? wl.slice(0, 30).map((x) => html`<tr><td>${F.time(x.at)}</td><td>${x.kind}${x.manual ? html` <span class="badge b-warn sm">ручной</span>` : ''}${x.pending ? html` <span class="badge b-warn sm">в очереди</span>` : ''}</td><td>${x.orderId ? AP.order(x.orderId).no : '—'}</td><td class="r fw-8">${F.num(x.net, 2)}</td><td class="r muted">${F.num(x.gross, 2)}</td><td class="fs-12">${x.who}</td><td>${x.id ? html`<a href="#/qr/${x.id}" class="mono fs-12">${x.id}</a>` : ''}</td></tr>`) : html`<tr><td colspan="7" class="muted">Сегодня на этих весах ещё не взвешивали</td></tr>`}
              </tbody></table></div></div>
          </div>
          <div class="stack">
            <div class="card"><div class="card-h"><h3>Что взвешиваем</h3></div><div class="card-b stack" style="gap:14px">
              ${sc.workshop !== 'sklad' ? html`<div class="seg" style="display:flex">${[['goods', 'Готовая продукция'], ['defect', 'Брак'], ['waste', 'Отходы']].map(([k, t]) => html`<button style="flex:1" class="${S.op === k ? 'on' : ''}" data-op="${k}">${t}</button>`)}</div>` : html`<div class="badge b-warn">Приход сырья на склад</div>`}
              ${S.op !== 'raw' ? html`<div class="field"><label>${S.op === 'goods' ? 'Задание (заказ в производстве)' : 'Заказ'}</label>${orders.length ? html`<select class="select input-lg" data-f="order">${UI.options(orders.map((x) => [x.id, x.no + ' · ' + AP.product(x.productId).name]), S.orderId)}</select>` : html`<div class="alert alert-info">${I('info')}<div class="grow"><b>Нет заказов в производстве</b><small>Запустите задание в разделе «Производство»</small></div></div>`}</div>` : ''}
              ${ex ? html`<div class="card tint"><div class="card-b"><dl class="dl"><dt>Упаковка</dt><dd>${AP.UNIT_TYPES[ex.type]}${ex.p.unit.pcs ? ' · ' + F.num(ex.p.unit.pcs) + ' шт' : ''}</dd><dt>Ожидаемо нетто</dt><dd>${F.kg(ex.net)} ± ${AP.db.settings.weightTolerance}%</dd><dt>Тара</dt><dd>${F.kg(ex.tare)}</dd><dt>Готово</dt><dd>${F.pct(AP.orderProgress(o) * 100, 0)} · ${AP.unitsOf(o.id).length} ед.</dd></dl></div></div>` : ''}
              ${S.op === 'defect' || S.op === 'waste' ? html`<div class="field"><label>Этап и причина</label><select class="select" data-f="stage">${UI.options([['extrusion', 'Выпуск плёнки'], ['print', 'Печать'], ['cut', 'Резка и запайка']])}</select><select class="select mt-8" data-f="reason">${UI.options((S.op === 'waste' ? ['Технологические отходы (обрезь, запуск)'] : DEF_REASONS.slice(0, 8)).map((x) => [x, x]))}</select></div>` : ''}
              ${S.op === 'raw' ? html`<div class="field"><label>Сырьё</label><select class="select" data-f="mat">${UI.options(mats.map((m) => [m.id, m.name]))}</select></div><div class="field"><label>Поставщик и документ</label><select class="select" data-f="sup">${UI.options(AP.db.suppliers.map((s) => [s.id, s.name]))}</select><input class="input mt-8" data-f="doc" placeholder="№ счёт-фактуры / накладной"></div>${AP.seeMoney() ? html`<div class="field"><label>Цена за кг, сум</label><input class="input" data-f="price" type="number" value="14500"></div>` : ''}` : ''}
              ${S.op !== 'raw' ? html`<div class="field"><label>Оператор</label><select class="select" data-f="opr">${UI.options(ops.map((e) => [e.id, e.name + ' · ' + e.position.toLowerCase()]), (ops.find((e) => e.shift === sh) || ops[0] || {}).id)}</select></div>` : ''}
              <div class="field"><label>Скан QR единицы <span class="muted">(если на ней уже есть этикетка)</span></label><div class="input-icon">${I('scan')}<input class="input" data-f="rescan" placeholder="AP-000123"></div><span class="hint" data-rescanhint>Одну и ту же единицу нельзя взвесить дважды</span></div>
              ${S.op === 'goods' ? html`<label class="switch"><input type="checkbox" data-f="print" ${S.printNow ? raw('checked') : ''}>Сразу печатать этикетку</label>` : ''}
            </div></div>
            <div id="lastLabel">${S.last ? lastLabel(S.last) : html`<div class="card"><div class="card-b">${UI.empty('Здесь появится этикетка', 'QR-код создаётся сразу после взвешивания упаковочной единицы', 'qr')}</div></div>`}</div>
          </div>
        </div>`;
    },
    mount(el) {
      clearInterval(S.timer);
      S.samples = []; S.loaded = false;
      S.timer = setInterval(scaleTick, 100);
      const sc = AP.db.scales.find((x) => x.id === S.scaleId);
      UI.$$('[data-scale]', el).forEach((b) => (b.onclick = () => { S.scaleId = b.dataset.scale; S.last = null; AP.render(); }));
      UI.$$('[data-op]', el).forEach((b) => (b.onclick = () => { S.op = b.dataset.op; AP.render(); }));
      const fo = UI.$('[data-f=order]', el); if (fo) fo.onchange = () => { S.orderId = fo.value; AP.render(); };
      const pr = UI.$('[data-f=print]', el); if (pr) pr.onchange = () => (S.printNow = pr.checked);
      UI.$('[data-x=offline]', el).onchange = (e) => { AP.setOffline(e.target.checked); AP.render(); };
      UI.$('[data-x=load]', el).onclick = () => {
        let target;
        if (S.op === 'goods' && S.orderId) { const ex = expectedGoods(AP.order(S.orderId)); target = ex.net * (0.985 + Math.random() * 0.035) + ex.tare; }
        else if (S.op === 'raw') target = 25 * (20 + Math.floor(Math.random() * 30)) * (0.998 + Math.random() * 0.005);
        else target = 3 + Math.random() * 18;
        S.target = Math.min(sc.max, target); S.loaded = true; S.t0 = Date.now(); S.samples = [];
      };
      UI.$('[data-x=unload]', el).onclick = () => { S.loaded = false; S.t0 = Date.now(); S.samples = []; };
      const rs = UI.$('[data-f=rescan]', el);
      rs.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        const code = UI.parseCode(rs.value), hint = UI.$('[data-rescanhint]', el);
        const u = code && AP.unit(code);
        if (u) { rs.closest('.field').classList.add('is-invalid'); hint.textContent = 'Единица ' + code + ' уже взвешена ' + F.dt(u.at) + ' (' + F.kg(u.net) + '). Повторное взвешивание запрещено — используйте перепечатку этикетки.'; AP.audit('Попытка повторного взвешивания', 'unit', code, 'Отклонено программой'); AP.save(); }
        else { rs.closest('.field').classList.remove('is-invalid'); hint.textContent = code ? 'Код ' + code + ' не найден — новая единица получит свой номер после взвешивания' : 'Не похоже на код ALI PLAST'; }
      };
      UI.$('[data-x=accept]', el).onclick = () => accept(el, null);
      const mb = UI.$('[data-x=manual]', el);
      if (mb) mb.onclick = async () => {
        const r = await UI.prompt('Ручной ввод веса', 'Используйте, только если весы не работают. Запись попадёт в журнал действий с вашим именем.', { extra: html`<div class="field"><label>Вес брутто, кг <span class="req">*</span></label><input class="input input-lg" name="w" type="number" step="0.01" min="0.01"></div>`, ok: 'Принять вручную' });
        if (!r) return;
        const w = parseFloat(r.w);
        if (!(w > 0)) return UI.toast('Вес не указан', '', 'bad');
        accept(el, { w, comment: r.comment });
      };
      const ll = UI.$('[data-x=printlast]', el); if (ll) ll.onclick = () => printUnit(S.last);
      AP._leave = () => { clearInterval(S.timer); S.timer = null; };
    },
  });
  addEventListener('hashchange', () => { if (AP.route().key !== 'scales') { clearInterval(S.timer); S.timer = null; } });

  function lastLabel(id) {
    const u = AP.unit(id);
    if (!u) return '';
    return html`<div class="card iris"><div class="card-h"><h3>Этикетка готова</h3><span class="badge b-ok">${u.id}</span></div><div class="card-b">${UI.labelHTML(u)}<div class="row mt-12"><button class="btn btn-primary" data-x="printlast">${I('print')}Печать этикетки</button><a class="btn btn-ghost" href="#/qr/${u.id}">История единицы</a></div></div></div>`;
  }
  function printUnit(id) { const u = AP.unit(id); if (!u) return; UI.printLabels([u]); }

  async function accept(el, manual) {
    const sc = AP.db.scales.find((x) => x.id === S.scaleId);
    const gross = manual ? manual.w : S.value;
    if (!(gross > 0)) return;
    const get = (k) => { const x = UI.$('[data-f=' + k + ']', el); return x ? x.value : null; };
    if (S.op === 'raw') {
      const m = AP.material(get('mat'));
      const b = { id: 'B' + AP.seq('B'), code: m.code + '-' + D.todayISO().slice(2).replace(/-/g, ''), materialId: m.id, supplierId: get('sup'), date: D.todayISO(), qty: Math.round(gross * 10) / 10, price: +(get('price') || m.price), doc: get('doc') || 'без документа', left: { sklad: Math.round(gross * 10) / 10, w1: 0, w2: 0 }, weighed: true, weighedAt: new Date().toISOString(), scaleId: sc.id, manual: !!manual };
      AP.db.batches.push(b);
      AP.db.purchaseRequests.filter((r) => r.materialId === m.id && r.status !== 'received').forEach((r) => { r.status = 'received'; r.batchId = b.id; });
      AP.audit(manual ? 'Ручной ввод веса: приход сырья' : 'Приход сырья (вес с весов)', 'batch', b.id, m.name + ' · ' + F.kg(b.qty) + ' · партия ' + b.code + (manual ? ' · ' + manual.comment : ''));
      AP.save(); UI.toast('Приход оприходован', m.name + ' · ' + F.kg(b.qty) + ' · партия ' + b.code);
      S.loaded = false; S.samples = []; AP.render(); return;
    }
    const o = AP.order(S.orderId);
    if (!o) return;
    if (S.op === 'defect' || S.op === 'waste') {
      saveDefect(o, get('stage'), gross, get('reason'), true, true);
      S.loaded = false; S.samples = []; AP.render(); return;
    }
    const ex = expectedGoods(o);
    const p = ex.p;
    const net = Math.round((gross - ex.tare) * 100) / 100;
    if (net <= 0) return UI.toast('Вес меньше тары', 'Проверьте, что груз лежит на весах', 'bad');
    const dev = (net - ex.net) / ex.net;
    const tol = AP.db.settings.weightTolerance / 100;
    if (Math.abs(dev) > tol) {
      const ok = await UI.confirm('Вес отличается от ожидаемого', 'Нетто ' + F.kg(net) + ' при ожидаемых ' + F.kg(ex.net) + ' (' + (dev > 0 ? '+' : '') + F.num(dev * 100, 1) + '%). Количество штук по среднему весу пакета будет ≈ ' + F.num(p.base === 'кг' ? net : (net * 1000) / p.g) + '. Перепроверьте упаковку.', { ok: 'Всё верно, принять' });
      if (!ok) return;
    }
    const sh = nowShift();
    const now = new Date().toISOString();
    let pcs;
    if (p.base === 'кг') pcs = net;
    else { const est = (net * 1000) / p.g; const nominal = Math.min(p.unit.pcs, Math.max(p.pack.pcs, Math.round((o.qty - AP.producedQty(o)) / p.pack.pcs) * p.pack.pcs)); pcs = Math.abs(est / nominal - 1) <= tol ? nominal : Math.round(est / p.pack.pcs) * p.pack.pcs; }
    // предыдущие этапы догоняем автоматически: выработка и списание сырья по весу готовой продукции (ТЗ 5.2)
    const producedAfter = AP.producedKg(o) + net;
    AP.stagesOf(o).filter((s) => s !== 'pack').forEach((s) => {
      const k = s === 'extrusion' ? 1 + (p.waste + p.defect) / 100 : 1 + p.defect / 200;
      const need = producedAfter * k - (o.progress[s] || 0);
      if (need > 0.05) A.registerOutput(o, s, need, AP.db.employees.find((e) => e.machine === o.route[s] && e.shift === sh)?.id, 'по весу готовой продукции');
    });
    const pm = { box: 'box', sack: 'sack', roll: 'core' }[p.unit.type];
    const batches = p.recipe.map(([m]) => { const bs = AP.db.batches.filter((b) => b.materialId === m).sort((a, b) => (a.date < b.date ? 1 : -1)); return (bs.find((b) => (b.left[o.workshop] || 0) + (b.left.sklad || 0) > 0) || bs[0]).id; });
    const u = { id: 'AP-' + String(AP.seq('AP')).padStart(6, '0'), type: p.unit.type, orderId: o.id, productId: p.id, workshop: o.workshop, machineId: p.base === 'кг' ? o.route.extrusion : o.route.cut, operatorId: AP.db.employees.find((e) => e.machine === (p.base === 'кг' ? o.route.extrusion : o.route.cut) && e.shift === sh)?.id, packerId: get('opr'), shift: sh, at: now, net, gross: Math.round(gross * 100) / 100, pcs, batches, status: 'produced', scaleId: sc.id };
    if (manual) { u.manual = true; u.manualComment = manual.comment; }
    if (AP.offline()) u.pendingSync = true;
    AP.db.units.push(u);
    if (pm) { const used = AP.consume(pm, o.workshop, 1); AP.db.writeoffs.push({ id: 'wo' + AP.seq('wo'), at: now, orderId: o.id, workshop: o.workshop, materialId: pm, qty: 1, norm: 1, source: 'auto', stage: 'pack', unitId: u.id, batchId: used[0] && used[0].batchId, price: AP.material(pm).price }); }
    AP.audit(manual ? 'Ручной ввод веса' : 'Взвешивание: создана единица', 'unit', u.id, o.no + ' · ' + F.kg(net) + ' нетто' + (manual ? ' · ' + manual.comment : ' · вес с весов ' + sc.name));
    AP.save();
    S.last = u.id; S.loaded = false; S.samples = [];
    UI.toast('Единица ' + u.id + ' создана', AP.fmtQty(p, pcs) + ' · статус заказа: ' + AP.STATUSES[AP.orderStatus(o)].t);
    if (S.printNow) printUnit(u.id);
    AP.render();
  }

  /* ================= QR-КОДЫ ================= */
  function unitCard(u, inDrawer) {
    const o = AP.order(u.orderId), p = AP.product(u.productId), c = o ? AP.client(o.clientId) : null;
    const isPal = u.type === 'pallet';
    const kids = isPal ? AP.childrenOf(u.id) : [];
    const parent = u.parent ? AP.unit(u.parent) : null;
    const sh = u.shipmentId ? AP.db.shipments.find((s) => s.id === u.shipmentId) : null;
    const stBadge = { produced: html`<span class="badge b-teal">Произведена</span>`, stock: html`<span class="badge b-cyan">На складе</span>`, shipped: html`<span class="badge b-ok">Отгружена</span>` }[u.status];
    const canPrint = AP.can('qr', 2);
    return html`<div class="grid g-12">
      <div class="card"><div class="card-b" style="text-align:center">
        <div style="max-width:220px;margin:0 auto">${UI.qrSVG(UI.qrUrl(u.id), { size: 220 })}</div>
        <div class="mono fw-8 fs-20 mt-12">${u.id}</div>
        <div class="row mt-8" style="justify-content:center">${stBadge}<span class="badge">${AP.UNIT_TYPES[u.type]}</span>${u.manual ? html`<span class="badge b-warn">вес вручную</span>` : ''}</div>
        ${canPrint ? html`<button class="btn btn-secondary mt-16" data-u="reprint" data-id="${u.id}">${I('print')}${u.reprints ? 'Перепечатать ещё раз' : 'Перепечатать этикетку'}</button><div class="fs-12 muted mt-8">Номер не меняется${u.reprints ? ' · перепечатано ' + u.reprints + ' раз' : ''}</div>` : ''}
      </div></div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>${p.name}</h3></div><div class="card-b"><dl class="dl">
          <dt>Параметры</dt><dd>${p.material} · ${p.size} · ${o ? o.thick : p.thick} мкм · ${o ? o.color : p.color}</dd>
          <dt>Заказ</dt><dd>${o ? html`<a href="#" data-act="open-order" data-id="${o.id}">${o.no}</a>` : '—'}${c && AP.can('clients') ? html` · <a href="#" data-act="open-client" data-id="${c.id}">${c.name}</a>` : c ? ' · ' + c.name : ''}</dd>
          <dt>Выпуск</dt><dd>${AP.wsName(u.workshop)}${u.machineId ? ' · ' + AP.machine(u.machineId).name : ''} · ${SHIFT[u.shift]}</dd>
          <dt>Оператор</dt><dd>${empName(u.operatorId)}${u.packerId ? html`<span class="muted"> · упаковал ${empName(u.packerId)}</span>` : ''}</dd>
          <dt>Дата и время</dt><dd>${F.dt(u.at)}</dd>
          <dt>Вес нетто / брутто</dt><dd>${F.num(u.net, 2)} / ${F.num(u.gross, 2)} кг</dd>
          <dt>Количество</dt><dd>${p.base === 'кг' ? F.kg(u.pcs) : F.num(u.pcs) + ' шт' + (p.pack ? ' · ' + F.num(u.pcs / p.pack.pcs) + ' ' + p.pack.name : '')}${isPal ? ' · ' + kids.length + ' ед. внутри' : ''}</dd>
          ${u.batches && u.batches.length ? html`<dt>Партии сырья</dt><dd>${u.batches.map((bid) => { const b = AP.db.batches.find((x) => x.id === bid); return b ? html`<span class="chip ghost mono" style="margin:0 4px 4px 0">${b.code}</span>` : ''; })}<div class="fs-12 muted">${[...new Set(u.batches.map((bid) => { const b = AP.db.batches.find((x) => x.id === bid); return b ? AP.supplier(b.supplierId).name : ''; }))].join(', ')}</div></dd>` : ''}
          ${u.loc ? html`<dt>Место хранения</dt><dd>${u.loc}</dd>` : ''}
          ${sh ? html`<dt>Отгрузка</dt><dd>${sh.id} · ${F.dt(sh.at)} · ${sh.truck}<br><span class="muted">${AP.client(sh.clientId).name}</span></dd>` : ''}
          ${u.manualComment ? html`<dt>Ручной ввод</dt><dd class="warn-t">${u.manualComment}</dd>` : ''}
        </dl></div></div>
        <div class="card"><div class="card-h"><h3>История</h3></div><div class="card-b"><ul class="timeline">
          <li class="done"><i></i><b>Взвешена, создан QR</b><small>${F.dt(u.at)} · ${u.scaleId ? AP.db.scales.find((s) => s.id === u.scaleId).name : ''}</small></li>
          <li class="${u.stockAt ? 'done' : u.status === 'produced' ? 'now' : ''}"><i></i><b>Принята на склад ГП</b><small>${u.stockAt ? F.dt(u.stockAt) + ' · ' + (u.loc || '') : 'ожидает приёмки'}</small></li>
          <li class="${sh ? 'done' : ''}"><i></i><b>Отгружена</b><small>${sh ? F.dt(sh.at) + ' · ' + sh.truck : '—'}</small></li>
        </ul>
        ${parent ? html`<div class="alert alert-info">${I('pallet')}<div class="grow"><b>Лежит на паллете ${parent.id}</b><small><a href="#/qr/${parent.id}">Открыть паллету</a> — один скан паллеты считает всё, что в ней</small></div></div>` : ''}
        ${isPal ? html`<div class="fw-7 mb-8">Внутри паллеты:</div><div class="row" style="gap:6px">${kids.map((k) => html`<a class="chip ghost mono" href="#/qr/${k.id}">${k.id}</a>`)}</div>` : ''}
        </div></div>
      </div></div>`;
    void inDrawer;
  }
  function reprint(id) {
    const u = AP.unit(id);
    u.reprints = (u.reprints || 0) + 1;
    AP.audit('Перепечатка этикетки', 'unit', u.id, 'Тот же номер · раз: ' + u.reprints);
    AP.save(); UI.printLabels([u]);
  }
  AP.openUnit = function (id) {
    const u = AP.unit(id);
    if (!u) return UI.toast('Код не найден', id, 'bad');
    if (!AP.inUserScope(u.workshop)) return UI.toast('Единица другого цеха', 'Начальник цеха видит только свой цех', 'warn');
    const dr = UI.drawer({ title: u.id, sub: AP.product(u.productId).name, body: unitCard(u, true), foot: AP.can('qr') ? html`<a class="btn btn-ghost" href="#/qr/${u.id}">Открыть в разделе QR</a>` : '' });
    AP.trackDrawer(AP.openUnit, [id], dr);
    const b = dr.querySelector('[data-u=reprint]'); if (b) b.onclick = () => reprint(id);
  };

  AP.page('qr', {
    title: 'QR-коды',
    render(r) {
      const code = r.id ? UI.parseCode(r.id) : null;
      const u = code ? AP.unit(code) : null;
      let state = '';
      if (r.id && !u) state = html`<div class="alert alert-bad mb-16">${I('alert')}<div class="grow"><b>Код ${r.id} не найден</b><small>Проверьте этикетку или введите номер вручную</small></div></div>`;
      else if (u && !AP.inUserScope(u.workshop)) state = html`<div class="alert alert-warn mb-16">${I('lock')}<div class="grow"><b>Единица ${u.id} относится к другому цеху</b><small>Начальник цеха видит данные только своего цеха</small></div></div>`;
      let list = AP.db.units.filter((x) => AP.inScope(x.workshop));
      if (r.q.order) list = list.filter((x) => x.orderId === r.q.order);
      if (r.q.s) list = list.filter((x) => x.status === r.q.s);
      list = list.slice().sort((a, b) => (a.at < b.at ? 1 : -1));
      const ord = r.q.order ? AP.order(r.q.order) : null;
      return html`
        ${UI.pageHead('QR-коды', 'Каждая коробка, мешок, рулон и паллета получает свой номер. Скан ручным сканером или камерой телефона показывает всю историю.')}
        <div class="scan-box mb-16 ${u && AP.inUserScope(u.workshop) ? 'ok' : r.id ? 'bad' : ''}"><span class="scan-ic">${I('scan')}</span>
          <div class="grow"><b>Отсканируйте QR или введите номер</b><input class="input input-lg mt-8" id="qrIn" placeholder="AP-000123 или PL-0001" autofocus autocomplete="off"></div>
          <button class="btn btn-secondary btn-lg" data-x="cam">${I('camera')}Камера</button></div>
        ${state}
        ${u && AP.inUserScope(u.workshop) ? unitCard(u) : ''}
        <div class="card mt-16"><div class="card-h"><h3>${ord ? 'Единицы заказа ' + ord.no : 'Последние единицы'}</h3>
          <div class="seg">${[['', 'Все'], ['produced', 'Произведены'], ['stock', 'На складе'], ['shipped', 'Отгружены']].map(([k, t]) => html`<button class="${(r.q.s || '') === k ? 'on' : ''}" data-s="${k}">${t}</button>`)}</div>
          ${ord ? html`<a class="btn btn-ghost btn-sm" href="#/qr">Сбросить</a>` : ''}
          ${AP.can('qr', 2) && list.length ? html`<button class="btn btn-ghost btn-sm" data-x="printall">${I('print')}Печать ${Math.min(list.length, 30)} этикеток</button>` : ''}</div>
          <div class="table-wrap mt-8"><table class="table compact"><thead><tr><th>Код</th><th>Тип</th><th>Заказ / продукция</th><th class="r">Нетто</th><th class="r">Кол-во</th><th>Статус</th><th>Выпуск</th></tr></thead><tbody>
          ${list.slice(0, 80).map((x) => { const p = AP.product(x.productId); return html`<tr class="click" data-href="#/qr/${x.id}"><td class="mono fw-8">${x.id}</td><td>${AP.UNIT_TYPES[x.type]}</td><td><b>${AP.order(x.orderId).no}</b><span class="cell-sub">${p.name}</span></td><td class="r">${F.num(x.net, 1)}</td><td class="r">${p.base === 'кг' ? '—' : F.num(x.pcs)}</td><td>${{ produced: html`<span class="badge b-teal sm">Произведена</span>`, stock: html`<span class="badge b-cyan sm">На складе</span>`, shipped: html`<span class="badge b-ok sm">Отгружена</span>` }[x.status]}</td><td class="nowrap">${F.dt(x.at)}</td></tr>`; })}
          </tbody></table></div><div class="card-f muted fs-12">Показано ${Math.min(80, list.length)} из ${list.length}</div></div>`;
    },
    mount(el, r) {
      const inp = UI.$('#qrIn', el);
      inp.onkeydown = (e) => { if (e.key === 'Enter') { const c = UI.parseCode(inp.value); AP.go('#/qr/' + (c || encodeURIComponent(inp.value.trim()))); } };
      UI.$$('[data-s]', el).forEach((b) => (b.onclick = () => AP.setQuery({ s: b.dataset.s })));
      const rb = UI.$('[data-u=reprint]', el); if (rb) rb.onclick = () => reprint(rb.dataset.id);
      const pa = UI.$('[data-x=printall]', el);
      if (pa) pa.onclick = () => { let list = AP.db.units.filter((x) => AP.inScope(x.workshop)); if (r.q.order) list = list.filter((x) => x.orderId === r.q.order); if (r.q.s) list = list.filter((x) => x.status === r.q.s); UI.printLabels(list.slice(-30)); };
      UI.$('[data-x=cam]', el).onclick = () => camScan();
    },
  });

  /* сканирование камерой телефона (Chrome на Android поддерживает BarcodeDetector) */
  async function camScan() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return UI.toast('Камера в этом браузере недоступна', 'Откройте в Chrome на Android или используйте ручной сканер — он вводит код как клавиатура', 'info');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch (e) { return UI.toast('Нет доступа к камере', 'Разрешите камеру в настройках браузера', 'warn'); }
    const det = new window.BarcodeDetector({ formats: ['qr_code'] });
    const m = UI.modal({ title: 'Наведите камеру на QR', body: html`<video playsinline muted style="width:100%;border-radius:14px;background:#000"></video>`, foot: html`<button class="btn btn-ghost" data-close>Закрыть</button>`, onClose: () => stream.getTracks().forEach((t) => t.stop()) });
    const v = m.querySelector('video');
    v.srcObject = stream; await v.play();
    const loop = async () => {
      if (!document.body.contains(v)) return;
      try { const codes = await det.detect(v); const c = codes.length && UI.parseCode(codes[0].rawValue); if (c) { UI.closeTop(); AP.go('#/qr/' + c); return; } } catch (e) { /* кадр не распознан */ }
      requestAnimationFrame(loop);
    };
    loop();
  }
})();
