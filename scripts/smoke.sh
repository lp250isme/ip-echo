#!/usr/bin/env bash
# 回歸守門（保證不再犯）。ip-echo 踩過的坑：
#   wrangler 的 "assets" 設定會讓 request.cf 變空 → 地理/座標全空、地圖壞掉
#   （2026-06；連 run_worker_first:true 都救不了。icon 改由 Worker 內嵌服務）。
# 兩道關卡：
#   1) config 不得含 "assets"        ← 離線、確定性，擋最可能的回退。
#   2) production /json 真的有 geo    ← 從乾淨網路驗（Jina 代抓；本機可能有 fake-IP
#                                       代理把 *.kvcc.me 攔走、cf 測不準）。
set -euo pipefail
cd "$(dirname "$0")/.."

# 關卡 1：wrangler 不得有 assets（硬擋）
if grep -qE '"assets"[[:space:]]*:' wrangler.jsonc; then
  echo "✗ FAIL: wrangler.jsonc 出現 \"assets\"——它會讓 request.cf 變空、地圖壞。請拿掉。"
  exit 1
fi
echo "✓ wrangler 無 assets"

# 關卡 2：乾淨網路驗 /json 的 geo（Jina 代抓繞過本機代理）
j=$(curl -s --max-time 30 "https://r.jina.ai/https://ip.kvcc.me/json?cb=$$$RANDOM" 2>/dev/null || true)
parsed=$(printf '%s' "$j" | python3 -c "
import sys,json,re
try:
    m=re.search(r'\{.*\}', sys.stdin.read(), re.S)
    d=json.loads(m.group(0))
    print('%s|%s|%s' % (d.get('latitude',''), d.get('longitude',''), d.get('country','')))
except Exception:
    print('NOJSON')
" 2>/dev/null || echo NOJSON)

if [ "$parsed" = "NOJSON" ] || [ -z "$parsed" ]; then
  echo "⚠ 略過線上 geo 驗證（Jina 無回應/無法解析）；config 關卡已過。"
  exit 0
fi
lat="${parsed%%|*}"; rest="${parsed#*|}"; lon="${rest%%|*}"; country="${rest#*|}"
if [ -z "$lat" ] || [ -z "$lon" ]; then
  echo "✗ FAIL: /json geo 空（country='$country' lat='$lat' lon='$lon'）— 地圖會壞。檢查 request.cf。"
  exit 1
fi
echo "✓ geo OK (country=$country lat=$lat lon=$lon)"
echo "✓ SMOKE PASS"
