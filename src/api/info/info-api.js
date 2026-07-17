const fs = require('fs');
const path = require('path');

module.exports = (app) => {
  app.get('/info/info-api', async (req, res) => {
    try {
      const apiFolder = path.join(__dirname, '../api');
      const categories = {};
      let totalApis = 0;
      let totalWorking = 0;
      let totalError = 0;
      const allApis = [];
      const errorApis = [];

      if (fs.existsSync(apiFolder)) {
        const subfolders = fs.readdirSync(apiFolder);

        for (const subfolder of subfolders) {
          const subfolderPath = path.join(apiFolder, subfolder);
          if (fs.statSync(subfolderPath).isDirectory()) {
            const files = fs.readdirSync(subfolderPath).filter(file => path.extname(file) === '.js');
            categories[subfolder] = [];
            
            for (const file of files) {
              const filePath = path.join(subfolderPath, file);
              const fileName = path.basename(file, '.js');
              const fileInfo = {
                name: fileName,
                path: `/${subfolder}/${fileName}`,
                status: 'unknown'
              };

              try {
                require(filePath);
                fileInfo.status = 'working';
                totalWorking++;
              } catch (error) {
                fileInfo.status = 'error';
                fileInfo.error = error.message;
                totalError++;
                errorApis.push(fileInfo);
              }

              categories[subfolder].push(fileInfo);
              allApis.push(fileInfo);
              totalApis++;
            }
          }
        }
      }

      res.json({
        status: true,
        data: {
          total: {
            all: totalApis,
            working: totalWorking,
            error: totalError
          },
          categories: categories,
          error_apis: errorApis,
          all_apis: allApis
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        message: error.message || "Terjadi kesalahan"
      });
    }
  });
};
