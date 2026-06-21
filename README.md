<p align="center">
  <img src="public/icon-dark.png" alt="ip-echo" width="120" height="120">
</p>

# ip-echo — 連線資訊回顯小工具

[English](#english) | [繁體中文](#繁體中文)

🔗 **Live Demo**: [ip.kvcc.me](https://ip.kvcc.me)

---

## English

A zero-storage connection-info echo tool on Cloudflare Workers. One page shows your IP, geolocation, ASN/ISP, TLS details, and every request header — rendered server-side from the very request you just made. Nothing is logged, nothing is stored.

### ✨ Features

- **CLI-first**: `curl ip.kvcc.me` returns just your IP (content negotiation via `Accept`); `/ip` always returns plain text.
- **JSON API with CORS**: `curl ip.kvcc.me/json` returns IP + geo + ASN + TLS + all headers; `Access-Control-Allow-Origin: *` so any web app can `fetch` it.
- **Full header echo**: Every request header listed (HTML-escaped — reflected input is attacker-controlled), collapsible in the UI.
- **Zero storage**: Stateless Worker; data comes from `request.cf` and headers of the current request only.
- **Two design styles**: frosted **Liquid Glass** (cards on an animated mesh) and a flat **Linear** look — switch anytime from the top bar. Light / dark / auto theme with pre-paint anti-flash.
- **Multilingual (17 languages)**: UI labels in English, 繁體中文, 简体中文, 日本語, 한국어, Español, Français, Deutsch, Italiano, Português, Русский, العربية (RTL), Türkçe, हिन्दी, Bahasa Indonesia, Tiếng Việt, ไทย. Defaults to the device locale (`Accept-Language` negotiation, server-rendered — no flash), switchable anytime (saved to `localStorage`). Data values (IP / geo / headers) are never translated and stay LTR.
- **Map view**: Your approximate (city-level) location on a Leaflet + CARTO map that matches the light / dark theme; falls back to an OpenStreetMap link if tiles fail to load. Coordinates are city-level only — never your exact address.

### 🛠 Tech

- Cloudflare Workers (zero runtime dependencies, no build step)
- `request.cf` for geo / ASN / colo / TLS metadata
- [viewport-lock](https://github.com/lp250isme/viewport-lock) via jsDelivr (pinned SHA)

### 🔗 More by kv

- [kvcc.me](https://kvcc.me) — everything else lives here

---

## 繁體中文

跑在 Cloudflare Workers 上的零儲存連線資訊回顯工具。一頁看清你的 IP、地理位置、ASN/ISP、TLS 細節和所有 request headers——全部由你這一次請求在 server 端即時渲染，不記錄、不儲存。

### ✨ 功能

- **CLI 優先**：`curl ip.kvcc.me` 直接回純文字 IP（用 `Accept` 做內容協商）；`/ip` 永遠回純文字。
- **JSON API 開 CORS**：`curl ip.kvcc.me/json` 回 IP＋地理＋ASN＋TLS＋全部 headers；`Access-Control-Allow-Origin: *`，任何網頁都能直接 `fetch`。
- **完整 header 回顯**：列出每一個 request header（全部 HTML 跳脫——反射內容是請求方可控的），UI 可摺疊。
- **零儲存**：無狀態 Worker，資料只來自 `request.cf` 與當次請求的 headers。
- **兩種設計風格**：霜化 **Liquid Glass**（卡片＋流動 mesh）與扁平 **Linear** 風，頂列一鍵切換。淺色／深色／自動主題含 pre-paint 防閃爍。
- **多語系（17 種）**：介面支援 English／繁體中文／简体中文／日本語／한국어／Español／Français／Deutsch／Italiano／Português／Русский／العربية（RTL）／Türkçe／हिन्दी／Bahasa Indonesia／Tiếng Việt／ไทย。預設依裝置語系（`Accept-Language` 內容協商、server 端直出不閃），可隨時手動切換（記 `localStorage`）。資料值（IP／地理／headers）不翻譯、保持 LTR。
- **地圖視圖**：用 Leaflet + CARTO 圖磚把你的大略位置（城市級）畫在地圖上，跟著淺／深色主題切換；圖磚載入失敗自動退回 OpenStreetMap 連結。座標只到城市級，不是精確地址。

### 🛠 技術

- Cloudflare Workers（零執行期依賴、免 build）
- `request.cf` 取地理／ASN／節點／TLS 中繼資料
- [viewport-lock](https://github.com/lp250isme/viewport-lock) 經 jsDelivr 釘 SHA 載入

### 🔗 kv 的其他作品

- [kvcc.me](https://kvcc.me) — 都在這
