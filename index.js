const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 4000;

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use('/src', express.static(path.join(__dirname, 'src')));

const settingsPath = path.join(__dirname, './src/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

let requestLogs = [];
const MAX_LOGS = 100;

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const log = `[${req.method}] [${res.statusCode}] ${req.url}`;
        requestLogs.unshift(log);
        if (requestLogs.length > MAX_LOGS) requestLogs.pop();
    });
    next();
});

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status,
                creator: settings.apiSettings.creator || "Hanz",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

let totalRoutes = 0;
const apiFolder = path.join(__dirname, './src/api');
if (fs.existsSync(apiFolder)) {
    fs.readdirSync(apiFolder).forEach((subfolder) => {
        const subfolderPath = path.join(apiFolder, subfolder);
        if (fs.statSync(subfolderPath).isDirectory()) {
            fs.readdirSync(subfolderPath).forEach((file) => {
                const filePath = path.join(subfolderPath, file);
                if (path.extname(file) === '.js') {
                    try {
                        require(filePath)(app);
                        totalRoutes++;
                        console.log(chalk.bgHex('#FFFF99').hex('#333').bold(` Loaded Route: ${path.basename(file)} `));
                    } catch (err) {
                        console.log(chalk.bgHex('#FF4444').hex('#FFF').bold(` Failed to load: ${path.basename(file)} - ${err.message} `));
                    }
                }
            });
        }
    });
}

console.log(chalk.bgHex('#90EE90').hex('#333').bold(' Load Complete! ✓ '));
console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Total Routes Loaded: ${totalRoutes} `));

app.get('/config', (req, res) => {
    res.json({
        settings: {
            apiName: settings.name || "Hanz Api's",
            description: settings.description || "A free and reliable API service",
            favicon: settings.favicon || "",
            version: settings.version || "v1.0.0"
        }
    });
});

app.get('/stats/data', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const cpuUsage = os.loadavg()[0];

    const memUsed = (usedMem / (1024 * 1024 * 1024)).toFixed(2);
    const memTotal = (totalMem / (1024 * 1024 * 1024)).toFixed(2);
    const memFree = (freeMem / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
        status: true,
        server: {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            node_version: process.version,
            uptime: uptimeStr,
            cpu: {
                model: os.cpus()[0].model,
                cores: os.cpus().length,
                load: (cpuUsage * 10).toFixed(1)
            },
            memory: {
                used: memUsed + ' GB',
                total: memTotal + ' GB',
                free: memFree + ' GB',
                percent: memPercent
            }
        },
        requests: requestLogs.slice(0, 50)
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'leding.html'));
});

app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'index.html'));
});

app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'stats.html'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'script.js'));
});

app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'api-page', 'styles.css'));
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'api-page', '404.html'));
});

app.use((err, req, res) => {
    console.error(err.stack);
    res.status(500).sendFile(path.join(__dirname, 'api-page', '404.html'));
});

app.listen(PORT, () => {
    console.log(chalk.bgHex('#90EE90').hex('#333').bold(` Server is running on port ${PORT} `));
});

module.exports = app;
