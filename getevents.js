const http = require('http');
const fs = require('fs');
const path = require('path');
let result = [];
const eventNames = {};
const csvData = {};

const directoryPath = path.join(__dirname, 'Running Events');

function getContentType(filePath) {
  const extname = path.extname(filePath);
  switch (extname) {
    case '.csv':
      return 'text/csv';
    case '.lif':
      return 'text/plain'; // Change the content type for .lif files to 'text/plain'
    case '.lff':
      return 'text/plain'; // Change the content type for .lff files to 'text/plain'
    default:
      return 'application/octet-stream';
  }
}

function onFileChange(event, filename) {
  const filePath = path.join(directoryPath, filename);

  if (path.extname(filename) === '.lff') {
    console.log(`File ${filePath} has been modified`);
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error) {
        console.error(error);
      } else {
        const parsedFilename = path.parse(filename).base;

        csvData[filename] = data;
        console.log(data);
        const arr = data.split(',');
        const eventTitle = arr[3];  
        console.log(eventTitle);
        
        // Look for which event the file represents
        const lines = data.split('\n');
        const firstLine = lines[0];
        const wordsToTest = ['shot', 'discus', 'javelin', 'pole vault', 'hammer', 'long jump', 'triple jump', 'high jump'];
        let foundWords = [];
        for (const word of wordsToTest) {
          if (firstLine.toLowerCase().includes(word.toLowerCase())) {
              finalword = word.replace(/\s/g, "");
            foundWords.push(finalword);
          }
        }
        if (foundWords.length > 0) {
          for (const word of foundWords) {
            if (!eventNames[word]) {
              eventNames[word] = [];
            }
            eventNames[word].push(parsedFilename);
          }
        } else {
          console.log('No matching word was found in the first line');
        }

        console.log(eventNames);
      }
    });
  }
}

// Loop through all the files in the directory and listen for changes
fs.readdir(directoryPath, (error, files) => {
  if (error) {
    console.error(error);
  } else {
    // Call onFileChange function for each file in the directory
    files.forEach((filename) => {
      const filePath = path.join(__dirname, 'Running Events', filename);
      onFileChange(null, filename);

      if (path.extname(filename) === '.lff') {
        console.log(`Watching file: ${filename}`);
        fs.watch(filePath, onFileChange);
      }
    });
  }
});

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });

// Middleware function to add CORS headers to the response
function addCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function searchFiles(searchTerm) {
  result = [];
  const results = eventNames;
  return eventNames;
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    const url = new URL(`http://localhost${message}`);
    message = message.toString();
    console.log('Message received:', message);
  
    url.pathname === `/getevents.js/search?term=${message}`;
    console.log("searchterm: " + message);

    const results = await searchFiles(message);
    ws.send(JSON.stringify(results));
    console.log("Data Sent");

  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
