const fs = require('fs');
const code = fs.readFileSync('src/pages/index.astro', 'utf-8');

let stack = [];
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    let char = line[j];
    if (char === '(' || char === '{' || char === '[') {
      stack.push({ char, line: i + 1, col: j + 1 });
    } else if (char === ')' || char === '}' || char === ']') {
      if (stack.length === 0) {
        console.log(`Unmatched ${char} at line ${i + 1}:${j + 1}`);
      } else {
        let last = stack.pop();
        let expected = last.char === '(' ? ')' : last.char === '{' ? '}' : ']';
        if (char !== expected) {
          console.log(`Mismatch at line ${i + 1}:${j + 1}. Expected ${expected} (from ${last.line}:${last.col}) but found ${char}`);
          process.exit(1);
        }
      }
    }
  }
}
if (stack.length > 0) {
  console.log("Unclosed brackets:");
  console.log(stack);
} else {
  console.log("All brackets matched!");
}
