const axios = require('axios');

const urls = {
  auto: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
  terkini: "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
  dirasakan: "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json"
};

const BASE_SHAKEMAP_URL = "https://data.bmkg.go.id/DataMKG/TEWS/";

async function fetchAndCleanJSON(url) {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const text = response.data;
    const cleanText = JSON.stringify(text).replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    return JSON.parse(cleanText);
  } catch (error) {
    throw new Error(`Error fetching or parsing JSON: ${error.message}`);
  }
}

function addShakemapUrls(data) {
  if (!data) return data;

  function addShakemapToGempa(gempa) {
    if (!gempa || !gempa.Shakemap) return gempa;
    return {
      ...gempa,
      downloadShakemap: `${BASE_SHAKEMAP_URL}${gempa.Shakemap}`
    };
  }

  if (data.Infogempa) {
    if (data.Infogempa.gempa) {
      if (Array.isArray(data.Infogempa.gempa)) {
        return {
          ...data,
          Infogempa: {
            ...data.Infogempa,
            gempa: data.Infogempa.gempa.map(addShakemapToGempa)
          }
        };
      } else {
        return {
          ...data,
          Infogempa: {
            ...data.Infogempa,
            gempa: addShakemapToGempa(data.Infogempa.gempa)
          }
        };
      }
    }
  }
  return data;
}

async function scrapeBMKG() {
  try {
    const responses = await Promise.all(
      Object.values(urls).map((url) => fetchAndCleanJSON(url))
    );
    const processedResponses = responses.map(response => addShakemapUrls(response));
    return {
      auto: processedResponses[0],
      terkini: processedResponses[1],
      dirasakan: processedResponses[2]
    };
  } catch (error) {
    console.error("Error during BMKG scraping:", error.message);
    throw error;
  }
}

module.exports = (app) => {
  app.get('/info/cek-gempa', async (req, res) => {
    try {
      const data = await scrapeBMKG();
      res.json({
        status: true,
        data: data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan saat mengambil data gempa"
      });
    }
  });
};
