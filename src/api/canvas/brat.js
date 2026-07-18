const axios = require('axios');

module.exports = (app) => {
    app.get('/brat', async (req, res) => {
        const text = req.query.text || req.body.text;

        if (!text) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'text' diperlukan."
            });
        }

        const urls = [
            `https://brat.siputzx.my.id/image?text=${encodeURIComponent(text)}`,
            `https://brat-generator.vercel.app/api/brat?text=${encodeURIComponent(text)}`,
            `https://brat-generator.herokuapp.com/api/brat?text=${encodeURIComponent(text)}`
        ];

        let lastError = null;

        for (const url of urls) {
            try {
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/png,image/*,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://brat.siputzx.my.id/',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Connection': 'keep-alive'
                    },
                    validateStatus: (status) => status === 200
                });

                const contentType = response.headers['content-type'] || '';
                if (!contentType.includes('image')) {
                    continue;
                }

                res.set({
                    'Content-Type': contentType || 'image/png',
                    'Cache-Control': 'public, max-age=3600',
                    'Content-Length': response.data.length
                });
                return res.send(response.data);

            } catch (error) {
                lastError = error;
                
                if (error.response && error.response.status === 404) {
                    continue;
                }
                
                if (urls.indexOf(url) < urls.length - 1) {
                    continue;
                }
            }
        }

        try {
            const fallbackUrl = `https://api.microlink.io?url=https://brat.siputzx.my.id/&screenshot&text=${encodeURIComponent(text)}`;
            const fallbackResponse = await axios.get(fallbackUrl, {
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            res.set('Content-Type', 'image/png');
            return res.send(fallbackResponse.data);
        } catch (fallbackError) {
            return res.status(500).json({
                status: false,
                message: lastError ? lastError.message : "Gagal membuat BRAT image"
            });
        }
    });
};
