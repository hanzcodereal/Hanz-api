const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function getBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}

function drawRoundedImg(ctx, img, x, y, size, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    ctx.lineTo(x + radius, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

async function loadAssets() {
    const fontBoldPath = path.join(__dirname, 'RobotoBold.ttf');
    const fontRegularPath = path.join(__dirname, 'RobotoRegular.ttf');

    if (!fs.existsSync(fontBoldPath)) {
        const response = await axios.get('https://uploader.zenzxz.dpdns.org/uploads/1775138842054.ttf', { responseType: 'arraybuffer' });
        fs.writeFileSync(fontBoldPath, Buffer.from(response.data));
    }

    if (!fs.existsSync(fontRegularPath)) {
        const response = await axios.get('https://uploader.zenzxz.dpdns.org/uploads/1775138866574.ttf', { responseType: 'arraybuffer' });
        fs.writeFileSync(fontRegularPath, Buffer.from(response.data));
    }

    GlobalFonts.registerFromPath(fontRegularPath, 'Roboto');
    GlobalFonts.registerFromPath(fontBoldPath, 'Roboto');
}

async function fakeAfinitasML(inputImg) {
    await loadAssets();

    const background = 'https://uploader.zenzxz.dpdns.org/uploads/1775228325905.jpeg';
    const border = 'https://uploader.zenzxz.dpdns.org/uploads/1775232236060.png';

    const [bgBuffer, inputBuffer, borderBuffer] = await Promise.all([
        getBuffer(background),
        getBuffer(inputImg),
        getBuffer(border)
    ]);

    const bg = await loadImage(bgBuffer);
    const inputImage = await loadImage(inputBuffer);
    const borderImage = await loadImage(borderBuffer);

    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(bg, 0, 0, bg.width, bg.height);

    const ppSize = 236;
    const ppX = 235;
    const ppY = 500;
    const ppRadius = 40;

    const bdrSize = 320;
    const bdrX = 195;
    const bdrY = 460;

    drawRoundedImg(ctx, inputImage, ppX, ppY, ppSize, ppRadius);
    ctx.drawImage(borderImage, bdrX, bdrY, bdrSize, bdrSize);

    return canvas.toBuffer('image/png');
}

module.exports = (app) => {
    app.get('/canvas/fakeafinitasml', async (req, res) => {
        const image = req.query.image || req.body.image;

        if (!image) {
            return res.status(400).json({
                status: false,
                message: "Parameter 'image' diperlukan (URL gambar)"
            });
        }

        try {
            const imageBuffer = await fakeAfinitasML(image);
            
            res.set('Content-Type', 'image/png');
            res.send(imageBuffer);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: error.message || "Terjadi kesalahan saat membuat fake afinitas ML"
            });
        }
    });
};