/* Студия — дополнения: тема, печать, самопроверка, дубликат, отмена, поиск по свайпу.
   Подключается после storage.js и ничего в нём не ломает. */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function toast(t) { if (window.U && U.toast) U.toast(t); }

  /* ================= CSS ================= */
  var CSS = [
    /* --- safe-area: не залезать под «чёлку» и полоску «Домой» --- */
    '.nv{padding-top:calc(env(safe-area-inset-top) + 4px) !important}',
    '.sc{padding-bottom:calc(env(safe-area-inset-bottom) + 8px)}',
    '.nv .rt .ib{min-width:38px;min-height:38px}',
    /* --- iOS не должен зумить страницу при фокусе поля --- */
    'input,textarea,select{font-size:16px !important}',

    /* --- светлая тема --- */
    'html[data-theme="light"]{--bg:#f6f4ef;--s1:#ffffff;--s2:#efece6;--s3:#e3dfd7;',
    '--bd:rgba(0,0,0,.10);--bd2:rgba(0,0,0,.18);',
    '--t1:#1b1b1d;--t2:#5d5d63;--t3:#8b8b90;',
    '--ac:#0a6cd6;--ac2:#0a6cd6;--ok:#248a3d;--wa:#a75b00;--er:#c8181b;',
    '--text-primary:#1b1b1d;--text-secondary:#5d5d63;--text-muted:#8b8b90;',
    '--text-accent:#0a6cd6;--text-warning:#a75b00;--text-success:#248a3d;--text-danger:#c8181b;',
    '--border:rgba(0,0,0,.10);--surface-1:#ffffff;--surface-2:#efece6;color-scheme:light}',
    'html[data-theme="light"] .ctx,html[data-theme="light"] .toast,html[data-theme="light"] .sb,',
    'html[data-theme="light"] .shd,html[data-theme="light"] .sheet{background:#fff !important;color:#1b1b1d !important}',
    'html[data-theme="light"] .ctx div{border-color:rgba(0,0,0,.10) !important}',
    'html[data-theme="light"] .ctx svg{color:#5d5d63}',

    /* --- печать: только содержимое, без интерфейса --- */
    '@media print{',
    'html,body{background:#fff !important;color:#000 !important}',
    '#ui,.ly,.sc,.in{position:static !important;height:auto !important;overflow:visible !important;display:block !important}',
    '.nv,.sbs,.sbg,.ctx,.toast,.svt,.sheet,.shd,.gr,.fade,.sx,.sxp{display:none !important}',
    '*{color:#000 !important;background:transparent !important;box-shadow:none !important;text-shadow:none !important}',
    '.rw,.row,.hs,.cv,.q{border-color:#bbb !important}',
    '}'
  ].join('\n');

  var styleEl = document.createElement('style');
  styleEl.id = 'studio-extra-css';
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ================= тема ================= */
  var THEMES = ['dark', 'light', 'auto'];
  function themeName() { return localStorage.getItem('studio_theme') || 'dark'; }
  function applyTheme() {
    var t = themeName();
    var light = t === 'light' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f6f4ef' : '#0b0c0e');
  }
  function nextTheme() {
    var i = THEMES.indexOf(themeName());
    var t = THEMES[(i + 1) % THEMES.length];
    localStorage.setItem('studio_theme', t);
    applyTheme();
    toast('Тема: ' + ({ dark: 'тёмная', light: 'светлая', auto: 'как в системе' })[t]);
    setTimeout(function () { if (window.U && U.R) U.R(); }, 60);
  }
  window.studioSetTheme = function (t) { localStorage.setItem('studio_theme', t); applyTheme(); };
  window.studioNextTheme = nextTheme;

  /* ================= счётчики IDB ================= */
  function countFiles() {
    return new Promise(function (res) {
      try {
        var q = indexedDB.open('studio_files');
        q.onsuccess = function () {
          try {
            var g = q.result.transaction('blobs').objectStore('blobs').count();
            g.onsuccess = function () { res(g.result); };
            g.onerror = function () { res(-1); };
          } catch (e) { res(-1); }
        };
        q.onerror = function () { res(-1); };
      } catch (e) { res(-1); }
    });
  }
  function lsBytes() {
    var n = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      n += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    return n;
  }

  /* ================= самопроверка ================= */
  function box(html) {
    var w = document.createElement('div');
    w.id = 'studio-diag';
    w.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end';
    w.innerHTML = '<div style="background:var(--s1,#17181b);color:var(--t1,#f2f2f4);width:100%;max-height:82vh;overflow:auto;' +
      'border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));font:15px/1.45 -apple-system,system-ui,sans-serif">' +
      '<div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-size:18px">Проверка приложения</b>' +
      '<button id="sd-x" style="margin-left:auto;background:var(--s3,#2a2b30);color:inherit;border:0;width:32px;height:32px;border-radius:16px;font-size:16px">✕</button></div>' +
      '<div id="sd-b">Считаю…</div></div>';
    document.body.appendChild(w);
    w.addEventListener('click', function (e) { if (e.target === w) w.remove(); });
    $('#sd-x', w).addEventListener('click', function () { w.remove(); });
    return $('#sd-b', w);
  }

  function selfCheck() {
    var b = box();
    Promise.all([countFiles()]).then(function (r) {
      var files = r[0];
      var objsN = (window.objs || []).length;
      var pages = 0;
      try { pages = Math.round(lsBytes() / 1024); } catch (e) {}
      var rows = [
        ['Версия', 'Студия · 2-я сборка'],
        ['Объектов', objsN],
        ['Файлов в памяти', files < 0 ? 'недоступно' : files],
        ['Занято в хранилище', pages + ' КБ (лимит ~5 МБ)'],
        ['Офлайн-режим', ('serviceWorker' in navigator) ? 'включён' : 'нет'],
        ['Тема', ({ dark: 'тёмная', light: 'светлая', auto: 'как в системе' })[themeName()]],
        ['Последняя копия', (function () {
          var v = localStorage.getItem('studio_last_backup');
          return v ? new Date(v).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'не делалась';
        })()]
      ];
      b.innerHTML = rows.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--bd,rgba(255,255,255,.1))">' +
          '<span style="color:var(--t2,#a3a4ab)">' + r[0] + '</span><b style="text-align:right">' + r[1] + '</b></div>';
      }).join('') +
        '<button id="sd-run" style="margin-top:16px;width:100%;padding:14px;border-radius:12px;border:1px solid var(--bd2,rgba(255,255,255,.16));' +
        'background:var(--s2,#1f2024);color:inherit;font:600 15px/1 inherit">Прогнать мини-тест</button>' +
        '<div id="sd-res" style="margin-top:12px;color:var(--t2,#a3a4ab);font-size:14px"></div>' +
        '<div style="margin-top:14px;color:var(--t3,#6c6d74);font-size:12.5px">Данные хранятся на этом устройстве. Копию можно скачать в меню копии.</div>';

      $('#sd-run', b).addEventListener('click', function () {
        var out = $('#sd-res', b);
        out.textContent = 'Проверяю запись…';
        var key = 'studio_selftest';
        try {
          localStorage.setItem(key, 'ok');
          var ok = localStorage.getItem(key) === 'ok';
          localStorage.removeItem(key);
          out.innerHTML = ok
            ? '<span style="color:#30d158">✓ Запись и чтение работают</span>'
            : '<span style="color:#ff453a">✗ Хранилище не пишет</span>';
        } catch (e) {
          out.innerHTML = '<span style="color:#ff453a">✗ Хранилище недоступно: ' + (e.message || e) + '</span>';
        }
      });
    });
  }
  window.studioSelfCheck = selfCheck;

  /* ================= дубликат объекта ================= */
  function nextId() {
    var max = 0;
    (window.objs || []).forEach(function (o) {
      var n = parseInt(String(o.n).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return String(max + 1);
  }
  function dupObj() {
    if (!window.curObj) return toast('Сначала откройте объект');
    var src = window.curObj;
    var copy;
    try { copy = JSON.parse(JSON.stringify(src)); } catch (e) { return toast('Не удалось скопировать'); }
    copy.n = nextId();
    copy.ts = Date.now();
    copy.name = (src.name ? src.name + ' · ' : '') + 'копия';
    window.objs.push(copy);
    try { window.lsSave && lsSave(); } catch (e) {}
    toast('Создан объект ' + copy.n);
    try { U.goTab('objs'); } catch (e) {}
  }
  window.studioDuplicate = dupObj;

  function hookObjMenu() {
    if (!(window.U && U.objMenu) || U.objMenu.__wrapped) return;
    var orig = U.objMenu;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try {
        var ctx = document.querySelector('.ctx');
        if (ctx && !ctx.querySelector('[data-dup]')) {
          var row = document.createElement('div');
          row.setAttribute('data-dup', '1');
          row.innerHTML = 'Дублировать объект' + (typeof I === 'function' ? I('cp', 18) : '');
          row.addEventListener('click', function () { try { U.closeS(1); } catch (e) {} dupObj(); });
          ctx.appendChild(row);
        }
      } catch (e) {}
      return r;
    };
    wrapped.__wrapped = true;
    U.objMenu = wrapped;
  }

  /* ================= отмена удаления объекта ================= */
  function undoBar(text, onUndo) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9000;' +
      'background:var(--s2,#1f2024);color:var(--t1,#f2f2f4);border:1px solid var(--bd2,rgba(255,255,255,.16));' +
      'border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;font:15px/1.3 -apple-system,system-ui,sans-serif;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.45)';
    d.innerHTML = '<span style="flex:1">' + text + '</span>';
    var btn = document.createElement('button');
    btn.textContent = 'Вернуть';
    btn.style.cssText = 'background:#0a84ff;color:#fff;border:0;border-radius:10px;padding:10px 14px;font:600 15px/1 inherit';
    d.appendChild(btn);
    document.body.appendChild(d);
    var t = setTimeout(function () { d.remove(); }, 7000);
    btn.addEventListener('click', function () {
      clearTimeout(t); d.remove();
      try { onUndo(); } catch (e) {}
    });
  }

  function hookUndo() {
    if (typeof window.doDelObj !== 'function' || window.doDelObj.__wrapped) return;
    var orig = window.doDelObj;
    var wrapped = function () {
      var snap;
      try { snap = JSON.stringify(window.objs || []); } catch (e) { snap = null; }
      var r = orig.apply(this, arguments);
      if (snap) {
        undoBar('Объект удалён', function () {
          try {
            window.objs = JSON.parse(snap);
            window.lsSave && lsSave();
            toast('Объект восстановлен');
            try { U.goTab('objs'); } catch (e) {}
          } catch (e) {}
        });
      }
      return r;
    };
    wrapped.__wrapped = true;
    window.doDelObj = wrapped;
  }

  /* ================= запоминаем последний открытый объект ================= */
  function hookOpenObj() {
    if (typeof window.U === 'undefined' || !U.openObj || U.openObj.__wrapped) return;
    var orig = U.openObj;
    var wrapped = function (i) {
      var r = orig.apply(this, arguments);
      try {
        var o = (window.objs || [])[i];
        if (o) localStorage.setItem('studio_last_obj', String(o.n));
      } catch (e) {}
      return r;
    };
    wrapped.__wrapped = true;
    U.openObj = wrapped;
  }

  /* ================= поиск: открывается свайпом вниз на главной ================= */
  var SX = { open: false, el: null, inst: false, pill: null, label: null };
  var PULL_ARM = 90; /* на сколько пикселей надо потянуть, чтобы открылся поиск */
  var pull = { on: false, act: false, x0: 0, y0: 0, dy: 0, sc: null, inn: null };

  function sxCss() {
    if (document.getElementById('studio-sx-css')) return;
    var s = document.createElement('style');
    s.id = 'studio-sx-css';
    s.textContent = [
      '.sxp{position:fixed;left:16px;right:16px;top:calc(env(safe-area-inset-top,0px) + 10px);height:44px;z-index:55;',
      'border-radius:12px;background:var(--s2);color:var(--t3);display:none;align-items:center;gap:8px;padding:0 12px;',
      'font-size:16px;pointer-events:none;border:1.5px solid transparent;box-sizing:border-box;max-width:640px;margin:0 auto}',
      '.sxp.arm{border-color:var(--ac2);color:var(--t1)}',
      '.sx{position:absolute;inset:0;z-index:60;background:var(--bg);display:flex;flex-direction:column;',
      'animation:sxin .24s cubic-bezier(.32,.72,0,1)}',
      '.sx.out{animation:sxout .18s ease forwards;pointer-events:none}',
      '@keyframes sxin{from{opacity:0;transform:translateY(-22px)}to{opacity:1;transform:none}}',
      '@keyframes sxout{to{opacity:0;transform:translateY(-22px)}}',
      '.sxh{flex:none;width:100%;max-width:672px;margin:0 auto;box-sizing:border-box;',
      'padding:calc(env(safe-area-inset-top,0px) + 10px) 16px 8px}',
      '.sxi{display:flex;align-items:center;gap:8px;height:44px;border-radius:12px;background:var(--s2);',
      'padding:0 6px 0 12px;color:var(--t3)}',
      '.sxi input{flex:1;min-width:0;background:none;border:0;outline:none;color:var(--t1);height:44px;padding:0}',
      '.sxi input::placeholder{color:var(--t3)}',
      '.sxi input::-webkit-search-cancel-button{display:none}',
      '.sxx{width:32px;height:32px;border-radius:16px;border:0;background:var(--s3);color:var(--t2);',
      'display:flex;align-items:center;justify-content:center;padding:0;flex:none}',
      '.sxr{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;',
      'width:100%;max-width:672px;margin:0 auto;box-sizing:border-box;padding:4px 16px 40px}',
      'body.kb .sxr{padding-bottom:45vh}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function sxResults() { try { return U.sres(); } catch (e) { return ''; } }

  function openSx() {
    if (SX.open || !(window.U && U.ui && U.sres)) return;
    SX.open = true;
    U.gq = '';
    var ov = document.createElement('div');
    ov.id = 'sx';
    ov.className = 'sx';
    ov.innerHTML = '<div class="sxh"><div class="sxi">' + U.I('se', 18) +
      '<input id="gq" type="search" enterkeyhint="search" placeholder="Объекты, проекты, решения, работы" ' +
      'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
      '<button class="sxx" type="button" aria-label="Закрыть поиск">' + U.I('x', 15) + '</button></div></div>' +
      '<div id="gres" class="sxr"></div>';
    U.ui.appendChild(ov);
    SX.el = ov;
    var inp = ov.querySelector('#gq'), res = ov.querySelector('#gres');
    res.innerHTML = sxResults();
    inp.addEventListener('input', function () { U.gq = inp.value; res.innerHTML = sxResults(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
    /* крестик: очищает, убирает клавиатуру и закрывает поиск */
    ov.querySelector('.sxx').addEventListener('click', function (e) { e.preventDefault(); closeSx(); });
    /* листаешь результаты - клавиатура прячется */
    res.addEventListener('touchmove', function () { if (document.activeElement === inp) inp.blur(); }, { passive: true });
    /* нажали на результат: если открылся другой экран, поиск закрываем; если шторка или подсказка - остаемся */
    var snap = null;
    res.addEventListener('click', function () { snap = { top: U.top(), len: U.st.length }; }, true);
    res.addEventListener('click', function () {
      setTimeout(function () {
        if (!SX.open || !snap) return;
        if (U.top() !== snap.top || U.st.length !== snap.len) { closeSx(); return; }
        if (U.ui.querySelector('.sht')) return;
        if (inp.value !== U.gq) inp.value = U.gq;
        res.innerHTML = sxResults();
      }, 0);
    });
    try { inp.focus(); } catch (e) {}
  }

  function closeSx() {
    if (!SX.open) return;
    SX.open = false;
    var ov = SX.el;
    SX.el = null;
    try { var i = ov.querySelector('#gq'); i.value = ''; i.blur(); } catch (e) {}
    U.gq = '';
    ov.classList.add('out');
    setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 190);
  }
  window.studioOpenSearch = openSx;
  window.studioCloseSearch = closeSx;

  function homeActive() {
    var t = window.U && U.top && U.top();
    return !!(t && t.id === 'home' && !SX.open && !U.busy && !U.ui.querySelector('.sht'));
  }

  function pullUpdate(dy) {
    var shift = Math.min(58, dy * 0.55);
    if (pull.inn) { pull.inn.style.transition = 'none'; pull.inn.style.transform = 'translateY(' + shift + 'px)'; }
    var k = Math.min(1, shift / 40);
    SX.pill.style.opacity = k;
    SX.pill.style.transform = 'translateY(' + ((1 - k) * -14) + 'px)';
    var arm = dy >= PULL_ARM;
    SX.pill.classList.toggle('arm', arm);
    SX.label.textContent = arm ? 'Отпустите для поиска' : 'Потяните вниз для поиска';
  }

  function pullEnd(cancel) {
    if (!pull.on) return;
    var was = pull.act, arm = !cancel && pull.dy >= PULL_ARM, inn = pull.inn;
    pull.on = false;
    pull.act = false;
    if (inn) {
      inn.style.transition = 'transform .22s cubic-bezier(.32,.72,0,1)';
      inn.style.transform = '';
      setTimeout(function () { inn.style.transition = ''; }, 260);
    }
    if (!was) return;
    if (arm) openSx(); /* фокус ставится прямо в жесте, поэтому клавиатура открывается сразу */
    SX.pill.style.display = 'none';
  }

  function installSx() {
    if (SX.inst || !(window.U && U.ui)) return;
    SX.inst = true;
    sxCss();
    var pill = document.createElement('div');
    pill.className = 'sxp';
    pill.innerHTML = U.I('se', 18) + '<span>Потяните вниз для поиска</span>';
    U.ui.appendChild(pill);
    SX.pill = pill;
    SX.label = pill.querySelector('span');

    document.addEventListener('touchstart', function (e) {
      pull.on = false;
      if (e.touches.length !== 1 || !homeActive()) return;
      var p = e.touches[0];
      if (p.clientX < 26) return; /* левый край - свайп назад */
      var sc = U.cur && U.cur.querySelector('.sc');
      if (!sc || !sc.contains(e.target) || sc.scrollTop > 0) return;
      pull.on = true;
      pull.act = false;
      pull.x0 = p.clientX;
      pull.y0 = p.clientY;
      pull.dy = 0;
      pull.sc = sc;
      pull.inn = sc.querySelector('.in');
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!pull.on) return;
      var p = e.touches[0], dx = p.clientX - pull.x0, dy = p.clientY - pull.y0;
      if (!pull.act) {
        if (dy > 10 && dy > Math.abs(dx) * 1.3 && pull.sc.scrollTop <= 0) {
          pull.act = true;
          SX.pill.style.display = 'flex';
        } else if (dy < -6 || Math.abs(dx) > 14) { pull.on = false; return; }
        else return;
      }
      pull.dy = Math.max(0, dy);
      pullUpdate(pull.dy);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', function () { pullEnd(false); });
    document.addEventListener('touchcancel', function () { pullEnd(true); });
  }

  /* на главной убираем постоянную строку поиска (его открывает свайп вниз) и плашку «Продолжить» */
  function hookHome() {
    if (!(window.U && U.S && U.S.home) || U.S.home.__wrapped) return;
    installSx();
    var orig = U.S.home;
    var wrapped = function () {
      var h = orig.apply(this, arguments);
      return String(h).replace(/<div class="srch"[^>]*>[\s\S]*?<\/div>/, '');
    };
    wrapped.__wrapped = true;
    U.S.home = wrapped;
    U.openSearch = function () { openSx(); };
    try { U.R(); } catch (e) {}
  }

  /* ================= меню ================= */
  function menu() {
    var t = themeName();
    var nextLabel = ({ dark: 'Светлая тема', light: 'Тема как в системе', auto: 'Тёмная тема' })[t];
    U.menu([
      ['Скачать копию', 'bk2', function () { window.studioDownloadBackup && window.studioDownloadBackup(); }],
      ['Восстановить из файла', 'cp', function () { window.studioPickImport && window.studioPickImport(); }],
      [nextLabel, 'sh', function () { nextTheme(); }],
      ['Печать экрана', 'im', function () { setTimeout(function () { window.print(); }, 200); }],
      ['Проверка приложения', 'ch', function () { selfCheck(); }]
    ]);
  }
  window.studioMenu = menu;

  /* ================= старт ================= */
  function boot() {
    applyTheme();
    if (window.matchMedia) {
      try {
        matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
          if (themeName() === 'auto') applyTheme();
        });
      } catch (e) {}
    }
    hookUndo();
    hookOpenObj();
    hookHome();
    hookObjMenu();
    // догоняем, если приложение уже успело отрисоваться
    var n = 0;
    var t = setInterval(function () {
      n++;
      applyTheme(); hookUndo(); hookOpenObj(); hookHome(); hookObjMenu();
      if (n > 20) clearInterval(t);
    }, 250);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 0);
  else window.addEventListener('DOMContentLoaded', boot);
})();
