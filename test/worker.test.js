import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import worker from '../src/index.js';

const ORIGIN = 'https://ip.kvcc.me';

/** 模擬 Cloudflare 掛上的 request.cf；其餘走標準 Request。 */
function makeRequest(pathname, { headers = {}, cf = {}, search = '' } = {}) {
    const request = new Request(`${ORIGIN}${pathname}${search}`, { headers });
    request.cf = cf;
    return request;
}

const sampleCf = {
    country: 'TW',
    city: 'Taipei',
    region: 'TPE',
    timezone: 'Asia/Taipei',
    latitude: '25.0478',
    longitude: '121.5319',
    asn: 13335,
    asOrganization: 'AT&T',
    colo: 'TPE',
    httpProtocol: 'HTTP/2',
    tlsVersion: 'TLSv1.3',
    tlsCipher: 'AEAD-AES128-GCM-SHA256',
};

async function handle(pathname, opts) {
    const response = await worker.fetch(makeRequest(pathname, opts));
    const body = await response.text();
    return { response, body };
}

describe('純文字 IP', () => {
    test('/ip 永遠回 cf-connecting-ip，並禁止快取', async () => {
        const { response, body } = await handle('/ip', {
            headers: { 'cf-connecting-ip': '203.0.113.10', accept: 'text/html' },
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(body, '203.0.113.10\n');
    });

    test('根路徑在 CLI Accept（不含 text/html）時只回 IP', async () => {
        const { response, body } = await handle('/', {
            headers: {
                'cf-connecting-ip': '2001:db8::1',
                accept: '*/*',
                'accept-language': 'zh-TW',
            },
            cf: sampleCf,
        });
        assert.equal(body, '2001:db8::1\n');
        assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
        assert.equal(response.headers.get('cache-control'), 'no-store');
    });

    test('沒有 cf-connecting-ip 時回空行，不丟例外', async () => {
        const { response, body } = await handle('/ip');
        assert.equal(response.status, 200);
        assert.equal(body, '\n');
    });
});

describe('/json', () => {
    test('回傳地理、ASN、TLS 與全部 headers，並開 CORS', async () => {
        const { response, body } = await handle('/json', {
            headers: {
                'cf-connecting-ip': '203.0.113.10',
                accept: 'text/html',
                'user-agent': 'curl/8.0',
                'x-request-id': 'abc',
            },
            cf: sampleCf,
            search: '?cb=1',
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
        assert.equal(response.headers.get('access-control-allow-origin'), '*');
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const data = JSON.parse(body);
        assert.deepEqual(
            {
                ip: data.ip,
                country: data.country,
                city: data.city,
                region: data.region,
                timezone: data.timezone,
                latitude: data.latitude,
                longitude: data.longitude,
                asn: data.asn,
                asOrganization: data.asOrganization,
                colo: data.colo,
                httpProtocol: data.httpProtocol,
                tlsVersion: data.tlsVersion,
                tlsCipher: data.tlsCipher,
                userAgent: data.userAgent,
            },
            {
                ip: '203.0.113.10',
                country: 'TW',
                city: 'Taipei',
                region: 'TPE',
                timezone: 'Asia/Taipei',
                latitude: '25.0478',
                longitude: '121.5319',
                asn: 13335,
                asOrganization: 'AT&T',
                colo: 'TPE',
                httpProtocol: 'HTTP/2',
                tlsVersion: 'TLSv1.3',
                tlsCipher: 'AEAD-AES128-GCM-SHA256',
                userAgent: 'curl/8.0',
            }
        );
        assert.equal(data.headers['cf-connecting-ip'], '203.0.113.10');
        assert.equal(data.headers['user-agent'], 'curl/8.0');
        assert.equal(data.headers['x-request-id'], 'abc');
        assert.match(body, /\n {2}"ip": "203\.0\.113\.10"/);
    });

    test('request.cf 缺欄位時對應值是空字串', async () => {
        const { body } = await handle('/json', {
            headers: { 'cf-connecting-ip': '198.51.100.4' },
        });
        const data = JSON.parse(body);
        assert.equal(data.ip, '198.51.100.4');
        assert.equal(data.country, '');
        assert.equal(data.city, '');
        assert.equal(data.latitude, '');
        assert.equal(data.longitude, '');
        assert.equal(data.asn, '');
        assert.equal(data.colo, '');
        assert.equal(data.tlsVersion, '');
    });
});

describe('HTML 頁', () => {
    test('Accept 含 text/html 時渲染連線資訊，並跳脫反射內容', async () => {
        const evil = '<script>alert("x")</script>';
        const { response, body } = await handle('/', {
            headers: {
                'cf-connecting-ip': '"><img src=x>',
                accept: 'text/html,application/xhtml+xml',
                'accept-language': 'zh-TW,en;q=0.5',
                'user-agent': evil,
                'x-b': 'b',
                'x-a': 'a&b',
            },
            cf: sampleCf,
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
        assert.equal(response.headers.get('content-language'), 'zh-Hant');
        assert.equal(response.headers.get('vary'), 'Accept-Language');
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.match(body, /<html lang="zh-Hant" dir="ltr">/);
        assert.match(body, /<h1 data-i18n="tagline">你的連線資訊<\/h1>/);
        assert.match(body, /<p class="ip-place">Taipei · TPE · TW 🇹🇼<\/p>/);
        assert.match(body, /<dt>ASN<\/dt><dd class="mono">AS13335<\/dd>/);
        assert.match(body, /<dt>ISP<\/dt><dd>AT&amp;T<\/dd>/);
        assert.match(body, /data-lat="25\.0478"/);
        assert.match(body, /data-lon="121\.5319"/);
        assert.match(body, /<dt data-i18n="timezone">時區<\/dt><dd class="mono">Asia\/Taipei<\/dd>/);
        assert.match(body, /<dt>TLS<\/dt><dd class="mono">TLSv1\.3<\/dd>/);
        assert.match(body, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
        assert.equal(body.includes(evil), false);
        assert.match(body, /id="ipValue">&quot;&gt;&lt;img src=x&gt;</);
        assert.match(body, /data-copy="&quot;&gt;&lt;img src=x&gt;"/);
        assert.equal(body.includes('"><img'), false);
        assert.ok(body.indexOf('<dt>x-a</dt>') < body.indexOf('<dt>x-b</dt>'));
        assert.match(body, /<dd class="mono">a&amp;b<\/dd>/);
    });

    test('沒有座標時不輸出地圖', async () => {
        const { body } = await handle('/', {
            headers: { accept: 'text/html', 'cf-connecting-ip': '203.0.113.10' },
            cf: { country: 'TW', city: 'Taipei' },
        });
        assert.equal(body.includes('id="map"'), false);
        assert.match(body, /<p class="ip-place">Taipei · TW 🇹🇼<\/p>/);
    });

    test('Accept-Language 依 q 值與標籤對應語系', async () => {
        const cases = [
            ['zh-CN,zh;q=0.9', 'zh-Hans', 'ltr', '你的连接信息'],
            ['zh-HK', 'zh-Hant', 'ltr', '你的連線資訊'],
            ['zh', 'zh-Hans', 'ltr', '你的连接信息'],
            ['ar-EG,en;q=0.8', 'ar', 'rtl', 'معلومات اتصالك'],
            ['fr;q=0.1, ja;q=0.9', 'ja', 'ltr', '接続情報'],
            ['en-US,en;q=0.9', 'en', 'ltr', 'Your connection info'],
            ['pt-BR', 'pt', 'ltr', 'Suas informações de conexão'],
            ['in', 'id', 'ltr', 'Info koneksi Anda'],
            ['xx,yy;q=0.5', 'en', 'ltr', 'Your connection info'],
            ['', 'en', 'ltr', 'Your connection info'],
        ];
        for (const [acceptLanguage, lang, dir, tagline] of cases) {
            const headers = { accept: 'text/html' };
            if (acceptLanguage) headers['accept-language'] = acceptLanguage;
            const { response, body } = await handle('/', { headers });
            const label = acceptLanguage || '(empty)';
            assert.equal(response.headers.get('content-language'), lang, label);
            assert.match(body, new RegExp(`<html lang="${lang}" dir="${dir}">`), label);
            assert.match(body, new RegExp(`<h1 data-i18n="tagline">${tagline}</h1>`), label);
        }
    });
});

describe('路由', () => {
    test('未知路徑 302 回首頁', async () => {
        const response = await worker.fetch(makeRequest('/nope', { search: '?x=1' }));
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), `${ORIGIN}/`);
    });

    test('內嵌 icon 依路徑回傳圖片與長快取', async () => {
        const response = await worker.fetch(makeRequest('/icon.png', { search: '?v=linear' }));
        const bytes = new Uint8Array(await response.arrayBuffer());
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'image/png');
        assert.equal(response.headers.get('cache-control'), 'public, max-age=604800');
        assert.deepEqual([...bytes.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
    });

    test('favicon 回傳 icon 位元組', async () => {
        const response = await worker.fetch(makeRequest('/favicon.ico'));
        const bytes = new Uint8Array(await response.arrayBuffer());
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'image/x-icon');
        assert.equal(response.headers.get('cache-control'), 'public, max-age=604800');
        assert.ok(bytes.length > 100);
        assert.deepEqual([...bytes.subarray(0, 4)], [0x00, 0x00, 0x01, 0x00]);
    });
});
