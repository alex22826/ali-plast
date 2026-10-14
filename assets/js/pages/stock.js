/* Склад сырья, склад готовой продукции и погрузка (ТЗ 4.4, 4.6, 8) */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  const D = AP.d;
  const LOC = { sklad: 'Склад', w1: 'Цех №1', w2: 'Цех №2' };
  const KIND = { granule: 'Гранулят', additive: 'Добавки', masterbatch: 'Мастербатчи', ink: 'Краски', solvent: 'Растворители', pack: 'Упаковка и втулки' };
  const visLocs = () => { const f = AP.userWorkshop(); if (f !== 'all') return [f]; const s = AP.scope(); return s === 'all' ? ['sklad', 'w1', 'w2'] : ['sklad', s]; };
  const qn = (m, v) => F.num(v, m.unit === 'кг' && Math.abs(v) < 100 ? 1 : 0);

  /* ================= СКЛАД СЫРЬЯ ================= */
  function stockTab() {
    const st = AP.stock(), locs = visLocs(), money = AP.seeMoney();
    const groups = AP.groupBy(AP.db.materials, 'kind');
    const val = AP.sum(AP.db.materials, (m) => st[m.id].total * m.price);
    const low = AP.db.materials.filter((m) => st[m.id].total < m.min);
    return html`
      <div class="grid g-4 keep-2 mb-16">
        ${UI.kpi({ label: 'Позиций на учёте', icon: 'layers', value: AP.db.materials.length, foot: 'сырьё, краски, упаковка' })}
        ${UI.kpi({ label: 'Ниже минимума', icon: 'alert', value: low.length, foot: low.length ? low.map((m) => m.name.replace(/^(Гранулят|Краска флексо|Мастербатч) /, '')).slice(0, 3).join(', ') : 'всё в норме' })}
        ${UI.kpi({ label: 'Гранулят всего', icon: 'box', value: F.num((st.hdpe.total + st.ldpe.total + st.lldpe.total) / 1000, 1), unit: 'т', foot: F.num((st.hdpe.total + st.ldpe.total + st.lldpe.total) / 25) + ' мешков по 25 кг' })}
        ${money ? UI.kpi({ label: 'Стоимость остатков', icon: 'coins', value: F.short(val), unit: 'сум', foot: 'по цене последних партий' }) : UI.kpi({ label: 'Партий в работе', icon: 'tag', value: AP.db.batches.filter((b) => b.left.sklad + b.left.w1 + b.left.w2 > 0.01).length, foot: 'учёт по партиям' })}
      </div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Позиция</th>${locs.map((l) => html`<th class="r">${LOC[l]}</th>`)}${locs.length > 1 ? html`<th class="r">Итого</th>` : ''}<th class="r">Минимум</th><th>Статус</th></tr></thead>
      ${Object.keys(groups).map((k) => html`<tbody><tr><td colspan="${locs.length + 4}" style="background:var(--surface-2)" class="fs-12 fw-8 muted">${KIND[k].toUpperCase()}</td></tr>
        ${groups[k].map((m) => { const s = st[m.id], lowRow = s.total < m.min; return html`<tr class="${lowRow ? 'row-warn' : ''}">
          <td><span class="cell-title">${m.name}</span><span class="cell-sub">${m.code}${m.pack ? ' · ' + m.pack.name.replace('.', '') + ' ' + m.pack.qty + ' ' + m.unit : ''}${money ? ' · ' + F.m(m.price) + ' сум/' + m.unit : ''}</span></td>
          ${locs.map((l) => html`<td class="r nowrap ${s[l] > 0.01 ? 'fw-7' : 'muted'}">${s[l] > 0.01 ? qn(m, s[l]) + ' ' + m.unit : '—'}${m.pack && s[l] > 0.01 ? html`<span class="cell-sub">≈ ${F.num(s[l] / m.pack.qty, 1)} ${m.pack.name}</span>` : ''}</td>`)}
          ${locs.length > 1 ? html`<td class="r fw-8 nowrap">${qn(m, s.total)} ${m.unit}</td>` : ''}
          <td class="r muted">${F.num(m.min)} ${m.unit}</td>
          <td>${lowRow ? html`<span class="badge ${s.total < m.min * 0.5 ? 'b-bad' : 'b-warn'} sm">${s.total < m.min * 0.5 ? 'критично' : 'мало'}</span>` : html`<span class="badge b-ok sm">норма</span>`}</td></tr>`; })}</tbody>`)}
      </table></div></div>`;
  }

  function batchesTab() {
    const money = AP.seeMoney(), locs = visLocs();
    const list = AP.db.batches.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).filter((b) => locs.some((l) => (b.left[l] || 0) > 0.01) || locs.includes('sklad'));
    return html`<div class="card"><div class="card-h"><h3>Партии сырья</h3><span class="sub">учёт по партиям — видно, из какой партии сделан заказ</span></div><div class="table-wrap mt-8"><table class="table compact"><thead><tr><th>Партия</th><th>Позиция</th><th>Поставщик</th><th>Дата</th><th class="r">Пришло</th><th class="r">Осталось</th>${money ? html`<th class="r">Цена</th><th class="r">Сумма</th>` : ''}<th>Документ</th></tr></thead><tbody>
      ${list.slice(0, 120).map((b) => { const m = AP.material(b.materialId), left = locs.reduce((s, l) => s + (b.left[l] || 0), 0); return html`<tr><td class="mono fw-8">${b.code}</td><td>${m.name}</td><td class="fs-13">${b.supplierId ? AP.supplier(b.supplierId).name : '—'}</td><td class="nowrap">${F.date(b.date)}</td><td class="r nowrap">${qn(m, b.qty)} ${m.unit}${b.weighed ? html`<span class="cell-sub">${I('scale', 'icon-16')} взвешено</span>` : ''}</td><td class="r nowrap ${left > 0.01 ? 'fw-8' : 'muted'}" data-tip="${locs.map((l) => LOC[l] + ': ' + qn(m, b.left[l] || 0)).join('\n')}">${left > 0.01 ? qn(m, left) + ' ' + m.unit : 'израсходована'}</td>${money ? html`<td class="r">${F.m(b.price)}</td><td class="r fw-7">${F.m(b.qty * b.price)}</td>` : ''}<td class="fs-12 muted">${b.doc}</td></tr>`; })}
      </tbody></table></div></div>`;
  }

  function inTab(q) {
    const req = q.req ? AP.db.purchaseRequests.find((r) => r.id === q.req) : null;
    const m0 = req ? AP.material(req.materialId) : AP.db.materials[0];
    return html`<div class="grid g-21"><div class="card"><div class="card-h"><h3>Приход от поставщика</h3>${req ? html`<span class="badge b-brand">по заявке ${req.id}</span>` : ''}</div><div class="card-b">
      <form class="form-grid" id="inForm">
        <div class="field"><label>Позиция <span class="req">*</span></label><select class="select" name="m">${UI.options(AP.db.materials.map((m) => [m.id, m.name]), m0.id)}</select></div>
        <div class="field"><label>Поставщик <span class="req">*</span></label><select class="select" name="s">${UI.options(AP.db.suppliers.map((s) => [s.id, s.name + ' · ' + s.what]), m0.supplierId)}</select></div>
        <div class="field"><label>Количество <span class="req">*</span></label><div class="input-group"><input class="input" name="qty" type="number" min="0.1" step="0.1" value="${req ? req.qty : ''}"><span class="addon" data-u>${m0.unit}</span></div><span class="hint">Гранулят и краски лучше взвесить на весах склада</span></div>
        ${AP.seeMoney() ? html`<div class="field"><label>Цена за единицу, сум</label><input class="input" name="price" type="number" min="0" value="${m0.price}"></div>` : ''}
        <div class="field"><label>Документ</label><input class="input" name="doc" placeholder="Счёт-фактура № …"></div>
        <div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${D.todayISO()}"></div>
      </form></div>
      <div class="card-f"><button class="btn btn-primary" data-x="in">${I('check')}Оприходовать</button>${AP.db.scales.some((s) => s.workshop === 'sklad') ? html`<a class="btn btn-ghost" href="#/scales">${I('scale')}Взвесить на весах склада</a>` : ''}</div></div>
      <div class="card"><div class="card-h"><h3>Что произойдёт</h3></div><div class="card-b stack" style="gap:10px;font-weight:600" >
        <div class="row nowrap">${I('tag', 'icon-20 brand-t')}<span>Создастся партия со своим кодом — по ней потом видно, какие заказы из неё сделаны</span></div>
        <div class="row nowrap">${I('scale2', 'icon-20 brand-t')}<span>Долг перед поставщиком попадёт в кредиторку со сроком оплаты по договору</span></div>
        <div class="row nowrap">${I('refresh', 'icon-20 brand-t')}<span>Заказы со статусом «Ожидает сырьё» сами перейдут дальше, если сырья стало хватать</span></div>
      </div></div></div>`;
  }

  function issueTab() {
    const st = AP.stock();
    const mv = AP.db.movements.slice().reverse().slice(0, 60);
    const mats = AP.db.materials.filter((m) => st[m.id].sklad > 0.01);
    return html`<div class="grid g-12">
      <div class="card"><div class="card-h"><h3>Выдача в цех</h3></div><div class="card-b"><form class="stack" id="isForm" style="gap:14px">
        <div class="field"><label>Позиция</label><select class="select" name="m">${UI.options(mats.map((m) => [m.id, m.name + ' — на складе ' + qn(m, st[m.id].sklad) + ' ' + m.unit]))}</select></div>
        <div class="field"><label>Количество</label><input class="input" name="qty" type="number" min="0.1" step="0.1" placeholder="например 500"></div>
        <div class="field"><label>Куда</label><div class="seg" style="display:flex"><label style="flex:1" class="check"><input type="radio" name="to" value="w1" checked>Цех №1</label><label style="flex:1" class="check"><input type="radio" name="to" value="w2">Цех №2</label></div></div>
      </form></div><div class="card-f"><button class="btn btn-primary" data-x="issue">${I('arrowRight')}Выдать</button></div></div>
      <div class="card"><div class="card-h"><h3>Журнал перемещений</h3></div><div class="table-wrap"><table class="table compact"><thead><tr><th>Когда</th><th>Что</th><th class="r">Сколько</th><th>Откуда → куда</th><th>Кто</th></tr></thead><tbody>
        ${mv.map((x) => { const m = AP.material(x.materialId); return html`<tr><td class="nowrap">${F.dt(x.at)}</td><td>${m.name}${x.type === 'inventory' ? html` <span class="badge b-warn sm">инвентаризация</span>` : ''}${x.note && x.type === 'inventory' ? html`<span class="cell-sub">${x.note}</span>` : ''}</td><td class="r fw-7 nowrap">${x.qty > 0 && x.type === 'inventory' ? '+' : ''}${qn(m, x.qty)} ${m.unit}</td><td>${LOC[x.from] || '—'} → ${LOC[x.to] || '—'}</td><td class="muted">${(AP.userById(x.by) || {}).name || '—'}</td></tr>`; })}
      </tbody></table></div></div></div>`;
  }

  function writeoffsTab(q) {
    const per = q.p || 'week';
    const R = AP.periodRange(per);
    const locs = visLocs();
    let list = AP.db.writeoffs.filter((w) => locs.includes(w.workshop) && D.dayOf(w.at) >= R.from);
    if (q.m) list = list.filter((w) => w.materialId === q.m);
    const corr = AP.groupBy(list.filter((w) => w.correctionOf), 'correctionOf');
    const base = list.filter((w) => !w.correctionOf).sort((a, b) => (a.at < b.at ? 1 : -1));
    const g = AP.groupBy(list.filter((w) => AP.material(w.materialId).unit === 'кг'), 'materialId');
    const pend = AP.db.approvals.filter((a) => a.kind === 'writeoff_fix' && a.status === 'pending');
    return html`
      <div class="row mb-16">${UI.periodSeg(per)}<select class="select" style="max-width:280px" data-f="m" aria-label="Позиция">${UI.options(AP.db.materials.map((m) => [m.id, m.name]), q.m, 'Все позиции')}</select></div>
      <div class="grid g-21 mb-16"><div class="card"><div class="card-h"><h3>Расход: факт против нормы</h3><span class="sub">перерасход и экономия за период</span></div><div class="card-b">${Object.keys(g).length ? UI.normFact(Object.keys(g).map((k) => ({ label: AP.material(k).name, fact: AP.sum(g[k], 'qty'), norm: AP.sum(g[k], 'norm') })).sort((a, b) => b.fact - a.fact).slice(0, 8)) : UI.empty('Списаний нет', '')}</div></div>
        <div class="card"><div class="card-h"><h3>Как работает списание</h3></div><div class="card-b fs-13 text-2 stack" style="gap:10px;font-weight:600">
          <div>Гранулят и мастербатч списываются при выпуске плёнки, краски и растворитель — при печати, упаковка — при взвешивании каждой единицы.</div>
          <div>Исправить можно только с правом и обязательным комментарием. Исправление остаётся рядом с исходной записью.</div>
          ${pend.length ? html`<div class="alert alert-info">${I('shield')}<div class="grow"><b>На утверждении: ${pend.length}</b><small>${pend.map((a) => a.title).join('; ')}</small></div></div>` : ''}</div></div></div>
      <div class="card"><div class="table-wrap"><table class="table compact"><thead><tr><th>Когда</th><th>Заказ</th><th>Позиция</th><th class="r">Факт</th><th class="r">Норма</th><th>Партия</th><th>Источник</th><th></th></tr></thead><tbody>
        ${base.slice(0, 150).map((w) => { const m = AP.material(w.materialId), dev = w.norm ? (w.qty / w.norm - 1) * 100 : 0, cs = corr[w.id] || []; return html`<tr><td class="nowrap">${F.dt(w.at)}</td><td>${w.orderId ? html`<a href="#" data-act="open-order" data-id="${w.orderId}">${AP.order(w.orderId).no}</a>` : '—'}<span class="cell-sub">${LOC[w.workshop]}</span></td><td>${m.name}</td><td class="r fw-8 nowrap">${qn(m, w.qty)} ${m.unit}</td><td class="r nowrap muted">${qn(m, w.norm)} <span class="${dev > 3 ? 'bad-t' : dev < -1 ? 'ok-t' : ''} fw-7">${w.norm ? (dev > 0 ? '+' : '') + F.num(dev, 1) + '%' : ''}</span></td><td class="mono fs-12">${(AP.db.batches.find((b) => b.id === w.batchId) || {}).code || '—'}</td><td><span class="badge sm ${w.source === 'auto' ? 'b-info' : ''}">${w.source === 'auto' ? 'авто' : 'вручную'}</span></td><td class="r">${AP.can('stock', 1) && AP.inUserScope(w.workshop) ? html`<button class="btn btn-ghost btn-xs" data-fix="${w.id}">${I('edit')}Исправить</button>` : ''}</td></tr>
          ${cs.map((c) => html`<tr style="background:var(--warn-bg)"><td class="nowrap fs-12">↳ ${F.dt(c.at)}</td><td colspan="2" class="fs-12"><b>Исправление</b> · ${c.comment}</td><td class="r fw-8 nowrap">${c.qty > 0 ? '+' : ''}${qn(m, c.qty)} ${m.unit}</td><td colspan="3" class="fs-12 muted">${(AP.userById(c.by) || {}).name || ''}${c.approvedBy ? ' · утвердил ' + c.approvedBy : ''}</td><td></td></tr>`)}`; })}
      </tbody></table></div></div>`;
  }

  function invTab(q) {
    const st = AP.stock();
    const loc = q.loc || visLocs()[0];
    return html`<div class="row mb-16"><div class="seg">${visLocs().map((l) => html`<button class="${l === loc ? 'on' : ''}" data-loc="${l}">${LOC[l]}</button>`)}</div><span class="muted fs-13 fw-7">Введите фактическое количество — программа покажет расхождения</span></div>
      <div class="card"><form id="invForm"><div class="table-wrap"><table class="table compact"><thead><tr><th>Позиция</th><th class="r">По программе</th><th style="width:180px">Факт</th><th class="r">Разница</th></tr></thead><tbody>
      ${AP.db.materials.map((m) => html`<tr><td class="fw-7">${m.name}</td><td class="r nowrap">${qn(m, st[m.id][loc])} ${m.unit}</td><td><input class="input input-sm" type="number" step="0.1" name="${m.id}" placeholder="${qn(m, st[m.id][loc]).replace(/\s/g, '')}" data-sys="${st[m.id][loc]}"></td><td class="r fw-8" data-diff="${m.id}">—</td></tr>`)}
      </tbody></table></div></form><div class="card-f"><button class="btn btn-primary" data-x="inv">${I('check')}Провести инвентаризацию</button><span class="muted fs-12">Корректировка возможна только с комментарием и попадает в журнал</span></div></div>`;
  }

  function requestsTab() {
    const list = AP.db.purchaseRequests;
    const S = { new: ['Новая', 'b-brand'], ordered: ['Заказано', 'b-warn'], received: ['Получено', 'b-ok'] };
    return html`<div class="card"><div class="card-h"><h3>Заявки на закупку</h3><span class="sub">создаются сами, когда для заказа не хватает сырья</span></div><div class="table-wrap mt-8"><table class="table"><thead><tr><th>Заявка</th><th>Позиция</th><th class="r">Количество</th><th>Для заказа</th><th>Статус</th><th></th></tr></thead><tbody>
      ${list.map((r) => { const m = AP.material(r.materialId); return html`<tr><td><b>${r.id}</b><span class="cell-sub">${F.date(r.date)} · ${(AP.userById(r.by) || {}).name || ''}</span></td><td class="fw-7">${m.name}<span class="cell-sub">${r.note}</span></td><td class="r nowrap fw-8">${AP.fmtMat(m.id, r.qty)}</td><td>${r.orderId ? html`<a href="#" data-act="open-order" data-id="${r.orderId}">${AP.order(r.orderId).no}</a>` : '—'}</td><td><span class="badge ${S[r.status][1]}">${S[r.status][0]}</span></td>
        <td class="r nowrap">${AP.can('stock', 2) && r.status === 'new' ? html`<button class="btn btn-ghost btn-xs" data-req="ordered" data-id="${r.id}">Отметить заказанной</button>` : ''}${AP.can('stock', 2) && r.status !== 'received' ? html`<a class="btn btn-soft btn-xs" href="#/stock?tab=in&req=${r.id}">Оприходовать</a>` : ''}</td></tr>`; })}
      </tbody></table></div></div>`;
  }

  AP.page('stock', {
    title: 'Склад сырья',
    render(r) {
      const tab = r.q.tab || 'stock';
      const edit = AP.can('stock', 2);
      const nReq = AP.db.purchaseRequests.filter((x) => x.status !== 'received').length;
      const body = { stock: stockTab, batches: batchesTab, in: inTab, issue: issueTab, writeoffs: writeoffsTab, inv: invTab, requests: requestsTab }[tab] || stockTab;
      const fixed = AP.userWorkshop();
      return html`${UI.pageHead('Склад сырья и материалов', fixed !== 'all' ? 'Остатки сырья и красок, которые числятся за ' + AP.wsName(fixed).toLowerCase().replace('цех', 'цехом') : 'Остатки по складу и цехам в реальном времени, партии, приход, выдача и списания')}
        ${UI.tabs([['stock', 'Остатки'], fixed === 'all' ? ['batches', 'Партии'] : null, edit ? ['in', 'Приход'] : null, edit ? ['issue', 'Выдача в цех'] : null, ['writeoffs', 'Списания'], edit ? ['inv', 'Инвентаризация'] : null, ['requests', 'Заявки на закупку', nReq || null]], tab)}
        ${body(r.q)}`;
    },
    mount(el, r) {
      UI.bindTabs(el); UI.bindPeriod(el);
      const fm = UI.$('[data-f=m]', el); if (fm) fm.onchange = () => AP.setQuery({ m: fm.value });
      UI.$$('[data-loc]', el).forEach((b) => (b.onclick = () => AP.setQuery({ loc: b.dataset.loc })));
      // приход
      const inF = UI.$('#inForm', el);
      if (inF) {
        inF.m.onchange = () => { const m = AP.material(inF.m.value); UI.$('[data-u]', el).textContent = m.unit; inF.s.value = m.supplierId; if (inF.price) inF.price.value = m.price; };
        UI.$('[data-x=in]', el).onclick = () => {
          const d = UI.formData(inF), m = AP.material(d.m), qty = parseFloat(d.qty);
          if (!(qty > 0)) return inF.qty.closest('.field').classList.add('is-invalid');
          const b = { id: 'B' + AP.seq('B'), code: m.code + '-' + d.date.slice(2).replace(/-/g, ''), materialId: m.id, supplierId: d.s, date: d.date, qty, price: +(d.price || m.price), doc: d.doc || 'без документа', left: { sklad: qty, w1: 0, w2: 0 }, weighed: false };
          AP.db.batches.push(b);
          AP.db.purchaseRequests.filter((x) => x.materialId === m.id && x.status !== 'received').forEach((x) => { x.status = 'received'; x.batchId = b.id; });
          const waitingBefore = AP.db.orders.filter((o) => AP.orderStatus(o) === 'waiting').map((o) => o.id);
          AP.audit('Приход сырья', 'batch', b.id, m.name + ' · ' + AP.fmtMat(m.id, qty) + ' · партия ' + b.code + ' · ' + AP.supplier(d.s).name);
          AP.save();
          const freed = waitingBefore.filter((id) => AP.orderStatus(AP.order(id)) !== 'waiting');
          UI.toast('Оприходовано: партия ' + b.code, freed.length ? 'Заказы больше не ждут сырьё: ' + freed.map((id) => AP.order(id).no).join(', ') : AP.fmtMat(m.id, qty));
          AP.setQuery({ tab: 'stock', req: '' });
        };
      }
      // выдача
      const isF = UI.$('#isForm', el);
      if (isF) UI.$('[data-x=issue]', el).onclick = () => {
        const d = UI.formData(isF), m = AP.material(d.m), qty = parseFloat(d.qty);
        const to = isF.querySelector('input[name=to]:checked').value;
        const have = AP.stock()[m.id].sklad;
        if (!(qty > 0)) return UI.toast('Укажите количество', '', 'warn');
        if (qty > have + 1e-6) return UI.toast('На складе меньше', 'Есть ' + AP.fmtMat(m.id, have), 'bad');
        let rest = qty;
        AP.db.batches.filter((b) => b.materialId === m.id && b.left.sklad > 0).sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((b) => { if (rest <= 0) return; const t = Math.min(b.left.sklad, rest); b.left.sklad -= t; b.left[to] = (b.left[to] || 0) + t; rest -= t; });
        AP.db.movements.push({ id: 'mv' + AP.seq('mv'), at: new Date().toISOString(), type: 'issue', materialId: m.id, qty, from: 'sklad', to, by: AP.user.id, note: '' });
        AP.audit('Выдача в цех', 'material', m.id, m.name + ' · ' + AP.fmtMat(m.id, qty) + ' → ' + LOC[to]);
        AP.save(); UI.toast('Выдано в ' + LOC[to].toLowerCase(), AP.fmtMat(m.id, qty)); AP.render();
      };
      // исправление списаний (ТЗ 8.3)
      UI.$$('[data-fix]', el).forEach((b) => (b.onclick = async () => {
        const w = AP.db.writeoffs.find((x) => x.id === b.dataset.fix), m = AP.material(w.materialId);
        const can = AP.flag('correctWriteoff');
        const r2 = await UI.prompt('Исправление списания', m.name + ' · ' + (w.orderId ? AP.order(w.orderId).no : '') + ' · сейчас ' + qn(m, w.qty) + ' ' + m.unit + (can ? '' : '. У вас нет права исправлять — запрос уйдёт на утверждение директору.'), { extra: html`<div class="field"><label>Правильное количество, ${m.unit}</label><input class="input" name="q" type="number" step="0.1" value="${(Math.round(w.qty * 10) / 10)}"></div>`, ok: can ? 'Исправить' : 'Отправить на утверждение' });
        if (!r2) return;
        const nq = parseFloat(r2.q);
        if (!(nq >= 0) || Math.abs(nq - w.qty) < 0.01) return UI.toast('Количество не изменилось', '', 'info');
        if (can) { AP.act.applyWriteoffFix(w, nq, r2.comment, null); UI.toast('Списание исправлено', 'Исправление записано рядом с исходной записью'); }
        else {
          AP.db.approvals.push({ id: 'AR' + AP.seq('AR'), kind: 'writeoff_fix', status: 'pending', ts: new Date().toISOString(), uid: AP.user.id, user: AP.user.name, title: 'Исправление списания: ' + m.name.toLowerCase() + (w.orderId ? ' по ' + AP.order(w.orderId).no : ''), ref: { writeoffId: w.id, oldQty: w.qty, newQty: nq }, comment: r2.comment });
          AP.audit('Запрос на исправление списания', 'writeoff', w.id, r2.comment); AP.save();
          UI.toast('Отправлено на утверждение', 'Директор увидит запрос в уведомлениях', 'info');
        }
        AP.render();
      }));
      // инвентаризация
      const inv = UI.$('#invForm', el);
      if (inv) {
        inv.oninput = (e) => { const t = e.target; if (!t.dataset.sys) return; const cell = UI.$('[data-diff=' + t.name + ']', el); if (t.value === '') { cell.textContent = '—'; cell.className = 'r fw-8'; return; } const dlt = parseFloat(t.value) - parseFloat(t.dataset.sys); cell.textContent = (dlt > 0 ? '+' : '') + F.num(dlt, 1); cell.className = 'r fw-8 ' + (Math.abs(dlt) < 0.05 ? 'muted' : dlt < 0 ? 'bad-t' : 'ok-t'); };
        UI.$('[data-x=inv]', el).onclick = async () => {
          const loc = r.q.loc || visLocs()[0];
          const diffs = UI.$$('input[data-sys]', inv).filter((x) => x.value !== '' && Math.abs(parseFloat(x.value) - parseFloat(x.dataset.sys)) >= 0.05).map((x) => ({ m: x.name, d: parseFloat(x.value) - parseFloat(x.dataset.sys) }));
          if (!diffs.length) return UI.toast('Расхождений нет', 'Остатки совпадают с программой');
          const r2 = await UI.prompt('Корректировка остатков', 'Расхождений: ' + diffs.length + '. ' + diffs.map((x) => AP.material(x.m).name + ' ' + (x.d > 0 ? '+' : '') + F.num(x.d, 1)).join('; '), { ok: 'Провести' });
          if (!r2) return;
          diffs.forEach((x) => {
            if (x.d < 0) AP.consume(x.m, loc, -x.d);
            else { const bs = AP.db.batches.filter((b) => b.materialId === x.m).sort((a, b) => (a.date < b.date ? 1 : -1)); bs[0].left[loc] = (bs[0].left[loc] || 0) + x.d; }
            AP.db.movements.push({ id: 'mv' + AP.seq('mv'), at: new Date().toISOString(), type: 'inventory', materialId: x.m, qty: x.d, from: loc, to: loc, by: AP.user.id, note: r2.comment });
          });
          AP.audit('Инвентаризация: корректировка остатков', 'stock', loc, LOC[loc] + ' · ' + diffs.length + ' поз. · ' + r2.comment);
          AP.save(); UI.toast('Инвентаризация проведена', diffs.length + ' корректировок записано в журнал'); AP.setQuery({ tab: 'stock' });
        };
      }
      UI.$$('[data-req]', el).forEach((b) => (b.onclick = () => { const x = AP.db.purchaseRequests.find((z) => z.id === b.dataset.id); x.status = b.dataset.req; AP.audit('Заявка на закупку: заказано у поставщика', 'purchase', x.id, AP.material(x.materialId).name); AP.save(); AP.render(); }));
    },
  });

  AP.act.applyWriteoffFix = function (w, newQty, comment, approver) {
    const delta = newQty - w.qty;
    if (delta < 0) { const b = AP.db.batches.find((x) => x.id === w.batchId) || AP.db.batches.filter((x) => x.materialId === w.materialId).slice(-1)[0]; b.left[w.workshop] = (b.left[w.workshop] || 0) - delta; }
    else AP.consume(w.materialId, w.workshop, delta);
    AP.db.writeoffs.push({ id: 'wo' + AP.seq('wo'), at: new Date().toISOString(), orderId: w.orderId, workshop: w.workshop, materialId: w.materialId, qty: delta, norm: 0, source: 'correction', correctionOf: w.id, comment, batchId: w.batchId, price: w.price, by: AP.user.id, approvedBy: approver || null });
    AP.audit(approver ? 'Исправление списания утверждено' : 'Исправление списания', 'writeoff', w.id, AP.material(w.materialId).name + ': ' + F.num(w.qty, 1) + ' → ' + F.num(newQty, 1) + ' · ' + comment);
    AP.save();
  };

  /* ================= СКЛАД ГП И ПОГРУЗКА ================= */
  const L = { orderId: null, scanned: [], control: null, approved: false, msg: null };
  const placesFor = (w) => { const z = { w1: 'A', w2: 'B' }[w] || 'C'; return Array.from({ length: 12 }, (_, i) => z + '-' + String(i + 1).padStart(2, '0')).concat(['C-01', 'C-02', 'C-03']); };

  function gpStockTab(q) {
    const by = q.by || 'order';
    const units = AP.db.units.filter((u) => u.status === 'stock' && !u.parent && AP.orderVisible(AP.order(u.orderId)));
    const flat = AP.db.units.filter((u) => u.status === 'stock' && u.type !== 'pallet' && AP.orderVisible(AP.order(u.orderId)));
    const kg = AP.sum(flat, 'net');
    let rows;
    if (by === 'order') {
      const g = AP.groupBy(flat, 'orderId');
      rows = Object.keys(g).map((oid) => { const o = AP.order(oid), p = AP.product(o.productId), us = g[oid]; return html`<tr class="click" data-act="open-order" data-id="${oid}"><td><b>${o.no}</b><span class="cell-sub">${AP.statusBadge(AP.orderStatus(o))}</span></td><td>${AP.client(o.clientId).name}</td><td>${p.name}</td><td class="r fw-7">${us.length}</td><td class="r nowrap">${AP.fmtQty(p, AP.sum(us, 'pcs'), { kg: false })}</td><td class="r fw-8 nowrap">${F.kg(AP.sum(us, 'net'))}</td><td class="fs-12">${[...new Set(us.map((u) => u.loc))].sort().join(', ')}</td><td class="r">${AP.can('warehouse', 2) ? html`<a class="btn btn-soft btn-xs" href="#/warehouse?tab=load&order=${oid}">${I('truck')}Погрузить</a>` : ''}</td></tr>`; });
      return html`<div class="row mb-16"><div class="seg">${[['order', 'По заказам'], ['place', 'По местам хранения'], ['product', 'По продукции']].map(([k, t]) => html`<button class="${by === k ? 'on' : ''}" data-by="${k}">${t}</button>`)}</div><span class="muted fw-7">На складе: ${flat.length} ед. · ${F.kg(kg)}</span></div>
        <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Продукция</th><th class="r">Единиц</th><th class="r">Кол-во</th><th class="r">Вес</th><th>Места</th><th></th></tr></thead><tbody>${rows.length ? rows : html`<tr><td colspan="8">${UI.empty('Склад готовой продукции пуст', '')}</td></tr>`}</tbody></table></div></div>`;
    }
    const key = by === 'place' ? (u) => u.loc || '—' : (u) => u.productId;
    const g = AP.groupBy(flat, key);
    rows = Object.keys(g).sort().map((k) => { const us = g[k]; return html`<tr><td class="fw-8">${by === 'place' ? k : AP.product(k).name}</td><td>${[...new Set(us.map((u) => AP.order(u.orderId).no))].join(', ')}</td><td class="r fw-7">${us.length}</td><td class="r fw-8">${F.kg(AP.sum(us, 'net'))}</td></tr>`; });
    void units;
    return html`<div class="row mb-16"><div class="seg">${[['order', 'По заказам'], ['place', 'По местам хранения'], ['product', 'По продукции']].map(([k, t]) => html`<button class="${by === k ? 'on' : ''}" data-by="${k}">${t}</button>`)}</div><span class="muted fw-7">На складе: ${flat.length} ед. · ${F.kg(kg)}</span></div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>${by === 'place' ? 'Место' : 'Продукция'}</th><th>Заказы</th><th class="r">Единиц</th><th class="r">Вес</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function acceptTab() {
    const list = AP.db.units.filter((u) => u.status === 'produced' && u.type !== 'pallet' && AP.orderVisible(AP.order(u.orderId)));
    const g = AP.groupBy(list, 'orderId');
    return html`<div class="scan-box mb-16"><span class="scan-ic">${I('scan')}</span><div class="grow"><b>Сканируйте коробки, мешки и рулоны при приёмке</b><div class="row mt-8"><input class="input input-lg grow" id="accIn" placeholder="AP-000123" autofocus autocomplete="off"><select class="select input-lg" id="accLoc" style="max-width:150px">${UI.options(placesFor('w1').concat(placesFor('w2').slice(0, 12)).map((x) => [x, x]))}</select></div></div></div>
      <div id="accMsg"></div>
      ${Object.keys(g).length ? Object.keys(g).map((oid) => { const o = AP.order(oid), p = AP.product(o.productId); return html`<div class="card mb-16"><div class="card-h"><h3>${o.no} · ${p.name}</h3><span class="sub">${AP.client(o.clientId).name} · ${UI.wsChip(o.workshop)}</span>${AP.can('warehouse', 2) ? html`<button class="btn btn-primary btn-sm" data-accall="${oid}">${I('check')}Принять все (${g[oid].length})</button>` : ''}</div>
        <div class="card-b"><div class="row" style="gap:6px">${g[oid].map((u) => html`<button class="chip ghost mono" style="border:0;cursor:pointer;height:30px" data-acc="${u.id}" data-tip="${F.kg(u.net)} · ${F.dt(u.at)}">${I('box')}${u.id}</button>`)}</div></div></div>`; }) : UI.empty('Всё принято', 'Новые единицы появятся здесь сразу после взвешивания в цехе', 'check')}`;
  }

  function debtCheck(o) {
    const c = AP.client(o.clientId), d = AP.clientDebt(c.id);
    const over = d.overdue > 0, lim = c.limit && d.total > c.limit;
    if (!over && !lim) return { ok: true };
    const ap = AP.db.approvals.find((a) => a.kind === 'ship_overdue' && a.ref && a.ref.orderId === o.id && a.status === 'approved' && D.dayOf(a.decidedAt) === D.todayISO());
    const pend = AP.db.approvals.find((a) => a.kind === 'ship_overdue' && a.ref && a.ref.orderId === o.id && a.status === 'pending');
    return { ok: false, over, lim, d, c, approved: !!ap, pending: !!pend, ap };
  }

  function loadTab(q) {
    if (q.order && q.order !== L.orderId) { L.orderId = q.order; L.scanned = []; L.control = null; L.approved = false; L.msg = null; }
    const cand = AP.db.orders.filter((o) => AP.orderVisible(o) && AP.unitsOf(o.id).some((u) => u.status === 'stock'));
    if (!L.orderId || !cand.find((o) => o.id === L.orderId)) { L.orderId = cand[0] ? cand[0].id : null; L.scanned = []; }
    if (!L.orderId) return UI.empty('Нечего грузить', 'На складе нет принятой продукции', 'truck');
    const o = AP.order(L.orderId), p = AP.product(o.productId), c = AP.client(o.clientId);
    const avail = AP.db.units.filter((u) => u.orderId === o.id && u.status === 'stock' && u.type !== 'pallet');
    const pallets = AP.db.units.filter((u) => u.orderId === o.id && u.type === 'pallet' && u.status === 'stock');
    const sc = L.scanned.map((id) => AP.unit(id));
    const remain = o.qty - AP.shippedQty(o);
    const pcs = AP.sum(sc, 'pcs'), kg = AP.sum(sc, 'net'), gross = AP.sum(sc, 'gross') + pallets.filter((pl) => AP.childrenOf(pl.id).every((k) => L.scanned.includes(k.id))).length * AP.TARE.pallet;
    const dc = debtCheck(o);
    const money = AP.seeMoney();
    const blocked = !dc.ok && !(dc.approved || (AP.flag('approve') && L.approved));
    const MSG = { ok: 'alert-ok', bad: 'alert-bad', warn: 'alert-warn' };
    return html`<div class="grid g-12">
      <div class="stack">
        <div class="card"><div class="card-h"><h3>1. Заказ и транспорт</h3></div><div class="card-b stack" style="gap:12px">
          <div class="field"><label>Заказ</label><select class="select" id="ldOrder">${UI.options(cand.map((x) => [x.id, x.no + ' · ' + AP.client(x.clientId).name]), o.id)}</select></div>
          <dl class="dl fs-13"><dt>Продукция</dt><dd>${p.name}</dd><dt>Осталось отгрузить</dt><dd>${AP.fmtQty(p, Math.max(0, remain))}</dd><dt>На складе</dt><dd>${avail.length} ед.${pallets.length ? ' · ' + pallets.length + ' паллет' : ''}</dd></dl>
          <form class="stack" id="ldForm" style="gap:10px"><div class="field"><label>Машина (госномер)</label><input class="input" name="truck" placeholder="10 123 AAA"></div><div class="field"><label>Водитель и телефон</label><input class="input" name="driver" placeholder="ФИО, +998 …"></div><div class="field"><label>Адрес доставки</label><input class="input" name="address" value="${c.address}"></div></form>
        </div></div>
        ${!dc.ok ? html`<div class="alert ${dc.approved ? 'alert-ok' : 'alert-bad'}">${I(dc.approved ? 'check' : 'alert')}<div class="grow"><b>${dc.approved ? 'Отгрузка разрешена директором' : 'У клиента ' + (dc.over ? 'просроченный долг' : 'превышен лимит долга')}</b>
          <small>${money ? 'Долг ' + F.money(dc.d.total) + (dc.over ? ', просрочено ' + F.money(dc.d.overdue) + ' (' + dc.d.maxDays + ' дн.)' : '') + (dc.c.limit ? ', лимит ' + F.money(dc.c.limit) : '') : 'Подробности видит директор и бухгалтер'}. Решение об отгрузке принимает директор.</small>
          ${!dc.approved && AP.flag('approve') ? html`<label class="check mt-8" style="color:var(--text)"><input type="checkbox" id="ldApprove" ${L.approved ? raw('checked') : ''}>Разрешаю отгрузку под мою ответственность</label>` : ''}
          ${!dc.approved && !AP.flag('approve') ? html`<button class="btn btn-sm btn-secondary mt-8" data-x="askship" ${dc.pending ? raw('disabled') : ''}>${dc.pending ? 'Запрос отправлен — ждём решения' : 'Запросить решение директора'}</button>` : ''}</div></div>` : ''}
      </div>
      <div class="stack">
        <div class="card"><div class="card-h"><h3>2. Сканирование при погрузке</h3><span class="sub">программа проверит заказ, количество и повторы</span></div><div class="card-b">
          <div class="scan-box ${L.msg ? (L.msg.k === 'ok' ? 'ok' : 'bad') : ''}"><span class="scan-ic">${I('scan')}</span><div class="grow"><input class="input input-lg" id="ldIn" placeholder="Сканируйте коробку, мешок или паллету" autofocus autocomplete="off">${L.msg ? html`<div class="fs-13 fw-7 mt-8 ${L.msg.k === 'ok' ? 'ok-t' : 'bad-t'}">${L.msg.t}</div>` : ''}</div></div>
          <div class="grid g-4 keep-2 mt-16" style="gap:10px">
            <div><div class="muted fs-12 fw-7">Отсканировано</div><b class="fs-20">${sc.length}</b><span class="muted"> / ${avail.length}</span></div>
            <div><div class="muted fs-12 fw-7">Количество</div><b class="fs-20">${p.base === 'кг' ? F.kg(pcs) : F.num(pcs)}</b></div>
            <div><div class="muted fs-12 fw-7">Нетто / брутто</div><b class="fs-20">${F.num(kg)}</b><span class="muted"> / ${F.num(gross)} кг</span></div>
            <div><div class="muted fs-12 fw-7">Контрольный вес</div>${L.control ? html`<b class="fs-20 ${Math.abs(L.control - gross) / gross > 0.01 ? 'bad-t' : 'ok-t'}">${F.num(L.control)}</b><span class="muted"> кг · ${(L.control - gross > 0 ? '+' : '') + F.num(((L.control - gross) / gross) * 100, 1)}%</span>` : html`<button class="btn btn-ghost btn-sm" data-x="control" ${sc.length ? '' : raw('disabled')}>${I('scale')}Взвесить</button>`}</div>
          </div>
          ${pcs > remain * 1.02 ? html`<div class="alert alert-warn mt-12">${I('alert')}<div class="grow"><b>Больше, чем осталось по заказу</b><small>Осталось ${AP.fmtQty(p, remain)}, отсканировано ${AP.fmtQty(p, pcs)}</small></div></div>` : ''}
          <div class="fw-7 fs-13 mt-16 mb-8">На складе по этому заказу <span class="muted">(нажмите — имитация скана)</span></div>
          <div class="row" style="gap:6px">${pallets.map((pl) => html`<button class="chip ${AP.childrenOf(pl.id).every((k) => L.scanned.includes(k.id)) ? 'w2' : 'ghost'} mono" style="border:0;cursor:pointer;height:30px" data-scan="${pl.id}">${I('pallet')}${pl.id}</button>`)}${avail.filter((u) => !u.parent).map((u) => html`<button class="chip ${L.scanned.includes(u.id) ? 'w2' : 'ghost'} mono" style="border:0;cursor:pointer;height:30px" data-scan="${u.id}">${L.scanned.includes(u.id) ? I('check') : I('box')}${u.id}</button>`)}</div>
          <div class="fs-12 muted mt-12">Для проверки: попробуйте ввести код другого заказа или уже отгруженной единицы — программа не даст погрузить.</div>
        </div>
        <div class="card-f"><button class="btn btn-primary btn-lg" data-x="ship" ${!sc.length || blocked ? raw('disabled') : ''}>${I('truck')}Оформить отгрузку</button>${sc.length ? html`<button class="btn btn-ghost" data-x="clear">Очистить</button>` : ''}${blocked ? html`<span class="bad-t fw-7 fs-13">нужно решение директора</span>` : ''}</div></div>
      </div></div>`;
  }

  function shipmentsTab() {
    const list = AP.db.shipments.filter((s) => AP.orderVisible(AP.order(s.orderId))).slice().reverse();
    return html`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Отгрузка</th><th>Клиент / заказ</th><th class="r">Единиц</th><th class="r">Вес брутто</th><th>Транспорт</th><th>Документ</th><th></th></tr></thead><tbody>
      ${list.slice(0, 80).map((s) => html`<tr><td><b>${s.id}</b><span class="cell-sub">${F.dt(s.at)}</span></td><td>${AP.client(s.clientId).name}<span class="cell-sub"><a href="#" data-act="open-order" data-id="${s.orderId}">${AP.order(s.orderId).no}</a></span></td><td class="r">${s.units.length}</td><td class="r fw-7">${F.kg(s.kg)}${s.controlKg ? html`<span class="cell-sub">контроль ${F.num(s.controlKg)}</span>` : ''}</td><td>${s.truck}<span class="cell-sub">${s.driver}</span></td><td class="mono fs-12">${s.doc}</td><td><button class="btn btn-ghost btn-xs" data-ttn="${s.id}">${I('print')}ТТН</button></td></tr>`)}
    </tbody></table></div></div>`;
  }

  function printTTN(s) {
    const o = AP.order(s.orderId), p = AP.product(o.productId), c = AP.client(s.clientId);
    const us = s.units.map((id) => AP.unit(id)).filter(Boolean);
    UI.printDoc('ТТН ' + s.doc, `<h1>Товарно-транспортная накладная ${s.doc}</h1><div class="muted">от ${F.date(s.date)} · отгрузка ${s.id} · заказ ${o.no}</div>
      <div class="grid" style="margin-top:5mm"><div><b>Грузоотправитель:</b> ${AP.esc(AP.db.company.name)}, ${AP.esc(AP.db.company.city)}, ИНН ${AP.db.company.inn}</div><div><b>Грузополучатель:</b> ${AP.esc(c.name)}${c.inn ? ', ИНН ' + c.inn : ''}<br>${AP.esc(s.address)}</div><div><b>Автомобиль:</b> ${AP.esc(s.truck)}</div><div><b>Водитель:</b> ${AP.esc(s.driver)}</div></div>
      <table><tr><th>№</th><th>Наименование</th><th>Упаковка</th><th class="r">Мест</th><th class="r">Кол-во</th><th class="r">Нетто, кг</th><th class="r">Брутто, кг</th></tr><tr><td>1</td><td>${AP.esc(p.name)}<br><span class="muted">${o.material}, ${o.thick} мкм, ${o.color}</span></td><td>${p.unit.name}</td><td class="r">${us.length}</td><td class="r">${p.base === 'кг' ? F.num(AP.sum(us, 'pcs')) + ' кг' : F.num(AP.sum(us, 'pcs')) + ' шт'}</td><td class="r">${F.num(AP.sum(us, 'net'), 1)}</td><td class="r">${F.num(s.kg, 1)}</td></tr></table>
      <div class="muted" style="font-size:8.5pt">Коды единиц: ${us.map((u) => u.id).join(', ')}</div>
      <div class="muted" style="font-size:8.5pt;margin-top:3mm">Форма документа и электронная счёт-фактура уточняются по требованиям Узбекистана (оператор ЭДО) на этапе внедрения.</div>
      <div class="sign"><div>Отпустил (кладовщик)</div><div>Принял (водитель)</div></div>`);
  }

  AP.page('warehouse', {
    title: 'Склад ГП и погрузка',
    render(r) {
      const tab = r.q.tab || 'stock';
      const nAcc = AP.db.units.filter((u) => u.status === 'produced' && u.type !== 'pallet' && AP.orderVisible(AP.order(u.orderId))).length;
      const edit = AP.can('warehouse', 2);
      const body = { stock: gpStockTab, accept: acceptTab, load: loadTab, shipments: shipmentsTab }[tab] || gpStockTab;
      return html`${UI.pageHead('Склад готовой продукции и погрузка', 'Приём по QR-кодам, остатки по заказам и местам хранения, контроль при погрузке')}
        ${UI.tabs([['stock', 'Остатки'], edit ? ['accept', 'Приёмка', nAcc || null] : null, edit ? ['load', 'Погрузка'] : null, ['shipments', 'Отгрузки']], tab)}${body(r.q)}`;
    },
    mount(el, r) {
      UI.bindTabs(el);
      UI.$$('[data-by]', el).forEach((b) => (b.onclick = () => AP.setQuery({ by: b.dataset.by })));
      UI.$$('[data-ttn]', el).forEach((b) => (b.onclick = () => printTTN(AP.db.shipments.find((s) => s.id === b.dataset.ttn))));
      // приёмка
      const accept = (u, loc) => { u.status = 'stock'; u.stockAt = new Date().toISOString(); u.loc = loc; AP.audit('Приёмка на склад ГП', 'unit', u.id, AP.order(u.orderId).no + ' · место ' + loc); };
      const accIn = UI.$('#accIn', el);
      if (accIn) {
        const loc = () => UI.$('#accLoc', el).value;
        const msg = (k, t) => { UI.$('#accMsg', el).innerHTML = String(html`<div class="alert alert-${k} mb-16">${I(k === 'ok' ? 'check' : 'alert')}<div class="grow"><b>${t}</b></div></div>`); };
        accIn.onkeydown = (e) => {
          if (e.key !== 'Enter') return;
          const code = UI.parseCode(accIn.value); accIn.value = '';
          const u = code && AP.unit(code);
          if (!u) return msg('bad', 'Код не найден');
          if (u.status === 'stock') return msg('warn', u.id + ' уже на складе, место ' + u.loc);
          if (u.status === 'shipped') return msg('bad', u.id + ' уже отгружена');
          accept(u, loc()); AP.save(); UI.toast('Принято: ' + u.id, 'Место ' + loc()); AP.render();
        };
        UI.$$('[data-acc]', el).forEach((b) => (b.onclick = () => { const u = AP.unit(b.dataset.acc); accept(u, loc()); AP.save(); UI.toast('Принято: ' + u.id, 'Место ' + loc()); AP.render(); }));
        UI.$$('[data-accall]', el).forEach((b) => (b.onclick = () => { const us = AP.db.units.filter((u) => u.orderId === b.dataset.accall && u.status === 'produced'); us.forEach((u) => accept(u, loc())); AP.save(); UI.toast('Принято ' + us.length + ' ед.', AP.order(b.dataset.accall).no + ' · статус: ' + AP.STATUSES[AP.orderStatus(AP.order(b.dataset.accall))].t); AP.render(); }));
      }
      // погрузка
      const ldo = UI.$('#ldOrder', el);
      if (ldo) {
        const o = AP.order(L.orderId);
        ldo.onchange = () => AP.setQuery({ order: ldo.value });
        const form = UI.$('#ldForm', el);
        if (L.form) Object.keys(L.form).forEach((k) => { if (form[k] && L.form[k]) form[k].value = L.form[k]; });
        form.oninput = () => (L.form = UI.formData(form));
        const scan = (code) => {
          const u = AP.unit(code);
          if (!u) { L.msg = { k: 'bad', t: 'Код ' + (code || '') + ' не найден' }; return; }
          if (u.status === 'shipped') { const s = AP.db.shipments.find((x) => x.id === u.shipmentId); L.msg = { k: 'bad', t: u.id + ' уже отгружена ' + (s ? F.dt(s.at) + ' (' + s.id + ')' : '') + ' — повторно грузить нельзя' }; AP.audit('Погрузка: попытка повторной отгрузки', 'unit', u.id, 'Отклонено программой'); return; }
          if (u.orderId !== o.id) { const oo = AP.order(u.orderId); L.msg = { k: 'bad', t: u.id + ' — это ' + oo.no + ' (' + AP.client(oo.clientId).name + '), не этот заказ' }; return; }
          if (u.status === 'produced') { L.msg = { k: 'bad', t: u.id + ' не принята на склад — сначала приёмка' }; return; }
          const add = u.type === 'pallet' ? AP.childrenOf(u.id).filter((k) => k.status === 'stock').map((k) => k.id) : [u.id];
          const fresh = add.filter((x) => !L.scanned.includes(x));
          if (!fresh.length) { L.msg = { k: 'warn', t: u.id + ' уже отсканирована' }; return; }
          L.scanned.push(...fresh); L.control = null;
          L.msg = { k: 'ok', t: u.type === 'pallet' ? 'Паллета ' + u.id + ': добавлено ' + fresh.length + ' ед.' : u.id + ' ✓ ' + F.kg(u.net) };
        };
        const li = UI.$('#ldIn', el);
        li.onkeydown = (e) => { if (e.key === 'Enter') { scan(UI.parseCode(li.value)); AP.render(); } };
        UI.$$('[data-scan]', el).forEach((b) => (b.onclick = () => { const id = b.dataset.scan; if (L.scanned.includes(id)) { L.scanned = L.scanned.filter((x) => x !== id); L.msg = null; } else scan(id); AP.render(); }));
        const ap = UI.$('#ldApprove', el); if (ap) ap.onchange = () => { L.approved = ap.checked; AP.render(); };
        const cl = UI.$('[data-x=clear]', el); if (cl) cl.onclick = () => { L.scanned = []; L.msg = null; L.control = null; AP.render(); };
        const ct = UI.$('[data-x=control]', el); if (ct) ct.onclick = () => { const g = AP.sum(L.scanned.map(AP.unit), 'gross'); L.control = Math.round(g * (0.996 + Math.random() * 0.008) * 2) / 2; AP.render(); };
        const ask = UI.$('[data-x=askship]', el);
        if (ask) ask.onclick = () => { const c = AP.client(o.clientId); AP.db.approvals.push({ id: 'AR' + AP.seq('AR'), kind: 'ship_overdue', status: 'pending', ts: new Date().toISOString(), uid: AP.user.id, user: AP.user.name, title: 'Отгрузка должнику: ' + c.name + ' · ' + o.no, ref: { orderId: o.id }, comment: 'Клиент с просроченным долгом, машина на погрузке' }); AP.audit('Запрос решения об отгрузке должнику', 'order', o.id, o.no); AP.save(); UI.toast('Запрос отправлен директору', 'Как только он разрешит — кнопка станет активной', 'info'); AP.render(); };
        const sb = UI.$('[data-x=ship]', el);
        if (sb) sb.onclick = () => {
          const d = UI.formData(form);
          if (!d.truck) { form.truck.closest('.field').classList.add('is-invalid'); form.truck.focus(); return; }
          const us = L.scanned.map(AP.unit);
          const dc = debtCheck(o);
          if (!dc.ok && L.approved && !dc.approved) { AP.db.approvals.push({ id: 'AR' + AP.seq('AR'), kind: 'ship_overdue', status: 'approved', ts: new Date().toISOString(), uid: AP.user.id, user: AP.user.name, title: 'Отгрузка должнику: ' + AP.client(o.clientId).name + ' · ' + o.no, ref: { orderId: o.id }, comment: 'Разрешено при погрузке', decidedBy: AP.user.name, decidedAt: new Date().toISOString() }); AP.audit('Разрешена отгрузка клиенту с долгом', 'order', o.id, o.no + ' · решение директора'); }
          const s = { id: 'ОТ-' + String(AP.seq('ОТ-')).padStart(4, '0'), orderId: o.id, clientId: o.clientId, date: D.todayISO(), at: new Date().toISOString(), units: us.map((u) => u.id), qty: AP.sum(us, 'pcs'), kg: Math.round(AP.sum(us, 'gross') * 10) / 10, truck: d.truck, driver: d.driver || '—', address: d.address, doc: 'ТТН-' + String(AP.seq('ТТН')).padStart(5, '0'), by: AP.user.id, controlKg: L.control };
          us.forEach((u) => { u.status = 'shipped'; u.shipmentId = s.id; if (u.parent) { const pl = AP.unit(u.parent); if (AP.childrenOf(pl.id).every((k) => k.status === 'shipped' || us.includes(k))) { pl.status = 'shipped'; pl.shipmentId = s.id; } } });
          AP.db.shipments.push(s);
          AP.audit('Отгрузка оформлена', 'shipment', s.id, o.no + ' · ' + us.length + ' ед. · ' + s.truck + (L.control ? ' · контроль ' + L.control + ' кг' : ''));
          AP.save();
          L.scanned = []; L.msg = null; L.control = null; L.approved = false; L.form = null;
          UI.toast('Отгрузка ' + s.id + ' оформлена', o.no + ' · статус: ' + AP.STATUSES[AP.orderStatus(o)].t);
          AP.setQuery({ tab: 'shipments', order: '' });
          setTimeout(() => UI.confirm('Печать накладной', 'Распечатать ТТН ' + s.doc + ' для водителя?', { ok: 'Печать' }).then((y) => y && printTTN(s)), 300);
        };
      }
      void r;
    },
  });
})();
