const https = require('https');
const crypto = require('crypto');

function extractVideoId(url) {
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

function reqJSON(urlStr, method, body, extraHeaders, timeoutMs) {
    return new Promise((resolve, reject) => {
        let u;
        try { u = new URL(urlStr); } catch (e) { reject(e); return; }
        const payload = body ? JSON.stringify(body) : null;
        const headers = Object.assign({
            'User-Agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json'
        }, extraHeaders || {});
        if (payload) {
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(payload);
        }
        const options = {
            hostname: u.hostname,
            path: u.pathname + (u.search || ''),
            method: method,
            headers: headers,
            rejectUnauthorized: false,
            timeout: timeoutMs || 15000
        };
        const r = https.request(options, (response) => {
            let d = '';
            response.on('data', c => d += c);
            response.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { resolve(null); }
            });
        });
        r.on('error', reject);
        r.on('timeout', () => { r.destroy(); reject(new Error('Timeout')); });
        if (payload) r.write(payload);
        r.end();
    });
}

async function getDownloadSavetube(url) {
    try {
        const id = extractVideoId(url);
        if (!id) return null;

        const cdnRes = await reqJSON('https://media.savetube.vip/api/random-cdn', 'GET', null, null, 10000);
        let cdns = [];
        if (cdnRes && Array.isArray(cdnRes.cdns)) cdns = cdnRes.cdns;
        else if (cdnRes && cdnRes.cdn) cdns = [cdnRes.cdn];
        if (cdns.length === 0) cdns = ['cdn305.savetube.vip', 'cdn105.savetube.vip'];

        const baseHeaders = { 'origin': 'https://yt.savetube.me' };

        for (const cdn of cdns) {
            try {
                const infoRes = await reqJSON('https://' + cdn + '/v2/info', 'POST', { url: url }, baseHeaders, 12000);
                const encData = infoRes && infoRes.data;
                if (!encData) continue;

                const encrypted = Buffer.from(encData, 'base64');
                const decipher = crypto.createDecipheriv(
                    'aes-128-cbc',
                    Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex'),
                    encrypted.slice(0, 16)
                );
                const decryptedBuf = Buffer.concat([decipher.update(encrypted.slice(16)), decipher.final()]);
                const decrypted = JSON.parse(decryptedBuf.toString());
                if (!decrypted.key) continue;

                const dlRes = await reqJSON('https://' + cdn + '/download', 'POST', {
                    id: id, downloadType: 'audio', quality: '128', key: decrypted.key
                }, baseHeaders, 12000);

                const downloadUrl = dlRes && ((dlRes.data && dlRes.data.downloadUrl) || dlRes.downloadUrl);
                if (downloadUrl) {
                    const dur = decrypted.duration || 0;
                    return {
                        duration: dur ? Math.floor(dur / 60) + ':' + String(dur % 60).padStart(2, '0') : null,
                        audio: downloadUrl
                    };
                }
            } catch (e) { continue; }
        }
        return null;
    } catch (err) {
        return null;
    }
}

async function cobaltExtraction(url) {
    const instances = [
        'https://api.cobalt.tools/api/json',
        'https://co.wuk.sh/api/json'
    ];
    for (const instance of instances) {
        try {
            const r = await reqJSON(instance, 'POST', {
                url: url, downloadMode: 'audio', audioFormat: 'mp3', audioBitrate: '128'
            }, { 'Accept': 'application/json' }, 10000);
            if (r && r.url) return { audio: r.url, duration: null };
        } catch (e) { continue; }
    }
    return null;
}

async function lexcodeExtraction(url) {
    try {
        const r = await reqJSON('https://api.lexcode.biz.id/api/dwn/ytplay?q=' + encodeURIComponent(url), 'GET', null, null, 20000);
        if (!r) return null;
        function findAudioUrl(obj, depth) {
            depth = depth || 0;
            if (depth > 10 || !obj || typeof obj !== 'object') return '';
            if (Array.isArray(obj)) {
                for (const item of obj) { const f = findAudioUrl(item, depth + 1); if (f) return f; }
                return '';
            }
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                if (typeof val === 'string' && /^https?:\/\//.test(val) && (val.includes('.mp3') || val.includes('audio') || val.includes('stream'))) return val;
                if (typeof val === 'object') { const f = findAudioUrl(val, depth + 1); if (f) return f; }
            }
            return '';
        }
        const found = findAudioUrl(r);
        if (found) return { audio: found, duration: null };
        return null;
    } catch (e) {
        return null;
    }
}

module.exports = (app) => {
    app.get('/youtube-music/stream', async (req, res) => {
        const url = (req.query.url || '').trim();

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' wajib diisi."
            });
        }

        try {
            let result = await getDownloadSavetube(url);
            if (!result || !result.audio) result = await cobaltExtraction(url);
            if (!result || !result.audio) result = await lexcodeExtraction(url);

            if (!result || !result.audio) {
                return res.status(503).json({
                    status: false,
                    message: 'Layanan ekstraksi audio sedang sibuk, coba lagu lain.'
                });
            }

            res.json({
                status: true,
                result: {
                    duration: result.duration || null,
                    audio: result.audio
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan"
            });
        }
    });
};
