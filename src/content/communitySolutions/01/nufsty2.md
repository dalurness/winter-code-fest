---
descriptions: ["ts", "node"]
---

# 2026 Solution Typescript

<details>
<summary>Show Typescript Solution</summary>

```ts
import { readFile } from "node:fs/promises";

// Helper function to read letters.txt
async function readTextFile(filePath: string): Promise<string> {
  try {
    const content: string = await readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
}

function countLettersByCountry(letters: string): Map<string, number> {
  var countryCodeToLetterCount: Map<string, number> = new Map();
  const lettersList: number[] = letters.trim().split(" ");

  for (const countryCode of lettersList) {
    const countryCount: number = countryCodeToLetterCount.get(countryCode);
    if (countryCount) {
      countryCodeToLetterCount.set(countryCode, countryCount + 1);
    } else {
      countryCodeToLetterCount.set(countryCode, 1);
    }
  }

  return new Map(
    [...countryCodeToLetterCount.entries()].sort((a, b) => a[0] - b[0])
  );
}

function printMap(map: Map<string, number>): void {
  map.forEach((value: string, key: number) => {
    console.log(`${key}: ${value}`);
  });
}

async function main(): void {
  const letters: string = await readTextFile("../days/01/letters.txt");
  printMap(countLettersByCountry(letters));
}

main();
```
