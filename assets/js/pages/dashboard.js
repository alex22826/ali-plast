/* Сводка: директор видит оба цеха, начальник цеха — свой экран (ТЗ 4.5, 4.10) */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, fmt: F } = AP;
  const I = UI.icon;
  const D = AP.d;

  const M_ICON = { extrusion: 'flame', print: 'droplet', cut: 'scissors', pack: 'box' };
  UI.machineCard = function (m) {
    const st = AP.machineState(m.id);
    const cls = { run: 'run', idle: 'idle', down: 'down' }[st.s];
    let sub = '';
    if (st.s === 'run') { const o = st.order, p = AP.product(o.productId); sub = html`<span class="cell-sub">${o.no} · ${p.name}</span>`; }
    else if (st.s === 'down') sub = html`<span class="cell-sub bad-t">${st.reason} · ${F.mins((Date.now() - D.parse(st.since)) / 60000)}</span>`;
    else { const q = AP.db.orders.filter((o) => o.task && !o.task.startedAt && o.task.machineId === m.id); sub = html`<span class="cell-sub">${q.length ? 'В очереди: ' + q.map((o) => o.no).join(', ') : 'Нет заданий'}</span>`; }
    const badge = { run: 'b-ok', idle: '', down: 'b-bad' }[st.s];
    return html`<div class="machine ${cls}" ${st.order ? AP.raw(`data-act="open-order" data-id="${st.order.id}" style="cursor:pointer"`) : ''}>
      <div class="m-ic ${st.s === 'run' ? 'pulse' : ''}">${I(M_ICON[m.type])}</div>
      <div class="grow" style="min-width:0"><b class="fs-13 ellipsis" style="display:block">${m.name}</b>${sub}</div>
      <span class="badge ${badge} sm">${st.t}</span></div>`;
  };

  function alertList(list, n = 7) {
    if (!list.length) return UI.empty('Всё идёт по плану', 'Нет предупреждений', 'check');
    const C = { bad: 'var(--bad)', warn: 'var(--warn)', info: 'var(--info)' };
    return html`<ul class="list">${list.slice(0, n).map((a) => html`<li class="click" data-href="${a.href}"><span style="color:${C[a.lvl]}">${I(a.icon, 'icon-20')}</span><div class="grow" style="min-width:0"><b class="fs-13">${a.title}</b><div class="fs-12 muted ellipsis">${a.kind} · ${a.text}</div></div>${I('chevronRight', 'icon-16 muted')}</li>`)}</ul>`;
  }

  function wsStats(w) {
    const ob = AP.outputByDay(14);
    const today = ob[w][13];
    const from7 = D.iso(D.addDays(D.todayISO(), -6));
    const ext = AP.sum(AP.db.outputs.filter((x) => x.workshop === w && x.stage === 'extrusion' && x.date >= from7), 'kg');
    const def = AP.sum(AP.db.defects.filter((x) => x.workshop === w && x.kind !== 'waste' && x.date >= from7), 'kg');
    const ms = AP.db.machines.filter((m) => m.workshop === w && m.type !== 'pack');
    const run = ms.filter((m) => AP.machineState(m.id).s === 'run').length;
    const down = ms.filter((m) => AP.machineState(m.id).s === 'down').length;
    return { today, defPct: ext ? (def / ext) * 100 : 0, run, down, total: ms.length };
  }
  const shiftNow = () => { const h = new Date().getHours(); return h >= 8 && h < 20 ? 'Смена А (день)' : 'Смена Б (ночь)'; };

  function mainView() {
    const scope = AP.scope();
    const wl = scope === 'all' ? ['w1', 'w2'] : [scope];
    const ob = AP.outputByDay(14);
    const daySum = (i) => wl.reduce((s, w) => s + ob[w][i], 0);
    const series14 = ob.days.map((d, i) => daySum(i));
    const today = daySum(13);
    const wk = series14.slice(7).reduce((a, b) => a + b, 0), pwk = series14.slice(0, 7).reduce((a, b) => a + b, 0);
    const orders = AP.db.orders.filter(AP.orderVisible);
    const active = orders.filter((o) => ['new', 'layout', 'waiting', 'queue', 'production', 'ready'].includes(AP.orderStatus(o)));
    const overdue = orders.filter(AP.isOverdue);
    const from7 = D.iso(D.addDays(D.todayISO(), -6));
    const ships = AP.db.shipments.filter((s) => s.date >= from7 && AP.orderVisible(AP.order(s.orderId)));
    const shipKg = AP.sum(ships, 'kg');
    const shipAmt = AP.sum(ships, (s) => AP.orderAmount(AP.order(s.orderId), s.qty));
    const money = AP.seeMoney();
    const R = AP.receivables();
    const recv = AP.sum(Object.values(R), 'total'), recvOver = AP.sum(Object.values(R), 'overdue');
    const st = wl.map(wsStats);
    const defAvg = st.reduce((s, x) => s + x.defPct, 0) / st.length;
    const pipe = {};
    const from30 = D.iso(D.addDays(D.todayISO(), -30));
    orders.forEach((o) => { const s = AP.orderStatus(o); if (s === 'closed' && o.date < from30) return; pipe[s] = (pipe[s] || 0) + 1; });
    const alerts = AP.alerts();
    const greet = (() => { const h = new Date().getHours(); return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; })();
    const wsNames = wl.map((w) => AP.wsName(w)).join(' и ');

    return html`
      ${UI.pageHead(greet + ', ' + AP.user.name.split(' ')[0], F.date(D.todayISO()) + ' · ' + shiftNow() + ' · данные по ' + (scope === 'all' ? 'обоим цехам' : wsNames.toLowerCase()), html`
        ${AP.can('orders', 2) ? html`<a class="btn btn-primary" href="#/orders?new=1">${I('plus')}Новый заказ</a>` : ''}
        ${AP.can('reports') ? html`<a class="btn btn-secondary" href="#/reports">${I('file')}Отчёты</a>` : ''}`)}
      <div class="grid g-5 keep-2">
        ${UI.kpi({ label: 'Выпуск сегодня', icon: 'box', value: F.num(today), unit: 'кг', foot: wl.length > 1 ? html`Ц1 ${F.num(ob.w1[13])} · Ц2 ${F.num(ob.w2[13])}` : 'готовая продукция, по весам', spark: series14, sparkColor: 'var(--s1)' })}
        ${UI.kpi({ label: 'Выпуск за 7 дней', icon: 'factory', value: F.num(wk / 1000, 1), unit: 'т', foot: html`${UI.delta(wk, pwk)} к прошлой неделе`, href: '#/reports' })}
        ${UI.kpi({ label: 'Заказы в работе', icon: 'clipboard', value: active.length, foot: overdue.length ? html`<span class="badge b-bad sm">просрочено ${overdue.length}</span>` : html`<span class="badge b-ok sm">без просрочек</span>`, href: '#/orders' })}
        ${UI.kpi({ label: 'Отгружено за 7 дней', icon: 'truck', value: F.num(shipKg / 1000, 1), unit: 'т', foot: money ? html`на ${F.short(shipAmt)} сум · ${ships.length} ${F.plural(ships.length, 'машина', 'машины', 'машин')}` : ships.length + ' ' + F.plural(ships.length, 'отгрузка', 'отгрузки', 'отгрузок'), href: AP.can('warehouse') ? '#/warehouse?tab=shipments' : '' })}
        ${money && AP.can('debts')
          ? UI.kpi({ label: 'Нам должны', icon: 'scale2', value: F.short(recv), unit: 'сум', foot: html`<span class="badge ${recvOver ? 'b-bad' : 'b-ok'} sm">просрочено ${F.short(recvOver)}</span>`, href: '#/debts' })
          : UI.kpi({ label: 'Брак за 7 дней', icon: 'alert', value: F.num(defAvg, 1), unit: '%', foot: 'от выпуска плёнки', href: '#/production?tab=defects' })}
      </div>

      <div class="grid g-21 mt-16">
        <div class="card">
          <div class="card-h"><h3>Выпуск готовой продукции, кг</h3>${UI.legend(wl.map((w) => ({ name: AP.wsName(w), color: w === 'w1' ? 'var(--s1)' : 'var(--s2)' })))}</div>
          <div class="card-b">${UI.chart({ type: 'stack', height: 250, labels: ob.days.map((d) => F.dm(d)), tipLabels: ob.days.map((d) => F.date(d)), series: wl.map((w) => ({ name: AP.wsName(w), color: w === 'w1' ? 'var(--s1)' : 'var(--s2)', values: ob[w] })), fmt: (v) => F.short(v), tipFmt: (v) => F.kg(v) })}</div>
        </div>
        <div class="card">
          <div class="card-h"><h3>Требует внимания</h3><span class="badge ${alerts.length ? 'b-bad' : 'b-ok'}">${alerts.length}</span></div>
          <div class="card-b flush">${alertList(alerts)}</div>
          ${alerts.length > 7 ? html`<div class="card-f"><button class="btn btn-ghost btn-sm" data-act="alerts">Все уведомления ${I('arrowRight')}</button></div>` : ''}
        </div>
      </div>

      <div class="grid ${wl.length > 1 ? 'g-2' : ''} mt-16">
        ${wl.map((w, k) => { const s = st[k]; return html`<div class="card iris">
          <div class="card-h"><h3>${AP.wsName(w)}</h3><span class="sub">${AP.workshop(w).profile}</span></div>
          <div class="card-b">
            <div class="grid g-4 keep-2" style="gap:10px;margin-bottom:14px">
              <div><div class="muted fs-12 fw-7">Сегодня</div><b class="fs-16">${F.kg(s.today)}</b></div>
              <div><div class="muted fs-12 fw-7">Брак 7 дн.</div><b class="fs-16 ${s.defPct > 2.5 ? 'warn-t' : ''}">${F.pct(s.defPct)}</b></div>
              <div><div class="muted fs-12 fw-7">В работе</div><b class="fs-16">${s.run} из ${s.total}</b></div>
              <div><div class="muted fs-12 fw-7">Простой</div><b class="fs-16 ${s.down ? 'bad-t' : ''}">${s.down}</b></div>
            </div>
            <div class="stack" style="gap:8px">${AP.db.machines.filter((m) => m.workshop === w && m.type !== 'pack').map(UI.machineCard)}</div>
          </div></div>`; })}
      </div>

      <div class="card mt-16">
        <div class="card-h"><h3>Где сейчас заказы</h3><span class="sub">статус меняется сам — по весам, складу и оплатам</span></div>
        <div class="card-b"><div class="pipeline">${AP.STATUS_ORDER.map((k) => html`<button class="pipe" data-href="#/orders?st=${k}"><span><i class="dot" style="background:currentColor"></i>${AP.STATUSES[k].s}</span><b>${pipe[k] || 0}</b></button>`)}</div></div>
      </div>`;
  }

  function shopView() {
    const w = AP.userWorkshop();
    const s = wsStats(w);
    const today = D.todayISO();
    const unitsToday = AP.db.units.filter((u) => u.workshop === w && u.type !== 'pallet' && D.dayOf(u.at) === today);
    const woToday = AP.db.writeoffs.filter((x) => x.workshop === w && D.dayOf(x.at) === today && AP.material(x.materialId).unit === 'кг');
    const defToday = AP.sum(AP.db.defects.filter((x) => x.workshop === w && x.date === today && x.kind !== 'waste'), 'kg');
    const extToday = AP.sum(AP.db.outputs.filter((x) => x.workshop === w && x.date === today && x.stage === 'extrusion'), 'kg');
    const tasks = AP.db.orders.filter((o) => o.workshop === w && ['queue', 'production', 'waiting'].includes(AP.orderStatus(o)));
    const st = AP.stock();
    const mats = AP.db.materials.filter((m) => st[m.id][w] > 0.01 || (m.kind === 'ink' && w === 'w2'));
    const alerts = AP.alerts();
    const BA = (href, icon, color, title, sub) => html`<a class="big-act" href="${href}"><span class="ba-ic" style="background:${color}1f;color:${color}">${I(icon)}</span><span><b>${title}</b><br><small>${sub}</small></span></a>`;
    return html`
      ${UI.pageHead(AP.wsName(w) + ' · ' + shiftNow(), AP.workshop(w).profile + ' · ' + F.date(today))}
      <div class="big-actions">
        ${BA('#/scales', 'scale', '#3D5AFE', 'Взвесить продукцию', 'вес с весов → QR-этикетка')}
        ${BA('#/production?tab=defects&add=1', 'alert', '#E2621B', 'Зафиксировать брак', 'с причиной и весом')}
        ${BA('#/production?tab=down&add=1', 'pause', '#DC3B42', 'Простой станка', 'остановка и причина')}
        ${BA('#/production', 'clipboard', '#10B3A3', 'Задания цеха', tasks.length + ' ' + F.plural(tasks.length, 'задание', 'задания', 'заданий'))}
      </div>
      <div class="grid g-4 keep-2 mt-16">
        ${UI.kpi({ label: 'Выпущено сегодня', icon: 'box', value: F.num(s.today), unit: 'кг', foot: unitsToday.length + ' ' + F.plural(unitsToday.length, 'единица', 'единицы', 'единиц') + ' с QR' })}
        ${UI.kpi({ label: 'Ушло сырья сегодня', icon: 'layers', value: F.num(AP.sum(woToday, 'qty')), unit: 'кг', foot: 'списано автоматически по рецептуре' })}
        ${UI.kpi({ label: 'Брак сегодня', icon: 'alert', value: F.num(defToday, 1), unit: 'кг', foot: extToday ? F.pct((defToday / extToday) * 100) + ' от выпуска плёнки' : 'выпуска плёнки ещё нет' })}
        ${UI.kpi({ label: 'Станки', icon: 'factory', value: s.run + ' / ' + s.total, foot: s.down ? html`<span class="badge b-bad sm">простой: ${s.down}</span>` : 'все исправны' })}
      </div>
      <div class="grid g-21 mt-16">
        <div class="card"><div class="card-h"><h3>Задания в работе</h3><a class="btn btn-ghost btn-sm" href="#/production">Очередь ${I('arrowRight')}</a></div>
          <div class="card-b flush"><ul class="list">${tasks.length ? tasks.map((o) => {
            const stg = AP.currentStage(o), p = AP.product(o.productId), stt = AP.orderStatus(o);
            const need = AP.kgOf(p, o.qty), done = stg === 'pack' ? AP.producedKg(o) : (o.progress[stg] || 0);
            return html`<li class="click" data-act="open-order" data-id="${o.id}"><div class="grow" style="min-width:0">
              <div class="row" style="gap:8px"><b>${o.no}</b>${AP.statusBadge(stt, stt === 'production' ? AP.STAGES[stg].short : '')}${o.urgent ? html`<span class="chip urgent">срочно</span>` : ''}</div>
              <div class="fs-12 muted mt-8">${p.name} · ${AP.fmtQty(p, o.qty)} · до ${F.date(o.deadline)}</div>
              ${stt === 'production' ? html`<div class="mt-8">${UI.progress(done / need, '', 'sm')}</div>` : ''}</div></li>`;
          }) : html`<li>${UI.empty('Заданий нет', 'Новые задания назначает директор или вы — в разделе «Производство»')}</li>`}</ul></div></div>
        <div class="card"><div class="card-h"><h3>Где проблемы</h3><span class="badge ${alerts.length ? 'b-bad' : 'b-ok'}">${alerts.length}</span></div><div class="card-b flush">${alertList(alerts, 8)}</div></div>
      </div>
      <div class="grid g-2 mt-16">
        <div class="card"><div class="card-h"><h3>Станки цеха</h3></div><div class="card-b stack" style="gap:8px">${AP.db.machines.filter((m) => m.workshop === w).map(UI.machineCard)}</div></div>
        <div class="card"><div class="card-h"><h3>Сырьё и краски за цехом</h3><a class="btn btn-ghost btn-sm" href="#/stock">Склад ${I('arrowRight')}</a></div>
          <div class="card-b flush"><table class="table compact"><tbody>${mats.map((m) => html`<tr><td class="fw-7">${m.name}</td><td class="r nowrap">${AP.fmtMat(m.id, st[m.id][w])}</td><td class="r">${st[m.id].total < m.min ? html`<span class="badge b-warn sm">мало</span>` : ''}</td></tr>`)}</tbody></table></div></div>
      </div>`;
  }

  AP.page('dashboard', {
    title: () => (AP.userWorkshop() !== 'all' ? 'Экран начальника цеха' : 'Сводка'),
    render: () => (AP.userWorkshop() !== 'all' ? shopView() : mainView()),
  });
})();
