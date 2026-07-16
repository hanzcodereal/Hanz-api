const axios = require('axios');

module.exports = (app) => {
  app.get('/info/cek-cuaca', async (req, res) => {
    const query = req.query.query;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'query' diperlukan. Contoh: /info/cek-cuaca?query=Jakarta"
      });
    }

    try {
      const response = await axios.get(
        'https://raw.githubusercontent.com/kodewilayah/permendagri-72-2019/main/dist/base.csv'
      );
      const rows = response.data.split('\n');
      let foundCode = null;
      let foundName = null;
      let foundAdm1 = null;
      let foundAdm2 = null;
      let foundAdm3 = null;
      let foundAdm4 = null;

      for (const row of rows) {
        if (!row.trim()) continue;
        const [kode, nama] = row.split(',');
        if (!nama) continue;
        if (nama.toLowerCase().includes(query.toLowerCase())) {
          foundCode = kode;
          foundName = nama;
          const parts = kode.split('.');
          foundAdm1 = parts[0] || null;
          foundAdm2 = parts.length >= 2 ? parts.slice(0, 2).join('.') : null;
          foundAdm3 = parts.length >= 3 ? parts.slice(0, 3).join('.') : null;
          foundAdm4 = parts.length >= 4 ? parts.slice(0, 4).join('.') : null;
          break;
        }
      }

      if (!foundCode) {
        return res.status(404).json({
          status: false,
          message: "Wilayah tidak ditemukan"
        });
      }

      const dots = (foundCode.match(/\./g) || []).length;
      const admLevel = dots + 1;
      const bmkgUrl = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm${admLevel}=${foundCode}`;

      const weatherResponse = await axios.get(bmkgUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const weatherData = weatherResponse.data;

      const result = {
        status: true,
        data: {
          wilayah: {
            kode: foundCode,
            nama: foundName,
            score: 1.4,
            adm1: foundAdm1,
            adm2: foundAdm2,
            adm3: foundAdm3,
            adm4: foundAdm4,
            currentLevel: `adm${admLevel}`,
            bmkgUrl: bmkgUrl
          },
          weather: weatherData.data || weatherData
        },
        timestamp: new Date().toISOString()
      };

      res.json(result);

    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan saat mengambil data cuaca"
      });
    }
  });
};
