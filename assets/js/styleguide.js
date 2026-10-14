/* UI-кит: страница собирается из тех же компонентов, что и приложение */
(function () {
  'use strict';
  const AP = window.AP, UI = AP.ui;
  const { html, raw, fmt: F } = AP;
  const I = UI.icon;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  AP.SG_CLIENTS = ['ООО «Tashkent Savdo Group»', 'ООО «Chirchiq Non»', 'ООО «Fresh Market»', 'ИП Абдуллаев Р. (рынок «Чорсу»)', 'ООО «Silk Road Food»', 'ООО «Bahor Textile»', 'ООО «Navruz Pharm»', 'ООО «Green Box Logistics»', 'ЧП «Mirzo Plast Savdo»', 'ООО «Samarqand Agro Export»', 'ООО «Olmaliq Meva»'];
  const SECTIONS = [['brand', 'Бренд'], ['colors', 'Цвета'], ['type', 'Шрифты'], ['buttons', 'Кнопки'], ['forms', 'Формы'], ['badges', 'Статусы'], ['cards', 'Карточки'], ['tables', 'Таблицы'], ['charts', 'Графики'], ['sidebar', 'Сайдбар'], ['sections', 'Разделы и доступы'], ['shop', 'Цех и весы'], ['icons', 'Иконки']];
  const sec = (id, n, title, lead, body) => html`<section class="sg-sec" id="${id}"><h2><span>${String(n).padStart(2, '0')}</span>${title}</h2>${lead ? html`<p class="lead">${lead}</p>` : ''}${body}</section>`;
  const sw = (name, token, note) => html`<div class="sw"><i style="background:var(${token})"></i><div><b>${name}</b><code data-tok="${token}">${token}</code>${note ? html`<div class="fs-12 muted" style="padding:0">${note}</div>` : ''}</div></div>`;

  const COLORS = [
    ['Бренд', [['Чернила 900 — сайдбар', '--ink-900'], ['Чернила 800', '--ink-800'], ['Чернила 600', '--ink-600'], ['Бренд — кнопки, ссылки', '--brand'], ['Бренд 600 — наведение', '--brand-600'], ['Бренд 50 — фоны', '--brand-50'], ['Бирюза', '--teal']]],
    ['Поверхности и текст', [['Фон страницы', '--bg'], ['Карточка', '--surface'], ['Подложка', '--surface-2'], ['Разделитель', '--border'], ['Граница полей', '--border-strong'], ['Текст', '--text'], ['Второстепенный', '--text-2'], ['Подписи', '--text-3']]],
    ['Статусы — только для состояний, всегда с иконкой и текстом', [['Норма', '--ok'], ['Внимание', '--warn'], ['Проблема', '--bad'], ['Инфо', '--info'], ['Макет', '--violet'], ['Склад', '--cyan'], ['Частично', '--orange']]],
    ['Графики — фиксированный порядок серий', [['Серия 1 · Цех №1 · безнал', '--s1'], ['Серия 2 · Цех №2 · наличные', '--s2'], ['Серия 3 · корп. карта', '--s3'], ['Серия 4 · расходы', '--s4'], ['Долг: не просрочен', '--age-0'], ['до 30 дней', '--age-1'], ['31–60 дней', '--age-2'], ['больше 60', '--age-3']]],
  ];

  const ROLE_COLS = [['director', 'Руков.'], ['shop', 'Нач. цеха'], ['storekeeper', 'Кладовщик'], ['sales', 'Менеджер'], ['accountant', 'Бухгалтер'], ['operator', 'Оператор весов']];
  const LVL_SHORT = ['—', 'смотрит', 'меняет', 'полный'];

  function render() {
    const statuses = AP.STATUS_ORDER.concat(['cancelled']);
    const demoTable = [
      ['ЗК-1056', 'ООО «Tashkent Savdo Group»', 'Пакет-майка 40×70 с логотипом', '90 000', 'production', 0.62, '31 770 000'],
      ['ЗК-1052', 'ООО «Olmaliq Meva»', 'Пакет-майка 35×60, синий', '240 000', 'waiting', 0, '43 200 000'],
      ['ЗК-1061', 'ИП Абдуллаев Р.', 'Пакет-майка 35×60, синий', '200 000', 'partial', 1, '36 000 000'],
    ];
    return html`
      <header class="sg-top"><div class="sg-bar">${UI.logoMark(34)}<span><b>ALI PLAST · UI-кит</b><small>Дизайн-система учёта производства</small></span>
        <span class="grow"></span><a class="btn btn-sm btn-dark" style="border-color:rgba(255,255,255,.12)" href="index.html">${I('arrowLeft')}Ко входу</a>
        <button class="btn btn-sm btn-icon" style="color:#fff" data-theme-toggle data-tip-pos="right" aria-label="Сменить тему">${I('moon')}</button></div>
        <nav class="sg-nav">${SECTIONS.map(([id, t]) => html`<a href="#${id}">${t}</a>`)}</nav></header>
      <main class="sg-main">
        <div class="sg-hero"><div><span class="badge b-dark plain">CHIRCHIQ ALI PLAST</span><h1 class="mt-12">Плёнка, цифры и порядок</h1>
          <p>Тёмный сайдбар как цеховая табличка, светлые рабочие экраны и радужный перелив полиэтилена — только в акцентах. Всё собрано на токенах: цвет меняется в одном месте — меняется везде, включая тёмную тему.</p>
          <div class="row mt-16"><a class="btn btn-iris btn-lg" href="#buttons">Компоненты ${I('arrowRight')}</a><a class="btn btn-dark btn-lg" style="border-color:rgba(255,255,255,.14)" href="app.html">Открыть программу</a></div></div>
          <div style="display:grid;place-items:center">${UI.logoMark(190)}</div></div>

        ${sec('brand', 1, 'Бренд', 'Знак — пакет-майка, главный продукт фирмы. Градиент «плёнка» повторяет радужный отлив полиэтилена: используем его на знаке, главной кнопке входа и тонкой линии сверху карточек — не больше.', html`
          <div class="grid g-3">
            <div class="card" style="background:var(--ink-900);border-color:var(--ink-700)"><div class="card-b row" style="gap:14px;color:#fff">${UI.logoMark(48)}<div><b class="wordmark" style="font-size:20px">ALI PLAST</b><div class="fs-12" style="letter-spacing:.24em;color:var(--ink-300)">CHIRCHIQ · UZBEKISTAN</div></div></div></div>
            <div class="card"><div class="card-b row" style="gap:14px">${UI.logoMark(48)}<div><b class="wordmark" style="font-size:20px">ALI PLAST</b><div class="fs-12 muted" style="letter-spacing:.24em">CHIRCHIQ · UZBEKISTAN</div></div></div></div>
            <div class="card"><div class="card-b"><div style="height:56px;border-radius:12px;background:var(--iris)"></div><div class="spec mt-8">--iris: #7FE7F2 → #8FA9FF → #C6A2FF → #FFB4DB</div></div></div>
          </div>`)}

        ${sec('colors', 2, 'Цвета', 'Токены из assets/css/app.css. Тема меняется сама: тёмная с 18:00, светлая с 8:00 (вручную — до следующего переключения). В тёмной теме у каждого цвета свой шаг; все тексты и метки проверены на контраст не ниже 4,5:1 — коды ниже пересчитываются при смене темы.', html`${COLORS.map(([g, list]) => html`<h3 class="mt-16 mb-12">${g}</h3><div class="swatches">${list.map(([n, t]) => sw(n, t))}</div>`)}`)}

        ${sec('type', 3, 'Шрифты', 'Три гарнитуры с кириллицей, лежат локально в assets/fonts (не зависят от Google Fonts).', html`<div class="card"><div class="card-b">
          <div class="type-row"><div><b>Unbounded</b><div class="spec">заголовки · 600 / 700</div></div><div style="font:600 34px/1.1 var(--font-display);letter-spacing:-.02em">Заказ ЗК-1056 в производстве</div></div>
          <div class="type-row"><div><b>Manrope</b><div class="spec">текст · 500–800</div></div><div style="font-size:16px;font-weight:500">Начальник цеха видит только свой цех: задания, выработку, расход сырья, брак и простои. Финансы ему недоступны.</div></div>
          <div class="type-row"><div><b>JetBrains Mono</b><div class="spec">коды, вес, QR</div></div><div class="mono" style="font-size:20px;font-weight:700">AP-002889 · 17,80 кг · ТТН-00062</div></div>
          <div class="type-row"><div><b>Шкала</b><div class="spec">h1 24 · h2 18 · h3 15 · текст 14 · подпись 12</div></div><div class="stack" style="gap:8px"><h1>Заголовок страницы</h1><h2>Заголовок карточки</h2><h3>Подзаголовок блока</h3><div>Основной текст интерфейса 14 px</div><div class="hint">Подсказка под полем 12 px</div></div></div>
          <div class="type-row"><div><b>Цифры</b><div class="spec">tabular-nums · пробел тысяч</div></div><div class="kpi" style="padding:0"><div class="k-value">149 686 750 <small>сум</small></div></div></div>
        </div></div>`)}

        ${sec('buttons', 4, 'Кнопки', 'Одна главная кнопка на экран. Высота 38 px (обычная), 32 / 26 (компактные), 46 и 64 px — для цехового экрана, где жмут в перчатках.', html`<div class="card"><div class="card-b stack">
          <div class="demo"><button class="btn btn-primary">${I('plus')}Новый заказ</button><button class="btn btn-secondary">${I('download')}Excel</button><button class="btn btn-soft">${I('layers')}Заявка на закупку</button><button class="btn btn-ghost">Отмена</button><button class="btn btn-success">${I('check')}Утвердить</button><button class="btn btn-danger">${I('pause')}Остановить станок</button><button class="btn btn-dark">Тёмная</button></div>
          <div class="demo"><button class="btn btn-iris btn-lg">Войти ${I('arrowRight')}</button><span class="spec">btn-iris — только вход и промо</span></div>
          <div class="demo"><button class="btn btn-primary btn-xl">${I('check')}Принять вес</button><button class="btn btn-primary btn-lg">Большая</button><button class="btn btn-primary">Обычная</button><button class="btn btn-primary btn-sm">Малая</button><button class="btn btn-primary btn-xs">Мини</button></div>
          <div class="demo"><button class="btn btn-icon">${I('bell')}</button><button class="btn btn-icon btn-sm">${I('edit')}</button><button class="btn btn-primary" disabled>Недоступна</button><button class="btn btn-secondary"><span class="spin"></span>Проверяем…</button>
            <div class="btn-group"><button class="btn btn-secondary btn-sm">День</button><button class="btn btn-secondary btn-sm">Неделя</button><button class="btn btn-secondary btn-sm">Месяц</button></div>
            <div class="seg"><button class="on">Все цеха</button><button>Цех №1</button><button>Цех №2</button></div></div>
        </div></div>`)}

        ${sec('forms', 5, 'Формы', 'Подпись над полем, подсказка под ним. Ошибка — красная рамка и текст, а не только цвет. Обязательные поля — со звёздочкой.', html`<div class="grid g-2">
          <div class="card"><div class="card-b"><div class="form-grid">
            <div class="field"><label>Клиент <span class="req">*</span></label><select class="select">${AP.SG_CLIENTS.map((x, i) => html`<option ${i === 2 ? raw('selected') : ''}>${x}</option>`)}</select><span class="hint">Свой список: поиск, если пунктов больше 8; на телефоне — «шторка» снизу</span></div>
            <div class="field"><label>Тираж <span class="req">*</span></label><div class="input-group"><input class="input" value="120000"><span class="addon">шт</span></div><span class="hint">120 000 шт · 1 176 кг · 60 коробок</span></div>
            <div class="field"><label>Статус</label><select class="select" data-search="off"><option data-count="13">Все активные</option><option data-count="63">Все, включая закрытые</option>${AP.STATUS_ORDER.map((k, i) => html`<option data-dot="${AP.STATUSES[k].c}" data-count="${[2, 1, 1, 2, 4, 1, 1, 1, 11, 39][i]}" ${i === 0 ? raw('data-sep') : ''} ${k === 'production' ? raw('selected') : ''}>${AP.STATUSES[k].t}</option>`)}</select><span class="hint">Фильтр с количеством: у пункта <code>data-dot</code> — цвет статуса, <code>data-count</code> — счётчик, <code>data-sep</code> — разделитель</span></div>
            <div class="field"><label>Поиск</label><div class="input-icon">${I('search')}<input class="input" placeholder="Номер, клиент…"></div></div>
            <div class="field"><label>Срок</label><input class="input" type="date" value="2026-10-24"></div>
            <div class="field is-invalid"><label>Логин</label><input class="input" value="Директор"><span class="hint">Логин — латиница и цифры</span></div>
            <div class="field"><label>Только чтение</label><input class="input" value="ЗК-1056" readonly></div>
            <div class="field full"><label>Комментарий <span class="req">*</span></label><textarea class="textarea" placeholder="Причина исправления — попадёт в журнал действий"></textarea></div>
            <div class="field"><label>Вес вручную</label><input class="input input-lg" value="17,80"></div>
            <div class="field"><label>Недоступно</label><input class="input" value="нет права" disabled></div>
          </div></div></div>
          <div class="card"><div class="card-b stack">
            <label class="check"><input type="checkbox" checked>Печать логотипа клиента</label>
            <label class="check"><input type="checkbox">Срочный заказ</label>
            <div class="row"><label class="check"><input type="radio" name="r1" checked>Безналичные</label><label class="check"><input type="radio" name="r1">Наличные</label><label class="check"><input type="radio" name="r1">Корп. карта</label></div>
            <label class="switch"><input type="checkbox" checked>Сразу печатать этикетку</label>
            <label class="switch"><input type="checkbox">Нет связи с сервером</label>
            <label class="switch"><input type="checkbox" disabled>Выключено правами</label>
            <div class="divider"></div>
            <div class="alert alert-info">${I('info')}<div class="grow"><b>Списание сработает автоматически</b><small>Гранулят и мастербатч — по рецептуре при выпуске плёнки</small></div></div>
            <div class="alert alert-ok">${I('check')}<div class="grow"><b>Отгрузка разрешена директором</b></div></div>
            <div class="alert alert-warn">${I('alert')}<div class="grow"><b>Не хватает: Мастербатч синий</b><small>Будет сформирована заявка на закупку</small></div></div>
            <div class="alert alert-bad">${I('alert')}<div class="grow"><b>У клиента просроченный долг</b><small>Решение об отгрузке принимает директор</small></div></div>
            <div class="row"><button class="btn btn-secondary btn-sm" data-tip="Подсказка в стиле сайта — вместо системной">Наведите — подсказка</button><button class="btn btn-secondary btn-sm" data-toast="ok">Тост: успех</button><button class="btn btn-secondary btn-sm" data-toast="warn">Тост: внимание</button><button class="btn btn-secondary btn-sm" data-modal>Модальное окно</button><button class="btn btn-secondary btn-sm" data-drawer>Боковая карточка</button></div>
          </div></div></div>`)}

        ${sec('badges', 6, 'Статусы и метки', 'Статусы заказа меняются сами — по весам, складу и оплатам. Каждый статус — точка + текст, цвет не единственный признак.', html`<div class="card"><div class="card-b stack">
          <div class="demo">${statuses.map((s) => AP.statusBadge(s))}</div>
          <div class="demo">${UI.wsChip('w1')}${UI.wsChip('w2')}${UI.wsChip('sklad')}${UI.wsChip(null)}<span class="chip urgent">${I('zap')}срочно</span><span class="chip ghost mono">AP-002889</span><span class="badge b-dark plain">${I('lock', 'icon-16')}только для директора</span></div>
          <div class="demo"><span class="delta up">▲ 12%</span><span class="delta down">▼ 4,5%</span><span class="delta flat">0%</span><span class="badge b-teal sm">${I('recycle', 'icon-16')}на переработку</span><span class="badge b-warn sm">вес вручную</span><span class="badge b-warn sm">в очереди</span>
            ${Object.keys(AP.PAY).map((k) => html`<span class="row nowrap" style="gap:6px;font-weight:700"><i class="dot" style="background:${AP.PAY[k].c}"></i>${AP.PAY[k].t}</span>`)}</div>
          <div style="max-width:420px" class="stack"><div>${UI.progress(0.35)}</div><div>${UI.progress(1, 'ok')}</div><div>${UI.progress(0.85, 'warn', 'lg')}</div></div>
        </div></div>`)}

        ${sec('cards', 7, 'Карточки и показатели', 'KPI: подпись, крупное число, сравнение с прошлым периодом, мини-график. Кликабельные карточки открывают список операций, из которых сложилась цифра.', html`
          <div class="grid g-4 keep-2">
            ${UI.kpi({ label: 'Выпуск сегодня', icon: 'box', value: '1 433', unit: 'кг', foot: 'Ц1 333 · Ц2 1 100', spark: [3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 12], sparkColor: 'var(--s1)' })}
            ${UI.kpi({ label: 'Поступило', icon: 'arrowDown', value: '658,6 млн', unit: 'сум', foot: html`${UI.delta(658, 400)} к прошлому периоду` })}
            ${UI.kpi({ label: 'Нам должны', icon: 'scale2', value: '318,2 млн', unit: 'сум', foot: html`<span class="badge b-bad sm">просрочено 112,3 млн</span>` })}
            ${UI.kpi({ label: 'Брак за 7 дней', icon: 'alert', value: '2,1', unit: '%', foot: 'от выпуска плёнки' })}
          </div>
          <div class="grid g-3 mt-16">
            <div class="card iris"><div class="card-h"><h3>Карточка с акцентом</h3><span class="sub">подпись справа</span></div><div class="card-b text-2">Тонкая радужная линия сверху — для главных блоков страницы (цеха, этикетка).</div><div class="card-f"><button class="btn btn-primary btn-sm">Действие</button><button class="btn btn-ghost btn-sm">Ещё</button></div></div>
            <div class="card"><div class="card-h"><h3>Станки</h3></div><div class="card-b stack" style="gap:8px">
              <div class="machine run"><div class="m-ic pulse">${I('flame')}</div><div class="grow"><b class="fs-13">Экструдер ЭК-3</b><span class="cell-sub">ЗК-1055 · Пакет-майка 40×70</span></div><span class="badge b-ok sm">Работает</span></div>
              <div class="machine down"><div class="m-ic">${I('scissors')}</div><div class="grow"><b class="fs-13">Пакетоделательная ПД-2</b><span class="cell-sub bad-t">Замена ножа · 52 мин</span></div><span class="badge b-bad sm">Простой</span></div>
              <div class="machine idle"><div class="m-ic">${I('droplet')}</div><div class="grow"><b class="fs-13">Флексопечать ФП-1</b><span class="cell-sub">Нет заданий</span></div><span class="badge sm">Свободен</span></div></div></div>
            <div class="card"><div class="card-h"><h3>Задание в очереди</h3></div><div class="card-b"><div class="task now"><div class="t-top"><b class="fs-13">ЗК-1054</b>${AP.statusBadge('production', 'Экструзия')}<span class="chip urgent">${I('zap')}срочно</span></div><div class="t-title">Фасовочный пакет 24×37 в рулоне</div><div class="t-meta">ООО «Fresh Market» · 1 200 000 шт · 1 620 кг</div><div class="mt-8">${UI.progress(0.4, '', 'sm')}</div></div>
              <ul class="timeline mt-16"><li class="done"><i></i><b>Заказ принят</b><small>12.10 12:40</small></li><li class="now"><i></i><b>Производство</b><small>сейчас</small></li><li><i></i><b>Отгружено</b><small>—</small></li></ul></div></div>
          </div>`)}

        ${sec('tables', 8, 'Таблицы', 'Шапка — мелкие заглавные, числа справа и моноширинные по цифрам. Просроченные строки подсвечены, строка кликабельна целиком.', html`<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Продукция</th><th class="r">Тираж, шт</th><th>Статус</th><th style="width:120px">Готово</th><th class="r">Сумма</th></tr></thead><tbody>
          ${demoTable.map((r, i) => html`<tr class="click ${i === 2 ? 'row-bad' : ''}"><td><span class="cell-title">${r[0]}</span><span class="cell-sub">12.10.2026</span></td><td class="fw-7">${r[1]}</td><td>${r[2]}</td><td class="r fw-8">${r[3]}</td><td>${AP.statusBadge(r[4])}</td><td>${UI.progress(r[5], r[5] >= 1 ? 'ok' : '', 'sm')}</td><td class="r fw-7">${r[6]}</td></tr>`)}
        </tbody><tfoot><tr><td colspan="6">Итого</td><td class="r">110 970 000</td></tr></tfoot></table></div></div>`)}

        ${sec('charts', 9, 'Графики', 'Палитра серий проверена на различимость при дальтонизме в обеих темах. Одна ось, тонкие столбцы со скруглённой вершиной, подсказка по наведению, легенда при двух и более сериях.', html`<div class="grid g-2">
          <div class="card"><div class="card-h"><h3>Столбцы с накоплением</h3>${UI.legend([{ name: 'Цех №1', color: 'var(--s1)' }, { name: 'Цех №2', color: 'var(--s2)' }])}</div><div class="card-b">${UI.chart({ type: 'stack', height: 220, labels: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'], series: [{ name: 'Цех №1', color: 'var(--s1)', values: [820, 760, 910, 640, 980, 520, 300] }, { name: 'Цех №2', color: 'var(--s2)', values: [610, 700, 540, 820, 760, 410, 0] }], tipFmt: F.kg })}</div></div>
          <div class="card"><div class="card-h"><h3>Сравнение двух величин</h3>${UI.legend([{ name: 'Поступления', color: 'var(--s1)' }, { name: 'Расходы', color: 'var(--s4)' }])}</div><div class="card-b">${UI.chart({ type: 'bar', height: 220, labels: ['июл', 'авг', 'сен', 'окт'], series: [{ name: 'Поступления', color: 'var(--s1)', values: [520e6, 610e6, 590e6, 658e6] }, { name: 'Расходы', color: 'var(--s4)', values: [480e6, 560e6, 640e6, 610e6] }], tipFmt: F.money })}</div></div>
          <div class="card"><div class="card-h"><h3>Доли целого</h3></div><div class="card-b">${UI.segBar([{ name: 'Безналичные', value: 596e6, color: 'var(--pay-bank)' }, { name: 'Наличные', value: 41e6, color: 'var(--pay-cash)' }, { name: 'Корп. карта', value: 21e6, color: 'var(--pay-card)' }], { fmt: F.short })}</div></div>
          <div class="card"><div class="card-h"><h3>Норма против факта</h3></div><div class="card-b">${UI.normFact([{ label: 'Гранулят ПНД', fact: 914, norm: 903 }, { label: 'Мастербатч белый', fact: 37.9, norm: 37.6 }, { label: 'Краска флексо синяя', fact: 6.2, norm: 6.6 }])}</div></div>
        </div>`)}

        ${sec('sidebar', 10, 'Сайдбар и верхняя панель', 'Слева — разделы, сгруппированные по смыслу. Пользователь видит только те, на которые у него есть права. Сверху — переключатель цеха (у начальника цеха он заблокирован на свой цех), поиск по заказу/клиенту/QR, связь с весами, уведомления, тема.', html`<div class="sb-demo">
          <aside class="sidebar"><a class="sb-brand" href="#sidebar">${UI.logoMark(38)}<span><b>ALI PLAST</b><small>Chirchiq · учёт</small></span></a>
            <div class="sb-scope"><button class="on">Все цеха</button><button>Цех №1</button><button>Цех №2</button></div>
            <nav class="sb-nav">${[['Главное', [['home', 'Сводка', 1], ['chart', 'Финансовый дашборд', 0, 'lock']]], ['Продажи', [['clipboard', 'Заказы', 0, 4], ['users', 'Клиенты']]], ['Производство', [['factory', 'Производство', 0, 6], ['scale', 'Весы'], ['qr', 'QR-коды']]], ['Склад', [['layers', 'Склад сырья', 0, '!2'], ['truck', 'Склад ГП и погрузка']]]].map(([g, items]) => html`<div class="sb-group"><span>${g}</span>${items.map(([ic, t, on, extra]) => html`<a class="sb-link ${on ? 'active' : ''}" href="#sidebar">${I(ic)}<span>${t}</span>${extra === 'lock' ? I('lock', 'sb-lock') : extra ? html`<span class="sb-count ${String(extra)[0] === '!' ? 'bad' : ''}">${String(extra).replace('!', '')}</span>` : ''}</a>`)}</div>`)}</nav>
            <div class="sb-user">${UI.avatar('Алишер Юсупов', 'u1')}<div class="who"><b>Алишер Юсупов</b><small>Директор</small></div><button class="btn btn-icon btn-sm">${I('logout')}</button></div></aside>
          <div class="demo-main"><header class="topbar"><div class="crumbs"><small>Главное</small><b>Сводка</b></div><div class="spacer"></div><label class="tb-search input-icon">${I('search')}<input class="input" placeholder="Заказ, клиент или QR"><kbd>/</kbd></label><span class="conn"><i></i><span>Весы на связи</span></span><button class="btn btn-icon bell">${I('bell')}<span class="dot">14</span></button></header>
            <div class="content">${UI.pageHead('Заголовок раздела', 'Короткое пояснение, что здесь делают и откуда берутся цифры.', html`<button class="btn btn-secondary">${I('download')}Excel</button><button class="btn btn-primary">${I('plus')}Действие</button>`)}
              ${UI.tabs([['a', 'Очередь заданий', 6], ['b', 'Выработка'], ['c', 'Брак и отходы'], ['d', 'Простои', 1]], 'a')}
              <div class="pipeline" style="grid-template-columns:repeat(5,minmax(0,1fr))">${AP.STATUS_ORDER.slice(0, 5).map((k, i) => html`<button class="pipe ${i === 4 ? 'on' : ''}"><span><i class="dot" style="background:currentColor"></i>${AP.STATUSES[k].s}</span><b>${[2, 1, 1, 2, 4][i]}</b></button>`)}</div></div></div>
        </div>`)}

        ${sec('sections', 11, 'Разделы и кому они доступны', 'По ТЗ (раздел 2) на старте нужны три учётные записи: директор и два начальника цеха. Остальные роли заведены, но выключены — включаются без переделки программы. Финансовый дашборд — только директор, выдать на него права нельзя.', html`<div class="card"><div class="table-wrap"><table class="table compact matrix no-stack"><thead><tr><th>Раздел</th>${ROLE_COLS.map(([, t]) => html`<th>${t}</th>`)}</tr></thead><tbody>
          ${AP.SECTIONS.map((s) => html`<tr><td><span class="row nowrap" style="gap:10px">${I(s.icon, 'icon-16')}<b>${s.title}</b><span class="muted fs-12">${s.group}</span></span></td>${ROLE_COLS.map(([r]) => { const lv = s.directorOnly ? (r === 'director' ? 3 : 0) : (AP.ROLE_PRESETS[r].perms[s.key] || 0); return html`<td class="lvl-${lv} fw-7 fs-12">${s.directorOnly && r === 'director' ? html`<span class="row nowrap" style="justify-content:center;gap:4px">${I('lock', 'icon-16')}только он</span>` : LVL_SHORT[lv]}</td>`; })}</tr>`)}
          <tr><td class="fw-7">Доступ к цехам</td>${ROLE_COLS.map(([r]) => html`<td class="fs-12 fw-7">${r === 'shop' || r === 'operator' ? 'свой цех' : 'оба'}</td>`)}</tr>
          <tr><td class="fw-7">На старте</td>${ROLE_COLS.map(([r]) => html`<td>${['director', 'shop'].includes(r) ? html`<span class="badge b-ok sm">включён</span>` : html`<span class="badge sm">выключен</span>`}</td>`)}</tr>
        </tbody></table></div></div>`)}

        ${sec('shop', 12, 'Цеховой экран, весы и этикетка', 'Крупные кнопки и минимум действий — понятно без обучения. Вес принимается только когда устоялся; этикетка 100×50 мм уходит на Xprinter через агента печати (команды TSPL напрямую, без драйвера Windows).', html`<div class="grid g-21">
          <div class="stack"><div class="big-actions" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <a class="big-act" href="#shop"><span class="ba-ic" style="background:#3D5AFE1f;color:#3D5AFE">${I('scale')}</span><span><b>Взвесить продукцию</b><br><small>вес с весов → QR-этикетка</small></span></a>
            <a class="big-act" href="#shop"><span class="ba-ic" style="background:#DC3B421f;color:#DC3B42">${I('pause')}</span><span><b>Простой станка</b><br><small>остановка и причина</small></span></a></div>
            <div class="scale-display"><div class="sd-top"><span class="chip" style="background:rgba(255,255,255,.08);color:#fff">${I('scale')}Весы Ц1</span><span>RS-232 → COM3</span><span class="right">Смена А (день)</span></div><div class="sd-val"><span>17,80</span><small>кг</small></div><span class="sd-state stable">${I('check', 'icon-16')}СТАБИЛЬНО</span><div class="sd-bars">${Array.from({ length: 24 }, (_, i) => raw(`<i style="height:${Math.min(100, 20 + i * 4)}%"></i>`))}</div></div></div>
          <div class="card iris"><div class="card-h"><h3>Этикетка</h3><span class="badge b-ok">AP-002889</span></div><div class="card-b"><div class="label-prev"><div class="lp-qr">${UI.qrSVG('https://alex22826.github.io/ali-plast/app.html#/qr/AP-001511', { size: 200 })}<div class="lp-no">AP-001511</div></div><div class="lp-txt"><div class="lp-p">Пакет-майка 35×60, синий</div><div>Заказ ЗК-1028 · мешок 4 000 шт</div><div>Абдуллаев Р. (рынок Чорсу)</div><div>Нетто 25,21 / брутто 25,36 кг</div><div>Цех №1 · смена Б · 29.08 21:33</div><div>CHIRCHIQ ALI PLAST</div></div></div></div></div>
        </div>`)}

        ${sec('icons', 13, 'Иконки', 'Линейные, 24×24, толщина 2 px, скруглённые концы. В коде: AP.ui.icon(\'имя\').', html`<div class="icon-grid">${Object.keys(UI.icons).map((k) => html`<div>${I(k)}<code>${k}</code></div>`)}</div>`)}

        <p class="muted fs-12 mt-24">Файлы: assets/css/app.css — токены и компоненты · assets/css/login.css — страница входа · assets/js/ui.js — иконки, окна, графики, QR, печать.</p>
      </main>`;
  }

  function fillTokens() {
    document.querySelectorAll('[data-tok]').forEach((c) => { const v = css(c.dataset.tok); c.textContent = c.dataset.tok + ' · ' + (v.length < 30 ? v.toUpperCase() : 'градиент'); });
  }
  function boot() {
    document.documentElement.setAttribute('data-theme', AP.themeWanted());
    AP.startThemeClock();
    document.body.insertAdjacentHTML('afterbegin', String(render()));
    UI.enhance(document);
    UI.drawCharts(document);
    fillTokens();
    const tt = document.querySelector('[data-theme-toggle]');
    tt.innerHTML = String(I(AP.theme() === 'dark' ? 'sun' : 'moon'));
    tt.setAttribute('data-tip', AP.themeTip());
    tt.onclick = () => { const r = tt.getBoundingClientRect(); UI.hideTip(); AP.toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); };
    new MutationObserver(() => { fillTokens(); UI.drawCharts(document); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    document.querySelectorAll('[data-toast]').forEach((b) => (b.onclick = () => (b.dataset.toast === 'ok' ? UI.toast('Единица AP-002889 создана', '1 000 шт · статус заказа: в производстве') : UI.toast('Вес отличается от ожидаемого', '+9,4% — перепроверьте упаковку', 'warn'))));
    document.querySelector('[data-modal]').onclick = () => UI.modal({ title: 'Ручной ввод веса', sub: 'Запись попадёт в журнал действий с вашим именем.', body: html`<div class="stack"><div class="field"><label>Вес брутто, кг <span class="req">*</span></label><input class="input input-lg" value="17,95"></div><div class="field"><label>Комментарий <span class="req">*</span></label><textarea class="textarea">Весы Ц1 перезагружались</textarea></div></div>`, foot: html`<button class="btn btn-ghost" data-close>Отмена</button><button class="btn btn-primary" data-close>Принять вручную</button>` });
    document.querySelector('[data-drawer]').onclick = () => UI.drawer({ title: 'ЗК-1056 · ООО «Tashkent Savdo Group»', sub: 'Пакет-майка 40×70 с логотипом', body: html`<div class="card"><div class="card-b"><dl class="dl"><dt>Тираж</dt><dd>90 000 шт · 882 кг</dd><dt>Статус</dt><dd>${AP.statusBadge('production', 'Печать')}</dd><dt>Срок</dt><dd>16.10.2026</dd></dl></div></div>`, foot: html`<button class="btn btn-primary">Отметить выработку</button><button class="btn btn-ghost" data-close>Закрыть</button>` });
  }
  boot();
})();
