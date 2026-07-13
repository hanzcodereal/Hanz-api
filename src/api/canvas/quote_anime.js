const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');

const ANIME_BG_URL = 'https://raw.githubusercontent.com/hanzcodereal/quote-generator/main/backgroun_anime.jpg';

async function generateQuoteAnime(quoteText, creatorName) {
    const response = await axios.get(ANIME_BG_URL, { responseType: 'arraybuffer' });
    const bgBuffer = Buffer.from(response.data);
    const bgImage = await loadImage(bgBuffer);
    
    const canvas = createCanvas(1280, 946);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(bgImage, 0, 0, 1280, 946);
    
    const textX = 105;
    const maxWidth = 500;
    const fontSize = 54;
    const gapY = 45;
    const colorText = "#004d26";
    const colorNama = "#2e7d32";
    
    ctx.font = "bold " + fontSize + "px sans-serif";
    const lineHeight = fontSize * 1.3;
    
    function wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
    
    const lines = wrapText(quoteText, maxWidth);
    const availableHeight = 850 - 100;
    const totalTextHeight = lines.length * lineHeight;
    const totalCombinedHeight = totalTextHeight + (creatorName ? (gapY + 34) : 0);
    let autoTextY = 100 + ((availableHeight - totalCombinedHeight) / 2);
    if (autoTextY < 100) autoTextY = 100;
    
    ctx.fillStyle = colorText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), textX, autoTextY + (i * lineHeight));
    }
    
    if (creatorName) {
        const autoUsernameY = autoTextY + totalTextHeight + gapY;
        const autoUsernameX = (textX + (maxWidth / 3)) - (maxWidth * 0.03);
        ctx.fillStyle = colorNama;
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText("— " + creatorName, autoUsernameX, autoUsernameY);
    }
    
    return canvas.toBuffer('image/png');
}

module.exports = (app) => {
    app.get('/meker/quote/anime', async (req, res) => {
        const quote = req.query.quote || req.body.quote;
        const creator = req.query.creator || req.body.creator || 'Hanz';

        if (!quote) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'quote' diperlukan"
            });
        }

        try {
            const imageBuffer = await generateQuoteAnime(quote, creator);
            
            res.set('Content-Type', 'image/png');
            res.send(imageBuffer);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan saat membuat quote anime"
            });
        }
    });
};
