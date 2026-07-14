const axios = require('axios');

module.exports = (app) => {
    app.get('/download/tiktok', async (req, res) => {
        const url = req.query.url;

        if (!url) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'url' diperlukan."
            });
        }

        try {
            const params = new URLSearchParams();
            params.append('url', url);
            params.append('hd', '1');

            const response = await axios.post('https://www.tikwm.com/api/', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const resData = response.data;

            if (resData.code !== 0 || !resData.data) {
                return res.status(400).json({
                    status: false,
                    message: "Gagal mengambil data. Pastikan URL valid, akun tidak privat, dan coba lagi."
                });
            }

            const data = resData.data;

            const result = {
                username: data.author.unique_id,
                nickname: data.author.nickname,
                avatar: data.author.avatar,
                description: data.title || "Tidak ada deskripsi.",
                thumbnail: data.cover,
                stats: {
                    likes: data.digg_count || 0,
                    comments: data.comment_count || 0,
                    shares: data.share_count || 0,
                    views: data.play_count || 0
                },
                type: data.images && data.images.length > 0 ? 'photo' : 'video',
                downloads: {
                    nowm: data.play ? [data.play] : [],
                    wm: data.wmplay ? [data.wmplay] : []
                },
                mp3: data.music ? [data.music] : [],
                slides: data.images ? data.images.map((img, index) => ({
                    url: img,
                    index: index + 1
                })) : []
            };

            res.json({
                status: true,
                result: result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan saat mendownload TikTok"
            });
        }
    });
};
