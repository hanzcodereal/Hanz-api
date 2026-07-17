const axios = require('axios');

module.exports = (app) => {
  app.get('/canvas/brat', async (req, res) => {
    const text = req.query.text || 'Brat Canvas';

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' diperlukan."
      });
    }

    try {
      const url = `https://brat.siputzx.my.id/image?text=${encodeURIComponent(text)}`;
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      res.set('Content-Type', 'image/png');
      res.send(response.data);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan saat membuat Brat image"
      });
    }
  });
};
