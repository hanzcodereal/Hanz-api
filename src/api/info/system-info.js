const os = require('os');

module.exports = (app) => {
  app.get('/info/system-info', async (req, res) => {
    try {
      const mem = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      };

      const cpus = os.cpus();
      const cpu = {
        model: cpus.length ? cpus[0].model : 'Unknown',
        cores: cpus.length,
        loadavg: os.loadavg()
      };

      const uptime = os.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      const result = {
        status: true,
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        uptime: `${days}d ${hours}h ${minutes}m`,
        cpu: {
          model: cpu.model,
          cores: cpu.cores,
          loadavg: cpu.loadavg
        },
        memory: {
          total: formatBytes(mem.total),
          used: formatBytes(mem.used),
          free: formatBytes(mem.free),
          usedPercent: mem.usedPercent.toFixed(1) + '%'
        },
        network: getNetworkInfo()
      };

      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan"
      });
    }
  });
};

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return 'n/a';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return gb.toFixed(1) + ' GB';
  const mb = bytes / (1024 ** 2);
  return mb.toFixed(0) + ' MB';
}

function getNetworkInfo() {
  const ifaces = os.networkInterfaces();
  const list = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of (addrs || [])) {
      if (!addr.internal) {
        list.push({ name, address: addr.address, family: addr.family });
      }
    }
  }
  return list;
        }
