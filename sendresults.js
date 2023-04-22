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
            res = await scoreVertical(fileList);
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
    message = message.toString()


    console.log(typeof message); 
    console.log("Message: " + message);
    message = "020-1";

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




async function scoreVertical(fileList) {
  console.log('Vertical Jump Score:');
  console.log(fileList);

  const results = await readlff(fileList);
  var data = parselines(results);

  const rows = data.split("\n");
const header = rows[0].split(",");
const heights = header.slice(6, -1);
let Misses = [];

// Loop over each row starting at index 1 to skip the header row
for (let i = 1; i < rows.length; i++) {
  const rowValues = rows[i].split(',');
  let xCount = 0;
  
  // Loop over each value starting at index 7 to count "X"s individually
  for (let j = 7; j < rowValues.length; j++) {
    for (let k = 0; k < rowValues[j].length; k++) {
      if (rowValues[j][k] === 'X') {
        xCount++;
      }
    }
  }
  Misses[i] = xCount;
}

const result = {
  name: header[3],
  metric: header[4],
  heights: {}
};

for (let i = 1; i < rows.length; i++) {
  const cols = rows[i].split(",");
  const name = cols[5] + " " + cols[4];
  const team = cols[6];
  const attempts = cols.slice(6, -1);
  let missesOnPrevHeight = undefined;
  let clearanceOnPrevHeight = undefined;
  let bestClearance = undefined;
  let bestHeight = undefined;
  
  for (let j = heights.length - 1; j >= 0; j--) {
    const height = heights[j];
    if (attempts[j] !== undefined) {
      const clearance = attempts[j];
      const totalMisses = Misses[i];
      if (clearance == "XXO") {
        missesOnPrevHeight = 2;
      } else if (clearance == "XO") {
        missesOnPrevHeight = 1;
      } else if (clearance == "O") {
        missesOnPrevHeight = 0;
        if (bestHeight === undefined || height > bestHeight) {
          bestHeight = height;
        }
      } else {
        missesOnPrevHeight = -1;
      }
      if (bestClearance === undefined || clearance === "O") {
        bestClearance = clearance;
      }
      result.heights[height] = result.heights[height] || [];
      result.heights[height].push({
        name,
        team,
        clearance,
        totalMisses,
        missesOnPrevHeight
      });
      clearanceOnPrevHeight = clearance;
      break; // break out of the loop once the clearance for the current height is added
    }
  }   
}

// sort the heights in ascending order
const sortedHeights = Object.keys(result.heights).sort();

// create a new object with sorted data
const sortedResult = {
  name: result.name,
  metric: result.metric,
  heights: {}
};

sortedHeights.forEach((height) => {
  sortedResult.heights[height] = result.heights[height].map((obj) => {
    return {
      name: obj.name,
      team: obj.team,
      lastclearance: obj.clearance,
      totalMisses: obj.totalMisses,
      missesOnPrevHeight: obj.missesOnPrevHeight,
      bestHeight: height
    };
  });
});

  sortedHeights.forEach((height) => {
    sortedResult.heights[height].forEach((athlete) => {
      if (height == heights[0]) {athlete.bestHeight = "NH"}
else
{
    for (let i = 1; i<heights.length; i++) {
        if (height == heights[i]) {athlete.bestHeight = heights[i-1];}
    }
    }
});
  });

  const sortedDataArray = Object.values(sortedResult.heights).flat();

  function compare(a, b) {
    // First, compare the numeric value of bestHeight
    let aHeight = parseFloat(a.bestHeight);
    let bHeight = parseFloat(b.bestHeight);
  
    if (aHeight > bHeight) {
      return -1;
    }
    if (bHeight > aHeight) {
      return 1;
    }
  
    // If bestHeight is equal, move entries with letters to the bottom
    if (isNaN(aHeight)) {
      return 1;
    }
    if (isNaN(bHeight)) {
      return -1;
    }
  
    // If both have a numeric bestHeight or both have a non-numeric bestHeight, do not change order
    return 0;
  }
  
  sortedDataArray.sort(compare);

// Sort the data array
sortedDataArray.sort((a, b) => {
  // Sort by bestHeight first
  if (a.bestHeight !== b.bestHeight) {
    return b.bestHeight - a.bestHeight;
  }
  // Sort by missesOnPrevHeight second
  if (a.missesOnPrevHeight !== b.missesOnPrevHeight) {
    return a.missesOnPrevHeight - b.missesOnPrevHeight;
  }
  // Sort by totalMisses last
  return a.totalMisses - b.totalMisses;
});

// Assign the places to each athlete
let currentPlace = 1;
let previousAthlete = null;

for (let i = 0; i < sortedDataArray.length; i++) {
  const athlete = sortedDataArray[i];
  let n=0;
  if (previousAthlete !== null && 
      athlete.bestHeight === previousAthlete.bestHeight &&
      athlete.missesOnPrevHeight === previousAthlete.missesOnPrevHeight &&
      athlete.totalMisses === previousAthlete.totalMisses) {
    athlete.place = previousAthlete.place;
    n=n+1;
  } else {
    athlete.place = currentPlace;
    currentPlace++;
  }
  currentPlace = currentPlace + n;
  previousAthlete = athlete;
}
return sortedDataArray;

}