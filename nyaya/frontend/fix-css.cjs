const fs = require('fs');
let content = fs.readFileSync('src/App.css', 'utf8');

// The bad CSS is at the very end. Let's just find the index of "F o r m" or "/ *" and slice there.
const badStringIndex = content.lastIndexOf('/ *   F o r m');
if (badStringIndex !== -1) {
  content = content.slice(0, badStringIndex);
} else {
  // Try another approach: split by lines, find the line with "F o r m   F i l l e r", and cut off from there.
  const lines = content.split('\n');
  let cutIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].replace(/\s/g, '').includes('FormFiller')) {
      cutIndex = i;
      break;
    }
  }
  if (cutIndex !== -1) {
    // Cut off everything from that line onwards
    content = lines.slice(0, cutIndex).join('\n');
  } else {
    console.log("Still couldn't find it!");
  }
}

// Append the fixed CSS
content += `\n\n/* Form Filler & Bookmarklet */
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

fs.writeFileSync('src/App.css', content);
console.log("Fixed App.css (v2)!");
