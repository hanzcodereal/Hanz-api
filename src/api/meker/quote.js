const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

const PADDING_RATIO = 0.15;
const FOOTER_RATIO = 0.12;
const QUOTE_COLOR = '#1a1a1a';
const FONT_SIZE_MAX = 60;
const FONT_SIZE_MIN = 20;
const FONT_URL = 'https://raw.githubusercontent.com/hanzcodereal/quote-generator/main/CrimsonText-Regular.ttf';
const BG_URL = 'https://raw.githubusercontent.com/hanzcodereal/quote-generator/main/background.jpeg';

async function downloadFont() {
    const response = await axios.get(FONT_URL, { responseType: 'arraybuffer' });
    const fontPath = path.join(__dirname, 'temp_font.ttf');
    fs.writeFileSync(fontPath, response.data);
    return fontPath;
}

function calcFontSize(ctx, text, maxWidth, maxHeight, fontName) {
    const words = text.split(' ');
    for (let size = FONT_SIZE_MAX; size >= FONT_SIZE_MIN; size -= 1) {
        ctx.font = size + 'px ' + fontName;
        const lineHeight = size * 1.35;
        let lines = 0;
        let currentLine = [];
        words.forEach(function(word) {
            const testLine = currentLine.concat(word).join(' ').replace(/[\[\]]/g, '');
            if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                lines++;
                currentLine = [word];
            } else {
                currentLine.push(word);
            }
        });
        lines++;
        if (lines * lineHeight <= maxHeight) return size;
    }
    return FONT_SIZE_MIN;
}

function drawTextJustified(ctx, text, centerX, centerY, maxWidth, fontSize) {
    const lineHeight = fontSize * 1.35;
    const words = text.split(' ');
    const lines = [];
    let currentLine = [];
    words.forEach(function(word) {
        const testLine = currentLine.concat(word).join(' ').replace(/[\[\]]/g, '');
        if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [word];
        } else {
            currentLine.push(word);
        }
    });
    lines.push(currentLine);
    let startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach(function(line, index) {
        const isLastLine = index === lines.length - 1;
        const lineParts = line.map(function(word) {
            const match = word.match(/^\[(.+?)\]([^\w]*)$/);
            if (match) {
                const highlighted = match[1];
                const trailing = match[2];
                const hlWidth = ctx.measureText(highlighted).width;
                const trailWidth = ctx.measureText(trailing).width;
                return {
                    content: highlighted,
                    trailing: trailing,
                    isHighlight: true,
                    width: hlWidth + trailWidth,
                    hlWidth: hlWidth
                };
            }
            return {
                content: word,
                trailing: '',
                isHighlight: false,
                width: ctx.measureText(word).width,
                hlWidth: 0
            };
        });
        const totalWordsWidth = lineParts.reduce(function(sum, p) { return sum + p.width; }, 0);
        let currentX, spaceWidth;
        if (!isLastLine && line.length > 1) {
            spaceWidth = (maxWidth - totalWordsWidth) / (line.length - 1);
            currentX = centerX - maxWidth / 2;
        } else {
            const standardSpace = ctx.measureText(' ').width;
            spaceWidth = standardSpace;
            currentX = centerX - (totalWordsWidth + standardSpace * (line.length - 1)) / 2;
        }
        lineParts.forEach(function(part) {
            if (part.isHighlight) {
                ctx.fillStyle = 'rgba(212, 225, 87, 0.85)';
                ctx.fillRect(currentX, startY - fontSize * 0.45, part.hlWidth, fontSize * 0.95);
            }
            ctx.fillStyle = QUOTE_COLOR;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            ctx.fillText(part.content, currentX, startY);
            if (part.trailing) {
                ctx.fillText(part.trailing, currentX + part.hlWidth, startY);
            }
            currentX += part.width + spaceWidth;
        });
        startY += lineHeight;
    });
}

async function generateQuote(quoteText, creatorName) {
    const fontPath = await downloadFont();
    registerFont(fontPath, { family: 'CrimsonText' });
    
    const response = await axios.get(BG_URL, { responseType: 'arraybuffer' });
    const bgBuffer = Buffer.from(response.data);
    const bgImage = await loadImage(bgBuffer);
    
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(bgImage, 0, 0);
    
    const padding = canvas.width * PADDING_RATIO;
    const footerHeight = canvas.height * FOOTER_RATIO;
    const centerX = canvas.width / 2;
    const maxWidth = canvas.width - padding * 2;
    const quoteAreaTop = padding;
    const quoteAreaHeight = canvas.height - footerHeight - quoteAreaTop;
    const quoteAreaCenterY = quoteAreaTop + quoteAreaHeight / 2;
    
    const fontSize = calcFontSize(ctx, quoteText, maxWidth, quoteAreaHeight, 'CrimsonText');
    ctx.font = fontSize + 'px CrimsonText';
    drawTextJustified(ctx, quoteText, centerX, quoteAreaCenterY, maxWidth, fontSize);
    
    ctx.font = '26px CrimsonText';
    ctx.fillStyle = QUOTE_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(creatorName, centerX, canvas.height - footerHeight / 2);
    
    fs.unlinkSync(fontPath);
    
    return canvas.toBuffer('image/jpeg', { quality: 0.92 });
}

module.exports = (app) => {
    app.get('/meker/quote', async (req, res) => {
        const quote = req.query.quote || req.body.quote;
        const creator = req.query.creator || req.body.creator || 'Hanz';

        if (!quote) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'quote' diperlukan"
            });
        }

        try {
            const imageBuffer = await generateQuote(quote, creator);
            
            res.set('Content-Type', 'image/jpeg');
            res.send(imageBuffer);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan saat membuat quote"
            });
        }
    });
};
