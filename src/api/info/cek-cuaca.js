const axios = require('axios');

class WilayahService {
  constructor() {
    this.baseUrl = "https://raw.githubusercontent.com/kodewilayah/permendagri-72-2019/main/dist/base.csv";
    this.bmkgUrl = "https://api.bmkg.go.id/publik/prakiraan-cuaca";
  }

  determineBMKGUrl(code) {
    const dots = (code.match(/\./g) || []).length;
    const admLevel = dots + 1;
    return `${this.bmkgUrl}?adm${admLevel}=${code}`;
  }

  parseWilayahCode(code) {
    const parts = code.split(".");
    const levels = {
      adm1: parts[0],
      adm2: parts.length >= 2 ? parts.slice(0, 2).join(".") : null,
      adm3: parts.length >= 3 ? parts.slice(0, 3).join(".") : null,
      adm4: parts.length >= 4 ? parts.slice(0, 4).join(".") : null,
    };

    const highestLevel = Object.entries(levels)
      .reverse()
      .find(([_key, value]) => value !== null);

    return {
      ...levels,
      currentLevel: highestLevel ? highestLevel[0] : "adm1",
      bmkgUrl: this.determineBMKGUrl(code),
    };
  }

  calculateSimilarity(searchQuery, targetText) {
    const query = searchQuery.toLowerCase();
    const target = targetText.toLowerCase();

    const queryWords = query.split(" ").filter((w) => w.length > 0);
    const targetWords = target.split(" ").filter((w) => w.length > 0);

    let wordMatchScore = 0;
    let exactMatchBonus = 0;

    for (const queryWord of queryWords) {
      let bestWordScore = 0;

      for (const targetWord of targetWords) {
        if (queryWord === targetWord) {
          bestWordScore = 1;
          exactMatchBonus += 0.2;
          break;
        }

        if (targetWord.includes(queryWord) || queryWord.includes(targetWord)) {
          const matchLength = Math.min(queryWord.length, targetWord.length);
          const maxLength = Math.max(queryWord.length, targetWord.length);
          const partialScore = matchLength / maxLength;
          bestWordScore = Math.max(bestWordScore, partialScore);
        }
      }

      wordMatchScore += bestWordScore;
    }

    const normalizedWordScore = wordMatchScore / queryWords.length;
    return normalizedWordScore + exactMatchBonus;
  }

  async searchWilayah(query) {
    try {
      const response = await axios.get(this.baseUrl);
      const data = response.data;
      const rows = data.split("\n");

      const results = [];

      for (const row of rows) {
        if (!row.trim()) continue;

        const [kode, nama] = row.split(",");
        if (!nama) continue;

        const similarity = this.calculateSimilarity(query, nama);
        const threshold = query.length <= 4 ? 0.4 : 0.3;

        if (similarity > threshold) {
          const wilayahInfo = this.parseWilayahCode(kode);
          results.push({
            kode,
            nama,
            score: similarity,
            ...wilayahInfo,
          });
        }
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, 10);
    } catch (error) {
      console.error("Error dalam pencarian wilayah:", error.message);
      throw new Error("Failed to search wilayah data");
    }
  }

  async getWeatherData(wilayahCode) {
    try {
      const url = this.determineBMKGUrl(wilayahCode);
      const response = await axios.get(url, { timeout: 30000 });
      return response.data.data;
    } catch (error) {
      console.error("Error dalam mengambil data cuaca:", error.message);
      throw new Error("Failed to get weather data from API");
    }
  }

  async scrape(query) {
    try {
      const wilayahResults = await this.searchWilayah(query);

      if (wilayahResults.length > 0) {
        const topResult = wilayahResults[0];
        const weatherData = await this.getWeatherData(topResult.kode);

        return {
          wilayah: topResult,
          weather: weatherData,
        };
      }
      return null;
    } catch (error) {
      console.error("Error dalam pencarian wilayah dan cuaca:", error.message);
      throw new Error("Failed to get weather and location data");
    }
  }
}

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
      const service = new WilayahService();
      const result = await service.scrape(query);

      if (!result) {
        return res.status(404).json({
          status: false,
          message: "Wilayah tidak ditemukan"
        });
      }

      res.json({
        status: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan saat mengambil data cuaca"
      });
    }
  });
};
