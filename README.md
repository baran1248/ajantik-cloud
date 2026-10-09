# ☁️ Ajantik Cloud — Bulut Modu

Ajantik Telegram botunun **kısıtlı bulut kopyasıdır**. Laptop kapalıyken
bot yazılı sorulara yine cevap verir (dosya/uygulama işleri hariç).

## Nasıl çalışır?

- **Laptop AÇIK:** laptop'taki tam ajan çalışır (polling), bu bulut fonksiyonu boşta bekler.
- **Laptop KAPANIYOR:** laptop kapanmadan önce Telegram'a "mesajları buluta gönder" der
  (`setWebhook`). Böylece laptop kapalıyken mesajlar buraya düşer.
- **Laptop AÇILIYOR:** ajan açılışta webhook'u geri alır (`deleteWebhook`) ve
  tam kapasite devralır.
- Geçiş **tamamen otomatiktir**; sen hiçbir şeye basmazsın.

Bulut modu neler yapar: sohbet, soru-cevap, yazı yazma, fikir, açıklama.
Bulut modu neler yapamaz: dosya işlemleri, komut çalıştırma, uygulama kurma
(bulutta laptopun dosyaları yok).

## Kurulum (bir kere yapılır, ~5 dk)

### 1) Netlify'a bağla
1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. **GitHub** → `ajantik-cloud` reposunu seç → **Deploy**
3. Deploy bitince sitenin adresini not et (örn. `https://ajantik-cloud.netlify.app`)

### 2) Environment değişkenlerini ekle
Netlify → siten → **Site configuration → Environment variables → Add a variable**:

| İsim | Değer |
|---|---|
| `BOT_TOKEN` | Telegram bot token'ın (ajantik-node `config.json`'daki ile aynı) |
| `GEMINI_KEY` | Gemini API anahtarın |
| `ALLOWED_IDS` | İzinli kullanıcı ID'leri, virgülle: `708331817,123456789` |
| `GEMINI_MODEL` | *(opsiyonel)* Varsayılan: `gemini-flash-lite-latest` |

Ekledikten sonra değişkenlerin aktif olması için:
**Deploys → Trigger deploy → Deploy site**.

### 3) Laptop'a bulut adresini tanıt
Laptop'ta `ajantik-node/config.json` içine şunu ekle (site adresine göre):

```json
"cloud_webhook_url": "https://SENIN-SITE-ADIN.netlify.app/.netlify/functions/telegram"
```

Sonra laptop'ta servisi yeniden başlat:

```bash
sudo systemctl restart ajantik
```

### 4) Test
1. Laptopta: `sudo systemctl stop ajantik` (simülasyon: laptop kapandı)
2. Telefonda bota yaz: "Merhaba, hangi moddasın?"
3. ☁️ notlu cevap gelmeli.
4. Laptopta: `sudo systemctl start ajantik` → artık tam ajan cevap verir.

Elle geçiş komutları (laptopta):

```bash
./venv/bin/python -m ajantik.webhook durumu   # şu an kimde?
./venv/bin/python -m ajantik.webhook on       # buluta devret
./venv/bin/python -m ajantik.webhook off      # laptop'a al
```

## Sınırlar ve notlar

- **Netlify ücretsiz plan:** ayda 125.000 fonksiyon çağrısı — kişisel kullanım için bol bol yeter.
- **Hafıza yok:** bulut modunda her mesaj bağımsızdır (önceki mesajları hatırlamaz).
- **Cevap süresi:** 10 saniyelik sınır var; hızlı model (`flash-lite`) kullandığımız için sorun olmaz.
- **Ani elektrik kesintisi:** laptop düzgün kapanmazsa buluta geçiş yapılamaz; bot o an
  sessiz kalır. Laptop tekrar açılınca düzelir. Laptopu normal kapatmayı tercih et.
- Bot token'ı ve anahtarlar Netlify'da environment variable olarak saklanır; repoda tutulmaz.
