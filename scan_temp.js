const fs = require('fs');
const path = require('path');

function findFuncs(dir) {
  const results = [];
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return results; }
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules','dist','.git'].includes(item.name)) {
      results.push(...findFuncs(fullPath));
    } else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        let funcStart = -1, funcName = '', braceDepth = 0, inFunc = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>)/);
          if (funcMatch && !inFunc) {
            funcName = funcMatch[1] || funcMatch[2];
            funcStart = i;
            inFunc = true;
            braceDepth = 0;
          }
          if (inFunc) {
            braceDepth += (line.match(/{/g) || []).length;
            braceDepth -= (line.match(/}/g) || []).length;
            if (braceDepth <= 0 && i > funcStart) {
              const len = i - funcStart + 1;
              if (len > 50) {
                results.push({ file: fullPath.replace(/\/g, '/'), name: funcName, start: funcStart + 1, end: i + 1, length: len });
              }
              inFunc = false;
            }
          }
        }
      } catch(e) {}
    }
  }
  return results;
}

let all = [];
for (const d of ['server/src', 'shared/types']) {
  all.push(...findFuncs(d));
}
all.sort((a, b) => b.length - a.length);
all.slice(0, 40).forEach(f => {
  console.log('LONG_FUNC|' + f.file + '|L' + f.start + '-' + f.end + '|' + f.name + '|' + f.length + 'lines');
});
