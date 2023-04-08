const fs = require('fs');
const csv = require('csv-parser');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 1516 });

const folderPath = '/Users/ih-admin/Documents/biomech/scoreboards/Running Events'; // replace this with the path to the folder you want to watch

fs.watchFile(folderPath, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs) {
    fs.readdir(folderPath, (err, files) => {
      if (err) throw err;
      files.forEach((filename) => {
        let i = 0;
        let body = new Object();
        body.results = [];
        const filePath = `${folderPath}/${filename}`;
        fs.createReadStream(filePath)
          .pipe(csv({ headers: false })) // Pass headers: false to treat first row as data
          .on('data', (row) => {
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                data = row;
                if (data["5"]="") {
                  body.event = data["3"];
                  body.round = data["2"];
                  console.log("Event: " + body.event);
                  client.send(JSON.stringify(body.event));
                } else {
                  body.results[i] = { name: data["3"] };
                  body.results[i] = { mark: data["6"] };
                  client.send(JSON.stringify(body.results[i].name));
                  client.send(JSON.stringify(body.results[i].mark));
                  i = i + 1;
                }
                
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
