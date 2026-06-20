/* ============================================================
   ip-echo — ip.kvcc.me
   回顯這次請求的 IP / 地理 / ASN / TLS / headers，零儲存零記錄。
   - curl/wget 等 CLI（Accept 不含 text/html）→ 純文字 IP
   - /ip    → 純文字 IP
   - /json  → 完整 JSON（CORS *，其他 app 可直接 fetch）
   - 其他   → HTML 頁（值在 server 端渲染進模板）

   i18n：HTML 頁的「介面標籤」支援世界主流語系。預設依裝置語系
   （Accept-Language 內容協商）server 端直出，使用者可在右上角自行切換
   （存 localStorage，前端即時換不重整）。資料值（IP/地理/headers/UA）不翻譯。
   ============================================================ */

import { ICONS } from './icons.js';

/** base64 → bytes（給內嵌 icon 用） */
const b64ToBytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

const esc = s =>
    String(s ?? '').replace(
        /[&<>"']/g,
        c =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[c]
    );

/** 國碼 → 旗幟 emoji（regional indicator） */
const flag = cc =>
    cc && /^[A-Z]{2}$/.test(cc)
        ? String.fromCodePoint(...[...cc].map(c => 0x1f1a5 + c.charCodeAt(0)))
        : '';

/* ---------- i18n 字典（只翻介面標籤；資料值不翻） ---------- */

const I18N = {
    en: {
        tagline: 'Your connection info',
        intro: 'Your IP, location, ASN, TLS and request headers — all on one page. Live from this request, never logged or stored.',
        theme: 'Toggle theme',
        language: 'Language',
        copy: 'Copy',
        copied: 'Copied ✓',
        connection: 'Connection',
        timezone: 'Timezone',
        coords: 'Coordinates',
        node: 'Edge node',
        protocol: 'Protocol',
        cipher: 'Cipher',
        device: 'Device',
        headers: 'Request headers',
        count: '{n} items',
        apiNote: '/json sends CORS (*), so any page can fetch it directly; CLI tools hitting the root get a plain-text IP.',
        noLogs: 'No logs, no storage',
    },
    'zh-Hant': {
        tagline: '你的連線資訊',
        intro: 'IP、地理位置、ASN、TLS、request headers 一頁看清楚。資料即時來自這一次請求，不記錄、不儲存。',
        theme: '切換主題',
        language: '語言',
        copy: '複製',
        copied: '已複製 ✓',
        connection: '連線',
        timezone: '時區',
        coords: '座標',
        node: '節點',
        protocol: '協定',
        cipher: '加密套件',
        device: '裝置',
        headers: 'Request headers',
        count: '{n} 個',
        apiNote: '/json 開了 CORS（*），任何網頁都能直接 fetch；CLI 打根路徑會直接回純文字 IP。',
        noLogs: '零儲存零記錄',
    },
    'zh-Hans': {
        tagline: '你的连接信息',
        intro: 'IP、地理位置、ASN、TLS、request headers 一页看清楚。数据实时来自这次请求，不记录、不存储。',
        theme: '切换主题',
        language: '语言',
        copy: '复制',
        copied: '已复制 ✓',
        connection: '连接',
        timezone: '时区',
        coords: '坐标',
        node: '节点',
        protocol: '协议',
        cipher: '加密套件',
        device: '设备',
        headers: '请求头',
        count: '{n} 个',
        apiNote: '/json 开启了 CORS（*），任何网页都能直接 fetch；CLI 访问根路径会直接返回纯文本 IP。',
        noLogs: '不记录不存储',
    },
    ja: {
        tagline: '接続情報',
        intro: 'IP、位置情報、ASN、TLS、リクエストヘッダーを1ページで確認。今回のリクエストからリアルタイムに取得し、記録も保存もしません。',
        theme: 'テーマ切替',
        language: '言語',
        copy: 'コピー',
        copied: 'コピー済み ✓',
        connection: '接続',
        timezone: 'タイムゾーン',
        coords: '座標',
        node: 'エッジノード',
        protocol: 'プロトコル',
        cipher: '暗号スイート',
        device: 'デバイス',
        headers: 'リクエストヘッダー',
        count: '{n} 件',
        apiNote: '/json は CORS（*）を許可しているため、どのページからでも直接 fetch できます。CLI でルートにアクセスするとプレーンテキストの IP を返します。',
        noLogs: '記録なし・保存なし',
    },
    ko: {
        tagline: '연결 정보',
        intro: 'IP, 위치, ASN, TLS, 요청 헤더를 한 페이지에서 확인하세요. 이번 요청에서 실시간으로 가져오며 기록하거나 저장하지 않습니다.',
        theme: '테마 전환',
        language: '언어',
        copy: '복사',
        copied: '복사됨 ✓',
        connection: '연결',
        timezone: '시간대',
        coords: '좌표',
        node: '엣지 노드',
        protocol: '프로토콜',
        cipher: '암호화 스위트',
        device: '기기',
        headers: '요청 헤더',
        count: '{n}개',
        apiNote: '/json 은 CORS(*)를 허용하므로 어떤 페이지에서도 바로 fetch 할 수 있습니다. CLI 로 루트에 접속하면 일반 텍스트 IP 를 반환합니다.',
        noLogs: '기록 없음, 저장 없음',
    },
    es: {
        tagline: 'Tu información de conexión',
        intro: 'Tu IP, ubicación, ASN, TLS y cabeceras de la petición en una sola página. En tiempo real desde esta petición, sin registros ni almacenamiento.',
        theme: 'Cambiar tema',
        language: 'Idioma',
        copy: 'Copiar',
        copied: 'Copiado ✓',
        connection: 'Conexión',
        timezone: 'Zona horaria',
        coords: 'Coordenadas',
        node: 'Nodo edge',
        protocol: 'Protocolo',
        cipher: 'Cifrado',
        device: 'Dispositivo',
        headers: 'Cabeceras de la petición',
        count: '{n} elementos',
        apiNote: '/json envía CORS (*), así que cualquier página puede hacer fetch directamente; las herramientas CLI en la raíz reciben la IP en texto plano.',
        noLogs: 'Sin registros ni almacenamiento',
    },
    fr: {
        tagline: 'Vos infos de connexion',
        intro: 'Votre IP, localisation, ASN, TLS et en-têtes de requête sur une seule page. En direct de cette requête, sans journal ni stockage.',
        theme: 'Changer de thème',
        language: 'Langue',
        copy: 'Copier',
        copied: 'Copié ✓',
        connection: 'Connexion',
        timezone: 'Fuseau horaire',
        coords: 'Coordonnées',
        node: 'Nœud edge',
        protocol: 'Protocole',
        cipher: 'Chiffrement',
        device: 'Appareil',
        headers: 'En-têtes de requête',
        count: '{n} éléments',
        apiNote: "/json envoie CORS (*), donc n'importe quelle page peut le récupérer directement ; les outils CLI sur la racine reçoivent l'IP en texte brut.",
        noLogs: 'Aucun journal, aucun stockage',
    },
    de: {
        tagline: 'Deine Verbindungsinfos',
        intro: 'Deine IP, Standort, ASN, TLS und Request-Header auf einer Seite. Live aus dieser Anfrage, ohne Protokoll und ohne Speicherung.',
        theme: 'Thema wechseln',
        language: 'Sprache',
        copy: 'Kopieren',
        copied: 'Kopiert ✓',
        connection: 'Verbindung',
        timezone: 'Zeitzone',
        coords: 'Koordinaten',
        node: 'Edge-Knoten',
        protocol: 'Protokoll',
        cipher: 'Verschlüsselung',
        device: 'Gerät',
        headers: 'Request-Header',
        count: '{n} Einträge',
        apiNote: '/json sendet CORS (*), sodass jede Seite es direkt abrufen kann; CLI-Tools auf dem Stammpfad erhalten die IP als Klartext.',
        noLogs: 'Keine Protokolle, keine Speicherung',
    },
    it: {
        tagline: 'Le tue info di connessione',
        intro: "Il tuo IP, posizione, ASN, TLS e header della richiesta in un'unica pagina. In tempo reale da questa richiesta, senza log né archiviazione.",
        theme: 'Cambia tema',
        language: 'Lingua',
        copy: 'Copia',
        copied: 'Copiato ✓',
        connection: 'Connessione',
        timezone: 'Fuso orario',
        coords: 'Coordinate',
        node: 'Nodo edge',
        protocol: 'Protocollo',
        cipher: 'Cifratura',
        device: 'Dispositivo',
        headers: 'Header della richiesta',
        count: '{n} elementi',
        apiNote: "/json invia CORS (*), quindi qualsiasi pagina può fare fetch direttamente; gli strumenti CLI sulla radice ricevono l'IP in testo semplice.",
        noLogs: 'Nessun log, nessuna archiviazione',
    },
    pt: {
        tagline: 'Suas informações de conexão',
        intro: 'Seu IP, localização, ASN, TLS e cabeçalhos da requisição em uma só página. Em tempo real desta requisição, sem registros nem armazenamento.',
        theme: 'Alternar tema',
        language: 'Idioma',
        copy: 'Copiar',
        copied: 'Copiado ✓',
        connection: 'Conexão',
        timezone: 'Fuso horário',
        coords: 'Coordenadas',
        node: 'Nó de borda',
        protocol: 'Protocolo',
        cipher: 'Cifra',
        device: 'Dispositivo',
        headers: 'Cabeçalhos da requisição',
        count: '{n} itens',
        apiNote: '/json envia CORS (*), então qualquer página pode fazer fetch diretamente; ferramentas CLI na raiz recebem o IP em texto puro.',
        noLogs: 'Sem registros, sem armazenamento',
    },
    ru: {
        tagline: 'Сведения о подключении',
        intro: 'Ваш IP, местоположение, ASN, TLS и заголовки запроса на одной странице. В реальном времени из этого запроса, без журналов и хранения.',
        theme: 'Сменить тему',
        language: 'Язык',
        copy: 'Копировать',
        copied: 'Скопировано ✓',
        connection: 'Подключение',
        timezone: 'Часовой пояс',
        coords: 'Координаты',
        node: 'Пограничный узел',
        protocol: 'Протокол',
        cipher: 'Шифр',
        device: 'Устройство',
        headers: 'Заголовки запроса',
        count: '{n} шт.',
        apiNote: '/json отправляет CORS (*), поэтому любая страница может получить его напрямую; CLI-инструменты по корневому пути получают IP обычным текстом.',
        noLogs: 'Без журналов и хранения',
    },
    ar: {
        tagline: 'معلومات اتصالك',
        intro: 'عنوان IP وموقعك وASN وTLS وترويسات الطلب في صفحة واحدة. مباشرة من هذا الطلب، دون تسجيل أو تخزين.',
        theme: 'تبديل السمة',
        language: 'اللغة',
        copy: 'نسخ',
        copied: 'تم النسخ ✓',
        connection: 'الاتصال',
        timezone: 'المنطقة الزمنية',
        coords: 'الإحداثيات',
        node: 'عقدة الحافة',
        protocol: 'البروتوكول',
        cipher: 'التشفير',
        device: 'الجهاز',
        headers: 'ترويسات الطلب',
        count: '{n} عنصرًا',
        apiNote: '‏/json يرسل CORS (*)، لذا يمكن لأي صفحة جلبه مباشرة؛ وأدوات سطر الأوامر على المسار الجذري تحصل على IP كنص عادي.',
        noLogs: 'بدون تسجيل أو تخزين',
    },
    tr: {
        tagline: 'Bağlantı bilgileriniz',
        intro: "IP'niz, konumunuz, ASN, TLS ve istek başlıkları tek sayfada. Bu istekten gerçek zamanlı, kayıt ve depolama olmadan.",
        theme: 'Temayı değiştir',
        language: 'Dil',
        copy: 'Kopyala',
        copied: 'Kopyalandı ✓',
        connection: 'Bağlantı',
        timezone: 'Saat dilimi',
        coords: 'Koordinatlar',
        node: 'Edge düğümü',
        protocol: 'Protokol',
        cipher: 'Şifre',
        device: 'Cihaz',
        headers: 'İstek başlıkları',
        count: '{n} öğe',
        apiNote: '/json CORS (*) gönderir, böylece herhangi bir sayfa doğrudan fetch edebilir; köke erişen CLI araçları düz metin IP alır.',
        noLogs: 'Kayıt yok, depolama yok',
    },
    hi: {
        tagline: 'आपकी कनेक्शन जानकारी',
        intro: 'आपका IP, स्थान, ASN, TLS और रिक्वेस्ट हेडर एक ही पेज पर। इसी रिक्वेस्ट से रियल-टाइम, बिना लॉग और बिना स्टोरेज।',
        theme: 'थीम बदलें',
        language: 'भाषा',
        copy: 'कॉपी',
        copied: 'कॉपी हो गया ✓',
        connection: 'कनेक्शन',
        timezone: 'टाइम ज़ोन',
        coords: 'निर्देशांक',
        node: 'एज नोड',
        protocol: 'प्रोटोकॉल',
        cipher: 'सिफर',
        device: 'डिवाइस',
        headers: 'रिक्वेस्ट हेडर',
        count: '{n} आइटम',
        apiNote: '/json CORS (*) भेजता है, इसलिए कोई भी पेज इसे सीधे fetch कर सकता है; रूट पर CLI टूल को सादा-टेक्स्ट IP मिलता है।',
        noLogs: 'कोई लॉग नहीं, कोई स्टोरेज नहीं',
    },
    id: {
        tagline: 'Info koneksi Anda',
        intro: 'IP, lokasi, ASN, TLS, dan header permintaan Anda dalam satu halaman. Real-time dari permintaan ini, tanpa log dan tanpa penyimpanan.',
        theme: 'Ganti tema',
        language: 'Bahasa',
        copy: 'Salin',
        copied: 'Tersalin ✓',
        connection: 'Koneksi',
        timezone: 'Zona waktu',
        coords: 'Koordinat',
        node: 'Node edge',
        protocol: 'Protokol',
        cipher: 'Cipher',
        device: 'Perangkat',
        headers: 'Header permintaan',
        count: '{n} item',
        apiNote: '/json mengirim CORS (*), jadi halaman mana pun bisa mem-fetch langsung; alat CLI di root mendapat IP dalam teks biasa.',
        noLogs: 'Tanpa log, tanpa penyimpanan',
    },
    vi: {
        tagline: 'Thông tin kết nối của bạn',
        intro: 'IP, vị trí, ASN, TLS và header yêu cầu của bạn trên một trang. Trực tiếp từ yêu cầu này, không ghi log, không lưu trữ.',
        theme: 'Đổi giao diện',
        language: 'Ngôn ngữ',
        copy: 'Sao chép',
        copied: 'Đã sao chép ✓',
        connection: 'Kết nối',
        timezone: 'Múi giờ',
        coords: 'Tọa độ',
        node: 'Nút edge',
        protocol: 'Giao thức',
        cipher: 'Bộ mã hóa',
        device: 'Thiết bị',
        headers: 'Header yêu cầu',
        count: '{n} mục',
        apiNote: '/json gửi CORS (*), nên mọi trang đều có thể fetch trực tiếp; công cụ CLI truy cập gốc sẽ nhận IP dạng văn bản thuần.',
        noLogs: 'Không log, không lưu trữ',
    },
    th: {
        tagline: 'ข้อมูลการเชื่อมต่อของคุณ',
        intro: 'IP ตำแหน่ง ASN TLS และ request headers ของคุณในหน้าเดียว เรียลไทม์จากคำขอนี้ ไม่บันทึกและไม่จัดเก็บ',
        theme: 'สลับธีม',
        language: 'ภาษา',
        copy: 'คัดลอก',
        copied: 'คัดลอกแล้ว ✓',
        connection: 'การเชื่อมต่อ',
        timezone: 'เขตเวลา',
        coords: 'พิกัด',
        node: 'โหนด edge',
        protocol: 'โปรโตคอล',
        cipher: 'การเข้ารหัส',
        device: 'อุปกรณ์',
        headers: 'Request headers',
        count: '{n} รายการ',
        apiNote: '/json เปิด CORS (*) ทุกหน้าจึง fetch ได้โดยตรง; เครื่องมือ CLI ที่เรียก root จะได้ IP เป็นข้อความล้วน',
        noLogs: 'ไม่บันทึก ไม่จัดเก็บ',
    },
};

/** 語言選單顯示順序 + 各語系自稱（autonym），讓使用者一眼找到自己的語言 */
const LANGS = [
    ['en', 'English'],
    ['zh-Hant', '繁體中文'],
    ['zh-Hans', '简体中文'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['es', 'Español'],
    ['fr', 'Français'],
    ['de', 'Deutsch'],
    ['it', 'Italiano'],
    ['pt', 'Português'],
    ['ru', 'Русский'],
    ['ar', 'العربية'],
    ['tr', 'Türkçe'],
    ['hi', 'हिन्दी'],
    ['id', 'Bahasa Indonesia'],
    ['vi', 'Tiếng Việt'],
    ['th', 'ไทย'],
];

const RTL_LANGS = ['ar'];
const DEFAULT_LANG = 'en';

/** 單一語言標籤 → 支援的語系代碼（含中文簡繁判斷、主語言子標籤回退）；無對應回 null */
function matchTag(tag) {
    const t = tag.toLowerCase();
    if (t === 'zh-hant' || t.startsWith('zh-hant-') || t === 'zh-tw' || t === 'zh-hk' || t === 'zh-mo')
        return 'zh-Hant';
    if (t === 'zh-hans' || t.startsWith('zh-hans-') || t === 'zh-cn' || t === 'zh-sg' || t === 'zh-my' || t === 'zh')
        return 'zh-Hans';
    if (t.startsWith('zh')) return 'zh-Hant';
    const base = t.split('-')[0];
    const map = {
        en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr', de: 'de', it: 'it',
        pt: 'pt', ru: 'ru', ar: 'ar', tr: 'tr', hi: 'hi', vi: 'vi', th: 'th',
        id: 'id', in: 'id', // 'in' 是 Indonesian 的舊代碼
    };
    return map[base] || null;
}

/** Accept-Language → 最佳支援語系（依 q 權重排序），全不中回 DEFAULT_LANG */
function pickLang(acceptLang) {
    if (!acceptLang) return DEFAULT_LANG;
    const tags = acceptLang
        .split(',')
        .map(part => {
            const [tag, ...params] = part.trim().split(';');
            let q = 1;
            for (const p of params) {
                const m = p.trim().match(/^q=([\d.]+)$/);
                if (m) q = parseFloat(m[1]);
            }
            return { tag: (tag || '').trim(), q };
        })
        .filter(t => t.tag)
        .sort((a, b) => b.q - a.q);
    for (const { tag } of tags) {
        const hit = matchTag(tag);
        if (hit) return hit;
    }
    return DEFAULT_LANG;
}

function collect(request) {
    const cf = request.cf || {};
    const h = request.headers;
    return {
        ip: h.get('cf-connecting-ip') || '',
        country: cf.country || '',
        city: cf.city || '',
        region: cf.region || '',
        timezone: cf.timezone || '',
        latitude: cf.latitude || '',
        longitude: cf.longitude || '',
        asn: cf.asn || '',
        asOrganization: cf.asOrganization || '',
        colo: cf.colo || '',
        httpProtocol: cf.httpProtocol || '',
        tlsVersion: cf.tlsVersion || '',
        tlsCipher: cf.tlsCipher || '',
        userAgent: h.get('user-agent') || '',
        language: h.get('accept-language') || '',
    };
}

const JSON_HEADERS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
};

export default {
    fetch(request) {
        const url = new URL(request.url);

        // 本 worker 不能用 wrangler "assets"——它會讓 request.cf 變空、地圖壞掉（踩過
        // 2026-06）。icon 改由 worker 直接服務（src/icons.js 內嵌 base64，Linear 配色）。
        // 動態路由只有 / /ip /json；其餘命中內嵌 icon 就回，否則導回 /。
        if (url.pathname !== '/' && url.pathname !== '/ip' && url.pathname !== '/json') {
            const icon = ICONS[url.pathname];
            if (icon) {
                return new Response(b64ToBytes(icon.b64), {
                    headers: {
                        'content-type': icon.type,
                        'cache-control': 'public, max-age=31536000, immutable',
                    },
                });
            }
            return Response.redirect(url.origin + '/', 302);
        }

        const d = collect(request);

        if (url.pathname === '/ip') {
            return new Response(d.ip + '\n', {
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    'cache-control': 'no-store',
                },
            });
        }

        if (url.pathname === '/json') {
            return new Response(
                JSON.stringify(
                    { ...d, headers: Object.fromEntries(request.headers) },
                    null,
                    2
                ),
                { headers: JSON_HEADERS }
            );
        }

        // CLI（curl/wget/httpie…）Accept 不含 text/html → 純文字 IP
        const accept = request.headers.get('accept') || '';
        if (!accept.includes('text/html')) {
            return new Response(d.ip + '\n', {
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    'cache-control': 'no-store',
                },
            });
        }

        const lang = pickLang(request.headers.get('accept-language'));
        return new Response(page(d, request.headers, lang), {
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'content-language': lang,
                'cache-control': 'no-store',
                vary: 'Accept-Language',
            },
        });
    },
};

/* ---------- HTML 模板（值全部 esc 過：headers 是請求方可控的反射內容） ----------
   介面標籤帶 data-i18n（前端切語言時即時換）；資料值不帶、不翻。 */

const row = (key, label, value, mono = true) =>
    value
        ? `<div class="row"><dt${key ? ` data-i18n="${key}"` : ''}>${esc(label)}</dt><dd${mono ? ' class="mono"' : ''}>${esc(value)}</dd></div>`
        : '';

function page(d, headers, lang) {
    const t = I18N[lang] || I18N[DEFAULT_LANG];
    const rtl = RTL_LANGS.includes(lang);

    const headerEntries = [...headers].sort(([a], [b]) => a.localeCompare(b));
    const headerRows = headerEntries
        .map(
            ([k, v]) =>
                `<div class="row"><dt>${esc(k)}</dt><dd class="mono">${esc(v)}</dd></div>`
        )
        .join('');
    const headerCount = headerEntries.length;

    const place = [d.city, d.region, d.country && `${d.country} ${flag(d.country)}`]
        .filter(Boolean)
        .join(' · ');

    const langOptions = LANGS.map(
        ([code, name]) =>
            `<option value="${code}"${code === lang ? ' selected' : ''}>${esc(name)}</option>`
    ).join('');

    return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ip.kvcc.me — ${esc(t.tagline)}</title>
<meta name="description" content="${esc(t.intro)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon.png" type="image/png" media="(prefers-color-scheme: light)">
<link rel="icon" href="/icon-dark.png" type="image/png" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f2f2f7">
<script>
/* pre-paint：套主題 + 套已選語言的 lang/dir（減少切過非裝置語系時的版面閃動） */
(function(){
  var p=localStorage.getItem('ip-theme')||'auto';
  var t=p==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;
  document.documentElement.dataset.theme=t;
  document.documentElement.dataset.style=localStorage.getItem('ip-style')||'linear';
  var l=localStorage.getItem('ip-lang');
  if(l){document.documentElement.lang=l;document.documentElement.dir=(l==='ar')?'rtl':'ltr';}
})();
</script>
<style>
:root{
  --font-ui:"Geist",-apple-system,BlinkMacSystemFont,"PingFang TC","Microsoft JhengHei","Segoe UI",system-ui,sans-serif;
  --font-mono:"Geist Mono",ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  --ease-out:cubic-bezier(.23,1,.32,1);
  --label:#000;--label-2:rgba(60,60,67,.6);--label-3:rgba(60,60,67,.3);
  --bg:#f2f2f7;--tint:#007aff;--green:#34c759;--fill:rgba(118,118,128,.12);
  --panel:rgba(255,255,255,.62);--panel-border:rgba(255,255,255,.75);
  --mesh:radial-gradient(at 0% 0%,hsla(210,100%,90%,.8) 0,transparent 50%),
         radial-gradient(at 100% 0%,hsla(150,75%,86%,.55) 0,transparent 50%),
         radial-gradient(at 50% 100%,hsla(252,75%,90%,.6) 0,transparent 50%);
  color-scheme:light;
}
:root[data-theme="dark"]{
  --label:#fff;--label-2:rgba(235,235,245,.6);--label-3:rgba(235,235,245,.3);
  --bg:#000;--tint:#0a84ff;--green:#30d158;--fill:rgba(118,118,128,.24);
  --panel:rgba(28,28,30,.62);--panel-border:rgba(255,255,255,.12);
  --mesh:radial-gradient(at 0% 0%,hsla(220,40%,20%,.8) 0,transparent 60%),
         radial-gradient(at 100% 0%,hsla(160,40%,18%,.55) 0,transparent 50%),
         radial-gradient(at 50% 100%,hsla(252,40%,22%,.5) 0,transparent 50%);
  color-scheme:dark;
}
/* ───────── Linear 風格變體（data-style="linear"，A/B 比較用） ─────────
   tokens 照 tw-live/DESIGN.md：近黑 canvas、單一 indigo accent、hairline border、
   扁平表面（無玻璃 blur / 無大圓角 / 無環境動畫）。滿意留哪個再砍另一套。 */
:root[data-style="linear"]{
  --label:#1C1D21;--label-2:#6B7280;--label-3:rgba(0,0,0,.26);
  --bg:#FBFBFC;--tint:#5E6AD2;--green:#3aa76d;--fill:rgba(0,0,0,.05);
  --panel:#fff;--panel-border:rgba(0,0,0,.09);
  --mesh:radial-gradient(120% 55% at 50% -10%,rgba(94,106,210,.06) 0,transparent 60%);
  color-scheme:light;
}
:root[data-style="linear"][data-theme="dark"]{
  --label:#ECEEF1;--label-2:#8A8F98;--label-3:rgba(255,255,255,.28);
  --bg:#08090a;--tint:#7C7DFF;--green:#3fb98a;--fill:rgba(255,255,255,.06);
  --panel:#0e0f11;--panel-border:rgba(255,255,255,.09);
  --mesh:radial-gradient(120% 55% at 50% -10%,rgba(124,125,255,.10) 0,transparent 60%);
  color-scheme:dark;
}
:root[data-style="linear"] body{background-size:auto;animation:none}
:root[data-style="linear"] .panel{border-radius:12px;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}
:root[data-style="linear"] .glass-ctl{backdrop-filter:none;-webkit-backdrop-filter:none}
:root[data-style="linear"] .topbar img{border-radius:7px;box-shadow:none}
:root[data-style="linear"] .panel-title{font-size:15px;letter-spacing:-.01em}
:root[data-style="linear"] .map{border-radius:12px}
:root[data-style="linear"] .api-line code{border-radius:8px}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%}
body{
  font-family:var(--font-ui);-webkit-font-smoothing:antialiased;color:var(--label);
  background-color:var(--bg);background-image:var(--mesh);
  background-size:150% 150%;background-attachment:fixed;
  animation:gradientBG 20s ease infinite alternate;
  padding-bottom:env(safe-area-inset-bottom);transition:background-color .3s ease;
  overscroll-behavior-y:none;
}
@keyframes gradientBG{0%{background-position:0% 0%}100%{background-position:100% 100%}}
.page{max-width:560px;margin:0 auto;padding:20px 20px 40px;padding-top:calc(20px + env(safe-area-inset-top))}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}
.topbar img{width:32px;height:32px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.1);user-select:none;flex-shrink:0}
.ctrls{display:flex;align-items:center;gap:10px}
.glass-ctl{color:var(--label);background:var(--panel);border:1px solid var(--panel-border);
  backdrop-filter:blur(16px) saturate(1.5);-webkit-backdrop-filter:blur(16px) saturate(1.5)}
.icon-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;padding:0;
  cursor:pointer;transition:transform .15s ease}
.icon-btn:active{transform:scale(.92)}
.icon-btn svg{width:19px;height:19px}
.lang-wrap{position:relative;display:flex;align-items:center;gap:6px;height:40px;padding:0 9px 0 12px;border-radius:9999px}
.lang-wrap .globe{width:16px;height:16px;color:var(--label-2);flex-shrink:0;pointer-events:none}
.lang-wrap .chev-sm{width:13px;height:13px;color:var(--label-3);flex-shrink:0;pointer-events:none}
.lang-wrap select{appearance:none;-webkit-appearance:none;border:none;background:transparent;color:var(--label);
  font-family:var(--font-ui);font-size:14px;font-weight:600;line-height:40px;height:40px;padding:0;margin:0;
  cursor:pointer;outline:none;max-width:124px;text-overflow:ellipsis}
.hero h1{margin:0 0 10px;font-size:28px;font-weight:700;letter-spacing:-.02em}
.hero p{margin:0;font-size:15px;line-height:1.65;color:var(--label-2)}
.stack{display:flex;flex-direction:column;gap:14px;margin-top:24px}
.panel{border-radius:28px;padding:16px 20px 18px;background:var(--panel);border:1px solid var(--panel-border);
  backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);
  box-shadow:0 8px 30px -18px rgba(0,0,0,.25)}
.panel-title{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:17px;font-weight:700;letter-spacing:-.01em}
.panel-title .meta{flex:1;text-align:right;font-size:13px;font-weight:600;color:var(--label-2)}
.ip-display{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ip-value{flex:1;min-width:0;font-family:var(--font-mono);font-size:clamp(20px,6vw,30px);font-weight:700;
  letter-spacing:-.01em;overflow-wrap:anywhere;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.ip-place{margin:8px 0 0;font-size:14px;color:var(--label-2)}
.copy-btn{border:none;border-radius:9999px;min-height:36px;padding:0 16px;font-family:var(--font-ui);
  font-size:14px;font-weight:600;color:var(--tint);cursor:pointer;white-space:nowrap;
  background:var(--fill);transition:background-color .15s ease,color .15s ease}
.copy-btn.done{color:var(--green)}
dl{margin:0;display:flex;flex-direction:column;gap:2px}
.row{display:flex;align-items:baseline;gap:14px;padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--label-3) 26%,transparent)}
.row:last-child{border-bottom:none}
dt{flex-shrink:0;width:108px;font-size:13px;font-weight:600;color:var(--label-2)}
dd{flex:1;margin:0;font-size:14.5px;font-weight:500;overflow-wrap:anywhere}
dd.mono{font-family:var(--font-mono);font-size:13.5px;font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
details{margin:0}
details summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;
  font-size:17px;font-weight:700;letter-spacing:-.01em}
details summary::-webkit-details-marker{display:none}
details summary .meta{flex:1;text-align:right;font-size:13px;font-weight:600;color:var(--label-2)}
details summary .chev{width:16px;height:16px;color:var(--label-3);transform:rotate(-90deg);transition:transform .2s ease}
details[open] summary .chev{transform:rotate(0)}
[dir="rtl"] details summary .chev{transform:rotate(90deg)}
[dir="rtl"] details[open] summary .chev{transform:rotate(0)}
details[open] summary{margin-bottom:12px}
.api-line{display:flex;align-items:center;gap:8px;margin-top:8px}
.api-line code{flex:1;min-width:0;display:block;padding:10px 14px;border-radius:14px;background:var(--fill);
  font-family:var(--font-mono);font-size:13px;overflow-wrap:anywhere;direction:ltr;unicode-bidi:isolate}
.api-note{margin:12px 0 0;font-size:13px;line-height:1.6;color:var(--label-2)}
.map-panel{padding:6px}
.map{position:relative;height:210px;border-radius:22px;overflow:hidden;background:var(--fill);display:grid;place-items:center}
.map-fallback{font-size:14px;font-weight:600;color:var(--tint);text-decoration:none}
.leaflet-container{background:var(--fill)!important;font:inherit}
.leaflet-control-attribution{font-size:10px;background:color-mix(in srgb,var(--panel) 82%,transparent)!important;color:var(--label-3)!important;backdrop-filter:blur(8px)}
.leaflet-control-attribution a{color:var(--label-2)!important}
.leaflet-bar a,.leaflet-bar a:hover{background:var(--panel)!important;color:var(--label)!important;border-bottom-color:var(--panel-border)!important}
.leaflet-touch .leaflet-bar{border-color:var(--panel-border)!important}
footer{margin-top:36px;text-align:center;font-size:13px;color:var(--label-3)}
footer a{color:var(--label-2);text-decoration:none}
footer a:hover{color:var(--tint)}
@keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.fade{animation:fade-in .5s var(--ease-out) both}
::selection{background:color-mix(in srgb,var(--tint) 28%,transparent)}
a:focus-visible,button:focus-visible,summary:focus-visible,select:focus-visible{outline:none;
  box-shadow:0 0 0 2px var(--bg),0 0 0 4px color-mix(in srgb,var(--tint) 70%,transparent)}
@media (prefers-reduced-motion:reduce){
  body{animation:none}
  .fade{animation-name:fade-in-opacity}
  @keyframes fade-in-opacity{from{opacity:0}to{opacity:1}}
  *,*::before,*::after{transition-duration:.01ms!important}
}
</style>
</head>
<body>
<main class="page">
  <header class="topbar fade">
    <img id="appIcon" src="/icon.png" alt="ip.kvcc.me">
    <div class="ctrls">
      <div class="lang-wrap glass-ctl">
        <svg class="globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
        <select id="langSel" data-i18n-aria="language" aria-label="${esc(t.language)}">${langOptions}</select>
        <svg class="chev-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <button class="icon-btn glass-ctl" id="styleBtn" title="切換設計風格 Glass / Linear" aria-label="Switch design style"></button>
      <button class="icon-btn glass-ctl" id="themeBtn" data-i18n-aria="theme" aria-label="${esc(t.theme)}"></button>
    </div>
  </header>

  <section class="hero fade">
    <h1 data-i18n="tagline">${esc(t.tagline)}</h1>
    <p data-i18n="intro">${esc(t.intro)}</p>
  </section>

  <section class="stack">
    <div class="panel fade">
      <div class="ip-display">
        <span class="ip-value" id="ipValue">${esc(d.ip)}</span>
        <button class="copy-btn" data-copy="${esc(d.ip)}"><span data-i18n="copy">${esc(t.copy)}</span></button>
      </div>
      ${place ? `<p class="ip-place">${esc(place)}</p>` : ''}
    </div>

    ${d.latitude && d.longitude ? `<div class="panel fade map-panel">
      <div id="map" class="map" data-lat="${esc(d.latitude)}" data-lon="${esc(d.longitude)}">
        <a class="map-fallback" href="https://www.openstreetmap.org/?mlat=${esc(d.latitude)}&amp;mlon=${esc(d.longitude)}#map=11/${esc(d.latitude)}/${esc(d.longitude)}" target="_blank" rel="noopener noreferrer">🗺 OpenStreetMap ↗</a>
      </div>
    </div>` : ''}

    <div class="panel fade">
      <h2 class="panel-title" data-i18n="connection">${esc(t.connection)}</h2>
      <dl>
        ${row('timezone', t.timezone, d.timezone)}
        ${row('coords', t.coords, d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : '')}
        ${row('', 'ASN', d.asn ? `AS${d.asn}` : '')}
        ${row('', 'ISP', d.asOrganization, false)}
        ${row('node', t.node, d.colo)}
        ${row('protocol', t.protocol, d.httpProtocol)}
        ${row('', 'TLS', d.tlsVersion)}
        ${row('cipher', t.cipher, d.tlsCipher)}
      </dl>
    </div>

    <div class="panel fade">
      <h2 class="panel-title" data-i18n="device">${esc(t.device)}</h2>
      <dl>
        ${row('', 'User-Agent', d.userAgent)}
        ${row('language', t.language, d.language)}
      </dl>
    </div>

    <div class="panel fade">
      <details>
        <summary>
          <span data-i18n="headers">${esc(t.headers)}</span>
          <span class="meta" data-i18n="count" data-n="${headerCount}">${esc(t.count.replace('{n}', String(headerCount)))}</span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <dl>${headerRows}</dl>
      </details>
    </div>

  </section>

  <footer class="fade">
    <span data-i18n="noLogs">${esc(t.noLogs)}</span> ·
    <a href="https://github.com/lp250isme/ip-echo" target="_blank" rel="noopener noreferrer">GitHub</a>
    · <a href="https://kvcc.me" rel="noopener noreferrer">more by kv</a>
  </footer>
</main>

<script>
/* ---------- i18n（介面標籤即時切換；資料值不動） ---------- */
const I18N = ${JSON.stringify(I18N)};
const RTL = ${JSON.stringify(RTL_LANGS)};
let curLang = ${JSON.stringify(lang)};
const langSel = document.getElementById('langSel');

function dict(){ return I18N[curLang] || I18N['${DEFAULT_LANG}']; }
function applyLang(l){
  curLang = I18N[l] ? l : '${DEFAULT_LANG}';
  const dx = dict();
  document.documentElement.lang = curLang;
  document.documentElement.dir = RTL.indexOf(curLang) >= 0 ? 'rtl' : 'ltr';
  document.title = 'ip.kvcc.me — ' + dx.tagline;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = dx.intro;
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    const k = el.getAttribute('data-i18n');
    let s = dx[k]; if (s == null) return;
    const n = el.getAttribute('data-n');
    if (n != null) s = s.replace('{n}', n);
    el.textContent = s;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(function(el){
    const v = dx[el.getAttribute('data-i18n-aria')];
    if (v != null) el.setAttribute('aria-label', v);
  });
}
langSel.addEventListener('change', function(){
  applyLang(langSel.value);
  try { localStorage.setItem('ip-lang', langSel.value); } catch (e) {}
});
/* 載入時：使用者先前選過的語言覆蓋裝置預設 */
try {
  const stored = localStorage.getItem('ip-lang');
  if (stored && I18N[stored] && stored !== curLang) { applyLang(stored); langSel.value = stored; }
} catch (e) {}

/* ---------- 主題三段循環（light → dark → auto） ---------- */
const ICONS = {
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  dark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  auto:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>'
};
const ORDER = ['light','dark','auto'];
const mq = matchMedia('(prefers-color-scheme: dark)');
const themeBtn = document.getElementById('themeBtn');
let pref = localStorage.getItem('ip-theme') || 'auto';
function apply(){
  const t = pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref;
  document.documentElement.dataset.theme = t;
  themeBtn.innerHTML = ICONS[pref];
  var st = document.documentElement.dataset.style;
  document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? (st === 'linear' ? '#08090a' : '#000000') : (st === 'linear' ? '#FBFBFC' : '#f2f2f7');
  document.getElementById('appIcon').src = (st === 'linear')
    ? (t === 'dark' ? '/icon-linear-dark.png' : '/icon-linear.png')
    : (t === 'dark' ? '/icon-dark.png' : '/icon.png');
  if (window.__mapTheme) window.__mapTheme();
}
themeBtn.addEventListener('click', () => {
  pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  localStorage.setItem('ip-theme', pref);
  apply();
});
mq.addEventListener('change', () => { if (pref === 'auto') apply(); });
apply();

/* ───────── 設計風格切換（Glass ⇄ Linear，A/B 比較用，存 localStorage） ───────── */
var STYLE_ICONS = {
  glass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="6"/><path d="M3 9.5h18"/></svg>',
  linear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7.5 8h9M7.5 12h9M7.5 16h5"/></svg>'
};
var styleBtn = document.getElementById('styleBtn');
var stylePref = localStorage.getItem('ip-style') || 'glass';
function applyStyle(){
  document.documentElement.dataset.style = stylePref;
  if (styleBtn) {
    styleBtn.innerHTML = STYLE_ICONS[stylePref] || STYLE_ICONS.glass;
    styleBtn.title = (stylePref === 'linear' ? 'Linear' : 'Glass') + ' 風格（點擊切換）';
  }
  apply(); // re-assert theme-color for the active style
}
if (styleBtn) styleBtn.addEventListener('click', function(){
  stylePref = stylePref === 'glass' ? 'linear' : 'glass';
  try { localStorage.setItem('ip-style', stylePref); } catch (e) {}
  applyStyle();
});
applyStyle();

/* ---------- 複製（換字鈕：replaceChildren 換節點，不掛 transform/opacity 過渡） ---------- */
document.querySelectorAll('.copy-btn').forEach(btn => {
  let timer;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch { return; }
    const span = document.createElement('span');
    span.setAttribute('data-i18n', 'copied');
    span.textContent = dict().copied;
    btn.replaceChildren(span);
    btn.classList.add('done');
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = document.createElement('span');
      s.setAttribute('data-i18n', 'copy');
      s.textContent = dict().copy;
      btn.replaceChildren(s);
      btn.classList.remove('done');
    }, 1600);
  });
});

/* ---------- 地圖視圖（Leaflet + CARTO 主題化圖磚；無座標就沒有 #map、直接跳過。
   載入失敗則保留 #map 內的 OpenStreetMap 退路連結。圖磚跟著淺/深色切換） ---------- */
(function(){
  var el = document.getElementById('map');
  if (!el) return;
  var lat = parseFloat(el.dataset.lat), lon = parseFloat(el.dataset.lon);
  if (!isFinite(lat) || !isFinite(lon)) return;
  var V = '1.9.4';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/leaflet@' + V + '/dist/leaflet.css';
  document.head.appendChild(css);
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/leaflet@' + V + '/dist/leaflet.js';
  s.onload = function(){
    var L = window.L;
    if (!L) return; // 退路連結留著
    el.innerHTML = '';
    el.style.display = 'block';
    var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var map = L.map(el, { scrollWheelZoom:false, zoomControl:true, attributionControl:true, zoomAnimation:!rm, fadeAnimation:!rm, markerZoomAnimation:!rm }).setView([lat, lon], 11);
    function tileUrl(){ return 'https://{s}.basemaps.cartocdn.com/' + (document.documentElement.dataset.theme === 'dark' ? 'dark_all' : 'light_all') + '/{z}/{x}/{y}{r}.png'; }
    var layer = L.tileLayer(tileUrl(), { maxZoom:19, attribution:'© OpenStreetMap © CARTO' }).addTo(map);
    L.circleMarker([lat, lon], { radius:8, weight:3, color:'#fff', fillColor:'#007aff', fillOpacity:1 }).addTo(map);
    window.__mapTheme = function(){ layer.setUrl(tileUrl()); };
    /* 地圖在 .panel.fade 裡：0.5s translateY 進場 + backdrop-filter 會在 iOS Safari
       建出合成圖層，Leaflet 若在動畫進行中 init，圖磚會畫進停格快照、之後不重繪
       → 空白灰。等進場動畫結束（transform 歸零、圖層落定）再 invalidateSize，讓
       圖磚重新落到已穩定的圖層；加 rAF + 過 0.5s 的 backstop 多重保險。桌機/Chromium
       本來就會重繪、不受影響——這是 iOS 專屬修法（headless 驗不出，需實機）。 */
    var fix = function(){ map.invalidateSize(); };
    var panel = el.closest('.panel');
    if (panel) panel.addEventListener('animationend', fix, { once:true });
    requestAnimationFrame(fix);
    setTimeout(fix, 120);
    setTimeout(fix, 700);
  };
  document.head.appendChild(s);
})();

/* ---------- viewport-lock（無打包器：jsDelivr 釘 SHA） ---------- */
import('https://cdn.jsdelivr.net/gh/lp250isme/viewport-lock@d9c5a5c8c10e833827ff9bc529d93eed7786ea5c/dist/index.js')
  .then(m => m.lockViewport())
  .catch(() => {});
</script>
</body>
</html>`;
}
