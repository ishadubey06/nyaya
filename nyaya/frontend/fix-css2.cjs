const fs = require('fs');
// Read as a buffer just to be safe
const buffer = fs.readFileSync('src/App.css');
const content = buffer.toString('utf8');

const lines = content.split('\n');

// Find the line where the weird text starts by checking if a line contains a lot of null bytes or looks weird
let cutIndex = lines.length;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('F\x00o\x00r\x00m') || lines[i].includes('F o r m') || lines[i].includes('B o o k m a r k l e t')) {
    cutIndex = i;
    break;
  }
}

// If we can't find it by string, just blindly cut at 2070 if the file has > 2070 lines
if (cutIndex === lines.length && lines.length > 2070) {
    cutIndex = 2070;
}

let newContent = lines.slice(0, cutIndex).join('\n');

newContent += `\n\n/* Form Filler & Bookmarklet */
.form-filler-layout {
    animation: fadeIn 0.3s ease;
}

.bookmarklet-btn {
    transition: transform 0.2s, box-shadow 0.2s;
}

.bookmarklet-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6) !important;
}

.bookmarklet-btn:active {
    transform: translateY(0);
}
`;

fs.writeFileSync('src/App.css', newContent);
console.log("Fixed App.css (v3)! Cut at line " + cutIndex);
