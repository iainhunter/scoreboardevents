const http = require('http');
const fs = require('fs');
const path = require('path');
let result = [];
const eventFilenames = [];
let eventNames = {};
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
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.log('Error getting directory information.');
    } else {
      const filteredFiles = files.filter(file => {
        return path.extname(file) === '.lff';
      });

      filteredFiles.forEach((file) => {
        if (!eventFilenames.includes(file)) {
          eventFilenames.push(file);
        }
      });
    }
  });
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
        fs.watch(filePath, onFileChange);
      }
    });
  }
});

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

// Middleware function to add CORS headers to the response
function addCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readFileAsync(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function readlff(fileList) {
    let res = [];
    for (filename of fileList) {
        try {
            const path = directoryPath + '/' + filename;
            const data = await readFileAsync(path);
            const lines = data.split("\n");
            
            lines.shift(); // remove the first line
            lines.pop(); //remove the last line

            let linesTrimmed = [];
            for (line of lines) {
                linesTrimmed.push(line.slice(0, -1));
            }
            res.push(...linesTrimmed);
          } catch (err) {
            console.error('Error reading file:', err);
          }
    }
    return res;
}

function parselines(lffdata) {
    for (datarow of lffdata) {
        const data = datarow.split(',');
        marks = data.slice(7);
        //  Remove any NaN and the odd elements (wind readings)
        const filteredArr = marks.filter((el, idx) => idx % 2 === 0 && !isNaN(parseFloat(el)));
        const sortedArr = filteredArr.sort((a, b) => b - a);
        result.push(
            {
                name: data[5] + " " + data[4],
                team: data[6],
                result: sortedArr
            }
        )
    }
    return result;

}

async function horizontalJumpScoredList(fileList) {
    console.log('Horizontal Jump Score:');
    console.log(fileList);

    const results = await readlff(fileList);
    var resultarray = parselines(results);
    // Filter out rows that contain "DNS"
    resultarray = resultarray.filter(row => !row.result.includes("DNS"));
    // Sort the array based on the first entry in the "result" array
    resultarray.sort((a, b) => {
        if (a.result.length === 0 && b.result.length === 0) {
          return a.name.localeCompare(b.name);
        } else if (a.result.length === 0) {
          return 1;
        } else if (b.result.length === 0) {
          return -1;
        } else if (b.result[0] === a.result[0]) {
          // if there is a tie, check for the second-best result
          if (b.result.length === 1 && a.result.length > 1) {
            return -1;
          } else if (a.result.length === 1 && b.result.length > 1) {
            return 1;
          } else if (a.result[1] === b.result[1]) {
            return a.name.localeCompare(b.name); // if there is still a tie, sort by name
          } else {
            return b.result[1] - a.result[1]; // otherwise, sort by second-best result
          }
        } else {
          return b.result[0] - a.result[0];
        }
      });
    
      const resultwithplace = [];
    // Add the place property to each object
    for (let i = 0; i < resultarray.length; i++) {
        let place = i + 1;
        if (isNaN(resultarray[i].result[0])) {
          resultarray[i].result[0] = "FOUL"
        }
        let row = {title: "Girl's Long Jump", place: place, lane: 1, name: resultarray[i].name, team: resultarray[i].team, mark: resultarray[i].result[0]};
        resultwithplace.push(row);
    }
    console.log(resultwithplace);
    return resultwithplace;
    

}


// Takes in an array of lif files and returns the results in an object.
async function getResults(fileList, eventName) {

  eventName = "longjump";
    let res;
    switch(eventName) {
        case 'longjump':
            res = await horizontalJumpScoredList(fileList);
            break;
        case 'highjump':
            res = await horizontalJumpScoredList(fileList);
            break;
        default:
            console.log('Event Type hit default.');
    }
    //console.log(res);
    return res;
}

async function searchFiles(searchTerm) {
  result = [];

  console.log("Event Names: " + eventNames[searchTerm]);

  const results = await getResults(eventNames[searchTerm], searchTerm);
  
  return results;
}

  // Function to create the eventNames object
  function createEventNames(searchFor) {
    const matchingFilenames = eventFilenames.filter(filename => filename.includes(searchFor));
    eventNames[searchFor] = matchingFilenames;
  }

  console.log(eventNames);

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    message="019-1";

    createEventNames(message);

    // Regular expression to match two-digit numbers
    const twoDigitNumberRegex = /\b(\d{2})\b/g;
    // Regular expression to match the last number in a string
    const lastNumberRegex = /(\d+)\b/;

    // Replace the first two-digit number with a leading zero if it is less than three digits
    const messageWithLeadingZero = message.replace(twoDigitNumberRegex, (match, p1) => {
      if (p1.length < 3) {
        return "0" + p1;
      } else {
        return match;
      }
    });

    const url = new URL(`http://localhost${message}`);
    message = message.toString();
    console.log('Message received:', message);
  
    url.pathname === `/sendresults.js/search?term=${message}`;
    console.log("searchterm: " + message);

    const results = await searchFiles(message);
    ws.send(JSON.stringify(results));
    console.log("Data Sent");

  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
