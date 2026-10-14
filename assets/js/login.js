/* Вход по личному логину и паролю (ТЗ 2.2, 9.3). Пакет на фоне — window.APBag, если WebGL доступен. */
(function () {
  'use strict';
  const AP = window.AP;
  AP.load();
  if (AP.currentUser()) { location.replace('app.html'); return; }

  const $ = (s) => document.querySelector(s);
  const form = $('#lf'), btn = $('#go'), err = $('.lg-error'), pass = $('#pass'), login = $('#login'), card = $('.lg-card');
  const bag = () => window.APBag || null;
  const BTN = btn.innerHTML;
  const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"/></svg>';
  let fails = 0, lockUntil = 0;

  try { const last = localStorage.getItem('ap.lastLogin'); if (last) { login.value = last; } } catch (e) { /* без хранилища */ }
  (login.value ? pass : login).focus();

  // пакет «отворачивается», пока вводят скрытый пароль
  pass.addEventListener('focus', () => { if (bag() && pass.type === 'password') bag().setShy(true); });
  pass.addEventListener('blur', () => { if (bag()) bag().setShy(false); });
  $('.eye').addEventListener('click', () => {
    const show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    $('.eye').innerHTML = show ? EYE_OFF : EYE;
    $('.eye').setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    if (bag()) bag().setShy(!show);
    pass.focus();
  });
  const caps = (e) => { if (e.getModifierState) $('.caps').classList.toggle('hide', !e.getModifierState('CapsLock')); };
  pass.addEventListener('keyup', caps); pass.addEventListener('keydown', caps);

  function showErr(text) {
    err.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span></span>';
    err.querySelector('span').textContent = text;
    err.classList.remove('hide');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    if (bag()) bag().shake();
  }
  [login, pass].forEach((i) => i.addEventListener('input', () => err.classList.add('hide')));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (Date.now() < lockUntil) return showErr('Слишком много попыток. Подождите ' + Math.ceil((lockUntil - Date.now()) / 1000) + ' с.');
    const l = login.value.trim(), p = pass.value;
    if (!l || !p) return showErr('Введите логин и пароль');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Проверяем…';
    let r;
    try { r = await AP.login(l, p, $('#remember').checked); }
    catch (x) { r = { ok: false, error: 'Браузер не поддерживает безопасный вход. Откройте сайт по https.' }; }
    if (!r.ok) {
      fails++;
      if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; }
      btn.disabled = false; btn.innerHTML = BTN;
      showErr(r.error);
      pass.select();
      return;
    }
    try { localStorage.setItem('ap.lastLogin', l); } catch (x) { /* без хранилища */ }
    btn.innerHTML = 'Добро пожаловать, ' + r.user.name.split(' ')[0] + '!';
    document.body.classList.add('leaving');
    let gone = false;
    const go = () => { if (!gone) { gone = true; location.href = 'app.html'; } };
    if (bag()) bag().flyAway(go); else setTimeout(go, 500);
    setTimeout(go, 1900);
  });
})();
