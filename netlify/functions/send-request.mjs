/*
  ==========================================================
  СЕРВЕРНАЯ ФУНКЦИЯ NETLIFY: заявка на замер → Telegram
  Работает на сервере Netlify, не в браузере посетителя.

  Нужны переменные в Netlify (Project configuration → Environment variables):
    TELEGRAM_BOT_TOKEN — токен бота (отметить как секрет)
    TELEGRAM_CHAT_ID   — куда присылать заявки
  Адрес функции: /.netlify/functions/send-request
  ==========================================================
*/

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function escapeHtml(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  let data;
  try {
    data = await req.json();
  } catch {
    return json({ ok: false, error: 'Bad request' }, 400);
  }

  // Ловушка для спам-ботов: если скрытое поле заполнено — молча «принимаем», но не отправляем
  if (data.website) {
    return json({ ok: true });
  }

  for (const field of ['name', 'phone', 'work']) {
    if (!data[field] || String(data[field]).trim() === '') {
      return json({ ok: false, error: 'Missing field: ' + field }, 400);
    }
  }
  const tooLong = Object.values(data).some((v) => String(v).length > 1000);
  const digits = String(data.phone).replace(/\D/g, '');
  if (tooLong || digits.length < 10 || digits.length > 12) {
    return json({ ok: false, error: 'Invalid data' }, 400);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return json({ ok: false, error: 'Telegram is not configured' }, 500);
  }

  const message =
    '🏠 <b>Нова заявка на замір</b>\n\n' +
    '👤 <b>Ім\'я:</b> ' + escapeHtml(data.name) + '\n' +
    '📞 <b>Телефон:</b> ' + escapeHtml(data.phone) + '\n' +
    '💬 <b>Зв\'язок:</b> ' + escapeHtml(data.contact) + '\n' +
    '🛠 <b>Роботи:</b> ' + escapeHtml(data.work) +
    (data.area ? '\n📐 <b>Площа:</b> ' + escapeHtml(data.area) + ' м²' : '') +
    (data.calc ? '\n🧮 <b>Розрахунок з калькулятора:</b> ' + escapeHtml(data.calc) : '') +
    (data.comment ? '\n📝 <b>Коментар:</b> ' + escapeHtml(data.comment) : '');

  const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
  });
  const result = await response.json();

  if (!result.ok) {
    console.error('Telegram error:', result.description);
    return json({ ok: false, error: 'Telegram error' }, 502);
  }
  return json({ ok: true });
};
