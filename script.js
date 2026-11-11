/*
  ==========================================================
  JAVASCRIPT: «Оселя». ОДИН файл на все 4 страницы.
  Каждая часть сначала проверяет, есть ли нужный блок на ЭТОЙ странице.
  Например, калькулятор есть только на poslugy.html — на других страницах
  эта часть просто ничего не делает.

  1) мобильное меню
  2) подсветка пункта меню текущей страницы
  3) калькулятор стоимости (poslugy.html)
  4) слайдеры «до / после» (index.html, roboty.html)
  5) форма заявки (kontakty.html)
  ==========================================================
*/

/* ---------- 1. Мобильное меню ---------- */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', function () {
  nav.classList.toggle('is-open');
});

/* ---------- 2. Активный пункт меню ----------
   Берём имя файла из адреса (например, "roboty.html") и подсвечиваем ссылку на него. */
const currentPage = location.pathname.split('/').pop() || 'index.html';
nav.querySelectorAll('a').forEach(function (link) {
  if (link.getAttribute('href') === currentPage) link.classList.add('is-active');
});

// Год в подвале всегда актуальный
document.getElementById('year').textContent = new Date().getFullYear();

// Красивое число: 330000 → «330 000»
function money(n) {
  return Math.round(n).toLocaleString('uk-UA').replace(/,/g, ' ') + ' ₴';
}


/* ---------- 3. Калькулятор ---------- */
const calcForm = document.getElementById('calcForm');

if (calcForm) {
  const area = document.getElementById('area');
  const areaOut = document.getElementById('areaOut');
  const totalEl = document.getElementById('calcTotal');
  const rangeEl = document.getElementById('calcRange');
  const rowsEl = document.getElementById('calcRows');
  const orderBtn = document.getElementById('calcOrder');

  function recalc() {
    const m2 = Number(area.value);
    const type = calcForm.querySelector('input[name="type"]:checked');
    const price = Number(type.dataset.price);

    // Строки расшифровки: [название, сумма]
    const rows = [[type.dataset.label + ' ремонт, ' + m2 + ' м²', m2 * price]];

    calcForm.querySelectorAll('input[name="extra"]:checked').forEach(function (extra) {
      const sum = extra.dataset.perM2 ? m2 * Number(extra.dataset.perM2) : Number(extra.dataset.fixed);
      rows.push([extra.dataset.label, sum]);
    });

    const total = rows.reduce(function (acc, row) { return acc + row[1]; }, 0);
    // Сроки: площадь делим на «скорость» бригады (м² в неделю), минимум 2 недели
    const weeks = Math.max(2, Math.ceil(m2 / Number(type.dataset.speed)));

    areaOut.textContent = m2 + ' м²';
    totalEl.textContent = money(total);
    rangeEl.textContent = 'Діапазон: ' + money(total * 0.9) + ' – ' + money(total * 1.1) + ' · термін ≈ ' + weeks + ' тиж.';
    rowsEl.innerHTML = rows.map(function (r) {
      return '<li><span>' + r[0] + '</span><b>' + money(r[1]) + '</b></li>';
    }).join('');

    // Кнопка «Получить точную смету» передаёт расчёт на страницу контактов через адрес:
    // kontakty.html?type=Капітальний&area=60&total=...&extras=...
    const params = new URLSearchParams({
      type: type.dataset.label,
      area: m2,
      total: Math.round(total),
      extras: rows.slice(1).map(function (r) { return r[0]; }).join(', ')
    });
    orderBtn.href = 'kontakty.html?' + params.toString();
  }

  // 'input' срабатывает сразу при движении ползунка и при каждом клике по вариантам
  calcForm.addEventListener('input', recalc);
  recalc();
}


/* ---------- 4. Слайдеры «до / после» ----------
   Ползунок меняет CSS-переменную --pos, а CSS по ней обрезает картинку «до». */
document.querySelectorAll('.ba').forEach(function (slider) {
  const range = slider.querySelector('input[type="range"]');
  range.addEventListener('input', function () {
    slider.style.setProperty('--pos', range.value + '%');
  });
});


/* ---------- 5. Форма заявки ---------- */
const form = document.getElementById('requestForm');

if (form) {
  const submitButton = form.querySelector('button[type="submit"]');
  const formError = document.getElementById('formError');
  const success = document.getElementById('success');
  const successText = document.getElementById('successText');

  // 5.1. Если человек пришёл из калькулятора — показываем его расчёт и заполняем поля
  const q = new URLSearchParams(location.search);
  if (q.get('total')) {
    const summary = q.get('type') + ' ремонт, ' + q.get('area') + ' м² — ≈ ' + money(Number(q.get('total'))) +
      (q.get('extras') ? ' (+ ' + q.get('extras') + ')' : '');
    const badge = document.getElementById('calcBadge');
    badge.textContent = 'Ваш розрахунок: ' + summary;
    badge.hidden = false;
    document.getElementById('calcField').value = summary;
    document.getElementById('areaInput').value = q.get('area');
    const workSelect = document.getElementById('workSelect');
    workSelect.value = q.get('type') + ' ремонт';
  }

  // 5.2. Проверка полей (как в барбершопе)
  function checkField(input) {
    let ok = input.value.trim() !== '';
    if (input.name === 'phone') {
      const digits = input.value.replace(/\D/g, '');
      ok = digits.length >= 10 && digits.length <= 12;
    }
    input.closest('.field').classList.toggle('is-invalid', !ok);
    return ok;
  }
  form.querySelectorAll('[required]').forEach(function (input) {
    input.addEventListener('input', function () { checkField(input); });
    input.addEventListener('change', function () { checkField(input); });
  });

  // 5.3. Отправка: на нашу серверную функцию Netlify, она пересылает заявку в Telegram
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    formError.hidden = true;

    let allOk = true;
    form.querySelectorAll('[required]').forEach(function (input) {
      if (!checkField(input)) allOk = false;
    });
    if (!allOk) {
      form.querySelector('.is-invalid').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    submitButton.disabled = true;
    submitButton.textContent = 'Надсилаємо...';

    try {
      const response = await fetch('/.netlify/functions/send-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) throw new Error(result.error || ('HTTP ' + response.status));

      successText.textContent = data.name + ', ми зв\'яжемося з вами (спосіб зв\'язку: ' + data.contact +
        ') протягом 30 хвилин у робочий час і домовимось про замір.';
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      console.error('Помилка відправки заявки:', error.message);
      formError.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Надіслати заявку';
    }
  });
}
