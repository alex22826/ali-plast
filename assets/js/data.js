/* =========================================================
   ALI PLAST — демо-данные.
   Генерируются детерминированно (одинаково при каждом сбросе)
   и привязаны к сегодняшней дате. Все цифры условные.
   ========================================================= */
(function () {
  'use strict';
  const AP = window.AP;

  AP.seed = function () {
    const R = AP.rng(20261014);
    const U = (a, b) => R.range(a, b);
    const D = AP.d;
    const H = 3600000, DAY = 86400000;
    const T0 = D.today().getTime();
    const NOW = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const dISO = (ms) => D.iso(new Date(ms));
    const tAt = (dayOff, hour = 9, min = 0) => T0 + dayOff * DAY + hour * H + min * 60000;
    const counters = {};
    const cnt = (k) => (counters[k] = (counters[k] || 0) + 1);
    const id = (k, pad) => k + String(cnt(k)).padStart(pad, '0');
    const round = (v, step) => Math.round(v / step) * step;

    /* ---------- справочники ---------- */
    const workshops = [
      { id: 'w1', name: 'Цех №1', short: 'Ц1', profile: 'Экструзия · пакеты-майки, фасовка, мусорные мешки' },
      { id: 'w2', name: 'Цех №2', short: 'Ц2', profile: 'Экструзия · флексопечать · пакеты с логотипом, плёнка' },
    ];
    const machines = [
      { id: 'm1', workshop: 'w1', name: 'Экструдер ЭК-1', type: 'extrusion', cap: 45, note: 'ПНД/ПВД, рукав до 600 мм' },
      { id: 'm2', workshop: 'w1', name: 'Экструдер ЭК-2', type: 'extrusion', cap: 40, note: 'ПНД, рукав до 500 мм' },
      { id: 'm3', workshop: 'w1', name: 'Пакетоделательная ПД-1', type: 'cut', cap: 38, note: 'майка, фасовка' },
      { id: 'm4', workshop: 'w1', name: 'Пакетоделательная ПД-2', type: 'cut', cap: 32, note: 'майка, мусорные мешки в рулоне' },
      { id: 'm5', workshop: 'w1', name: 'Участок упаковки Ц1', type: 'pack', cap: 60, note: 'весы Ц1, принтер этикеток' },
      { id: 'm6', workshop: 'w2', name: 'Экструдер ЭК-3', type: 'extrusion', cap: 65, note: 'рукав до 1200 мм' },
      { id: 'm7', workshop: 'w2', name: 'Флексопечать ФП-1 (4 цв.)', type: 'print', cap: 55, colors: 4, note: 'ширина печати 600 мм' },
      { id: 'm8', workshop: 'w2', name: 'Флексопечать ФП-2 (6 цв.)', type: 'print', cap: 50, colors: 6, note: 'ширина печати 800 мм' },
      { id: 'm9', workshop: 'w2', name: 'Пакетоделательная ПД-3', type: 'cut', cap: 40, note: 'майка, zip' },
      { id: 'm10', workshop: 'w2', name: 'Вырубной пресс ВП-1', type: 'cut', cap: 30, note: 'вырубная ручка' },
      { id: 'm11', workshop: 'w2', name: 'Участок упаковки Ц2', type: 'pack', cap: 60, note: 'весы Ц2, принтер этикеток' },
    ];
    const settings = {
      tariff: 1000, // сум за кВт·ч
      kwhPerKg: { extrusion: 0.78, print: 0.15, cut: 0.2, pack: 0.02 },
      laborPerKg: { extrusion: 1500, print: 1300, cut: 1800, pack: 900 },
      deprPerKg: 600, overheadPerKg: 1400,
      inkPerColorKg: 0.006, solventPerKg: 0.004,
      weightTolerance: 8, // % отклонения веса от ожидаемого
    };
    const materials = [
      { id: 'hdpe', code: 'HDPE', name: 'Гранулят ПНД (HDPE) F-Y346', kind: 'granule', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 14500, min: 3000, supplierId: 's1' },
      { id: 'ldpe', code: 'LDPE', name: 'Гранулят ПВД (LDPE) 15803-020', kind: 'granule', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 15800, min: 2000, supplierId: 's1' },
      { id: 'lldpe', code: 'LLDPE', name: 'Гранулят ЛПВД (LLDPE) 218W', kind: 'granule', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 16200, min: 800, supplierId: 's2' },
      { id: 'caco3', code: 'MEL', name: 'Добавка мел CaCO₃', kind: 'additive', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 6500, min: 250, supplierId: 's2' },
      { id: 'mb_white', code: 'MBW', name: 'Мастербатч белый', kind: 'masterbatch', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 24000, min: 200, supplierId: 's3' },
      { id: 'mb_black', code: 'MBK', name: 'Мастербатч чёрный', kind: 'masterbatch', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 19000, min: 150, supplierId: 's3' },
      { id: 'mb_blue', code: 'MBB', name: 'Мастербатч синий', kind: 'masterbatch', unit: 'кг', pack: { name: 'меш.', qty: 25 }, price: 31000, min: 80, supplierId: 's3' },
      { id: 'ink_blue', code: 'INKB', name: 'Краска флексо синяя', kind: 'ink', unit: 'кг', pack: { name: 'банк.', qty: 20 }, price: 62000, min: 60, supplierId: 's4', color: '#2340E8' },
      { id: 'ink_red', code: 'INKR', name: 'Краска флексо красная', kind: 'ink', unit: 'кг', pack: { name: 'банк.', qty: 20 }, price: 64000, min: 40, supplierId: 's4', color: '#E5383B' },
      { id: 'ink_green', code: 'INKG', name: 'Краска флексо зелёная', kind: 'ink', unit: 'кг', pack: { name: 'банк.', qty: 20 }, price: 63000, min: 30, supplierId: 's4', color: '#16A34A' },
      { id: 'ink_black', code: 'INKK', name: 'Краска флексо чёрная', kind: 'ink', unit: 'кг', pack: { name: 'банк.', qty: 20 }, price: 56000, min: 40, supplierId: 's4', color: '#111827' },
      { id: 'ink_white', code: 'INKW', name: 'Краска флексо белая', kind: 'ink', unit: 'кг', pack: { name: 'банк.', qty: 20 }, price: 58000, min: 40, supplierId: 's4', color: '#E5E7EB' },
      { id: 'solvent', code: 'SOLV', name: 'Растворитель (этилацетат)', kind: 'solvent', unit: 'л', pack: { name: 'боч.', qty: 200 }, price: 18000, min: 150, supplierId: 's4' },
      { id: 'core', code: 'VTL', name: 'Втулки картонные 76 мм', kind: 'pack', unit: 'шт', price: 2200, min: 150, supplierId: 's5' },
      { id: 'box', code: 'KOR', name: 'Коробки гофро 60×40×40', kind: 'pack', unit: 'шт', pack: { name: 'пачк.', qty: 25 }, price: 4800, min: 250, supplierId: 's5' },
      { id: 'sack', code: 'MSH', name: 'Мешки упаковочные ПП 60×100', kind: 'pack', unit: 'шт', pack: { name: 'пачк.', qty: 100 }, price: 1900, min: 400, supplierId: 's5' },
    ];
    const MAT = Object.fromEntries(materials.map((m) => [m.id, m]));

    const products = [
      { id: 'p1', name: 'Пакет-майка 30×55, белый', material: 'ПНД', size: '30×55 см', thick: 12, color: 'белый', base: 'шт', g: 4.2, pack: { name: 'пачка', pcs: 100 }, unit: { type: 'sack', name: 'мешок', pcs: 5000 }, recipe: [['hdpe', 0.955], ['mb_white', 0.03], ['caco3', 0.015]], waste: 3, defect: 2, price: 118000, printable: false, stages: ['extrusion', 'cut', 'pack'], workshop: 'w1' },
      { id: 'p2', name: 'Пакет-майка 40×70 с логотипом', material: 'ПНД', size: '40×70 см', thick: 18, color: 'белый', base: 'шт', g: 9.8, pack: { name: 'пачка', pcs: 100 }, unit: { type: 'box', name: 'коробка', pcs: 2000 }, recipe: [['hdpe', 0.96], ['mb_white', 0.04]], waste: 4, defect: 2.5, price: 340000, printable: true, stages: ['extrusion', 'print', 'cut', 'pack'], workshop: 'w2' },
      { id: 'p3', name: 'Фасовочный пакет 24×37 в рулоне', material: 'ПНД', size: '24×37 см', thick: 7, color: 'прозрачный', base: 'шт', g: 1.35, pack: { name: 'рулон', pcs: 500 }, unit: { type: 'box', name: 'коробка', pcs: 20000 }, recipe: [['hdpe', 1.0]], waste: 2.5, defect: 1.5, price: 46000, printable: false, stages: ['extrusion', 'cut', 'pack'], workshop: 'w1' },
      { id: 'p4', name: 'Пакет с вырубной ручкой 40×50, логотип', material: 'ПВД', size: '40×50 см', thick: 50, color: 'белый', base: 'шт', g: 21.5, pack: { name: 'пачка', pcs: 50 }, unit: { type: 'box', name: 'коробка', pcs: 500 }, recipe: [['ldpe', 0.97], ['mb_white', 0.03]], waste: 5, defect: 3, price: 830000, printable: true, stages: ['extrusion', 'print', 'cut', 'pack'], workshop: 'w2' },
      { id: 'p5', name: 'Мешок для мусора 60 л, чёрный', material: 'ПВД + ЛПВД', size: '60×80 см', thick: 25, color: 'чёрный', base: 'шт', g: 17.5, pack: { name: 'рулон', pcs: 20 }, unit: { type: 'sack', name: 'мешок', pcs: 1000 }, recipe: [['ldpe', 0.55], ['lldpe', 0.4], ['mb_black', 0.05]], waste: 3, defect: 2, price: 520000, printable: false, stages: ['extrusion', 'cut', 'pack'], workshop: 'w1' },
      { id: 'p6', name: 'Плёнка-рукав ПВД 1000 мм, 100 мкм', material: 'ПВД', size: 'рукав 1000 мм', thick: 100, color: 'прозрачный', base: 'кг', g: 1000, unit: { type: 'roll', name: 'рулон', kg: 45 }, recipe: [['ldpe', 1.0]], waste: 2, defect: 1, price: 23500, printable: false, stages: ['extrusion', 'pack'], workshop: 'w2' },
      { id: 'p7', name: 'Zip-пакет 10×15', material: 'ПВД', size: '10×15 см', thick: 60, color: 'прозрачный', base: 'шт', g: 2.1, pack: { name: 'пачка', pcs: 100 }, unit: { type: 'box', name: 'коробка', pcs: 10000 }, recipe: [['ldpe', 0.97], ['lldpe', 0.03]], waste: 4, defect: 2.5, price: 72000, printable: false, stages: ['extrusion', 'cut', 'pack'], workshop: 'w2' },
      { id: 'p8', name: 'Пакет-майка 35×60, синий', material: 'ПНД', size: '35×60 см', thick: 15, color: 'синий', base: 'шт', g: 6.3, pack: { name: 'пачка', pcs: 100 }, unit: { type: 'sack', name: 'мешок', pcs: 4000 }, recipe: [['hdpe', 0.95], ['mb_blue', 0.035], ['caco3', 0.015]], waste: 3, defect: 2, price: 180000, printable: false, stages: ['extrusion', 'cut', 'pack'], workshop: 'w1' },
    ];
    const PROD = Object.fromEntries(products.map((p) => [p.id, p]));
    const unitKg = (p) => (p.base === 'кг' ? p.unit.kg : (p.unit.pcs * p.g) / 1000);
    const kgOf = (p, q) => (p.base === 'кг' ? q : (q * p.g) / 1000);

    const suppliers = [
      { id: 's1', name: 'ООО «Polimer Trade Tashkent»', what: 'Гранулят ПНД / ПВД', inn: '305 118 442', phone: '+998 71 205-44-10', contact: 'Рашид Мухамедов', payDays: 21, address: 'г. Ташкент, Яшнабадский р-н, ул. Махтумкули, 104' },
      { id: 's2', name: 'ООО «Granula Invest»', what: 'ЛПВД, мел, добавки', inn: '306 552 019', phone: '+998 71 233-18-07', contact: 'Евгений Ким', payDays: 14, address: 'Ташкентская обл., г. Алмалык, Промзона-2' },
      { id: 's3', name: 'ООО «ColorMix Masterbatch»', what: 'Мастербатчи', inn: '307 091 884', phone: '+998 90 318-22-41', contact: 'Ойбек Алимов', payDays: 30, address: 'г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 11' },
      { id: 's4', name: 'ООО «Flexo Ink Asia»', what: 'Флексокраски, растворители', inn: '304 770 316', phone: '+998 71 150-90-90', contact: 'Наталья Пак', payDays: 21, address: 'г. Ташкент, Мирзо-Улугбекский р-н, ул. Буюк Ипак Йули, 70' },
      { id: 's5', name: 'ООО «Karton Pack Chirchiq»', what: 'Коробки, втулки, мешки', inn: '309 214 657', phone: '+998 70 712-33-05', contact: 'Бахром Тураев', payDays: 10, address: 'Ташкентская обл., г. Чирчик, ул. Амира Темура, 52' },
    ];

    const users = [
      { id: 'u1', login: 'director', name: 'Алишер Юсупов', role: 'director', title: 'Директор', workshop: 'all', active: true, passHash: '7c76209d2c373c9535743267a6397b930b131586cc40277c131eb77e7152f4f8' },
      { id: 'u2', login: 'ceh1', name: 'Бахтиёр Каримов', role: 'shop', title: 'Начальник цеха №1', workshop: 'w1', active: true, passHash: '6070bbf9b2ccdb95101e8602c1c61942d9b613548fc9ef4f280c4fc19de02d98' },
      { id: 'u3', login: 'ceh2', name: 'Шерзод Назаров', role: 'shop', title: 'Начальник цеха №2', workshop: 'w2', active: true, passHash: 'a60260c5decb55a5c78f687643e3a78863ebf0068932fb8b8d646b25a37a734a' },
      { id: 'u4', login: 'sklad', name: 'Дилшод Рашидов', role: 'storekeeper', title: 'Кладовщик', workshop: 'all', active: false, optional: true, passHash: 'b8467d4070144fa599610a8fbf026375fa140858c6f2fb436108099175f8f955' },
      { id: 'u5', login: 'sales', name: 'Камила Ахмедова', role: 'sales', title: 'Менеджер по продажам', workshop: 'all', active: false, optional: true, passHash: '346cf139fa727131d400bde1c10dcc38de9662e831e01024ecb927d3ef7ce291' },
      { id: 'u6', login: 'buh', name: 'Нилуфар Исмоилова', role: 'accountant', title: 'Бухгалтер', workshop: 'all', active: false, optional: true, passHash: '49d354a6b81874e74fd2d24f81ad47d7fc2f1b693f3c36336e94e498d4fe285f' },
      { id: 'u7', login: 'vesy', name: 'Жасур Тошматов', role: 'operator', title: 'Оператор весов Ц1', workshop: 'w1', active: false, optional: true, passHash: '68417f4903118d65871788fe16bf1954c1806b94a986c646330cf29100ec4dc1' },
    ];
    users.forEach((u) => {
      const pr = AP.ROLE_PRESETS[u.role];
      u.perms = Object.assign({}, pr.perms);
      u.flags = Object.assign({}, pr.flags);
      u.created = iso(tAt(-100, 10));
    });

    const clients = [
      { id: 'c1', name: 'ООО «Tashkent Savdo Group»', type: 'ООО', group: 'Сети', terms: 'post', payDays: 14, limit: 90e6, rel: 0.96, products: ['p2', 'p1'], inks: ['ink_blue', 'ink_red'], managerId: 'u5', contact: 'Жахонгир Расулов', phone: '+998 90 123-45-67', address: 'г. Ташкент, Юнусабадский р-н, ул. Амира Темура, 107Б' },
      { id: 'c2', name: 'ООО «Chirchiq Non»', type: 'ООО', group: 'Производство', terms: 'post', payDays: 10, limit: 25e6, rel: 0.93, products: ['p3', 'p7'], managerId: 'u1', contact: 'Ирода Халилова', phone: '+998 93 410-22-18', address: 'Ташкентская обл., г. Чирчик, ул. Навои, 18' },
      { id: 'c3', name: 'ООО «Fresh Market»', type: 'ООО', group: 'Сети', terms: 'post', payDays: 21, limit: 140e6, rel: 0.94, products: ['p2', 'p3', 'p4'], inks: ['ink_green', 'ink_black'], managerId: 'u5', contact: 'Сергей Ли', phone: '+998 71 207-77-07', address: 'г. Ташкент, Мирабадский р-н, ул. Шахрисабз, 5' },
      { id: 'c4', name: 'ИП Абдуллаев Р. (рынок «Чорсу»)', type: 'ИП', group: 'Опт', terms: 'post', payDays: 7, limit: 30e6, rel: 0.5, products: ['p1', 'p8'], managerId: 'u5', contact: 'Равшан Абдуллаев', phone: '+998 97 700-15-15', address: 'г. Ташкент, Шайхантахурский р-н, рынок «Чорсу», павильон 14' },
      { id: 'c5', name: 'ООО «Silk Road Food»', type: 'ООО', group: 'Производство', terms: 'pre50', payDays: 7, limit: 40e6, rel: 0.92, products: ['p7', 'p6'], managerId: 'u1', contact: 'Ахмад Юнусов', phone: '+998 90 951-60-60', address: 'Ташкентская обл., Зангиатинский р-н, массив Эшонгузар' },
      { id: 'c6', name: 'ООО «Bahor Textile»', type: 'ООО', group: 'Производство', terms: 'post', payDays: 14, limit: 30e6, rel: 0.9, products: ['p4'], inks: ['ink_black'], managerId: 'u1', contact: 'Гульчехра Умарова', phone: '+998 91 166-44-30', address: 'г. Ташкент, Бектемирский р-н, ул. Хусейна Байкаро, 41' },
      { id: 'c7', name: 'ООО «Navruz Pharm»', type: 'ООО', group: 'Производство', terms: 'post', payDays: 30, limit: 50e6, rel: 0.98, products: ['p7'], managerId: 'u1', contact: 'Дмитрий Цой', phone: '+998 71 281-30-30', address: 'г. Ташкент, Учтепинский р-н, ул. Фархадская, 2' },
      { id: 'c8', name: 'ООО «Green Box Logistics»', type: 'ООО', group: 'Опт', terms: 'pre100', payDays: 0, limit: 0, rel: 1, products: ['p6', 'p5'], managerId: 'u1', contact: 'Тимур Абдурахманов', phone: '+998 99 880-12-12', address: 'Ташкентская обл., г. Чирчик, Промзона «Восток», 3' },
      { id: 'c9', name: 'ЧП «Mirzo Plast Savdo»', type: 'ЧП', group: 'Опт', terms: 'post', payDays: 7, limit: 45e6, rel: 0.3, products: ['p1', 'p5', 'p8'], managerId: 'u5', contact: 'Мирзо Хакимов', phone: '+998 94 600-70-07', address: 'г. Ташкент, Сергелийский р-н, оптовый рынок «Абу-Сахий», ряд 6' },
      { id: 'c10', name: 'ООО «Samarqand Agro Export»', type: 'ООО', group: 'Производство', terms: 'post', payDays: 14, limit: 60e6, rel: 0.88, products: ['p6', 'p5'], managerId: 'u1', contact: 'Шахриёр Иброгимов', phone: '+998 66 233-50-50', address: 'г. Самарканд, ул. Регистан, 12' },
      { id: 'c11', name: 'Юлдашев Бахтиёр (физ. лицо)', type: 'Физ. лицо', group: 'Розница', terms: 'post', payDays: 5, limit: 6e6, rel: 0.5, products: ['p1'], managerId: 'u5', contact: 'Бахтиёр Юлдашев', phone: '+998 93 555-21-90', address: 'Ташкентская обл., г. Чирчик, махалля «Гулистон», д. 7' },
      { id: 'c12', name: 'ООО «Olmaliq Meva»', type: 'ООО', group: 'Опт', terms: 'post', payDays: 14, limit: 35e6, rel: 0.9, products: ['p8', 'p1', 'p4'], inks: ['ink_green'], managerId: 'u5', contact: 'Фазлиддин Норов', phone: '+998 90 777-04-04', address: 'Ташкентская обл., г. Алмалык, ул. Ислама Каримова, 33' },
    ];
    clients.forEach((c, i) => {
      c.inn = c.type === 'Физ. лицо' ? '' : String(300000000 + Math.floor(R() * 99999999)).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
      c.bank = c.type === 'Физ. лицо' ? '' : 'АКБ «' + R.pick(['Капиталбанк', 'Ипотека-банк', 'Хамкорбанк', 'Асака банк', 'Узпромстройбанк']) + '», МФО 0' + R.int(1000, 1099);
      c.account = c.type === 'Физ. лицо' ? '' : '2020 8000 ' + R.int(1000, 9999) + ' ' + R.int(1000, 9999) + ' ' + R.int(1000, 9999);
      c.email = c.type === 'Физ. лицо' ? '' : ['zakaz', 'info', 'snab', 'office'][i % 4] + '@' + c.name.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 12) + '.uz';
      c.created = dISO(tAt(-400 + i * 25));
      c.logos = c.inks ? [{ name: 'logo_' + c.id + '.ai', colors: c.inks.length, note: c.inks.length + ' цв., печать с двух сторон' }] : [];
    });
    const CL = Object.fromEntries(clients.map((c) => [c.id, c]));

    /* ---------- сотрудники (около 30, ТЗ 4.9) ---------- */
    const E = (id, name, workshop, position, shift, payType, rate, machine) => ({ id, name, workshop, position, shift, payType, rate, machine: machine || null });
    const employees = [
      E('e1', 'Рустам Хасанов', 'w1', 'Мастер смены', 'A', 'time', 260000),
      E('e2', 'Улугбек Саидов', 'w1', 'Мастер смены', 'B', 'time', 260000),
      E('e3', 'Азиз Турсунов', 'w1', 'Оператор экструдера', 'A', 'piece', 1200, 'm1'),
      E('e4', 'Феруз Мирзаев', 'w1', 'Оператор экструдера', 'B', 'piece', 1200, 'm1'),
      E('e5', 'Отабек Ниязов', 'w1', 'Оператор экструдера', 'A', 'piece', 1200, 'm2'),
      E('e6', 'Санжар Холматов', 'w1', 'Оператор экструдера', 'B', 'piece', 1200, 'm2'),
      E('e7', 'Гулнора Юсупова', 'w1', 'Оператор пакетоделательной машины', 'A', 'piece', 1500, 'm3'),
      E('e8', 'Дилноза Каримова', 'w1', 'Оператор пакетоделательной машины', 'B', 'piece', 1500, 'm3'),
      E('e9', 'Зарина Ахмедова', 'w1', 'Оператор пакетоделательной машины', 'A', 'piece', 1500, 'm4'),
      E('e10', 'Малика Рахимова', 'w1', 'Оператор пакетоделательной машины', 'B', 'piece', 1500, 'm4'),
      E('e11', 'Шахноза Исмоилова', 'w1', 'Упаковщик', 'A', 'piece', 650, 'm5'),
      E('e12', 'Лола Абдуллаева', 'w1', 'Упаковщик', 'B', 'piece', 650, 'm5'),
      E('e13', 'Акмал Жураев', 'w1', 'Наладчик оборудования', 'D', 'time', 230000),
      E('e14', 'Бобур Эргашев', 'w1', 'Подсобный рабочий', 'D', 'time', 140000),
      E('e15', 'Фаррух Усмонов', 'w2', 'Мастер смены', 'A', 'time', 260000),
      E('e16', 'Тимур Назаров', 'w2', 'Мастер смены', 'B', 'time', 260000),
      E('e17', 'Жамшид Алиев', 'w2', 'Оператор экструдера', 'A', 'piece', 1200, 'm6'),
      E('e18', 'Нодир Сафаров', 'w2', 'Оператор экструдера', 'B', 'piece', 1200, 'm6'),
      E('e19', 'Сардор Кодиров', 'w2', 'Печатник', 'A', 'piece', 1300, 'm7'),
      E('e20', 'Бекзод Рашидов', 'w2', 'Печатник', 'B', 'piece', 1300, 'm7'),
      E('e21', 'Ильхом Тошпулатов', 'w2', 'Печатник', 'A', 'piece', 1300, 'm8'),
      E('e22', 'Нигора Собирова', 'w2', 'Оператор пакетоделательной машины', 'A', 'piece', 1500, 'm9'),
      E('e23', 'Мадина Хамидова', 'w2', 'Оператор пакетоделательной машины', 'B', 'piece', 1500, 'm9'),
      E('e24', 'Севара Олимова', 'w2', 'Оператор вырубного пресса', 'A', 'piece', 1500, 'm10'),
      E('e25', 'Камола Юлдашева', 'w2', 'Упаковщик', 'A', 'piece', 650, 'm11'),
      E('e26', 'Феруза Норматова', 'w2', 'Упаковщик', 'B', 'piece', 650, 'm11'),
      E('e27', 'Шухрат Маматов', 'w2', 'Наладчик оборудования', 'D', 'time', 230000),
      E('e28', 'Достон Бердиев', 'w2', 'Подсобный рабочий', 'D', 'time', 140000),
      E('e29', 'Дилшод Рашидов', 'sklad', 'Кладовщик', 'D', 'time', 190000),
      E('e30', 'Анвар Хайдаров', 'sklad', 'Грузчик', 'D', 'time', 150000),
    ];
    employees.forEach((e, i) => { e.phone = '+998 9' + R.int(0, 9) + ' ' + R.int(100, 999) + '-' + R.int(10, 99) + '-' + R.int(10, 99); e.hired = dISO(tAt(-R.int(120, 1600))); e.active = true; });
    const OPS = {}; // станок+смена → оператор
    employees.forEach((e) => { if (e.machine) OPS[e.machine + e.shift] = e.id; });
    OPS.m8B = 'e20'; OPS.m10B = 'e23';
    const opFor = (mid, shift) => OPS[mid + shift] || OPS[mid + 'A'];
    const shiftOf = (ms) => { const h = new Date(ms).getHours(); return h >= 8 && h < 20 ? 'A' : 'B'; };

    /* ---------- коллекции ---------- */
    const orders = [], units = [], outputs = [], defects = [], downtimes = [], writeoffs = [], shipments = [], payments = [], expenses = [], audit = [], batches = [];
    const log = (ms, uid, action, entity, entityId, details) => {
      const u = users.find((x) => x.id === uid) || { name: 'Система' };
      audit.push({ id: 'L' + cnt('L').toString(36), ts: iso(Math.min(ms, NOW - 60000)), uid: uid || null, user: u.name, action, entity, entityId, details: details || '' });
    };
    const shopHead = (w) => (w === 'w1' ? 'u2' : 'u3');
    const PLACES = { w1: 'A', w2: 'B' };
    const place = (w) => PLACES[w] + '-' + String(R.int(1, 12)).padStart(2, '0');
    const routeOf = (p, w) => ({
      extrusion: w === 'w1' ? (R() < 0.55 ? 'm1' : 'm2') : 'm6',
      print: R() < 0.5 ? 'm7' : 'm8',
      cut: w === 'w1' ? (R() < 0.55 ? 'm3' : 'm4') : p.id === 'p4' ? 'm10' : 'm9',
      pack: w === 'w1' ? 'm5' : 'm11',
    });
    const DEFECT_REASONS = { extrusion: ['Разнотолщинность плёнки', 'Прожиг / гели в плёнке', 'Обрыв рукава при запуске', 'Наладка после смены рецептуры'], print: ['Смещение печати (приводка)', 'Непропечатка', 'Смазывание краски'], cut: ['Слабая запайка шва', 'Кривой рез', 'Брак вырубки ручки'] };

    function makeOrder(o) {
      const n = cnt('o');
      const p = PROD[o.productId], c = CL[o.clientId];
      const ord = Object.assign({
        id: 'o' + n, no: 'ЗК-' + (1000 + n),
        workshop: p.workshop, material: p.material, size: p.size, thick: p.thick, color: p.color,
        logo: false, inks: [], coverage: 1, sides: 1,
        price: Math.round((p.price * U(0.94, 1.04)) / (p.base === 'кг' ? 100 : 1000)) * (p.base === 'кг' ? 100 : 1000),
        terms: c.terms, payDays: c.payDays, progress: {}, history: [], k: { power: U(0.95, 1.1), labor: U(0.95, 1.08) },
        route: null, task: null, urgent: null, maket: null, notes: '',
      }, o);
      ord.route = ord.route || routeOf(p, ord.workshop);
      if (ord.logo && !ord.inks.length) ord.inks = (c.inks || ['ink_blue']).slice();
      if (!ord.logo) ord.inks = [];
      orders.push(ord);
      return ord;
    }

    /* производство заказа в окне [t1, t2], обрезка по cutoff (ТЗ 3.1, шаги 4–7) */
    function produce(o, t1, t2, opt = {}) {
      const p = PROD[o.productId];
      const stages = p.stages.filter((s) => s !== 'print' || o.logo);
      const cutoff = Math.min(opt.cutoff || NOW - 5 * 60000, NOW - 5 * 60000);
      const good = kgOf(p, o.qty) * U(1.0, 1.012);
      const defRate = (p.defect / 100) * (opt.defectMul || U(0.55, 1.2));
      const W = { extrusion: [0, 0.72], print: [0.12, 0.84], cut: [0.22, 0.94], pack: [0.28, 1] };
      if (!o.logo) { W.cut = [0.15, 0.92]; W.pack = [0.2, 1]; }
      if (p.base === 'кг') W.pack = [0.05, 1];
      const stageKg = { extrusion: good * (1 + defRate + p.waste / 100), print: good * (1 + defRate * 0.7), cut: good * (1 + defRate * 0.4), pack: good };
      const dur = t2 - t1;
      const frac = {};
      for (const s of stages) {
        const a = t1 + W[s][0] * dur, b = t1 + W[s][1] * dur;
        const f = Math.max(0, Math.min(1, (cutoff - a) / (b - a)));
        frac[s] = f;
        if (s !== 'pack') o.progress[s] = stageKg[s] * f;
        if (s === 'pack' || f <= 0) continue;
        // смены 08:00–20:00 (А) и 20:00–08:00 (Б)
        const end = Math.min(b, cutoff);
        let cur = a;
        while (cur < end - 1000) {
          const d = new Date(cur), h = d.getHours();
          const bound = new Date(d); bound.setMinutes(0, 0, 0);
          if (h >= 8 && h < 20) bound.setHours(20); else { if (h >= 20) bound.setDate(bound.getDate() + 1); bound.setHours(8); }
          const segEnd = Math.min(bound.getTime(), end);
          const kg = (stageKg[s] * (segEnd - cur)) / (b - a);
          if (kg > 0.5) {
            const sh = shiftOf(cur);
            const mid = o.route[s];
            const date = dISO(cur);
            const outRec = { id: 'out' + cnt('out'), date, at: iso(segEnd), shift: sh, workshop: o.workshop, machineId: mid, operatorId: opFor(mid, sh), orderId: o.id, stage: s, kg: Math.round(kg * 10) / 10 };
            outputs.push(outRec);
            if (s === 'extrusion') {
              for (const [m, perKg] of p.recipe) {
                const norm = kg * perKg;
                writeoffs.push({ id: 'wo' + cnt('wo'), at: iso(segEnd), orderId: o.id, workshop: o.workshop, materialId: m, qty: norm * U(0.975, 1.065), norm, source: 'auto', stage: s, outputId: outRec.id });
              }
            }
            if (s === 'print') {
              for (const m of o.inks) {
                const norm = kg * settings.inkPerColorKg * o.coverage;
                writeoffs.push({ id: 'wo' + cnt('wo'), at: iso(segEnd), orderId: o.id, workshop: o.workshop, materialId: m, qty: norm * U(0.96, 1.12), norm, source: 'auto', stage: s, outputId: outRec.id });
              }
              const normS = kg * settings.solventPerKg * o.inks.length;
              writeoffs.push({ id: 'wo' + cnt('wo'), at: iso(segEnd), orderId: o.id, workshop: o.workshop, materialId: 'solvent', qty: normS * U(0.95, 1.15), norm: normS, source: 'auto', stage: s, outputId: outRec.id });
            }
          }
          cur = segEnd;
        }
      }
      // брак
      const dStages = stages.filter((s) => s !== 'pack');
      const nDef = R.int(1, 3);
      for (let i = 0; i < nDef; i++) {
        const s = R.pick(dStages);
        const a = t1 + W[s][0] * dur, b = t1 + W[s][1] * dur;
        const tt = a + (b - a) * U(0.1, 0.9);
        if (tt > cutoff) continue;
        const kg = (good * defRate) / nDef * (frac[s] || 0) * U(0.8, 1.2);
        if (kg < 0.3) continue;
        const sh = shiftOf(tt);
        defects.push({ id: 'df' + cnt('df'), date: dISO(tt), at: iso(tt), workshop: o.workshop, machineId: o.route[s], operatorId: opFor(o.route[s], sh), orderId: o.id, stage: s, kg: Math.round(kg * 10) / 10, reason: R.pick(DEFECT_REASONS[s]), recycle: R() < 0.75, kind: 'defect' });
      }
      // технологические отходы (возврат на переработку)
      if ((frac.extrusion || 0) > 0.3) {
        const tt = t1 + dur * 0.2;
        defects.push({ id: 'df' + cnt('df'), date: dISO(tt), at: iso(tt), workshop: o.workshop, machineId: o.route.extrusion, operatorId: opFor(o.route.extrusion, shiftOf(tt)), orderId: o.id, stage: 'extrusion', kg: Math.round(good * (p.waste / 100) * frac.extrusion * 10) / 10, reason: 'Технологические отходы (обрезь, запуск)', recycle: true, kind: 'waste' });
      }
      // упаковочные единицы
      const fp = frac.pack || 0;
      const packA = t1 + W.pack[0] * dur, packB = t1 + W.pack[1] * dur;
      const ukg = unitKg(p);
      const targetQty = o.qty * U(1.0, 1.01);
      const doneQty = fp >= 1 ? targetQty : targetQty * fp;
      const made = [];
      if (doneQty > 0) {
        const per = p.base === 'кг' ? null : p.unit.pcs;
        let q = 0, i = 0;
        const nEst = Math.max(1, Math.round(p.base === 'кг' ? doneQty / ukg : doneQty / per));
        while (q < doneQty - (fp >= 1 ? 0 : (per || ukg) * 0.5)) {
          let pcs, net;
          if (per) { pcs = Math.min(per, Math.round(targetQty - q)); if (fp < 1) pcs = per; if (pcs < per * 0.05) break; net = ((pcs * p.g) / 1000) * U(0.986, 1.014); }
          else { net = Math.round(U(42, 48) * 10) / 10; pcs = net; }
          const tt = packA + (Math.min(packB, cutoff) - packA) * ((i + 0.5) / nEst);
          const at = Math.min(tt, cutoff);
          const sh = shiftOf(at);
          const machineId = p.base === 'кг' ? o.route.extrusion : o.route.cut;
          const u = {
            id: 'AP-' + String(cnt('AP')).padStart(6, '0'), type: p.unit.type, orderId: o.id, productId: p.id, workshop: o.workshop, machineId,
            operatorId: opFor(machineId, sh), packerId: opFor(o.route.pack, sh), shift: sh, at: iso(at),
            net: Math.round(net * 100) / 100, gross: Math.round((net + AP.TARE[p.unit.type] * U(0.95, 1.05)) * 100) / 100, pcs, batches: [],
            status: 'produced', loc: null, stockAt: null, shipmentId: null, parent: null, reprints: 0, manual: false, scaleId: o.workshop === 'w1' ? 'sc1' : 'sc2',
          };
          const sa = at + U(1, 7) * H;
          if (sa < cutoff && !opt.noStock) { u.status = 'stock'; u.stockAt = iso(sa); u.loc = place(o.workshop); }
          units.push(u); made.push(u);
          q += pcs; i++;
          if (i > 400) break;
        }
        // упаковка — списание по единицам
        const pm = { box: 'box', sack: 'sack', roll: 'core' }[p.unit.type];
        if (pm && made.length) writeoffs.push({ id: 'wo' + cnt('wo'), at: made[made.length - 1].at, orderId: o.id, workshop: o.workshop, materialId: pm, qty: made.length, norm: made.length, source: 'auto', stage: 'pack' });
      }
      o.producedUnits = made;
      return made;
    }

    function ship(o, ms, frac, opt = {}) {
      const avail = units.filter((u) => u.orderId === o.id && u.status === 'stock').sort((a, b) => (a.stockAt < b.stockAt ? -1 : 1));
      if (!avail.length || ms > NOW) return null;
      const n = Math.max(1, Math.min(avail.length, Math.round(avail.length * frac)));
      const list = avail.slice(0, n);
      const c = CL[o.clientId];
      const sh = {
        id: 'ОТ-' + String(cnt('ОТ-')).padStart(4, '0'), orderId: o.id, clientId: o.clientId, date: dISO(ms), at: iso(ms),
        units: list.map((u) => u.id), qty: list.reduce((s, u) => s + u.pcs, 0), kg: Math.round(list.reduce((s, u) => s + u.gross, 0) * 10) / 10,
        truck: R.pick(['10 ', '01 ']) + R.int(100, 999) + ' ' + R.pick(['AAA', 'ABA', 'BCA', 'CDA', 'DAA', 'MAA']),
        driver: R.pick(['Ахрор Мансуров', 'Олег Ткаченко', 'Шерали Каримов', 'Умид Рахмонов', 'Зафар Исаев', 'Икром Валиев']),
        address: c.address, doc: 'ТТН-' + String(cnt('ТТН')).padStart(5, '0'), by: opt.by || 'u1',
      };
      sh.controlKg = Math.round(sh.kg * U(0.995, 1.006) * 10) / 10;
      list.forEach((u) => { u.status = 'shipped'; u.shipmentId = sh.id; });
      shipments.push(sh);
      log(ms, sh.by, 'Отгрузка оформлена', 'shipment', sh.id, o.no + ' · ' + list.length + ' ед. · ' + sh.truck);
      return sh;
    }

    const payMethod = (c) => {
      const r = R();
      if (c.type === 'Физ. лицо' || c.type === 'ИП' || c.type === 'ЧП') return r < 0.55 ? 'cash' : r < 0.8 ? 'card' : 'bank';
      return r < 0.9 ? 'bank' : r < 0.95 ? 'card' : 'cash';
    };
    function pay(o, ms, amount, method) {
      if (ms > NOW || amount < 1) return;
      const c = CL[o.clientId];
      const m = method || payMethod(c);
      payments.push({ id: 'ПЛ-' + String(cnt('ПЛ-')).padStart(4, '0'), date: dISO(ms), at: iso(ms), clientId: o.clientId, orderId: o.id, amount: Math.round(amount / 1000) * 1000, method: m, by: m === 'cash' ? 'u1' : 'u1', note: '' });
      log(ms, 'u1', 'Поступление оплаты', 'payment', o.id, o.no + ' · ' + AP.fmt.money(amount) + ' · ' + AP.PAY[m].t);
    }
    const amountOf = (o, q) => { const p = PROD[o.productId]; return p.base === 'кг' ? q * o.price : (q / 1000) * o.price; };

    /* ---------- исторические заказы (последние ~3 месяца) ---------- */
    const QTY = { p1: [150e3, 450e3, 5000], p2: [50e3, 150e3, 2000], p3: [500e3, 1400e3, 20000], p4: [25e3, 70e3, 500], p5: [40e3, 100e3, 1000], p6: [800, 2500, 45], p7: [300e3, 800e3, 10000], p8: [120e3, 300e3, 4000] };
    const QK = { c4: 0.55, c9: 0.6, c11: 0.16 };
    const qtyFor = (pid, cid) => { const [a, b, s] = QTY[pid]; return Math.max(s, round(U(a, b) * (QK[cid] || 1), s)); };
    const weighted = ['c1', 'c1', 'c1', 'c2', 'c2', 'c3', 'c3', 'c3', 'c5', 'c5', 'c6', 'c7', 'c7', 'c8', 'c10', 'c10', 'c12', 'c12'];
    const forced = { 4: 'c9', 9: 'c4', 17: 'c9', 24: 'c11', 27: 'c4', 33: 'c9', 38: 'c4', 41: 'c11' };
    const unpaidAfter = { c9: -80, c4: -45, c11: -30 };

    for (let k = 0; k < 48; k++) {
      const created = tAt(-96 + k * 1.75, R.int(9, 17), R.int(0, 59));
      const cid = forced[k] || R.pick(weighted);
      const c = CL[cid];
      const pid = R.pick(c.products);
      const p = PROD[pid];
      const logo = p.printable;
      const o = makeOrder({ clientId: cid, productId: pid, qty: qtyFor(pid, cid), created: iso(created), date: dISO(created), logo, managerId: c.managerId });
      o.deadline = dISO(created + R.int(7, 13) * DAY);
      log(created, c.managerId === 'u5' ? 'u1' : 'u1', 'Создан заказ', 'order', o.id, o.no + ' · ' + c.name + ' · ' + p.name);
      let t = created;
      if (logo) { o.maket = { file: 'maket_' + o.no + '.pdf', approved: true, approvedAt: iso(t + U(20, 40) * H), by: 'u1' }; t += U(24, 44) * H; log(t, 'u1', 'Макет согласован', 'order', o.id, o.no); }
      const queued = t + U(4, 18) * H;
      const start = queued + U(6, 26) * H;
      const kg = kgOf(p, o.qty);
      const prodH = (kg / ({ w1: 760, w2: 820 })[o.workshop]) * 24 * U(0.9, 1.25) + 10;
      const end = start + prodH * H;
      o.task = { machineId: o.route.extrusion, queuedAt: iso(queued), startedAt: iso(start), by: shopHead(o.workshop) };
      log(queued, shopHead(o.workshop), 'Задание поставлено в очередь', 'order', o.id, o.no + ' → ' + machines.find((m) => m.id === o.route.extrusion).name);
      log(start, shopHead(o.workshop), 'Запуск производства', 'order', o.id, o.no);
      produce(o, start, end);
      // отгрузки
      const partial = R() < 0.22;
      const s1 = end + U(10, 40) * H;
      const shs = [];
      if (partial) { const a = ship(o, s1, 0.6); if (a) shs.push(a); const b = ship(o, s1 + U(40, 90) * H, 1); if (b) shs.push(b); }
      else { const a = ship(o, s1, 1); if (a) shs.push(a); }
      // оплаты по условиям клиента
      const total = amountOf(o, o.qty);
      const unpaid = unpaidAfter[cid] != null && shs.length && D.parse(shs[0].date).getTime() > T0 + unpaidAfter[cid] * DAY;
      if (c.terms === 'pre100') pay(o, created + U(3, 20) * H, total);
      else if (c.terms === 'pre50') {
        pay(o, created + U(3, 22) * H, total * 0.5, 'bank');
        for (const s of shs) pay(o, D.parse(s.date).getTime() + (c.payDays + U(-3, 2)) * DAY + 11 * H, amountOf(o, s.qty) - total * 0.5 * (s.qty / o.qty));
      } else if (!unpaid) {
        for (const s of shs) {
          const amt = amountOf(o, s.qty);
          const late = R() > c.rel ? U(4, 25) : U(-4, 1);
          const when = D.parse(s.date).getTime() + (c.payDays + late) * DAY + R.int(10, 17) * H;
          if (R() < 0.15) { pay(o, when - 3 * DAY, amt * 0.4); pay(o, when, amt * 0.6); } else pay(o, when, amt);
        }
      } else if (cid === 'c4' && R() < 0.5) {
        for (const s of shs) pay(o, D.parse(s.date).getTime() + 9 * DAY, amountOf(o, s.qty) * 0.3, 'cash');
      }
      // доплата за перевыпуск тиража (±1%) у добросовестных клиентов
      if (!unpaid && shs.length) {
        const diff = shs.reduce((s, x) => s + amountOf(o, x.qty), 0) - payments.filter((x) => x.orderId === o.id).reduce((s, x) => s + x.amount, 0);
        if (diff > 1000) pay(o, D.parse(shs[shs.length - 1].date).getTime() + (c.payDays + 1) * DAY + 12 * H, diff);
      }
    }

    /* ---------- текущие заказы: по одному на каждый статус ---------- */
    const A = {};
    const now = NOW;
    // новые
    A.n1 = makeOrder({ clientId: 'c7', productId: 'p7', qty: 400e3, created: iso(Math.min(tAt(0, 9, 40), now - 30 * 60000)), managerId: 'u1' });
    A.n2 = makeOrder({ clientId: 'c2', productId: 'p3', qty: 900e3, created: iso(tAt(-1, 16, 10)), managerId: 'u1' });
    // согласование макета
    A.l1 = makeOrder({ clientId: 'c6', productId: 'p4', qty: 30e3, created: iso(tAt(-2, 11, 5)), logo: true, managerId: 'u1', maket: { file: 'Bahor_logo_v2.pdf', approved: false, sent: iso(tAt(-1, 15, 20)) }, notes: 'Клиент просит сдвинуть логотип на 2 см выше' });
    // ждёт сырьё (синий мастербатч)
    A.w1 = makeOrder({ clientId: 'c12', productId: 'p8', qty: 240e3, created: iso(tAt(-2, 10, 0)), managerId: 'u5' });
    A.w1.task = { machineId: 'm1', queuedAt: iso(tAt(-1, 9, 30)), startedAt: null, by: 'u2' };
    A.w1.route.extrusion = 'm1';
    // в очереди
    A.q1 = makeOrder({ clientId: 'c1', productId: 'p1', qty: 300e3, created: iso(tAt(-1, 10, 20)), managerId: 'u5' });
    A.q1.route.extrusion = 'm1'; A.q1.task = { machineId: 'm1', queuedAt: iso(tAt(-1, 17, 0)), startedAt: null, by: 'u2' };
    A.q2 = makeOrder({ clientId: 'c3', productId: 'p3', qty: 1200e3, created: iso(tAt(-1, 12, 40)), managerId: 'u5', urgent: { by: 'u1', name: 'Алишер Юсупов', reason: 'Сеть открывает 3 магазина — нужно к пятнице', at: iso(tAt(-1, 13, 0)) } });
    A.q2.route.extrusion = 'm2'; A.q2.task = { machineId: 'm2', queuedAt: iso(tAt(-1, 13, 5)), startedAt: null, by: 'u2' };
    // в производстве — разные этапы
    A.p1 = makeOrder({ clientId: 'c3', productId: 'p2', qty: 120e3, created: iso(tAt(-4, 10, 0)), logo: true, managerId: 'u5' });
    A.p2 = makeOrder({ clientId: 'c1', productId: 'p2', qty: 90e3, created: iso(tAt(-5, 9, 30)), logo: true, managerId: 'u5' });
    A.p3 = makeOrder({ clientId: 'c10', productId: 'p5', qty: 60e3, created: iso(tAt(-4, 14, 0)), managerId: 'u1' });
    A.p4 = makeOrder({ clientId: 'c5', productId: 'p7', qty: 500e3, created: iso(tAt(-5, 15, 30)), managerId: 'u1' });
    // готов, на складе, частично, отгружен
    A.r1 = makeOrder({ clientId: 'c8', productId: 'p6', qty: 1800, created: iso(tAt(-5, 9, 0)), managerId: 'u1' });
    A.s1 = makeOrder({ clientId: 'c12', productId: 'p1', qty: 250e3, created: iso(tAt(-7, 11, 0)), managerId: 'u5' });
    A.pt = makeOrder({ clientId: 'c4', productId: 'p8', qty: 200e3, created: iso(tAt(-8, 12, 0)), managerId: 'u5' });
    A.sh = makeOrder({ clientId: 'c1', productId: 'p1', qty: 400e3, created: iso(tAt(-9, 10, 0)), managerId: 'u5' });
    A.sx = makeOrder({ clientId: 'c9', productId: 'p5', qty: 50e3, created: iso(tAt(-26, 10, 0)), managerId: 'u5' });

    const deadlines = { n1: 9, n2: 6, l1: 10, w1: 5, q1: 6, q2: 3, p1: 4, p2: 2, p3: 1, p4: 2, r1: 1, s1: 1, pt: -3, sh: -5, sx: -21 };
    for (const k in A) { A[k].date = D.dayOf(A[k].created); A[k].deadline = dISO(T0 + deadlines[k] * DAY); log(D.parse(A[k].created).getTime(), 'u1', 'Создан заказ', 'order', A[k].id, A[k].no + ' · ' + CL[A[k].clientId].name); }
    // макеты для заказов с логотипом
    for (const k of ['p1', 'p2']) { A[k].maket = { file: 'maket_' + A[k].no + '.pdf', approved: true, approvedAt: iso(D.parse(A[k].created).getTime() + 22 * H), by: 'u1' }; }
    A.p1.coverage = 1.2;

    const run = (o, startMs, endMs, opt) => {
      o.task = { machineId: o.route.extrusion, queuedAt: iso(startMs - 8 * H), startedAt: iso(startMs), by: shopHead(o.workshop) };
      log(startMs, shopHead(o.workshop), 'Запуск производства', 'order', o.id, o.no);
      return produce(o, startMs, endMs, opt);
    };
    run(A.p1, now - 10 * H, now + 44 * H);                         // экструзия ~25%
    run(A.p2, now - 38 * H, now + 10 * H);                         // печать
    A.p3.route.cut = 'm3';
    run(A.p3, now - 36 * H, now + 9 * H, { defectMul: 2.4 });      // резка, брак выше нормы
    run(A.p4, now - 44 * H, now + 4 * H);                          // упаковка
    run(A.r1, now - 40 * H, now - 3 * H, { noStock: true });       // готов, не принят на склад
    run(A.s1, tAt(-6, 8), tAt(-3, 14));                             // на складе
    run(A.pt, tAt(-7, 8), tAt(-4, 20));
    run(A.sh, tAt(-8, 8), tAt(-5, 12));
    run(A.sx, tAt(-25, 8), tAt(-22, 18));
    // поддоны для zip-пакетов (вложенность: паллета → коробки)
    const palletize = (o, per) => {
      const list = units.filter((u) => u.orderId === o.id && u.status === 'stock');
      for (let i = 0; i + per <= list.length; i += per) {
        const ch = list.slice(i, i + per);
        const pl = { id: 'PL-' + String(cnt('PL')).padStart(4, '0'), type: 'pallet', orderId: o.id, productId: o.productId, workshop: o.workshop, machineId: null, operatorId: ch[0].packerId, shift: ch[0].shift, at: ch[ch.length - 1].stockAt, net: Math.round(ch.reduce((s, u) => s + u.net, 0) * 10) / 10, gross: Math.round((ch.reduce((s, u) => s + u.gross, 0) + AP.TARE.pallet) * 10) / 10, pcs: ch.reduce((s, u) => s + u.pcs, 0), batches: [], status: 'stock', loc: 'C-0' + R.int(1, 6), stockAt: ch[ch.length - 1].stockAt, shipmentId: null, parent: null, reprints: 0 };
        ch.forEach((u) => { u.parent = pl.id; u.loc = pl.loc; });
        units.push(pl);
      }
    };
    palletize(A.p4, 12);
    ship(A.pt, tAt(-3, 15), 0.6, { by: 'u1' });
    ship(A.sh, tAt(-3, 11), 1, { by: 'u1' });
    ship(A.sx, tAt(-19, 10), 1, { by: 'u1' });
    pay(A.pt, tAt(-2, 12), amountOf(A.pt, A.pt.qty) * 0.15, 'cash');
    // предоплата по «Green Box»
    pay(A.r1, tAt(-4, 11), amountOf(A.r1, 1800), 'bank');
    pay(A.p4, tAt(-5, 17), amountOf(A.p4, A.p4.qty) * 0.5, 'bank');

    /* ---------- партии сырья, приходы и долги поставщикам ---------- */
    const cons = {};
    writeoffs.forEach((w) => (cons[w.materialId] = (cons[w.materialId] || 0) + w.qty));
    const END = { hdpe: 9800, ldpe: 5200, lldpe: 1650, caco3: 520, mb_white: 410, mb_black: 230, mb_blue: 35, ink_blue: 128, ink_red: 26, ink_green: 74, ink_black: 92, ink_white: 80, solvent: 310, core: 640, box: 290, sack: 2150 };
    const NBATCH = { hdpe: 11, ldpe: 8, lldpe: 4, caco3: 3, mb_white: 3, mb_black: 3, mb_blue: 2, ink_blue: 3, ink_red: 2, ink_green: 2, ink_black: 2, ink_white: 1, solvent: 3, core: 2, box: 4, sack: 3 };
    const SPLIT = { granule: { sklad: 0.7, w1: 0.17, w2: 0.13 }, additive: { sklad: 0.6, w1: 0.4, w2: 0 }, masterbatch: { sklad: 0.65, w1: 0.2, w2: 0.15 }, ink: { sklad: 0.55, w1: 0, w2: 0.45 }, solvent: { sklad: 0.6, w1: 0, w2: 0.4 }, pack: { sklad: 0.8, w1: 0.1, w2: 0.1 } };
    for (const m of materials) {
      const total = (cons[m.id] || 0) + END[m.id];
      const n = NBATCH[m.id];
      const step = m.pack ? m.pack.qty : 50;
      const list = [];
      for (let i = 0; i < n; i++) {
        const dOff = -100 + ((i + 0.5) * 96) / n + U(-3, 3);
        const t = tAt(Math.min(-2, Math.round(dOff)), R.int(9, 15));
        const qty = Math.max(step, round((total / n) * U(0.85, 1.15), step));
        const b = { id: 'B' + cnt('B'), code: m.code + '-' + dISO(t).slice(2).replace(/-/g, ''), materialId: m.id, supplierId: m.supplierId, date: dISO(t), qty, price: Math.round((m.price * U(0.96, 1.03)) / 10) * 10, doc: 'Счёт-фактура №' + R.int(1200, 9800), left: { sklad: 0, w1: 0, w2: 0 }, weighed: m.unit === 'кг', scaleId: m.unit === 'кг' ? 'sc3' : null };
        list.push(b); batches.push(b);
        log(t, 'u1', 'Приход сырья', 'batch', b.id, m.name + ' · ' + AP.fmt.num(qty) + ' ' + m.unit + ' · партия ' + b.code);
      }
      // остаток — в самых новых партиях (FIFO)
      let rest = END[m.id];
      const sp = SPLIT[m.kind];
      for (let i = list.length - 1; i >= 0 && rest > 0; i--) {
        const take = Math.min(list[i].qty, rest);
        rest -= take;
        list[i].left = { sklad: take * sp.sklad, w1: take * sp.w1, w2: take * sp.w2 };
      }
      // привязка списаний к партиям (последняя партия до даты списания)
      list.sort((a, b) => (a.date < b.date ? -1 : 1));
      writeoffs.filter((w) => w.materialId === m.id).forEach((w) => {
        let pick = list[0];
        for (const b of list) if (b.date <= D.dayOf(w.at)) pick = b;
        w.batchId = pick.id; w.price = pick.price;
      });
    }
    // какие партии сырья ушли в единицу продукции
    const byMat = AP.groupBy(batches, 'materialId');
    units.forEach((u) => {
      const p = PROD[u.productId];
      u.batches = p.recipe.map(([m]) => { let pick = byMat[m][0]; for (const b of byMat[m]) if (b.date <= D.dayOf(u.at)) pick = b; return pick.id; });
    });
    // оплаты поставщикам
    const supPay = { s1: 0.97, s2: 0.95, s3: 0.85, s4: 0.95, s5: 0.98 };
    batches.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((b, i) => {
      const s = suppliers.find((x) => x.id === b.supplierId);
      const amt = b.qty * b.price;
      const when = D.parse(b.date).getTime() + (s.payDays + U(-6, 2)) * DAY + 12 * H;
      const recent = D.parse(b.date).getTime() > T0 - 60 * DAY;
      const skip = (b.supplierId === 's3' && b.materialId === 'mb_white' && recent) || (b.supplierId === 's4' && b.materialId === 'ink_blue' && recent);
      if (when < NOW && !skip && R() < supPay[b.supplierId] + 0.05) {
        expenses.push({ id: 'РС-' + String(cnt('РС-')).padStart(4, '0'), date: dISO(when), at: iso(when), category: 'raw', amount: Math.round(amt), method: 'bank', supplierId: s.id, batchId: b.id, note: 'Оплата по ' + b.doc, by: 'u1' });
      }
    });

    /* ---------- прочие расходы ---------- */
    const exp = (ms, category, amount, method, note) => { if (ms > NOW) return; expenses.push({ id: 'РС-' + String(cnt('РС-')).padStart(4, '0'), date: dISO(ms), at: iso(ms), category, amount: Math.round(amount / 1000) * 1000, method, note, by: 'u1' }); };
    for (let d = -100; d <= 0; d++) {
      const dt = new Date(T0 + d * DAY);
      const dom = dt.getDate();
      if (dom === 5) { exp(tAt(d, 11), 'salary', 36e6 * U(0.95, 1.05), 'bank', 'Аванс за ' + AP.MONTHS_FULL[dt.getMonth()].toLowerCase()); exp(tAt(d, 12), 'salary', 5e6, 'cash', 'Аванс, наличные'); }
      if (dom === 20) { exp(tAt(d, 11), 'salary', 54e6 * U(0.95, 1.06), 'bank', 'Зарплата за ' + AP.MONTHS_FULL[(dt.getMonth() + 11) % 12].toLowerCase()); exp(tAt(d, 12), 'salary', 7e6, 'cash', 'Зарплата, наличные'); }
      if (dom === 1) exp(tAt(d, 10), 'rent', 18e6, 'bank', 'Аренда помещения цеха №2');
      if (dom === 10) exp(tAt(d, 10), 'power', 21e6 * U(0.9, 1.1), 'bank', 'Электроэнергия за прошлый месяц');
      if (dom === 15) exp(tAt(d, 10), 'tax', 23e6 * U(0.9, 1.1), 'bank', 'Налоги за прошлый месяц');
      if (dt.getDay() === 2) exp(tAt(d, 15), 'transport', U(1.2e6, 2.6e6), R() < 0.6 ? 'cash' : 'card', 'ГСМ, доставка клиентам');
      if (R() < 0.05) exp(tAt(d, 14), 'repair', U(2.5e6, 9e6), R() < 0.5 ? 'card' : 'cash', R.pick(['Нож для ПД-2', 'Ремень привода ЭК-1', 'Нагреватели экструдера', 'Анилоксовый вал ФП-1', 'Подшипники намотчика']));
      if (R() < 0.12) exp(tAt(d, 16), 'other', U(0.3e6, 1.8e6), 'card', R.pick(['Связь и интернет', 'Канцтовары', 'Вода, чай для цехов', 'Хозтовары', 'Спецодежда']));
    }

    /* ---------- простои станков ---------- */
    const DT_REASONS = ['Замена ножа / наладка', 'Нет сырья на участке', 'Перезаправка рукава', 'Плановое обслуживание', 'Отключение электроэнергии', 'Смена печатных форм', 'Поломка намотчика'];
    for (let i = 0; i < 34; i++) {
      const m = R.pick(machines.filter((x) => x.type !== 'pack'));
      const st = tAt(-R.int(1, 60), R.int(0, 23), R.int(0, 59));
      const len = R.int(15, 180);
      downtimes.push({ id: 'dt' + cnt('dt'), machineId: m.id, workshop: m.workshop, start: iso(st), end: iso(st + len * 60000), reason: R.pick(DT_REASONS), by: shopHead(m.workshop) });
    }
    downtimes.push({ id: 'dt' + cnt('dt'), machineId: 'm4', workshop: 'w1', start: iso(now - 52 * 60000), end: null, reason: 'Замена ножа / наладка', by: 'u2' });
    downtimes.sort((a, b) => (a.start < b.start ? -1 : 1));

    /* ---------- исправления списаний и утверждения ---------- */
    const woInk = writeoffs.filter((w) => w.orderId === A.p2.id && w.materialId === 'ink_blue').pop();
    const approvals = [];
    if (woInk) {
      approvals.push({ id: 'AR1', kind: 'writeoff_fix', status: 'pending', ts: iso(now - 2.2 * H), uid: 'u3', user: 'Шерзод Назаров', title: 'Исправление списания: краска синяя по ' + A.p2.no, ref: { writeoffId: woInk.id, oldQty: woInk.qty, newQty: Math.round(woInk.qty * 0.55 * 10) / 10 }, comment: 'Банку краски отметили дважды при смене, фактический расход меньше' });
      log(now - 2.2 * H, 'u3', 'Запрос на исправление списания', 'writeoff', woInk.id, 'Ожидает решения директора');
    }
    const woOld = writeoffs.find((w) => w.materialId === 'hdpe' && w.at < iso(T0 - 30 * DAY));
    if (woOld) {
      const fix = { id: 'wo' + cnt('wo'), at: iso(D.parse(woOld.at).getTime() + 5 * H), orderId: woOld.orderId, workshop: woOld.workshop, materialId: 'hdpe', qty: -25, norm: 0, source: 'correction', correctionOf: woOld.id, comment: 'Мешок гранулята вернули на склад — не был засыпан в бункер', batchId: woOld.batchId, price: woOld.price, by: 'u1' };
      writeoffs.push(fix);
      approvals.push({ id: 'AR0', kind: 'writeoff_fix', status: 'approved', ts: iso(D.parse(woOld.at).getTime() + 3 * H), uid: 'u2', user: 'Бахтиёр Каримов', title: 'Исправление списания: ПНД −25 кг', ref: { writeoffId: woOld.id }, comment: fix.comment, decidedBy: 'Алишер Юсупов', decidedAt: fix.at });
      log(D.parse(fix.at).getTime(), 'u1', 'Исправление списания утверждено', 'writeoff', woOld.id, fix.comment);
    }

    /* ---------- ручной ввод веса (пример для журнала) ---------- */
    const mu = units.find((u) => u.workshop === 'w1' && u.at < iso(T0 - 10 * DAY));
    if (mu) { mu.manual = true; mu.manualComment = 'Весы Ц1 перезагружались, вес снят с контрольных весов склада'; log(D.parse(mu.at).getTime(), 'u2', 'Ручной ввод веса', 'unit', mu.id, mu.net + ' кг · ' + mu.manualComment); }

    /* ---------- создание учётных записей (журнал) ---------- */
    log(tAt(-100, 10), 'u1', 'Создан пользователь', 'user', 'u2', 'Начальник цеха №1 · доступ: Цех №1');
    log(tAt(-100, 10, 5), 'u1', 'Создан пользователь', 'user', 'u3', 'Начальник цеха №2 · доступ: Цех №2');
    ['u4', 'u5', 'u6', 'u7'].forEach((uid, i) => log(tAt(-100, 10, 10 + i), 'u1', 'Создан пользователь (отключён)', 'user', uid, users.find((x) => x.id === uid).title + ' — дополнительная роль, включается по необходимости'));
    for (let d = -14; d <= 0; d++) { log(tAt(d, 8, R.int(0, 25)), 'u2', 'Вход в систему', 'user', 'u2', ''); log(tAt(d, 8, R.int(5, 40)), 'u3', 'Вход в систему', 'user', 'u3', ''); log(tAt(d, 9, R.int(0, 50)), 'u1', 'Вход в систему', 'user', 'u1', ''); }

    /* ---------- заявки на закупку, обязательства, касса ---------- */
    const purchaseRequests = [
      { id: 'ЗЯ-0007', date: dISO(tAt(-2, 10, 30)), materialId: 'mb_blue', qty: 100, orderId: A.w1.id, status: 'new', by: 'u1', note: 'Для ' + A.w1.no + ' — синий мастербатч закончился' },
      { id: 'ЗЯ-0006', date: dISO(tAt(-9, 12)), materialId: 'ink_red', qty: 60, orderId: null, status: 'ordered', by: 'u3', note: 'Минимальный остаток' },
    ];
    counters['ЗЯ-'] = 7;
    const obligations = [
      { id: 'OB1', name: 'Аренда помещения цеха №2', category: 'rent', amount: 18e6, due: dISO(T0 + (32 - new Date(T0).getDate()) * DAY), paid: false },
      { id: 'OB2', name: 'Электроэнергия (АО «Региональные электросети»)', category: 'power', amount: 22.4e6, due: dISO(T0 + 6 * DAY), paid: false },
      { id: 'OB3', name: 'Налоги за месяц', category: 'tax', amount: 24.1e6, due: dISO(T0 + 11 * DAY), paid: false },
    ];

    const db = {
      version: AP.DB_VERSION, demo: true, baseDay: D.iso(new Date(T0)), rev: 1,
      company: { name: 'CHIRCHIQ ALI PLAST', city: 'г. Чирчик, Ташкентская обл.', inn: '310 455 128', phone: '+998 70 000-00-00' },
      settings, workshops, machines, materials, products, suppliers, clients, users, employees,
      scales: [
        { id: 'sc1', name: 'Весы Ц1 · платформенные', workshop: 'w1', model: 'модель уточняется на выезде', max: 300, d: 0.05, link: 'RS-232 → COM3', online: true },
        { id: 'sc2', name: 'Весы Ц2 · платформенные', workshop: 'w2', model: 'модель уточняется на выезде', max: 300, d: 0.05, link: 'Ethernet 192.168.1.42', online: true },
        { id: 'sc3', name: 'Весы склада · паллетные', workshop: 'sklad', model: 'модель уточняется на выезде', max: 1500, d: 0.5, link: 'RS-232 → COM1', online: true },
      ],
      orders, units, outputs, defects, downtimes, batches, writeoffs, shipments, payments, expenses,
      transfers: [], movements: [], approvals, purchaseRequests, obligations, cashCloses: [], audit,
      opening: { cash: 42e6, bank: 260e6, card: 26e6 }, counters,
    };
    // временные поля, нужные только генератору
    orders.forEach((o) => { delete o.producedUnits; });

    // перемещения склад → цех (журнал выдачи)
    for (let d = -20; d <= 0; d++) {
      if (R() < 0.55) {
        const w = R() < 0.55 ? 'w1' : 'w2';
        const m = w === 'w1' ? R.pick(['hdpe', 'hdpe', 'mb_white', 'caco3', 'lldpe']) : R.pick(['ldpe', 'hdpe', 'ink_blue', 'ink_green', 'solvent']);
        const mt = MAT[m];
        const q = mt.pack ? mt.pack.qty * R.int(2, mt.kind === 'granule' ? 40 : 4) : 50;
        const t = tAt(d, R.int(7, 9), R.int(0, 59));
        if (t < NOW) db.movements.push({ id: 'mv' + cnt('mv'), at: iso(t), type: 'issue', materialId: m, qty: q, from: 'sklad', to: w, by: 'u1', note: 'Выдача в ' + (w === 'w1' ? 'цех №1' : 'цех №2') });
      }
    }

    // остатки денег: инкассация кассы и карты на расчётный счёт, стартовые остатки без ухода в минус
    const ev = [];
    payments.forEach((p) => ev.push([p.at, p.method, p.amount]));
    expenses.forEach((e) => ev.push([e.at, e.method, -e.amount]));
    ev.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const simulate = (open) => {
      const bal = Object.assign({}, open), mins = Object.assign({}, open), tr = [];
      let i = 0;
      for (let d = -100; d <= 0; d++) {
        const endDay = T0 + d * DAY + 18 * H;
        for (; i < ev.length && Date.parse(ev[i][0]) < endDay; i++) { bal[ev[i][1]] += ev[i][2]; mins[ev[i][1]] = Math.min(mins[ev[i][1]], bal[ev[i][1]]); }
        if (endDay > NOW) continue;
        const wd = new Date(endDay).getDay();
        if (wd === 5 && bal.cash > 45e6) { const a = Math.round((bal.cash - 30e6) / 1e6) * 1e6; tr.push({ id: 'TR' + (tr.length + 1), date: dISO(endDay), at: iso(endDay), from: 'cash', to: 'bank', amount: a, note: 'Инкассация выручки на расчётный счёт', by: 'u1' }); bal.cash -= a; bal.bank += a; }
        if (wd === 1 && bal.card > 30e6) { const a = Math.round((bal.card - 15e6) / 1e6) * 1e6; tr.push({ id: 'TR' + (tr.length + 1), date: dISO(endDay), at: iso(endDay), from: 'card', to: 'bank', amount: a, note: 'Перевод с корпоративной карты на расчётный счёт', by: 'u1' }); bal.card -= a; bal.bank += a; }
      }
      for (; i < ev.length; i++) { bal[ev[i][1]] += ev[i][2]; mins[ev[i][1]] = Math.min(mins[ev[i][1]], bal[ev[i][1]]); }
      return { mins, tr };
    };
    let open = { cash: 18e6, bank: 120e6, card: 8e6 };
    for (let it = 0; it < 10; it++) {
      const { mins } = simulate(open);
      let ok = true;
      for (const k of ['cash', 'bank', 'card']) { const floor = k === 'bank' ? 25e6 : k === 'cash' ? 4e6 : 2e6; if (mins[k] < floor) { open[k] += Math.round((floor - mins[k]) / 1e6 + 1) * 1e6; ok = false; } }
      if (ok) break;
    }
    db.opening = open;
    db.transfers = simulate(open).tr;
    // из кассы ушли и инкассации — учитываем в дневных оборотах
    db.transfers.forEach((t) => ev.push([t.at, t.from, -t.amount]));

    // сверка кассы за последние дни
    let cashBal = db.opening.cash;
    const cashByDay = {};
    ev.forEach(([at, m, v]) => { if (m === 'cash') { const d = D.dayOf(at); cashByDay[d] = (cashByDay[d] || 0) + v; } });
    const startDay = dISO(T0 - 100 * DAY);
    for (let d = -100; d < 0; d++) {
      const di = dISO(T0 + d * DAY);
      if (di < startDay) continue;
      cashBal += cashByDay[di] || 0;
      if (d >= -12) {
        const diff = d === -6 ? -50000 : 0;
        db.cashCloses.push({ date: di, expected: cashBal, actual: cashBal + diff, diff, by: 'u1', note: diff ? 'Недостача 50 000 сум — сдача клиенту, чек не пробит' : '' });
      }
    }

    // компактнее в localStorage: пустые поля единиц не храним
    units.forEach((u) => { for (const k in u) if (u[k] === null || u[k] === false || u[k] === 0) delete u[k]; });
    audit.sort((a, b) => (a.ts < b.ts ? -1 : 1));
    payments.sort((a, b) => (a.at < b.at ? -1 : 1));
    expenses.sort((a, b) => (a.at < b.at ? -1 : 1));
    shipments.sort((a, b) => (a.at < b.at ? -1 : 1));
    outputs.sort((a, b) => (a.at < b.at ? -1 : 1));
    counters.o = orders.length;
    return db;
  };
})();
