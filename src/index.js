/* ============================================================
   ip-echo — ip.kvcc.me
   回顯這次請求的 IP / 地理 / ASN / TLS / headers，零儲存零記錄。
   - curl/wget 等 CLI（Accept 不含 text/html）→ 純文字 IP
   - /ip    → 純文字 IP
   - /json  → 完整 JSON（CORS *，其他 app 可直接 fetch）
   - 其他   → HTML 頁（值在 server 端渲染進模板）
   ============================================================ */

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

        if (url.pathname !== '/') {
            return Response.redirect(url.origin + '/', 302);
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

        return new Response(page(d, request.headers), {
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'no-store',
            },
        });
    },
};

/* ---------- HTML 模板（值全部 esc 過：headers 是請求方可控的反射內容） ---------- */

const row = (label, value, mono = true) =>
    value
        ? `<div class="row"><dt>${label}</dt><dd${mono ? ' class="mono"' : ''}>${esc(value)}</dd></div>`
        : '';

function page(d, headers) {
    const headerRows = [...headers]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
            ([k, v]) =>
                `<div class="row"><dt>${esc(k)}</dt><dd class="mono">${esc(v)}</dd></div>`
        )
        .join('');

    const place = [d.city, d.region, d.country && `${d.country} ${flag(d.country)}`]
        .filter(Boolean)
        .join(' · ');

    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ip.kvcc.me — 你的連線資訊</title>
<meta name="description" content="IP / 地理 / ASN / TLS / headers 回顯小工具，零儲存零記錄。">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon.png" type="image/png" media="(prefers-color-scheme: light)">
<link rel="icon" href="/icon-dark.png" type="image/png" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f2f2f7">
<script>
/* pre-paint 防主題閃爍 */
(function(){var p=localStorage.getItem('ip-theme')||'auto';var t=p==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.dataset.theme=t;})();
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
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}
.topbar img{width:32px;height:32px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.1);user-select:none}
.icon-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:none;border-radius:9999px;padding:0;
  color:var(--label);cursor:pointer;background:var(--panel);border:1px solid var(--panel-border);
  backdrop-filter:blur(16px) saturate(1.5);-webkit-backdrop-filter:blur(16px) saturate(1.5);
  transition:transform .15s ease}
.icon-btn:active{transform:scale(.92)}
.icon-btn svg{width:19px;height:19px}
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
  letter-spacing:-.01em;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.ip-place{margin:8px 0 0;font-size:14px;color:var(--label-2)}
.copy-btn{border:none;border-radius:9999px;min-height:36px;padding:0 16px;font-family:var(--font-ui);
  font-size:14px;font-weight:600;color:var(--tint);cursor:pointer;white-space:nowrap;
  background:var(--fill);transition:background-color .15s ease,color .15s ease}
.copy-btn.done{color:var(--green)}
dl{margin:0;display:flex;flex-direction:column;gap:2px}
.row{display:flex;align-items:baseline;gap:14px;padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--label-3) 26%,transparent)}
.row:last-child{border-bottom:none}
dt{flex-shrink:0;width:104px;font-size:13px;font-weight:600;color:var(--label-2)}
dd{flex:1;margin:0;font-size:14.5px;font-weight:500;overflow-wrap:anywhere}
dd.mono{font-family:var(--font-mono);font-size:13.5px;font-variant-numeric:tabular-nums}
details{margin:0}
details summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;
  font-size:17px;font-weight:700;letter-spacing:-.01em}
details summary::-webkit-details-marker{display:none}
details summary .meta{flex:1;text-align:right;font-size:13px;font-weight:600;color:var(--label-2)}
details summary .chev{width:16px;height:16px;color:var(--label-3);transform:rotate(-90deg);transition:transform .2s ease}
details[open] summary .chev{transform:rotate(0)}
details[open] summary{margin-bottom:12px}
.api-line{display:flex;align-items:center;gap:8px;margin-top:8px}
.api-line code{flex:1;min-width:0;display:block;padding:10px 14px;border-radius:14px;background:var(--fill);
  font-family:var(--font-mono);font-size:13px;overflow-wrap:anywhere}
.api-note{margin:12px 0 0;font-size:13px;line-height:1.6;color:var(--label-2)}
footer{margin-top:36px;text-align:center;font-size:13px;color:var(--label-3)}
footer a{color:var(--label-2);text-decoration:none}
footer a:hover{color:var(--tint)}
@keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.fade{animation:fade-in .5s var(--ease-out) both}
::selection{background:color-mix(in srgb,var(--tint) 28%,transparent)}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:none;
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
    <button class="icon-btn" id="themeBtn" aria-label="切換主題"></button>
  </header>

  <section class="hero fade">
    <h1>你的連線資訊</h1>
    <p>IP、地理位置、ASN、TLS、request headers 一頁看清楚。資料即時來自這一次請求，不記錄、不儲存。</p>
  </section>

  <section class="stack">
    <div class="panel fade">
      <div class="ip-display">
        <span class="ip-value" id="ipValue">${esc(d.ip)}</span>
        <button class="copy-btn" data-copy="${esc(d.ip)}"><span>複製</span></button>
      </div>
      ${place ? `<p class="ip-place">${esc(place)}</p>` : ''}
    </div>

    <div class="panel fade">
      <h2 class="panel-title">連線</h2>
      <dl>
        ${row('時區', d.timezone)}
        ${row('座標', d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : '')}
        ${row('ASN', d.asn ? `AS${d.asn}` : '')}
        ${row('ISP', d.asOrganization, false)}
        ${row('節點', d.colo)}
        ${row('協定', d.httpProtocol)}
        ${row('TLS', d.tlsVersion)}
        ${row('加密套件', d.tlsCipher)}
      </dl>
    </div>

    <div class="panel fade">
      <h2 class="panel-title">裝置</h2>
      <dl>
        ${row('User-Agent', d.userAgent)}
        ${row('語言', d.language)}
      </dl>
    </div>

    <div class="panel fade">
      <details>
        <summary>
          Request headers
          <span class="meta">${[...headers].length} 個</span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <dl>${headerRows}</dl>
      </details>
    </div>

    <div class="panel fade">
      <h2 class="panel-title">API</h2>
      <div class="api-line"><code>curl ip.kvcc.me</code><button class="copy-btn" data-copy="curl ip.kvcc.me"><span>複製</span></button></div>
      <div class="api-line"><code>curl ip.kvcc.me/json</code><button class="copy-btn" data-copy="curl ip.kvcc.me/json"><span>複製</span></button></div>
      <p class="api-note">/json 開了 CORS（<code>*</code>），任何網頁都能直接 fetch；CLI 打根路徑會直接回純文字 IP。</p>
    </div>
  </section>

  <footer class="fade">
    零儲存零記錄 ·
    <a href="https://github.com/lp250isme/ip-echo" target="_blank" rel="noopener noreferrer">GitHub</a>
    · <a href="https://kvcc.me" rel="noopener noreferrer">more by kv</a>
  </footer>
</main>

<script>
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
  document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#000000' : '#f2f2f7';
  document.getElementById('appIcon').src = t === 'dark' ? '/icon-dark.png' : '/icon.png';
}
themeBtn.addEventListener('click', () => {
  pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  localStorage.setItem('ip-theme', pref);
  apply();
});
mq.addEventListener('change', () => { if (pref === 'auto') apply(); });
apply();

/* ---------- 複製（換字鈕：replaceChildren 換節點，不掛 transform/opacity 過渡） ---------- */
document.querySelectorAll('.copy-btn').forEach(btn => {
  let timer;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch { return; }
    const span = document.createElement('span');
    span.textContent = '已複製 ✓';
    btn.replaceChildren(span);
    btn.classList.add('done');
    clearTimeout(timer);
    timer = setTimeout(() => {
      const s = document.createElement('span');
      s.textContent = '複製';
      btn.replaceChildren(s);
      btn.classList.remove('done');
    }, 1600);
  });
});

/* ---------- viewport-lock（無打包器：jsDelivr 釘 SHA） ---------- */
import('https://cdn.jsdelivr.net/gh/lp250isme/viewport-lock@d9c5a5c8c10e833827ff9bc529d93eed7786ea5c/dist/index.js')
  .then(m => m.lockViewport())
  .catch(() => {});
</script>
</body>
</html>`;
}
