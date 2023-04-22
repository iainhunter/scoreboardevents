// Define the input data 
const data = `17,1,1,Boy's High Jump,Metric,SH,1.58,1.63,1.68,1.73,1.78,1.83,1.88,1.93,EH
17,0,4,17,Bush,Henry,UNAT,O,O,XXX
19,0,21,19,Scott,Brian,RIVT,XO,O,XXX
19,0,11,19,Calzadilla,Carlos,MMTN,XO,O,XXX
21,0,36,21,Grover,Spencer,FRMG,XXO,O,XXX
22,0,25,22,Johnson,Luke,UNAT,PPP,XO,XXX
22,0,28,22,Heywood,Jake,MORG,O,XO,XXX
22,0,10,22,Metcalf,Alex,RIVT,O,XO,XXX
22,0,3,22,Hess,Spencer,FRMG,PPP,XO,XXX
26,0,32,26,McQuivey,Matthew,RIVT,XO,XO,XXX
1,0,39,1,Smith,Cameron,DELT,PPP,O,O,XO,O,O,XO,XXX
2,0,42,2,Jewkes,Traxton,CARB,O,XO,O,O,XO,O,XO,XXX
3,0,12,3,Egbert,Brevin,UNAT,PPP,PPP,O,O,O,O,XXX
3,0,1,3,Smith,Brayker,PRST,PPP,PPP,O,O,O,O,XXX
3,0,27,3,Eggleston,Griffin,MMTN,O,O,O,O,O,O,XXX
6,0,35,6,Robinson,Erick,SSEV,PPP,O,XO,O,O,O,XXX
7,0,40,7,Diaz,Jyson,DELT,PPP,O,O,O,O,XXX
8,0,19,8,Borsella,Kai,UNAT,O,O,XO,O,XO,XXX
9,0,13,9,Trickett,Gavin,RIVT,O,O,XXO,PPP,XO,XXX
10,0,41,10,Brooks,Cole,WXH,PPP,PPP,O,XO,XXO,XXX
10,0,18,10,Sutton,Porter,UNAT,O,O,XO,O,XXO,XXX
12,0,23,12,Bourgeous,David,BRRV,PPP,PPP,O,O,XXX
13,0,5,13,White,Teige,BRRV,O,O,O,XXO,XXX
14,0,37,14,Schlenz,Colten,HRMN,O,O,O,XXX
15,0,7,15,Geppelt,Matson,WXH,PPP,O,XXO,XXX
15,0,31,15,Quiring,Coleson,WLAK,O,O,XXO,XXX
17,0,6,17,Prince,Treyson,UNAT,O,O,XXX
27,0,20,27,Anderson,Devon,SPVL,XXO,XO,XXX
28,0,29,28,Peterson,Gabriel,STVL,O,XXX
28,0,24,28,Enquist,Parker,RIVT,O,XXX
30,0,15,30,Snell,Gavin,RIVT,XO,XXX
30,0,8,30,Jenning,Connor,SPFK,XO,XXX
0,0,2,0,Southwick,Jack,STVL,XXX
0,0,9,0,Timpson,Jonathan,WTRC,XXX
0,0,34,0,Jewkes,Jaxson,CARB,XXX
0,0,17,0,Tarma,Helaman,LAYT,PPP,XXX
0,0,26,0,Taggart,Emerson,MTNV,XXX
0,0,16,0,Marchant,Ty,RIVT,XXX
0,0,33,0,Densley,Daniel,MTNV,XXX
0,0,14,0,Leonard,Joshua,SPFK,XXX
0,0,30,0,Chen,Elvis,EVAN,XXX`;

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

console.log(sortedDataArray);