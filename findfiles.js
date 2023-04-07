const fs = require('fs');
const path = require('path');

// Define the directory to watch
const directoryPath = '/Users/ih-admin/Documents/biomech/scoreboards/Running Events';

// Watch the directory for changes
fs.watch(directoryPath, (eventType, filename) => {
  // If a new file is added to the directory
  if (eventType === 'rename' && filename) {
    // Get the full path of the new file
    const filePath = path.join(directoryPath, filename);

    // Read the contents of the new file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading file: ${err}`);
      } else {
        console.log(`New file ${filename} arrived with contents: ${data}`);
        const extension = path.extname(filename);
        console.log('Extension: ' + extension);
        if (extension=='.lif') {
          const WebSocket = require('ws');

          // Create a WebSocket client
          const ws = new WebSocket('ws://localhost:1515');

          // When the WebSocket connection is opened, send data
          ws.on('open', function() {
            const data = {
              message: 'Hello, WebSocket!'
            };
            ws.send(JSON.stringify(data));
          });

          // Log any errors that occur
          ws.on('error', function(error) {
            console.error(error);
          });

          // When the WebSocket connection is closed, log a message
          ws.on('close', function() {
            console.log('WebSocket connection closed');
          });
        }
      }
    });
  }
});