const axios = require('axios');

module.exports = (app) => {
  app.post('/youtube-music/stream', async (req, res) => {
    const url = (req.body.url || '').trim();

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi"
      });
    }

    try {
      const response = await axios.post('https://api.lexcode.biz.id/api/dwn/ytplay', {
        q: url
      }, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const data = response.data;

      if (!data || !data.result) {
        return res.status(503).json({
          status: false,
          message: 'Gagal mendapatkan audio stream'
        });
      }

      res.json({
        status: true,
        result: {
          duration: data.result.duration || null,
          audio: data.result.download?.audio || data.result.audio || null
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
