---
descriptions: ["deno"]
---

### 2025 Solution Deno

```Deno

import { open } from 'node:fs/promises';

if (import.meta.main) {
  const file = await open("assembly_codes.txt");

  let preValidCounter = 0;
  let postValidCounter = 0;
  let totalAdds = 0;
  let totalRemoves = 0;

  for await (const line of file.readLines()) {
    const [valid] = validateCode(line);
    if (valid) {
      preValidCounter++;
    }

    const [validEndingCode, fixedLine] = fixCode(line);

    if (!validEndingCode) {
      continue;
    }

    const [validAfter, adds, removes] = validateCode(fixedLine);
    if (validAfter) {
      postValidCounter++;
    }
    totalAdds += adds;
    totalRemoves += removes;
  }
  console.log(`Total valid codes to begin with: ${preValidCounter}`);
  console.log(`Total fixed codes: ${postValidCounter - preValidCounter}`);
  console.log(`Total Adds from valid codes: ${totalAdds}`);
  console.log(`Total Removes from valid codes: ${totalRemoves}`);
}

function fixCode(line: string): [boolean, string] { // Returns whether the ending code is valid and the fixed line
  if (line.slice(-1) !== 'P' && line.slice(-2) !== 'C') {
    return [false, line];
  }
  return [true, line.split("").slice(0, -2).join("").replaceAll('C', 'A').replaceAll('P', 'R') + 'CP'];
}

function validateCode(line: string): [boolean, number, number] { // Returns if the code is valid, number of valid adds and number of valid removes
  const lineArray = line.split('');
  const lastChar = lineArray.pop();
  const secondToLastChar = lineArray.pop();

  let adds = 0;
  let removes = 0;

  if (lastChar !== 'P') {
    return [false, 0, 0]; // Don't report counts for invalid codes
  }

  if (secondToLastChar !== 'C') {
    return [false, 0, 0]; // Don't report counts for invalid codes
  }

  let addCounter = 0;
  for (let i = 0; i < lineArray.length; i++) {
    if (line[i] === 'C' || line[i] === 'P') {
      return [false, 0, 0]; // Don't report counts for invalid codes
    }

    if (line[i] === 'A') {
      addCounter++;
      adds++;
    }
    if (line[i] === 'R') {
      if (addCounter === 0) {
        return [false, 0, 0]; // Don't report counts for invalid codes
      }
      removes++;
      addCounter--;
    }
  }
  return [true, adds, removes];
}
```
