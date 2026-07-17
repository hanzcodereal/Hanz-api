const axios = require('axios');

module.exports = (app) => {
  app.get('/youtube-music/search', async (req, res) => {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'query' diperlukan"
      });
    }

    try {
      const { data } = await axios.post('https://music.youtube.com/youtubei/v1/search?prettyPrint=false', {
        context: {
          client: { clientName: 'WEB_REMIX', clientVersion: '1.20260620.07.01', hl: 'id', gl: 'ID' }
        },
        query: query,
        params: 'EgWKAQIIAWoSEAQQAxAFEAkQChAVEBAQERAO'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://music.youtube.com'
        },
        timeout: 15000
      });

      const songs = [];
      const tabs = data?.contents?.tabbedSearchResultsRenderer?.tabs || [];

      for (const tab of tabs) {
        const sections = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        for (const section of sections) {
          const shelf = section?.musicShelfRenderer;
          const items = shelf?.contents || section?.itemSectionRenderer?.contents || [];

          for (const item of items) {
            const r = item?.musicResponsiveListItemRenderer;
            if (!r) continue;

            const cols = r.flexColumns || [];
            const titleRuns = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const title = titleRuns.map(x => x.text).join('');
            const subRuns = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            
            let artist = '';
            let artistId = '';
            let album = '';
            let albumId = '';
            let duration = '';

            for (let i = 0; i < subRuns.length; i++) {
              const run = subRuns[i];
              const text = run.text || '';
              const browseId = run?.navigationEndpoint?.browseEndpoint?.browseId || '';

              if (browseId.startsWith('UC')) {
                artist = text;
                artistId = browseId;
              } else if (browseId.startsWith('MPRE')) {
                album = text;
                albumId = browseId;
              }
            }

            const accLabel = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.accessibility?.accessibilityData?.label || '';
            const durMatch = accLabel.match(/(\d+)\s*(?:menit|min)\s*(?:(\d+)\s*(?:detik|det))?/);
            if (durMatch) {
              duration = durMatch[1] + '.' + (durMatch[2] || '00').padStart(2, '0');
            }
            if (!duration) {
              const allText = subRuns.map(x => x.text).join(' ');
              const m = allText.match(/(\d+)\s*(?:menit|min)/);
              if (m) duration = m[1] + '.00';
            }

            const type = subRuns[0]?.text || '';
            if (type === 'Video') continue;

            const playsRuns = cols[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const plays = playsRuns.map(x => x.text).join('');
            const videoId = r?.playlistItemData?.videoId || '';
            const thumbs = r?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            let thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : '';
            
            if (thumbnail) {
              thumbnail = thumbnail.replace(/=w\d+-h\d+-/g, '=w800-h800-');
            }

            songs.push({
              title,
              videoId,
              thumbnail,
              url: videoId ? `https://music.youtube.com/watch?v=${videoId}` : '',
              artist: artist || (subRuns[1]?.text || ''),
              artistId,
              album: album || '',
              albumId,
              duration,
              plays
            });
          }
        }
      }

      res.json({
        status: true,
        result: {
          query: query,
          total: songs.length,
          songs: songs
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan saat mencari YouTube Music"
      });
    }
  });
};
