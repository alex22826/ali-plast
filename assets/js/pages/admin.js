/* Персонал, справочники, отчёты, пользователи и права, журнал (ТЗ 2, 4.3, 4.9, 4.10) */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  const D = AP.d;

  /* ================= ПЕРСОНАЛ ================= */
  function monthDays() { const t = D.today(); const n = t.getDate(); return Array.from({ length: n }, (_, i) => D.iso(new Date(t.getFullYear(), t.getMonth(), i + 1))); }
  const hash = (s) => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0);
  function worked(e, days) {
    const out = {};
    if (e.payType === 'piece') {
      AP.db.outputs.forEach((x) => { if (x.operatorId === e.id) out[x.date] = x.shift === 'B' ? 'Н' : 'Д'; });
      AP.db.units.forEach((u) => { if (u.packerId === e.id) out[D.dayOf(u.at)] = u.shift === 'B' ? 'Н' : 'Д'; });
    } else {
      const off = hash(e.id) % 4;
      days.forEach((d, i) => { const wd = D.parse(d).getDay(); if (e.shift === 'D') { if (wd !== 0) out[d] = 'Д'; } else if ((i + off) % 4 < 2) out[d] = e.shift === 'B' ? 'Н' : 'Д'; });
    }
    if (hash(e.id) % 11 === 3) { const d = days[Math.min(days.length - 1, 4)]; if (d) out[d] = 'Б'; }
    return out;
  }
  function empStats(e, days) {
    const from = days[0];
    const kg = AP.sum(AP.db.outputs.filter((x) => x.operatorId === e.id && x.date >= from), 'kg') + AP.sum(AP.db.units.filter((u) => u.packerId === e.id && D.dayOf(u.at) >= from), 'net');
    const w = worked(e, days);
    const shifts = Object.keys(w).filter((d) => d >= from && w[d] !== 'Б').length;
    const pay = e.payType === 'piece' ? kg * e.rate : shifts * e.rate;
    return { kg, shifts, pay, w };
  }
  AP.page('staff', {
    title: 'Персонал',
    render(r) {
      const tab = r.q.tab || 'list';
      const days = monthDays();
      const list = AP.db.employees.filter((e) => (e.workshop === 'sklad' ? AP.scope() === 'all' && AP.userWorkshop() === 'all' : AP.inScope(e.workshop)));
      const st = Object.fromEntries(list.map((e) => [e.id, empStats(e, days)]));
      const money = AP.seeMoney();
      const month = AP.MONTHS_FULL[D.today().getMonth()].toLowerCase();
      let body;
      if (tab === 'tabel') {
        body = html`<div class="card"><div class="card-h"><h3>Табель за ${month}</h3>${UI.legend([{ name: 'Д — дневная смена', color: 'var(--s1)' }, { name: 'Н — ночная', color: 'var(--s3)' }, { name: 'Б — больничный', color: 'var(--s4)' }])}</div><div class="table-wrap mt-8"><table class="table compact" style="font-size:12px"><thead><tr><th>Сотрудник</th>${days.map((d) => html`<th class="c" style="padding:6px 3px;${[0, 6].includes(D.parse(d).getDay()) ? 'color:var(--bad)' : ''}">${D.parse(d).getDate()}</th>`)}<th class="r">Смен</th><th class="r">Часов</th></tr></thead><tbody>
          ${list.map((e) => { const s = st[e.id]; return html`<tr><td class="nowrap"><b>${e.name}</b><span class="cell-sub">${e.position}</span></td>${days.map((d) => { const v = s.w[d]; return html`<td class="c" style="padding:6px 3px;font-weight:800;color:${v === 'Н' ? 'var(--s3)' : v === 'Б' ? 'var(--s4)' : 'var(--s1)'}">${v || ''}</td>`; })}<td class="r fw-8">${s.shifts}</td><td class="r">${s.shifts * (e.shift === 'D' ? 8 : 11)}</td></tr>`; })}
        </tbody></table></div></div>`;
      } else if (tab === 'pay' && money) {
        const tot = AP.sum(list, (e) => st[e.id].pay);
        body = html`<div class="grid g-3 mb-16">${UI.kpi({ label: 'Начислено за ' + month, icon: 'coins', value: F.short(tot), unit: 'сум', foot: list.length + ' сотрудников' })}${UI.kpi({ label: 'Сдельно', icon: 'weight', value: F.short(AP.sum(list.filter((e) => e.payType === 'piece'), (e) => st[e.id].pay)), unit: 'сум', foot: 'по выработке с весов' })}${UI.kpi({ label: 'Повременно', icon: 'clock', value: F.short(AP.sum(list.filter((e) => e.payType === 'time'), (e) => st[e.id].pay)), unit: 'сум', foot: 'по табелю смен' })}</div>
          <div class="card"><div class="card-h"><h3>Начисления</h3><button class="btn btn-ghost btn-sm" data-x="xpay">${I('download')}Excel</button></div><div class="table-wrap mt-8"><table class="table"><thead><tr><th>Сотрудник</th><th>Оплата</th><th class="r">Ставка</th><th class="r">Выработка</th><th class="r">Смен</th><th class="r">Начислено</th></tr></thead><tbody>
          ${list.map((e) => { const s = st[e.id]; return html`<tr><td><b>${e.name}</b><span class="cell-sub">${e.position} · ${AP.wsName(e.workshop)}</span></td><td>${e.payType === 'piece' ? html`<span class="badge b-info sm">сдельная</span>` : html`<span class="badge sm">повременная</span>`}</td><td class="r">${F.m(e.rate)} <span class="muted fs-12">${e.payType === 'piece' ? 'сум/кг' : 'сум/смена'}</span></td><td class="r">${s.kg ? F.kg(s.kg) : '—'}</td><td class="r">${s.shifts}</td><td class="r fw-8">${F.m(s.pay)}</td></tr>`; })}
          </tbody><tfoot><tr><td colspan="5">Итого</td><td class="r">${F.m(tot)}</td></tr></tfoot></table></div></div>`;
      } else {
        const byW = AP.groupBy(list, 'workshop');
        body = html`${Object.keys(byW).map((w) => html`<div class="card mb-16"><div class="card-h"><h3>${AP.wsName(w)}</h3><span class="sub">${byW[w].length} чел.</span></div><div class="table-wrap mt-8"><table class="table"><thead><tr><th>Сотрудник</th><th>Должность</th><th>Смена</th><th>Станок</th><th class="r">Выработка за месяц</th><th class="r">Смен</th>${money ? html`<th class="r">Начислено</th>` : ''}</tr></thead><tbody>
          ${byW[w].map((e) => { const s = st[e.id]; return html`<tr><td><span class="row nowrap" style="gap:10px">${UI.avatar(e.name, e.id, 'sm')}<span><b>${e.name}</b><span class="cell-sub">${e.phone}</span></span></span></td><td class="fs-13">${e.position}</td><td>${{ A: 'А (день)', B: 'Б (ночь)', D: 'дневная' }[e.shift]}</td><td class="fs-13">${e.machine ? AP.machine(e.machine).name : '—'}</td><td class="r fw-7">${s.kg ? F.kg(s.kg) : '—'}</td><td class="r">${s.shifts}</td>${money ? html`<td class="r fw-8">${F.m(s.pay)}</td>` : ''}</tr>`; })}
        </tbody></table></div></div>`)}`;
      }
      return html`${UI.pageHead('Персонал', 'Около 30 сотрудников: цех, смена, выработка. Заходить в программу им не нужно — выработка приходит с весов и из производства.', html`<span class="badge b-brand plain">${list.length} чел.</span>`)}
        ${UI.tabs([['list', 'Сотрудники'], ['tabel', 'Табель'], money ? ['pay', 'Начисления'] : null], tab)}${body}`;
    },
    mount(el) {
      UI.bindTabs(el);
      const x = UI.$('[data-x=xpay]', el);
      if (x) x.onclick = () => { const days = monthDays(); AP.exportCSV('zarplata-' + D.todayISO().slice(0, 7), [['Сотрудник', 'Должность', 'Цех', 'Оплата', 'Ставка', 'Выработка, кг', 'Смен', 'Начислено']].concat(AP.db.employees.map((e) => { const s = empStats(e, days); return [e.name, e.position, AP.wsName(e.workshop), e.payType === 'piece' ? 'сдельная' : 'повременная', e.rate, Math.round(s.kg), s.shifts, Math.round(s.pay)]; }))); };
    },
  });

  /* ================= СПРАВОЧНИКИ ================= */
  const KIND = { granule: 'Гранулят', additive: 'Добавка', masterbatch: 'Мастербатч', ink: 'Краска', solvent: 'Растворитель', pack: 'Упаковка' };
  const TYPE = { extrusion: 'Экструдер', print: 'Флексопечать', cut: 'Резка и запайка', pack: 'Упаковка' };
  AP.page('refs', {
    title: 'Справочники и нормы',
    render(r) {
      const tab = r.q.tab || 'products';
      const edit = AP.can('refs', 2), money = AP.seeMoney();
      const S = AP.db.settings;
      let body;
      if (tab === 'products') {
        body = html`<div class="grid g-2">${AP.db.products.map((p) => html`<div class="card"><div class="card-h"><h3>${p.name}</h3>${UI.wsChip(p.workshop)}${edit ? html`<button class="btn btn-ghost btn-xs" data-ep="${p.id}">${I('edit')}</button>` : ''}</div><div class="card-b">
          <div class="row mb-12"><span class="chip ghost">${p.material}</span><span class="chip ghost">${p.size}</span><span class="chip ghost">${p.thick} мкм</span><span class="chip ghost">${p.color}</span>${p.printable ? html`<span class="chip w2">${I('droplet')}печать</span>` : ''}</div>
          <table class="table compact"><thead><tr><th>Рецептура на 1 кг</th><th class="r">Доля</th></tr></thead><tbody>${p.recipe.map(([m, k]) => html`<tr><td>${AP.material(m).name}</td><td class="r fw-7">${F.num(k * 100, 1)}%</td></tr>`)}${p.printable ? html`<tr><td class="muted">Краска на 1 цвет / растворитель</td><td class="r muted">${F.num(S.inkPerColorKg * 1000, 0)} г / ${F.num(S.solventPerKg * 1000, 0)} г</td></tr>` : ''}</tbody></table>
          <dl class="dl mt-12 fs-13"><dt>Нормы</dt><dd>отходы ${F.pct(p.waste)} · брак ${F.pct(p.defect)}</dd><dt>Единицы</dt><dd>${p.base === 'кг' ? 'рулон ≈ ' + p.unit.kg + ' кг' : '1 шт ≈ ' + F.num(p.g, 2) + ' г · ' + p.pack.name + ' ' + p.pack.pcs + ' шт · ' + p.unit.name + ' ' + F.num(p.unit.pcs) + ' шт ≈ ' + F.kg(AP.unitKg(p))}</dd><dt>Маршрут</dt><dd>${p.stages.map((s) => AP.STAGES[s].short).join(' → ')}</dd>${money ? html`<dt>Базовая цена</dt><dd>${F.money(p.price)} за ${p.base === 'кг' ? 'кг' : '1000 шт'}</dd>` : ''}</dl></div></div>`)}</div>`;
      } else if (tab === 'materials') {
        body = html`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Код</th><th>Наименование</th><th>Вид</th><th>Единица и упаковка</th><th class="r">Мин. остаток</th>${money ? html`<th class="r">Цена</th>` : ''}<th>Поставщик</th><th></th></tr></thead><tbody>
          ${AP.db.materials.map((m) => html`<tr><td class="mono fw-8">${m.code}</td><td class="fw-7">${m.color ? html`<span class="row nowrap" style="gap:6px"><i class="dot" style="background:${m.color};outline:1px solid var(--border)"></i>${m.name}</span>` : m.name}</td><td>${KIND[m.kind]}</td><td>${m.unit}${m.pack ? ' · ' + m.pack.name + ' ' + m.pack.qty + ' ' + m.unit : ''}</td><td class="r">${F.num(m.min)}</td>${money ? html`<td class="r">${F.m(m.price)}</td>` : ''}<td class="fs-13">${AP.supplier(m.supplierId).name}</td><td>${edit ? html`<button class="btn btn-ghost btn-xs" data-em="${m.id}">${I('edit')}</button>` : ''}</td></tr>`)}
        </tbody></table></div></div>`;
      } else if (tab === 'machines') {
        body = html`${edit ? html`<div class="row mb-16"><button class="btn btn-primary" data-x="addm">${I('plus')}Добавить станок</button><span class="muted fs-13 fw-7">Новый цех, станок, весы или склад добавляются без переделки программы</span></div>` : ''}
          <div class="grid g-2">${AP.db.workshops.map((w) => html`<div class="card"><div class="card-h"><h3>${w.name}</h3><span class="sub">${w.profile}</span></div><div class="card-b flush"><table class="table compact"><tbody>${AP.db.machines.filter((m) => m.workshop === w.id).map((m) => html`<tr><td><b>${m.name}</b><span class="cell-sub">${m.note || ''}</span></td><td>${TYPE[m.type]}</td><td class="r">${m.cap} кг/ч</td></tr>`)}</tbody></table></div></div>`)}</div>`;
      } else if (tab === 'norms') {
        const can = AP.can('refs', 3);
        const inp = (name, val, step = 1) => html`<input class="input input-sm" type="number" step="${step}" name="${name}" value="${val}" ${can ? '' : raw('disabled')} style="width:120px;text-align:right">`;
        body = html`<form id="normsF" class="grid g-2">
          <div class="card"><div class="card-h"><h3>Расчёт себестоимости</h3></div><div class="card-b"><table class="table compact"><thead><tr><th>Этап</th><th class="r">кВт·ч на кг</th><th class="r">Зарплата, сум/кг</th></tr></thead><tbody>${Object.keys(AP.STAGES).map((s) => html`<tr><td class="fw-7">${AP.STAGES[s].t}</td><td class="r">${inp('kwh_' + s, S.kwhPerKg[s], 0.01)}</td><td class="r">${inp('lab_' + s, S.laborPerKg[s], 10)}</td></tr>`)}</tbody></table>
            <div class="form-grid mt-16"><div class="field"><label>Тариф, сум за кВт·ч</label>${inp('tariff', S.tariff, 10)}</div><div class="field"><label>Износ станков, сум/кг</label>${inp('depr', S.deprPerKg, 10)}</div><div class="field"><label>Прочие расходы, сум/кг</label>${inp('over', S.overheadPerKg, 10)}</div></div></div></div>
          <div class="card"><div class="card-h"><h3>Печать и весы</h3></div><div class="card-b"><div class="form-grid"><div class="field"><label>Краска на 1 цвет, г/кг</label>${inp('ink', S.inkPerColorKg * 1000, 0.5)}</div><div class="field"><label>Растворитель на цвет, г/кг</label>${inp('solv', S.solventPerKg * 1000, 0.5)}</div><div class="field full"><label>Допустимое отклонение веса упаковки, %</label>${inp('tol', S.weightTolerance, 0.5)}<span class="hint">Если вес отличается сильнее — оператор получит предупреждение и перепроверит</span></div></div></div>
          ${can ? html`<div class="card-f"><button class="btn btn-primary" type="button" data-x="saveNorms">${I('check')}Сохранить нормы</button></div>` : ''}</div></form>`;
      } else {
        body = html`<div class="grid g-3">
          <div class="card"><div class="card-h"><h3>Склады</h3></div><div class="card-b stack" style="gap:8px">${[['Склад сырья и материалов', 'гранулят, краски, упаковка'], ['Цех №1 — участок', 'сырьё, выданное в цех'], ['Цех №2 — участок', 'сырьё и краски в цехе'], ['Склад готовой продукции', 'зоны A (Ц1), B (Ц2), C (паллеты, отгрузка)']].map(([a, b]) => html`<div class="machine idle"><div class="m-ic">${I('layers')}</div><div><b class="fs-13">${a}</b><span class="cell-sub">${b}</span></div></div>`)}</div></div>
          <div class="card"><div class="card-h"><h3>Весы</h3></div><div class="card-b stack" style="gap:8px">${AP.db.scales.map((s) => html`<div class="machine run"><div class="m-ic">${I('scale')}</div><div><b class="fs-13">${s.name}</b><span class="cell-sub">до ${s.max} кг · d=${s.d} · ${s.link}<br>${s.model}</span></div></div>`)}</div></div>
          <div class="card"><div class="card-h"><h3>Оборудование для QR</h3></div><div class="card-b stack" style="gap:8px">${[['Принтер этикеток', 'этикетка 100×70 мм, модель уточняется'], ['Ручные сканеры QR', 'работают как клавиатура — без драйверов'], ['Камера телефона', 'сканирование в Chrome на Android']].map(([a, b]) => html`<div class="machine idle"><div class="m-ic">${I('qr')}</div><div><b class="fs-13">${a}</b><span class="cell-sub">${b}</span></div></div>`)}</div></div></div>`;
      }
      return html`${UI.pageHead('Справочники и нормы', 'Продукция с рецептурами, сырьё, станки, нормы отходов и брака — по ним программа считает сырьё, списания и себестоимость')}
        ${UI.tabs([['products', 'Продукция и рецептуры'], ['materials', 'Сырьё и материалы'], ['machines', 'Станки'], ['norms', 'Нормы и тарифы'], ['places', 'Склады и оборудование']], tab)}${body}`;
    },
    mount(el) {
      UI.bindTabs(el);
      UI.$$('[data-ep]', el).forEach((b) => (b.onclick = () => {
        const p = AP.product(b.dataset.ep);
        const m = UI.modal({ title: p.name, sub: 'Изменение рецептуры и норм попадёт в журнал',
          body: html`<form class="form-grid">${p.recipe.map(([mm, k], i) => html`<div class="field"><label>${AP.material(mm).name}, %</label><input class="input" type="number" step="0.1" name="r${i}" value="${Math.round(k * 1000) / 10}"></div>`)}<div class="field"><label>Норма отходов, %</label><input class="input" type="number" step="0.1" name="waste" value="${p.waste}"></div><div class="field"><label>Допустимый брак, %</label><input class="input" type="number" step="0.1" name="defect" value="${p.defect}"></div>${AP.seeMoney() ? html`<div class="field"><label>Базовая цена, сум</label><input class="input" type="number" name="price" value="${p.price}"></div>` : ''}</form>`,
          foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Сохранить</button>` });
        m.querySelector('[data-ok]').onclick = () => {
          const d = UI.formData(m.querySelector('form'));
          const rec = p.recipe.map(([mm], i) => [mm, (parseFloat(d['r' + i]) || 0) / 100]);
          const sum = rec.reduce((s, x) => s + x[1], 0);
          if (Math.abs(sum - 1) > 0.005) return UI.toast('Сумма рецептуры должна быть 100%', 'Сейчас ' + F.num(sum * 100, 1) + '%', 'bad');
          p.recipe = rec; p.waste = +d.waste; p.defect = +d.defect; if (d.price) p.price = +d.price;
          AP.audit('Изменена рецептура и нормы', 'product', p.id, p.name + ' · ' + rec.map(([mm, k]) => AP.material(mm).code + ' ' + F.num(k * 100, 1) + '%').join(', ') + ' · отходы ' + p.waste + '% · брак ' + p.defect + '%');
          AP.save(); UI.closeTop(); UI.toast('Сохранено', p.name); AP.render();
        };
      }));
      UI.$$('[data-em]', el).forEach((b) => (b.onclick = () => {
        const mt = AP.material(b.dataset.em);
        const m = UI.modal({ title: mt.name, body: html`<form class="form-grid"><div class="field"><label>Минимальный остаток, ${mt.unit}</label><input class="input" type="number" name="min" value="${mt.min}"><span class="hint">Ниже — предупреждение руководителю</span></div>${AP.seeMoney() ? html`<div class="field"><label>Цена, сум/${mt.unit}</label><input class="input" type="number" name="price" value="${mt.price}"></div>` : ''}</form>`, foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Сохранить</button>` });
        m.querySelector('[data-ok]').onclick = () => { const d = UI.formData(m.querySelector('form')); mt.min = +d.min || 0; if (d.price) mt.price = +d.price; AP.audit('Изменена позиция справочника', 'material', mt.id, mt.name + ' · минимум ' + mt.min); AP.save(); UI.closeTop(); AP.render(); };
      }));
      const am = UI.$('[data-x=addm]', el);
      if (am) am.onclick = () => {
        const m = UI.modal({ title: 'Новый станок', body: html`<form class="form-grid"><div class="field full"><label>Название</label><input class="input" name="name" placeholder="Экструдер ЭК-4"></div><div class="field"><label>Цех</label><select class="select" name="w">${UI.options(AP.db.workshops.map((w) => [w.id, w.name]))}</select></div><div class="field"><label>Тип</label><select class="select" name="type">${UI.options(Object.entries(TYPE))}</select></div><div class="field"><label>Производительность, кг/ч</label><input class="input" type="number" name="cap" value="40"></div><div class="field"><label>Примечание</label><input class="input" name="note"></div></form>`, foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Добавить</button>` });
        m.querySelector('[data-ok]').onclick = () => { const d = UI.formData(m.querySelector('form')); if (!d.name) return; const x = { id: 'm' + (AP.db.machines.length + 1) + Date.now().toString(36).slice(-2), workshop: d.w, name: d.name, type: d.type, cap: +d.cap || 40, note: d.note }; AP.db.machines.push(x); AP.audit('Добавлен станок', 'machine', x.id, x.name + ' · ' + AP.wsName(x.workshop)); AP.save(); UI.closeTop(); UI.toast('Станок добавлен', 'Он уже доступен в очереди заданий'); AP.render(); };
      };
      const sn = UI.$('[data-x=saveNorms]', el);
      if (sn) sn.onclick = () => {
        const d = UI.formData(UI.$('#normsF', el)), S = AP.db.settings;
        Object.keys(AP.STAGES).forEach((s) => { S.kwhPerKg[s] = +d['kwh_' + s]; S.laborPerKg[s] = +d['lab_' + s]; });
        S.tariff = +d.tariff; S.deprPerKg = +d.depr; S.overheadPerKg = +d.over; S.inkPerColorKg = +d.ink / 1000; S.solventPerKg = +d.solv / 1000; S.weightTolerance = +d.tol;
        AP.audit('Изменены нормы и тарифы', 'settings', null, 'тариф ' + S.tariff + ' сум/кВт·ч · допуск веса ' + S.weightTolerance + '%');
        AP.save(); UI.toast('Нормы сохранены', 'Плановая себестоимость пересчитана'); AP.render();
      };
    },
  });

  /* ================= ОТЧЁТЫ ================= */
  const inR = (s, a, b) => { const d = D.dayOf(s); return d >= a && d <= b; };
  const REPORTS = [
    { key: 'output', icon: 'factory', title: 'Выпуск по цехам', desc: 'Готовая продукция по дням, неделям и месяцам, выполнение плана', build(R) {
      const days = []; for (let i = 0; i < R.days; i++) days.push(D.iso(D.addDays(R.from, i)));
      const u = AP.db.units.filter((x) => x.type !== 'pallet' && inR(x.at, R.from, R.to) && AP.inScope(x.workshop));
      const g = AP.groupBy(u, (x) => D.dayOf(x.at) + x.workshop);
      const rows = days.map((d) => [F.date(d), Math.round(AP.sum(g[d + 'w1'] || [], 'net')), Math.round(AP.sum(g[d + 'w2'] || [], 'net'))]).map((r) => r.concat([r[1] + r[2]]));
      const due = AP.db.orders.filter((o) => AP.orderVisible(o) && o.deadline >= R.from && o.deadline <= R.to);
      const onTime = due.filter((o) => { const us = AP.unitsOf(o.id); const last = us.length ? us.reduce((a, b) => (a.at > b.at ? a : b)).at : null; return last && AP.producedQty(o) >= o.qty * 0.98 && D.dayOf(last) <= o.deadline; }).length;
      return { cols: ['Дата', 'Цех №1, кг', 'Цех №2, кг', 'Итого, кг'], rows, total: ['Итого', AP.sum(rows, (r) => r[1]), AP.sum(rows, (r) => r[2]), AP.sum(rows, (r) => r[3])], chart: { type: 'stack', labels: days.map(F.dm), series: [{ name: 'Цех №1', color: 'var(--s1)', values: rows.map((r) => r[1]) }, { name: 'Цех №2', color: 'var(--s2)', values: rows.map((r) => r[2]) }], tipFmt: F.kg }, note: 'Выполнение плана: в срок готово ' + onTime + ' из ' + due.length + ' заказов со сроком в периоде' };
    } },
    { key: 'materials', icon: 'layers', title: 'Сырьё и краски: норма и факт', desc: 'Перерасход и экономия по каждой позиции', build(R) {
      const w = AP.db.writeoffs.filter((x) => inR(x.at, R.from, R.to) && AP.inScope(x.workshop));
      const g = AP.groupBy(w, 'materialId');
      const rows = Object.keys(g).map((k) => { const f = AP.sum(g[k], 'qty'), n = AP.sum(g[k], 'norm'); return [AP.material(k).name, AP.material(k).unit, Math.round(n * 10) / 10, Math.round(f * 10) / 10, Math.round((f - n) * 10) / 10, n ? Math.round((f / n - 1) * 1000) / 10 + '%' : '—']; }).sort((a, b) => b[3] - a[3]);
      return { cols: ['Позиция', 'Ед.', 'Норма', 'Факт', 'Разница', 'Откл.'], rows };
    } },
    { key: 'defects', icon: 'alert', title: 'Брак и отходы', desc: 'По причинам, станкам и заказам; сравнение с нормой', build(R) {
      const d = AP.db.defects.filter((x) => inR(x.date, R.from, R.to) && AP.inScope(x.workshop));
      const g = AP.groupBy(d, (x) => x.orderId);
      const rows = Object.keys(g).map((oid) => { const o = AP.order(oid), p = AP.product(o.productId); const ext = AP.sum(AP.db.outputs.filter((x) => x.orderId === oid && x.stage === 'extrusion'), 'kg'); const def = AP.sum(g[oid].filter((x) => x.kind !== 'waste'), 'kg'), was = AP.sum(g[oid].filter((x) => x.kind === 'waste'), 'kg'); return [o.no, p.name, Math.round(def * 10) / 10, Math.round(was * 10) / 10, ext ? Math.round((def / ext) * 1000) / 10 + '%' : '—', p.defect + '%']; });
      return { cols: ['Заказ', 'Продукция', 'Брак, кг', 'Отходы, кг', 'Брак, %', 'Норма'], rows };
    } },
    { key: 'machines', icon: 'wrench', title: 'Станки и операторы', desc: 'Выработка, простои, выработка операторов', build(R) {
      const o = AP.db.outputs.filter((x) => inR(x.date, R.from, R.to) && AP.inScope(x.workshop));
      const dts = AP.db.downtimes.filter((x) => inR(x.start, R.from, R.to));
      const rows = AP.db.machines.filter((m) => AP.inScope(m.workshop) && m.type !== 'pack').map((m) => { const kg = AP.sum(o.filter((x) => x.machineId === m.id), 'kg'); const dt = dts.filter((x) => x.machineId === m.id); const mins = AP.sum(dt, (x) => ((x.end ? D.parse(x.end) : Date.now()) - D.parse(x.start)) / 60000); return [m.name, AP.wsName(m.workshop), Math.round(kg), dt.length, Math.round(mins)]; });
      const ops = AP.groupBy(o, 'operatorId');
      Object.keys(ops).forEach((k) => rows.push(['  ' + ((AP.employee(k) || {}).name || '—'), 'оператор', Math.round(AP.sum(ops[k], 'kg')), '', '']));
      return { cols: ['Станок / оператор', 'Цех', 'Выработка, кг', 'Простоев', 'Простой, мин'], rows };
    } },
    { key: 'clients', icon: 'users', title: 'Клиенты и заказы', desc: 'Заказы, отгрузки, выручка и оплаты по клиентам', money: true, build(R) {
      const rows = AP.db.clients.filter(AP.clientVisible).map((c) => { const os = AP.ordersOf(c.id).filter((o) => inR(o.date, R.from, R.to)); const sh = AP.db.shipments.filter((s) => s.clientId === c.id && inR(s.date, R.from, R.to)); const rev = AP.sum(sh, (s) => AP.orderAmount(AP.order(s.orderId), s.qty)); const paid = AP.sum(AP.db.payments.filter((p) => p.clientId === c.id && inR(p.date, R.from, R.to)), 'amount'); return [c.name, os.length, Math.round(AP.sum(sh, 'kg')), Math.round(rev), Math.round(paid), Math.round(AP.clientDebt(c.id).total)]; }).filter((r) => r[1] || r[2] || r[5]).sort((a, b) => b[3] - a[3]);
      return { cols: ['Клиент', 'Заказов', 'Отгружено, кг', 'Выручка', 'Оплачено', 'Долг сейчас'], rows };
    } },
    { key: 'debtors', icon: 'scale2', title: 'Должники', desc: 'Кто и сколько должен, сроки и просрочка', money: true, build() {
      const R2 = AP.receivables();
      const rows = AP.db.clients.filter(AP.clientVisible).filter((c) => R2[c.id].total).map((c) => { const d = R2[c.id]; return [c.name, (AP.userById(c.managerId) || {}).name || '', Math.round(d.total), Math.round(d.overdue), d.maxDays, Math.round(d.b.d60p)]; }).sort((a, b) => b[2] - a[2]);
      return { cols: ['Клиент', 'Менеджер', 'Долг', 'Просрочено', 'Дней', 'Более 60 дней'], rows };
    } },
    { key: 'stock', icon: 'box', title: 'Остатки сырья', desc: 'На складе и в цехах, ниже минимума', build() {
      const st = AP.stock();
      return { cols: ['Позиция', 'Ед.', 'Склад', 'Цех №1', 'Цех №2', 'Итого', 'Минимум'], rows: AP.db.materials.map((m) => [m.name, m.unit, Math.round(st[m.id].sklad * 10) / 10, Math.round(st[m.id].w1 * 10) / 10, Math.round(st[m.id].w2 * 10) / 10, Math.round(st[m.id].total * 10) / 10, m.min]) };
    } },
  ];
  function openReport(rep, per = 'month') {
    const R = AP.periodRange(per);
    const res = rep.build(R);
    const fmtCell = (v) => (typeof v === 'number' ? F.num(v, Math.abs(v) < 100 && v % 1 ? 1 : 0) : v);
    const dr = UI.drawer({
      title: rep.title, sub: F.date(R.from) + ' — ' + F.date(R.to),
      body: html`<div class="row mb-16">${UI.periodSeg(per, [['week', '7 дней'], ['month', '30 дней'], ['q', '90 дней']])}</div>
        ${res.note ? html`<div class="alert alert-info mb-16">${I('target')}<div class="grow"><b>${res.note}</b></div></div>` : ''}
        ${res.chart ? html`<div class="card mb-16"><div class="card-b">${UI.chart(Object.assign({ height: 220 }, res.chart))}</div></div>` : ''}
        <div class="card"><div class="table-wrap"><table class="table compact"><thead><tr>${res.cols.map((c, i) => html`<th class="${i ? 'r' : ''}">${c}</th>`)}</tr></thead><tbody>${res.rows.map((r) => html`<tr>${r.map((v, i) => html`<td class="${i ? 'r' : 'fw-7'}">${fmtCell(v)}</td>`)}</tr>`)}</tbody>${res.total ? html`<tfoot><tr>${res.total.map((v, i) => html`<td class="${i ? 'r' : ''}">${fmtCell(v)}</td>`)}</tr></tfoot>` : ''}</table></div></div>`,
      foot: html`<button class="btn btn-secondary" data-r="xls">${I('download')}Excel</button><button class="btn btn-secondary" data-r="pdf">${I('print')}PDF / печать</button>`,
    });
    UI.$$('[data-period]', dr).forEach((b) => (b.onclick = () => { UI.closeTop(); openReport(rep, b.dataset.period); }));
    dr.querySelector('[data-r=xls]').onclick = () => AP.exportCSV('otchet-' + rep.key + '-' + R.from + '-' + R.to, [res.cols].concat(res.rows, res.total ? [res.total] : []));
    dr.querySelector('[data-r=pdf]').onclick = () => { UI.printDoc(rep.title, `<h1>${AP.esc(rep.title)}</h1><div class="muted">${F.date(R.from)} — ${F.date(R.to)} · ${AP.esc(AP.scope() === 'all' ? 'оба цеха' : AP.wsName(AP.scope()))}</div>${res.note ? '<p>' + AP.esc(res.note) + '</p>' : ''}<table><tr>${res.cols.map((c) => '<th>' + AP.esc(c) + '</th>').join('')}</tr>${res.rows.map((r) => '<tr>' + r.map((v, i) => '<td class="' + (i ? 'r' : '') + '">' + AP.esc(fmtCell(v)) + '</td>').join('') + '</tr>').join('')}${res.total ? '<tr>' + res.total.map((v, i) => '<td class="' + (i ? 'r' : '') + '"><b>' + AP.esc(fmtCell(v)) + '</b></td>').join('') + '</tr>' : ''}</table>`); AP.audit('Отчёт в PDF', 'report', rep.key, rep.title); AP.save(); };
  }
  AP.page('reports', {
    title: 'Отчёты',
    render() {
      const list = REPORTS.filter((r) => !r.money || AP.seeMoney());
      const ob = AP.outputByDay(30);
      const ws = AP.scope() === 'all' ? ['w1', 'w2'] : [AP.scope()];
      return html`${UI.pageHead('Отчёты', 'Все отчёты выгружаются в Excel и PDF и печатаются. Данные — из весов, склада и производства, без ручной подготовки.')}
        <div class="card mb-16"><div class="card-h"><h3>Выпуск за 30 дней, кг</h3>${UI.legend(ws.map((w) => ({ name: AP.wsName(w), color: w === 'w1' ? 'var(--s1)' : 'var(--s2)' })))}</div><div class="card-b">${UI.chart({ type: 'stack', height: 220, labels: ob.days.map(F.dm), tipLabels: ob.days.map(F.date), series: ws.map((w) => ({ name: AP.wsName(w), color: w === 'w1' ? 'var(--s1)' : 'var(--s2)', values: ob[w] })), tipFmt: F.kg })}</div></div>
        <div class="big-actions">${list.map((r) => html`<button class="big-act" data-rep="${r.key}"><span class="ba-ic" style="background:var(--brand-50);color:var(--brand)">${I(r.icon)}</span><span><b>${r.title}</b><br><small>${r.desc}</small></span></button>`)}</div>`;
    },
    mount(el) { UI.$$('[data-rep]', el).forEach((b) => (b.onclick = () => openReport(REPORTS.find((r) => r.key === b.dataset.rep)))); },
  });

  /* ================= ПОЛЬЗОВАТЕЛИ И ПРАВА ================= */
  const genPass = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const p = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => a[x % a.length]).join(''); return p(4) + '-' + p(4) + '-' + p(3); };
  function showPassword(u, pass) {
    UI.modal({ title: 'Пароль для ' + u.name, sub: 'Покажите или передайте лично. После закрытия окна пароль больше не отображается — хранится только его отпечаток (хеш).',
      body: html`<div class="card tint"><div class="card-b"><dl class="dl"><dt>Логин</dt><dd class="mono fs-16">${u.login}</dd><dt>Пароль</dt><dd class="mono fs-20">${pass}</dd></dl></div></div>`,
      foot: html`<button class="btn btn-secondary" data-copy>${I('copy')}Скопировать</button><button class="btn btn-primary" data-close>Готово</button>` })
      .querySelector('[data-copy]').onclick = () => { navigator.clipboard && navigator.clipboard.writeText('Логин: ' + u.login + '\nПароль: ' + pass).then(() => UI.toast('Скопировано', '')); };
  }
  function rightsDrawer(u) {
    const isDir = u.role === 'director';
    const body = html`<form id="rf">
      ${isDir ? html`<div class="alert alert-info mb-16">${I('shield')}<div class="grow"><b>Главный руководитель видит всё</b><small>Его права не ограничиваются. Финансовый дашборд — только у него.</small></div></div>` : ''}
      <div class="form-grid mb-16"><div class="field"><label>Роль (шаблон прав)</label><select class="select" name="role" ${isDir ? raw('disabled') : ''}>${UI.options(Object.entries(AP.ROLE_PRESETS).filter(([k]) => k !== 'director' || isDir).map(([k, v]) => [k, v.title]), u.role)}</select><span class="hint">Смена шаблона заполнит матрицу ниже — потом её можно подправить</span></div>
        <div class="field"><label>Доступ к цехам</label><select class="select" name="workshop" ${isDir ? raw('disabled') : ''}>${UI.options([['all', 'Оба цеха'], ['w1', 'Только Цех №1'], ['w2', 'Только Цех №2']], u.workshop)}</select></div></div>
      <div class="card mb-16"><div class="table-wrap"><table class="table perm-table"><thead><tr><th>Раздел</th><th>Уровень доступа</th></tr></thead><tbody>
        ${AP.SECTIONS.map((s) => html`<tr><td class="fw-7">${s.title}${s.money ? html` <span class="badge sm">финансы</span>` : ''}</td><td>${s.directorOnly ? html`<span class="badge b-dark plain">${I('lock', 'icon-16')}только главный руководитель — выдать нельзя</span>` : html`<select class="select lvl-${AP.level(s.key, u)}" name="p_${s.key}" ${isDir ? raw('disabled') : ''}>${UI.options(AP.LEVELS.map((t, i) => [i, t]), AP.level(s.key, u))}</select>`}</td></tr>`)}
      </tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Особые права</h3></div><div class="card-b stack" style="gap:12px">${AP.FLAGS.map((f) => html`<label class="switch"><input type="checkbox" name="f_${f.key}" ${AP.flag(f.key, u) ? raw('checked') : ''} ${isDir ? raw('disabled') : ''}><span><b>${f.title}</b><br><span class="hint">${f.hint}</span></span></label>`)}</div></div>
      <div class="fs-12 muted mt-12">Уровни: «Просмотр» — только смотреть; «Изменение» — создавать и менять; «Полный» — ещё удалять и утверждать.</div></form>`;
    const dr = UI.drawer({ title: 'Права: ' + u.name, sub: u.title + ' · логин ' + u.login, body, foot: isDir ? '' : html`<button class="btn btn-primary" data-save>${I('check')}Сохранить права</button>`, head: UI.avatar(u.name, u.id, 'lg') });
    const f = dr.querySelector('#rf');
    UI.$$('select[name^=p_]', f).forEach((s) => (s.onchange = () => (s.className = 'select lvl-' + s.value)));
    if (f.role) f.role.onchange = () => {
      const pr = AP.ROLE_PRESETS[f.role.value];
      AP.SECTIONS.forEach((s) => { const el = f['p_' + s.key]; if (el) { el.value = pr.perms[s.key] || 0; el.className = 'select lvl-' + el.value; } });
      AP.FLAGS.forEach((fl) => (f['f_' + fl.key].checked = !!pr.flags[fl.key]));
      if (pr.workshop) f.workshop.value = pr.workshop;
    };
    const sv = dr.querySelector('[data-save]');
    if (sv) sv.onclick = () => {
      const d = UI.formData(f);
      const before = JSON.stringify({ p: u.perms, f: u.flags, w: u.workshop });
      u.role = d.role; u.title = d.role === 'shop' ? 'Начальник ' + (d.workshop === 'w2' ? 'цеха №2' : 'цеха №1') : AP.ROLE_PRESETS[d.role].title;
      u.workshop = d.workshop;
      u.perms = {}; AP.SECTIONS.forEach((s) => { if (!s.directorOnly && +d['p_' + s.key]) u.perms[s.key] = +d['p_' + s.key]; });
      u.flags = {}; AP.FLAGS.forEach((fl) => { if (d['f_' + fl.key]) u.flags[fl.key] = true; });
      if (JSON.stringify({ p: u.perms, f: u.flags, w: u.workshop }) !== before) AP.audit('Изменены права пользователя', 'user', u.id, u.name + ' · ' + AP.SECTIONS.filter((s) => u.perms[s.key]).map((s) => s.title + ': ' + AP.LEVELS[u.perms[s.key]].toLowerCase()).join(', '));
      AP.save(); UI.closeTop(); UI.toast('Права сохранены', u.name); AP.render();
    };
  }
  function addUser() {
    const m = UI.modal({ title: 'Новый пользователь', sub: 'У каждого — свой логин и пароль. Общий вход на нескольких человек не делаем, иначе непонятно, кто что сделал.',
      body: html`<form class="form-grid"><div class="field full"><label>ФИО <span class="req">*</span></label><input class="input" name="name"></div><div class="field"><label>Логин <span class="req">*</span></label><input class="input" name="login" placeholder="латиницей" autocomplete="off"></div><div class="field"><label>Роль</label><select class="select" name="role">${UI.options(Object.entries(AP.ROLE_PRESETS).filter(([k]) => k !== 'director').map(([k, v]) => [k, v.title]), 'storekeeper')}</select></div><div class="field"><label>Цех</label><select class="select" name="workshop">${UI.options([['all', 'Оба цеха'], ['w1', 'Цех №1'], ['w2', 'Цех №2']])}</select></div></form>`,
      foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-ok>Создать и выдать пароль</button>` });
    m.querySelector('[data-ok]').onclick = async () => {
      const d = UI.formData(m.querySelector('form'));
      const login = (d.login || '').toLowerCase();
      if (!d.name || !/^[a-z0-9._-]{3,}$/.test(login)) return UI.toast('Проверьте ФИО и логин', 'Логин — латиница и цифры, от 3 символов', 'bad');
      if (AP.db.users.some((u) => u.login === login)) return UI.toast('Такой логин уже есть', '', 'bad');
      const pr = AP.ROLE_PRESETS[d.role], pass = genPass();
      const u = { id: 'u' + (AP.db.users.length + 1) + Date.now().toString(36).slice(-3), login, name: d.name, role: d.role, title: d.role === 'shop' ? 'Начальник ' + (d.workshop === 'w2' ? 'цеха №2' : 'цеха №1') : pr.title, workshop: d.role === 'shop' && d.workshop === 'all' ? 'w1' : d.workshop, active: true, perms: Object.assign({}, pr.perms), flags: Object.assign({}, pr.flags), created: new Date().toISOString(), passHash: await AP.passHash(login, pass) };
      AP.db.users.push(u);
      AP.audit('Создан пользователь', 'user', u.id, u.name + ' · ' + u.title + ' · ' + AP.wsName(u.workshop === 'all' ? null : u.workshop));
      AP.save(); UI.closeTop(); AP.render(); showPassword(u, pass);
    };
  }
  AP.page('users', {
    title: 'Пользователи и права',
    render() {
      const users = AP.db.users;
      return html`${UI.pageHead('Пользователи и права', 'Права настраиваются отдельно для каждого: какие разделы видит, что может только смотреть, а что — создавать, менять, удалять и утверждать', html`<button class="btn btn-primary" data-x="add">${I('plus')}Добавить пользователя</button>`)}
        <div class="grid g-21 mb-16">
          <div class="card iris"><div class="card-h"><h3>Кому нужен доступ по ТЗ</h3><span class="sub">раздел 2</span></div><div class="card-b stack" style="gap:12px">
            ${[['shield', 'Главный руководитель', 'видит всё по обоим цехам, финансам и отчётам; создаёт пользователей; журнал действий; утверждает важные операции; единственный видит финансовый дашборд'], ['factory', 'Начальник цеха №1 и №2', 'только свой цех: задания, выработка, сырьё и краски цеха, брак, простои, весы. Финансов и чужого цеха не видит'], ['users', 'Около 30 сотрудников', 'в программу не заходят — ведутся списком в «Персонале»: цех, смена, выработка, начисления']].map(([ic, t, d]) => html`<div class="row nowrap" style="align-items:flex-start"><span class="avatar" style="background:var(--brand)">${I(ic, 'icon-16')}</span><div><b>${t}</b><div class="fs-13 text-2">${d}</div></div></div>`)}
          </div></div>
          <div class="card"><div class="card-h"><h3>Дополнительные роли</h3><span class="sub">не обязательны на старте</span></div><div class="card-b fs-13 text-2" style="font-weight:600">Кладовщик, менеджер по продажам, бухгалтер и оператор весов уже заведены, но <b>отключены</b>. Включите переключателем, когда понадобится, — без переделки программы.</div></div>
        </div>
        <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Пользователь</th><th>Роль</th><th>Цеха</th><th>Разделы</th><th>Последний вход</th><th class="c">Активен</th><th></th></tr></thead><tbody>
          ${users.map((u) => { const n = AP.SECTIONS.filter((s) => AP.can(s.key, 1, u)).length; return html`<tr class="${u.active ? '' : 'muted'}"><td><span class="row nowrap" style="gap:10px">${UI.avatar(u.name, u.id)}<span><b style="color:var(--text)">${u.name}</b><span class="cell-sub mono">${u.login}</span></span></span></td><td>${u.title}${u.optional ? html` <span class="badge sm">доп. роль</span>` : ''}</td><td>${UI.wsChip(u.workshop === 'all' ? null : u.workshop)}</td><td class="fs-13">${n} из ${AP.SECTIONS.length}${AP.isDirector(u) ? html` <span class="badge b-dark sm plain">${I('lock', 'icon-16')}фин. дашборд</span>` : ''}</td><td class="fs-13">${u.lastLogin ? F.dt(u.lastLogin) : '—'}</td>
            <td class="c"><label class="switch" style="justify-content:center"><input type="checkbox" data-active="${u.id}" ${u.active ? raw('checked') : ''} ${u.id === AP.user.id ? raw('disabled') : ''}></label></td>
            <td class="r nowrap"><button class="btn btn-ghost btn-sm" data-rights="${u.id}">${I('sliders')}Права</button><button class="btn btn-ghost btn-sm" data-pass="${u.id}">${I('key')}Пароль</button></td></tr>`; })}
        </tbody></table></div></div>
        <div class="alert alert-info mt-16">${I('info')}<div class="grow"><b>Это демо-версия на GitHub Pages</b><small>Пароли хранятся как SHA-256, данные — в браузере. В рабочей версии вход и права проверяет сервер, а журнал хранится в базе без возможности правки (ТЗ 9.3).</small></div></div>`;
    },
    mount(el) {
      UI.$('[data-x=add]', el).onclick = addUser;
      UI.$$('[data-rights]', el).forEach((b) => (b.onclick = () => rightsDrawer(AP.userById(b.dataset.rights))));
      UI.$$('[data-active]', el).forEach((c) => (c.onchange = () => { const u = AP.userById(c.dataset.active); u.active = c.checked; AP.audit(c.checked ? 'Доступ выдан' : 'Доступ отозван', 'user', u.id, u.name + ' · ' + u.title); AP.save(); UI.toast(c.checked ? 'Доступ включён' : 'Доступ отключён', u.name + (c.checked ? ' — выдайте пароль кнопкой «Пароль»' : ''), c.checked ? 'ok' : 'warn'); AP.render(); }));
      UI.$$('[data-pass]', el).forEach((b) => (b.onclick = async () => {
        const u = AP.userById(b.dataset.pass);
        if (!(await UI.confirm('Новый пароль для ' + u.name + '?', 'Старый пароль перестанет работать. Новый покажем один раз — передайте его лично.', { ok: 'Сгенерировать' }))) return;
        const pass = genPass();
        u.passHash = await AP.passHash(u.login, pass);
        AP.audit('Сброшен пароль', 'user', u.id, u.name);
        AP.save(); showPassword(u, pass);
      }));
    },
  });

  /* ================= ЖУРНАЛ ДЕЙСТВИЙ И УТВЕРЖДЕНИЯ ================= */
  const ENT = { order: 'Заказы', unit: 'QR-единицы', shipment: 'Отгрузки', payment: 'Оплаты', expense: 'Расходы', batch: 'Приход сырья', writeoff: 'Списания', user: 'Пользователи', machine: 'Станки', material: 'Материалы', stock: 'Остатки', client: 'Клиенты', settings: 'Нормы', product: 'Продукция', export: 'Выгрузки', purchase: 'Закупки', cash: 'Касса', sync: 'Синхронизация', report: 'Отчёты', act: 'Акты' };
  AP.page('audit', {
    title: 'Журнал действий',
    render(r) {
      const tab = r.q.tab || 'log';
      const pend = AP.db.approvals.filter((a) => a.status === 'pending');
      let body;
      if (tab === 'approvals') {
        const done = AP.db.approvals.filter((a) => a.status !== 'pending').slice().reverse();
        body = html`${pend.length ? pend.map((a) => html`<div class="card mb-16"><div class="card-b row nowrap" style="align-items:flex-start"><span class="avatar lg" style="background:var(--info)">${I('shield')}</span><div class="grow"><b class="fs-16">${a.title}</b><div class="fs-13 text-2 mt-8">${a.comment}</div>
          ${a.kind === 'writeoff_fix' && a.ref ? html`<div class="fs-13 mt-8">Было: <b>${F.num(a.ref.oldQty, 1)}</b> → станет: <b>${F.num(a.ref.newQty, 1)}</b></div>` : ''}<div class="fs-12 muted mt-8">${a.user} · ${F.dt(a.ts)}</div></div>
          ${AP.flag('approve') ? html`<div class="row nowrap"><button class="btn btn-ghost" data-rej="${a.id}">Отклонить</button><button class="btn btn-success" data-ok="${a.id}">${I('check')}Утвердить</button></div>` : ''}</div></div>`) : UI.empty('Нет операций на утверждении', 'Сюда попадают исправления списаний без права и отгрузки должникам', 'check')}
          <div class="card mt-16"><div class="card-h"><h3>Решения</h3></div><div class="table-wrap mt-8"><table class="table compact"><tbody>${done.map((a) => html`<tr><td>${F.dt(a.decidedAt || a.ts)}</td><td class="fw-7">${a.title}</td><td>${a.user}</td><td><span class="badge sm ${a.status === 'approved' ? 'b-ok' : 'b-bad'}">${a.status === 'approved' ? 'утверждено' : 'отклонено'}</span></td><td class="muted">${a.decidedBy || ''}</td></tr>`)}</tbody></table></div></div>`;
      } else {
        let list = AP.db.audit.slice().reverse();
        if (r.q.u) list = list.filter((a) => a.uid === r.q.u);
        if (r.q.e) list = list.filter((a) => a.entity === r.q.e);
        if (r.q.q) { const s = r.q.q.toLowerCase(); list = list.filter((a) => (a.action + ' ' + a.details + ' ' + a.user).toLowerCase().includes(s)); }
        const n = +(r.q.n || 150);
        body = html`<div class="card"><div class="card-h" style="padding-bottom:14px">
          <div class="input-icon grow" style="max-width:320px">${I('search')}<input class="input" data-f="q" placeholder="Номер заказа, QR, действие…" value="${r.q.q || ''}"></div>
          <select class="select" data-f="u" style="max-width:220px">${UI.options(AP.db.users.map((u) => [u.id, u.name]), r.q.u, 'Все пользователи')}</select>
          <select class="select" data-f="e" style="max-width:200px">${UI.options(Object.entries(ENT), r.q.e, 'Все объекты')}</select>
          <span class="badge b-dark plain right">${I('lock', 'icon-16')}записи нельзя изменить или удалить</span></div>
          <div class="table-wrap"><table class="table compact"><thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Подробности</th></tr></thead><tbody>
          ${list.slice(0, n).map((a) => html`<tr><td class="nowrap">${F.dt(a.ts)}</td><td class="nowrap"><span class="row nowrap" style="gap:8px">${UI.avatar(a.user, a.uid || a.user, 'sm')}<span class="fs-13 fw-7">${a.user}</span></span></td><td class="fw-7">${a.action}${a.entity && ENT[a.entity] ? html`<span class="cell-sub">${ENT[a.entity]}</span>` : ''}</td><td class="fs-13">${a.entity === 'order' && a.entityId && AP.order(a.entityId) ? html`<a href="#" data-act="open-order" data-id="${a.entityId}">${a.details}</a>` : a.entity === 'unit' && a.entityId ? html`<a href="#/qr/${a.entityId}">${a.entityId}</a> · ${a.details}` : a.details}</td></tr>`)}
          </tbody></table></div>${list.length > n ? html`<div class="card-f"><button class="btn btn-ghost btn-sm" data-more>Показать ещё (${list.length - n})</button></div>` : ''}</div>`;
      }
      return html`${UI.pageHead('Журнал действий', 'Кто, когда и что сделал. Если кто-то изменил заказ, поправил остаток или вручную ввёл вес — это останется здесь.')}
        ${UI.tabs([['log', 'Журнал', AP.db.audit.length], ['approvals', 'Утверждения', pend.length || null]], tab)}${body}`;
    },
    mount(el, r) {
      UI.bindTabs(el);
      const qi = UI.$('[data-f=q]', el);
      if (qi) { let t; qi.oninput = () => { clearTimeout(t); t = setTimeout(() => { AP.setQuery({ q: qi.value }); setTimeout(() => { const x = UI.$('[data-f=q]'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 0); }, 400); }; }
      ['u', 'e'].forEach((k) => { const s = UI.$('[data-f=' + k + ']', el); if (s) s.onchange = () => AP.setQuery({ [k]: s.value }); });
      const mb = UI.$('[data-more]', el); if (mb) mb.onclick = () => AP.setQuery({ n: (+(r.q.n || 150) + 300) });
      const decide = (id, ok) => {
        const a = AP.db.approvals.find((x) => x.id === id);
        a.status = ok ? 'approved' : 'rejected'; a.decidedBy = AP.user.name; a.decidedAt = new Date().toISOString();
        if (ok && a.kind === 'writeoff_fix') { const w = AP.db.writeoffs.find((x) => x.id === a.ref.writeoffId); if (w) AP.act.applyWriteoffFix(w, a.ref.newQty, a.comment + ' (запрос: ' + a.user + ')', AP.user.name); }
        AP.audit(ok ? 'Операция утверждена' : 'Операция отклонена', 'approval', a.id, a.title);
        AP.save(); UI.toast(ok ? 'Утверждено' : 'Отклонено', a.title, ok ? 'ok' : 'warn'); AP.render();
      };
      UI.$$('[data-ok]', el).forEach((b) => (b.onclick = () => decide(b.dataset.ok, true)));
      UI.$$('[data-rej]', el).forEach((b) => (b.onclick = () => decide(b.dataset.rej, false)));
    },
  });
})();
