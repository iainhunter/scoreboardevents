const fs = require('fs');
const csv = require('csv-parser');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 1515 });

const folderPath = '/Users/ih-admin/Documents/biomech/scoreboards/Running Events'; // replace this with the path to the folder you want to watch

fs.watchFile(folderPath, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs) {
    console.log("New file");
    fs.readdir(folderPath, (err, files) => {
      if (err) throw err;
      files.forEach((filename) => {
        const filePath = `${folderPath}/${filename}`;
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(row));
              }
            });
          })
          .on('end', () => {
            console.log(`File ${filename} processed`);
          });
      });
    });
  }
});

console.log(`Watching folder ${folderPath} for changes...`);
