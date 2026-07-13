const axios = require('axios');
const FormData = require('form-data');

const API = "https://litterbox.catbox.moe/resources/internals/api.php";

async function uploadFile(fileBuffer, filename, expire = "1h") {
    try {
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("time", expire);
        form.append("fileToUpload", fileBuffer, {
            filename: filename,
            contentType: "application/octet-stream"
        });

        const res = await axios.post(API, form, {
            timeout: 120000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            validateStatus: () => true,
            headers: {
                ...form.getHeaders(),
                accept: "*/*",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"
            }
        });

        const url = typeof res.data === "string" && res.data.trim().startsWith("https://")
            ? res.data.trim()
            : null;

        return {
            status: res.status === 200 && !!url,
            code: res.status,
            result_url: url || res.data,
            expire: expire
        };

    } catch (error) {
        return {
            status: false,
            code: error.response?.status || 500,
            result_url: error.message,
            expire: expire
        };
    }
}

module.exports = (app) => {
    app.post('/uploader/litterbox', async (req, res) => {
        const expire = req.query.expire || req.body.expire || '1h';

        const validExpire = ['1h', '12h', '24h', '72h'];
        if (!validExpire.includes(expire)) {
            return res.status(400).json({
                status: false,
                message: "Expire harus salah satu dari: 1h, 12h, 24h, 72h"
            });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                status: false,
                message: "Tidak ada file yang diupload. Kirim file dengan key 'file'"
            });
        }

        const file = req.files.file;

        if (file.size > 200 * 1024 * 1024) {
            return res.status(400).json({
                status: false,
                message: "Ukuran file maksimal 200MB"
            });
        }

        try {
            const result = await uploadFile(file.data, file.name, expire);
            
            if (result.status) {
                res.json({
                    status: true,
                    result: {
                        url: result.result_url,
                        expire: result.expire,
                        filename: file.name,
                        size: file.size
                    }
                });
            } else {
                res.status(500).json({
                    status: false,
                    message: result.result_url || "Gagal mengupload file"
                });
            }
        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan saat mengupload file"
            });
        }
    });
};
