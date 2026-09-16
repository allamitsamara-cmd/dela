/* «Дела» — записная книжка с галочками и календарём. Всё хранится в этом браузере (localStorage), сети не нужно.
   Задача: {id, text, area: work|home, bucket: day|week|month|long, key: дата|понедельник недели|месяц|'',
            time: 'ЧЧ:ММ'|'' , done, doneAt, carried (сколько раз переносилась), createdAt, updatedAt} */
'use strict';

const KEY = 'dela.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------------------------------------------------------------- даты
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const weekOf = (s) => { const x = parse(s); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return ymd(x); };
const monthOf = (s) => s.slice(0, 7);
const addMonths = (s, n) => { const [y, m] = s.split('-').map(Number); return monthOf(ymd(new Date(y, m - 1 + n, 1))); };
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_N = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_V = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const DAYS_S = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDay = (s) => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtDayFull = (s) => { const d = parse(s); return `${cap(DAYS[d.getDay()])}, ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
const fmtWeek = (s) => { const a = parse(s), b = parse(addDays(s, 6));
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]}` : `${fmtDay(s)} – ${fmtDay(addDays(s, 6))}`; };
const fmtMonth = (s) => { const [y, m] = s.split('-').map(Number); return `${MONTHS_N[m - 1]} ${y}`; };
const fmtMonthV = (s) => { const [y, m] = s.split('-').map(Number); return `${MONTHS_V[m - 1]}${y !== new Date().getFullYear() ? ' ' + y : ''}`; };
const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
function untilText(key, today) {                                // «через 12 дней» / «сегодня» / «прошло 3 дня»
  const d = daysBetween(today, key);
  if (d === 0) return 'сегодня';
  if (d === 1) return 'завтра';
  if (d > 0) return `через ${d} ${plural(d, ['день', 'дня', 'дней'])}`;
  return `прошло ${-d} ${plural(-d, ['день', 'дня', 'дней'])}`;
}
const relDay = (s, today) => (s === today ? 'сегодня' : s === addDays(today, 1) ? 'завтра' : s === addDays(today, -1) ? 'вчера' : '');

function now() {
  const t = ymd(new Date());
  return { today: t, week: weekOf(t), month: monthOf(t) };
}

// ---------------------------------------------------------------- данные
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const DEMO = new URLSearchParams(location.search).has('demo');   // ?demo — показать с примерами, ничего не сохранять
let state = load();
function load() {
  if (DEMO) return demoState();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.tasks)) return s;
  } catch (e) { /* испорченное хранилище — начинаем заново */ }
  return { tasks: [], tab: 'day', area: 'all', addArea: 'work', lastOpen: '' };
}
function save() { if (DEMO) return; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { alert('Не удалось сохранить: ' + e.message); } }

function demoState() {
  const n = now(), t = Date.now();
  const mk = (text, area, bucket, key, extra = {}) => ({ id: uid(), text, area, bucket, key, time: '', done: false, doneAt: 0, carried: 0, createdAt: t, updatedAt: t, ...extra });
  return { tab: 'day', area: 'all', addArea: 'work', lastOpen: n.today, tasks: [
    mk('Позвонить в банк по карте', 'work', 'day', n.today, { time: '11:00' }),
    mk('Подписать договор с арендодателем', 'work', 'day', n.today, { carried: 2 }),
    mk('Отправить отчёт за неделю', 'work', 'day', n.today),
    mk('Купить корм коту', 'home', 'day', n.today, { done: true, doneAt: t }),
    mk('Родительское собрание', 'home', 'day', addDays(n.today, 2), { time: '18:00' }),
    mk('Отпуск', 'home', 'day', addDays(n.today, 12), { countdown: true }),
    mk('День рождения мамы', 'home', 'day', addDays(n.today, 26), { countdown: true }),
    mk('Подготовить презентацию к четвергу', 'work', 'week', n.week),
    mk('Разобрать шкаф', 'home', 'week', n.week),
    mk('Отчёт в налоговую', 'work', 'month', n.month),
    mk('Выучить испанский до B1', 'home', 'long', ''),
  ] };
}

function addTask(text, area, bucket, key, time) {
  const t = Date.now();
  state.tasks.push({ id: uid(), text, area, bucket, key, time: time || '', done: false, doneAt: 0, carried: 0, createdAt: t, updatedAt: t });
  save();
}
function update(task, patch) { Object.assign(task, patch, { updatedAt: Date.now() }); save(); }
function remove(task) { state.tasks = state.tasks.filter((t) => t !== task); save(); }

/* Перенос невыполненного: всё, что осталось в прошлом дне/неделе/месяце, переезжает в текущий. */
function rollover() {
  const n = now(); let moved = 0;
  for (const t of state.tasks) {
    if (t.done || t.countdown) continue;                       // событие с отсчётом остаётся на своей дате
    const cur = { day: n.today, week: n.week, month: n.month }[t.bucket];
    if (cur && t.key && t.key < cur) { t.key = cur; t.carried = (t.carried || 0) + 1; t.updatedAt = Date.now(); moved++; }
  }
  state.lastOpen = n.today;
  if (moved) save();
  return moved;
}

// ---------------------------------------------------------------- выбранный период (в памяти, при открытии — сегодня)
const sel = { day: now().today, week: now().week, month: now().month };
const AREA_NAME = { work: 'Работа', home: 'Дом' };
let notice = '';
function flash(msg, ms = 4000) { notice = msg; render(); setTimeout(() => { notice = ''; render(); }, ms); }

const areaOk = (t) => state.area === 'all' || t.area === state.area;
const tasksFor = (bucket, key) => state.tasks.filter((t) => t.bucket === bucket && t.key === key && areaOk(t));
const openDay = (key) => state.tasks.filter((t) => t.bucket === 'day' && t.key === key && !t.done && areaOk(t));
const sortOpen = (a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : a.time ? -1 : b.time ? 1 : a.createdAt - b.createdAt);

// ---------------------------------------------------------------- отрисовка
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

function render() {
  const n = now();
  const d = new Date();
  $('#date').innerHTML = `<b>${DAYS[d.getDay()]}</b>, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  $$('#tabs button').forEach((b) => {
    const bucket = b.dataset.tab;
    const open = tasksFor(bucket, { day: n.today, week: n.week, month: n.month, long: '' }[bucket]).filter((t) => !t.done).length;
    b.querySelector('.n').textContent = open ? open : '';
    b.setAttribute('aria-selected', String(bucket === state.tab));
  });
  $$('#areas button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.area === state.area)));
  $$('#addarea button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.area === state.addArea)));

  const main = $('#main');
  main.innerHTML = '';
  if (notice) main.appendChild(el('p', 'notice', notice));
  ({ day: renderDay, week: renderWeek, month: renderMonth, long: renderLong })[state.tab](main, n);
  renderAddHint();
}

function list(items, emptyText) {
  const box = el('div', 'list');
  const open = items.filter((t) => !t.done).sort(sortOpen);
  const done = items.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt);
  if (!items.length && emptyText) box.appendChild(el('div', 'empty', emptyText));
  [...open, ...done].forEach((t) => box.appendChild(row(t)));
  return box;
}
function heading(title, items) {
  const open = items.filter((t) => !t.done).length;
  return el('h2', '', `${title} <span class="n">${open ? open + (items.length > open ? ' / ' + items.length : '') : ''}</span>`);
}
function arrow(dir, fn, label) { const b = el('button', 'arrow', dir < 0 ? '&#8249;' : '&#8250;'); b.type = 'button'; b.setAttribute('aria-label', label); b.onclick = fn; return b; }
function navBar(title, prev, next, backLabel, back) {
  const bar = el('div', 'nav');
  bar.appendChild(arrow(-1, prev, 'Назад'));
  const h = el('h2', '', title); bar.appendChild(h);
  if (back) { const b = el('button', 'cur', backLabel); b.type = 'button'; b.onclick = back; bar.appendChild(b); }
  bar.appendChild(arrow(1, next, 'Вперёд'));
  return bar;
}
function dots(count, cls = '') {
  const box = el('span', 'dots');
  if (count > 3) box.appendChild(el('i', 'num', count));
  else for (let i = 0; i < count; i++) box.appendChild(el('i', cls));
  return box;
}

/* ---- День: полоска недели, тап по числу — этот день */
function renderDay(main, n) {
  const ws = weekOf(sel.day);
  const strip = el('div', 'strip');
  strip.appendChild(arrow(-1, () => { sel.day = addDays(sel.day, -7); render(); }, 'Неделя назад'));
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    const c = el('button', 'd' + (k === n.today ? ' today' : ''), `${DAYS_S[i]}<b>${parse(k).getDate()}</b>`);
    c.type = 'button'; c.setAttribute('aria-pressed', String(k === sel.day));
    c.appendChild(dots(openDay(k).length));
    c.onclick = () => { sel.day = k; render(); };
    strip.appendChild(c);
  }
  strip.appendChild(arrow(1, () => { sel.day = addDays(sel.day, 7); render(); }, 'Неделя вперёд'));
  main.appendChild(strip);
  // обратный отсчёт до событий
  const events = state.tasks.filter((t) => t.countdown && !t.done && t.bucket === 'day' && t.key >= n.today && areaOk(t)).sort((a, b) => a.key.localeCompare(b.key));
  if (events.length) {
    const box = el('div', 'events');
    for (const t of events) {
      const d = daysBetween(n.today, t.key);
      const c = el('button', 'ev ' + t.area, `<b>${d === 0 ? 'сегодня' : d}</b><small>${d === 0 ? '' : plural(d, ['день', 'дня', 'дней'])}</small><span></span><small>${fmtDay(t.key)}</small>`);
      c.type = 'button'; $('span', c).textContent = t.text;
      c.onclick = () => { sel.day = t.key; render(); };
      box.appendChild(c);
    }
    main.appendChild(box);
  }
  const items = tasksFor('day', sel.day);
  const rel = relDay(sel.day, n.today);
  const h = heading(fmtDayFull(sel.day) + (rel ? ` <em>${rel}</em>` : ''), items);
  if (sel.day !== n.today) { const b = el('button', 'cur', 'к сегодня'); b.type = 'button'; b.onclick = () => { sel.day = n.today; render(); }; h.appendChild(b); }
  main.appendChild(h);
  main.appendChild(list(items, sel.day === n.today ? 'На сегодня ничего не записано' : 'На этот день ничего не записано'));
}

/* ---- Неделя: список на неделю + дела по дням этой недели */
function renderWeek(main, n) {
  main.appendChild(navBar(fmtWeek(sel.week), () => { sel.week = addDays(sel.week, -7); render(); }, () => { sel.week = addDays(sel.week, 7); render(); },
    'эта неделя', sel.week !== n.week ? () => { sel.week = n.week; render(); } : null));
  const items = tasksFor('week', sel.week);
  main.appendChild(heading('На неделю', items));
  main.appendChild(list(items, 'На эту неделю дел нет'));
  let any = false;
  for (let i = 0; i < 7; i++) {
    const k = addDays(sel.week, i);
    const dayItems = tasksFor('day', k);
    if (!dayItems.length) continue;
    any = true;
    const h = heading(`${cap(DAYS_S[i])}, ${fmtDay(k)}`, dayItems);
    const b = el('button', 'cur', 'открыть день'); b.type = 'button'; b.onclick = () => { sel.day = k; state.tab = 'day'; save(); render(); }; h.appendChild(b);
    main.appendChild(h); main.appendChild(list(dayItems));
  }
  if (!any) main.appendChild(el('p', 'hint', 'По дням на этой неделе пока ничего не записано'));
}

/* ---- Месяц: сетка-календарь с точками + список на месяц */
function renderMonth(main, n) {
  main.appendChild(navBar(fmtMonth(sel.month), () => { sel.month = addMonths(sel.month, -1); render(); }, () => { sel.month = addMonths(sel.month, 1); render(); },
    'этот месяц', sel.month !== n.month ? () => { sel.month = n.month; render(); } : null));
  const grid = el('div', 'grid');
  DAYS_S.forEach((s) => grid.appendChild(el('div', 'wd', s)));
  const first = sel.month + '-01';
  let k = weekOf(first);
  for (let i = 0; i < 42; i++) {
    const inMonth = monthOf(k) === sel.month;
    if (i >= 35 && !inMonth) break;
    const c = el('button', 'c' + (inMonth ? '' : ' out') + (k === n.today ? ' today' : ''), `<span>${parse(k).getDate()}</span>`);
    c.type = 'button'; c.appendChild(dots(openDay(k).length));
    const kk = k; c.onclick = () => { sel.day = kk; state.tab = 'day'; save(); render(); };
    grid.appendChild(c);
    k = addDays(k, 1);
  }
  main.appendChild(grid);
  const items = tasksFor('month', sel.month);
  main.appendChild(heading('На месяц', items));
  main.appendChild(list(items, 'На этот месяц дел нет'));
}

function renderLong(main) {
  const items = tasksFor('long', '');
  main.appendChild(heading('Долгосрочные', items));
  main.appendChild(list(items, 'Долгосрочных дел пока нет'));
}

function row(t) {
  const e = el('div', `task ${t.area}${t.done ? ' done' : ''}`, `
    <button class="chk" aria-label="${t.done ? 'Снять галочку' : 'Выполнено'}" aria-pressed="${t.done}">
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7.5l3.2 3L12 3.5"/></svg>
    </button>
    <div class="body"><div class="text"></div><div class="meta"><span class="area">${AREA_NAME[t.area]}</span></div></div>
    <button class="more" aria-label="Действия"><svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="16" cy="10" r="2"/></svg></button>`);
  const text = $('.text', e);
  if (t.time) text.appendChild(el('span', 'time', t.time));
  text.appendChild(document.createTextNode(t.text));
  const meta = $('.meta', e);
  if (t.countdown && !t.done) meta.appendChild(el('span', 'until', untilText(t.key, now().today)));
  if (t.carried) meta.appendChild(el('span', 'carried', `перенесено ×${t.carried}`));
  if (t.done && t.doneAt) meta.appendChild(el('span', '', `сделано ${fmtDay(ymd(new Date(t.doneAt)))}`));
  $('.chk', e).onclick = () => { update(t, { done: !t.done, doneAt: t.done ? 0 : Date.now() }); render(); };
  $('.more', e).onclick = () => openMenu(t);
  return e;
}

// ---------------------------------------------------------------- добавление
let addTime = null;   // null — без времени; '' — поле открыто, но пусто; 'ЧЧ:ММ'

function addTarget() {
  const n = now();
  return { day: ['day', sel.day], week: ['week', sel.week], month: ['month', sel.month], long: ['long', ''] }[state.tab];
}
function renderAddHint() {
  const h = $('#addhint'); h.innerHTML = '';
  const n = now();
  const [bucket, key] = addTarget();
  const rel = bucket === 'day' ? relDay(key, n.today) : '';
  const text = { day: `Запишу на ${rel ? rel + ', ' : ''}${fmtDayFull(key).toLowerCase()}`, week: `Запишу на неделю ${fmtWeek(key)}`, month: `Запишу на ${fmtMonthV(key)}`, long: 'Запишу в долгосрочные, без срока' }[bucket];
  h.appendChild(el('span', '', text));
  if (bucket !== 'day') { addTime = null; return; }
  if (addTime === null) {
    const b = el('button', '', '+ время'); b.type = 'button'; b.onclick = () => { addTime = ''; renderAddHint(); $('#addtime').focus(); }; h.appendChild(b);
  } else {
    const inp = el('input'); inp.type = 'time'; inp.id = 'addtime'; inp.value = addTime; inp.oninput = () => { addTime = inp.value; }; h.appendChild(inp);
    const x = el('button', '', 'без времени'); x.type = 'button'; x.onclick = () => { addTime = null; renderAddHint(); }; h.appendChild(x);
  }
}

$('#addform').onsubmit = (e) => {
  e.preventDefault();
  const inp = $('#addtext');
  const text = inp.value.trim();
  if (!text) return;
  const [bucket, key] = addTarget();
  addTask(text, state.addArea, bucket, key, bucket === 'day' ? addTime || '' : '');
  inp.value = '';
  render();
  inp.focus();
};
$('#addarea').onclick = (e) => { const b = e.target.closest('button'); if (b) { state.addArea = b.dataset.area; save(); render(); } };
$('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { state.tab = b.dataset.tab; save(); render(); } };
$('#areas').onclick = (e) => { const b = e.target.closest('button'); if (b) { state.area = b.dataset.area; save(); render(); } };

// ---------------------------------------------------------------- меню задачи
const sheet = $('#sheet'), panel = $('#sheetpanel');
function closeSheet() { sheet.removeAttribute('open'); }
sheet.onclick = (e) => { if (e.target.dataset.close !== undefined) closeSheet(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

function item(label, fn, cls = '') {
  const b = el('button', 'item ' + cls, label); b.type = 'button';
  b.onclick = () => { fn(); closeSheet(); render(); };
  return b;
}
function group(...items) { const g = el('div', 'grp'); items.forEach((i) => g.appendChild(i)); return g; }
function picker(t, type, label, apply) {
  /* строка «Выбрать дату…» раскрывается в поле ввода + кнопку */
  const b = el('button', 'item', label); b.type = 'button';
  b.onclick = () => {
    const wrap = el('div', 'pick');
    const inp = el('input'); inp.type = type;
    inp.value = type === 'date' ? (t.bucket === 'day' ? t.key : now().today) : (t.time || '');
    const ok = el('button', 'btn primary', 'Готово'); ok.type = 'button';
    ok.onclick = () => { if (inp.value || type === 'time') apply(inp.value); closeSheet(); render(); };
    wrap.append(inp, ok); b.replaceWith(wrap); inp.focus();
  };
  return b;
}

function openMenu(t) {
  const n = now();
  panel.innerHTML = '';
  panel.appendChild(el('p', 'title', (t.time ? t.time + ' ' : '') + t.text));
  const mv = (bucket, key, carried) => () => update(t, { bucket, key, carried: carried ? (t.carried || 0) + 1 : 0, time: bucket === 'day' ? t.time : '' });
  // «домашняя» дата задачи — от неё считаем неделю и месяц при переносе между списками
  const base = t.bucket === 'day' ? t.key : t.bucket === 'week' ? (t.key === n.week ? n.today : t.key) : t.bucket === 'month' ? (t.key === n.month ? n.today : t.key + '-01') : n.today;
  const moves = [picker(t, 'date', 'Перенести на другую дату…', (v) => update(t, { bucket: 'day', key: v, carried: 0 }))];
  if (t.bucket === 'day') {
    const next = addDays(t.key < n.today ? n.today : t.key, 1);
    moves.push(item(next === addDays(n.today, 1) ? 'На завтра' : `На ${fmtDay(next)}`, mv('day', next, true)));
    if (t.key !== n.today) moves.push(item('На сегодня', mv('day', n.today, false)));
  } else {
    moves.push(item('На сегодня', mv('day', n.today)));
  }
  if (t.bucket === 'week') moves.push(item(t.key === n.week ? 'На следующую неделю' : 'На эту неделю', t.key === n.week ? mv('week', addDays(n.week, 7), true) : mv('week', n.week, false)));
  else moves.push(item(`На неделю ${fmtWeek(weekOf(base))}`, mv('week', weekOf(base))));
  if (t.bucket === 'month') moves.push(item(t.key === n.month ? 'На следующий месяц' : 'На этот месяц', t.key === n.month ? mv('month', addMonths(n.month, 1), true) : mv('month', n.month, false)));
  else moves.push(item(`На ${fmtMonthV(monthOf(base))}`, mv('month', monthOf(base))));
  if (t.bucket !== 'long') moves.push(item('В долгосрочные', mv('long', '')));
  panel.appendChild(group(...moves));
  const extra = [];
  if (t.bucket === 'day') {
    extra.push(picker(t, 'time', t.time ? `Время: ${t.time} — изменить` : 'Указать время…', (v) => update(t, { time: v })));
    extra.push(item(t.countdown ? 'Убрать обратный отсчёт' : 'Обратный отсчёт до этого дня', () => update(t, { countdown: !t.countdown })));
  } else {
    extra.push(picker(t, 'date', 'Обратный отсчёт до даты…', (v) => update(t, { bucket: 'day', key: v, carried: 0, countdown: true })));
  }
  extra.push(item(t.area === 'work' ? 'Это домашнее дело' : 'Это рабочее дело', () => update(t, { area: t.area === 'work' ? 'home' : 'work' })));
  const ed = el('button', 'item', 'Изменить текст'); ed.type = 'button'; ed.onclick = () => editText(t); extra.push(ed);
  extra.push(item('Удалить', () => { if (confirm('Удалить это дело?')) remove(t); }, 'danger'));
  panel.appendChild(group(...extra));
  sheet.setAttribute('open', '');
}

function editText(t) {
  panel.innerHTML = '';
  const ta = el('textarea'); ta.value = t.text;
  const r = el('div', 'row');
  const cancel = el('button', 'btn', 'Отмена'); cancel.type = 'button'; cancel.onclick = closeSheet;
  const ok = el('button', 'btn primary', 'Сохранить'); ok.type = 'button';
  ok.onclick = () => { const v = ta.value.trim(); if (v) update(t, { text: v }); closeSheet(); render(); };
  r.append(cancel, ok); panel.append(ta, r); ta.focus();
}

// ---------------------------------------------------------------- меню приложения: копия в файл и обратно
$('#menu').onclick = () => {
  panel.innerHTML = '';
  const open = state.tasks.filter((t) => !t.done).length, done = state.tasks.length - open;
  panel.appendChild(el('p', 'title', `Всего дел: ${state.tasks.length} (открытых ${open}, сделано ${done}). Хранятся только в этом браузере и никуда не отправляются.`));
  panel.appendChild(group(
    item('Сохранить копию в файл', exportJson),
    item('Загрузить копию из файла', () => $('#importfile').click()),
    item('Убрать сделанное старше недели', () => {
      const lim = Date.now() - 7 * 864e5;
      const before = state.tasks.length;
      state.tasks = state.tasks.filter((t) => !(t.done && t.doneAt < lim)); save();
      flash(`Убрано: ${before - state.tasks.length}`);
    }),
  ));
  sheet.setAttribute('open', '');
};

function exportJson() {
  const blob = new Blob([JSON.stringify({ tasks: state.tasks, exported: new Date().toISOString() }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `дела-${now().today}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
$('#importfile').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const incoming = Array.isArray(data) ? data : data.tasks;
    if (!Array.isArray(incoming)) throw new Error('в файле нет списка дел');
    const byId = new Map(state.tasks.map((t) => [t.id, t]));
    let added = 0, updated = 0;
    for (const t of incoming) {
      if (!t || !t.id || typeof t.text !== 'string') continue;
      const mine = byId.get(t.id);
      if (!mine) { state.tasks.push(t); added++; }
      else if ((t.updatedAt || 0) > (mine.updatedAt || 0)) { Object.assign(mine, t); updated++; }
    }
    save(); rollover();
    flash(`Загружено: новых ${added}, обновлено ${updated}`);
  } catch (err) { alert('Не смог прочитать файл: ' + err.message); }
};

// ---------------------------------------------------------------- старт
(function start() {
  const moved = rollover();
  render();
  if (moved) flash(`Перенёс с прошлых дней: ${moved}`, 5000);
  // если приложение висело открытым через полночь — перенести при возвращении
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.lastOpen !== now().today) {
      Object.assign(sel, { day: now().today, week: now().week, month: now().month });
      const m = rollover(); render(); if (m) flash(`Перенёс с прошлых дней: ${m}`, 5000);
    }
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
