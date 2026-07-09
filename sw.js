// Копібара — service worker. Оновлення КЕРОВАНЕ: нова версія чекає згоди,
// застосунок показує запит «є оновлення» з переліком змін і оновлюється лише за натиском.
const VERSION = '2026.08.02';
const NOTES = [
  'Виправлено «зависання» на заставці: тепер вона ховається незалежно від помилок скрипта',
  'У добовому звіті «Старший групи» перенесено у шапку — під дати',
  'Кожен новий виліт за замовчуванням має коментар «Розвідка»',
  'Застосунок перейменовано на «Reports»; на заставці показується назва зміни',
  'Кілька коментарів у звіті — кожен окремим рядком під вильотом (шаблони більше не зливаються в один рядок)',
  'Кнопка «Інструкція» — поруч з іконкою застосунку; після встановлення переїжджає в кут',
  'Інструкція — поруч з іконкою застосунку вгорі справа; після встановлення переїжджає в кут',
  'Заставка з логотипом на старті (~3 с, тап — пропустити)',
  'Супутникова мапа за замовчуванням (кнопка ◧ перемикає на ч/б схему)',
  'Кнопка «Інструкція» вгорі зліва: детальний гайд зі складання та надсилання звіту',
  'Нові іконки: взліт — стрілка вгору від землі, у польоті — посадка (стрілка вниз)',
  'Іконку застосунку перенесено до кнопки встановлення (ховається, коли застосунок уже встановлено); можна додати за посиланням з інтернету — розмір підганяється автоматично',
  'Власна іконка застосунку: обирається до встановлення (manifest підміняється на льоту)',
  'Поле «Старший групи» — додається окремим рядком у звіт',
  'Редактор звіту (олівець): події доби, ручне редагування вильотів',
  'Звіт «Доба» — хронологія подій з авто-інтервалами «Ведення розвідки»',
  'Налаштування зміни: початок (16:00), шифр району, ручна к-сть вильотів',
];
const CACHE = 'kapibara-' + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // НЕ викликаємо skipWaiting — нова версія лишається у стані waiting до згоди користувача
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  const d = e.data;
  if (d === 'skipWaiting') { self.skipWaiting(); return; }
  if (d && d.type === 'getVersion' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ version: VERSION, notes: NOTES });
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  const isDoc = req.mode === 'navigate' ||
                (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));

  // Документ — З КЕШУ перш за все (кероване оновлення), мережа лише як запас на першому завантаженні.
  if (isDoc) {
    e.respondWith(
      caches.match('./index.html').then(c => c || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(ch => ch.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./')))
    );
    return;
  }

  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
