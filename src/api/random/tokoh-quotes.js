const axios = require('axios');

module.exports = (app) => {
    app.get('/random/tokoh-quotes', async (req, res) => {
        try {
            const response = await axios.get('https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/tokoh-quotes.json', {
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json,text/plain,*/*"
                }
            });

            let data = response.data;
            let quotes = [];

            if (Array.isArray(data)) {
                quotes = data;
            } else if (Array.isArray(data.quotes)) {
                quotes = data.quotes;
            } else if (Array.isArray(data.result)) {
                quotes = data.result;
            } else if (Array.isArray(data.data)) {
                quotes = data.data;
            }

            if (quotes.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Data quotes tidak ditemukan"
                });
            }

            const selected = quotes[Math.floor(Math.random() * quotes.length)];

            res.json({
                status: true,
                quote: selected.quote || selected.text || selected.kata || null,
                figure: selected.figure || selected.author || selected.name || selected.tokoh || null,
                source: selected.source || selected.sumber || null
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan saat mengambil quotes"
            });
        }
    });
};
