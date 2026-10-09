// Ajantik Cloud — Telegram webhook (kısıtlı bulut modu)
// Laptop kapalıyken devreye girer: SADECE yazılı cevap verir.
// Dosya/komut/uygulama işlemez (bulutta dosya sistemi yok).

var TG_API = "https://api.telegram.org/bot";
var GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

var SYSTEM_PROMPT = [
  "Sen Ajantik'sin: kullanıcının kişisel yardımcı ajanı.",
  "Şu an BULUT MODUNDASIN (kullanıcının laptopu kapalı).",
  "- Sadece yazılı cevap verebilirsin; bilgisayarda dosya, komut veya uygulama işi YAPAMAZSIN.",
  "- Dosya/uygulama işi istenirse kısaca açıkla: laptop açılınca tam kapasite çalışacaksın.",
  "- Sohbet, soru-cevap, fikir, yazı yazma, açıklama... bunların hepsini yapabilirsin.",
  "Türkçe, kısa ve net cevap ver."
].join("\n");

function tgUrl(token, method) {
  return TG_API + token + "/" + method;
}

async function tg(token, method, data) {
  var res = await fetch(tgUrl(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {})
  });
  try {
    return await res.json();
  } catch (e) {
    return {};
  }
}

function parseAllowed(envValue) {
  return String(envValue || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; })
    .map(Number);
}

exports.handler = async function (event) {
  // Tarayıcı/sağlık kontrolü
  if (event.httpMethod === "GET") {
    return { statusCode: 200, body: "Ajantik Cloud çalışıyor. (Telegram webhook: POST)" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "ok" };
  }

  var token = process.env.BOT_TOKEN || "";
  if (!token) {
    console.error("HATA: BOT_TOKEN environment değişkeni ayarlanmamış");
    return { statusCode: 200, body: "ok" };
  }

  var update = null;
  try {
    update = JSON.parse(event.body);
  } catch (e) {
    update = null;
  }
  if (!update || typeof update !== "object") {
    return { statusCode: 200, body: "ok" };
  }

  var msg = update.message || update.edited_message;
  if (!msg || !msg.chat || !msg.text) {
    return { statusCode: 200, body: "ok" };
  }

  var chatId = msg.chat.id;
  var userId = msg.from && msg.from.id ? msg.from.id : 0;
  var text = String(msg.text || "").trim();
  if (!text) {
    return { statusCode: 200, body: "ok" };
  }

  var geminiKey = process.env.GEMINI_KEY || "";
  var geminiModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  var allowed = parseAllowed(process.env.ALLOWED_IDS);

  // Komut ayrıştır
  var cmd = "";
  if (text.charAt(0) === "/") {
    cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  }

  // /kimlik herkese açık
  if (cmd === "/kimlik") {
    await tg(token, "sendMessage", {
      chat_id: chatId,
      text: "Senin Telegram ID'n: " + userId
    });
    return { statusCode: 200, body: "ok" };
  }

  // Yetki kontrolü
  if (allowed.indexOf(userId) === -1) {
    await tg(token, "sendMessage", {
      chat_id: chatId,
      text: "⛔ Bu bot sana kapalı. (bulut modu) Senin ID'n: " + userId
    });
    return { statusCode: 200, body: "ok" };
  }

  // Yardım
  if (cmd === "/start" || cmd === "/yardim" || cmd === "/help") {
    await tg(token, "sendMessage", {
      chat_id: chatId,
      text:
        "☁️ Ajantik BULUT modunda (laptop kapalı).\n\n" +
        "Şu an sadece yazılı cevap verebiliyorum: soru sor, yazı yazdır, fikir iste...\n" +
        "Dosya ve uygulama işleri için laptopu açman gerek; o zaman tam kapasite çalışırım.\n\n" +
        "Not: Bulut modunda sohbet hafızam yok (her mesaj bağımsız)."
    });
    return { statusCode: 200, body: "ok" };
  }

  // Diğer komutlar laptop işi ister
  if (cmd !== "") {
    await tg(token, "sendMessage", {
      chat_id: chatId,
      text: "☁️ Bulut modunda bu komut çalışmaz (laptop gerektirir). Laptop açılınca tekrar dene."
    });
    return { statusCode: 200, body: "ok" };
  }

  // LLM'den cevap al
  try {
    if (!geminiKey) {
      throw new Error("GEMINI_KEY ayarlanmamış");
    }
    var res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + geminiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: geminiModel,
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ]
      })
    });
    var data = await res.json();
    var cevap =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? String(data.choices[0].message.content).trim()
        : "";
    if (!cevap) {
      throw new Error("Boş cevap (anahtar/kota/model?)");
    }
    if (cevap.length > 3700) {
      cevap = cevap.slice(0, 3700) + "…";
    }
    await tg(token, "sendMessage", {
      chat_id: chatId,
      text: cevap + "\n\n— ☁️ bulut modu (laptop kapalı)"
    });
  } catch (e) {
    await tg(token, "sendMessage", {
      chat_id: chatId,
      text: "❌ Bulut beynine ulaşılamadı: " + String(e && e.message ? e.message : e).slice(0, 120)
    });
  }

  return { statusCode: 200, body: "ok" };
};
