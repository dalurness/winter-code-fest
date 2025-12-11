---
descriptions: ["deno"]
---

### 2025 Solution Deno

### Output

```
Total Time: 2803
```

```ts
const EPSILON = 1e-9;

class Elf {
  effeciency: number;
  timeLeftOnPresent: number = 0;
  hasPresent: boolean = false;

  constructor(effeciency: number) {
    this.effeciency = effeciency;
  }

  processPresent() {
    this.timeLeftOnPresent -= this.effeciency;
    if (this.timeLeftOnPresent <= EPSILON) {
      this.hasPresent = false;
    }
  }

  assignPresent(presentTime: number) {
    this.timeLeftOnPresent = presentTime + this.effeciency; // one minute to grab present regardless of efficiency
    this.hasPresent = true;
  }
}

if (import.meta.main) {
  const presents = (await Deno.readTextFile("presents.txt")).split(" ");

  const elves = [new Elf(1.4), new Elf(0.7), new Elf(1.1), new Elf(1.0)];

  let time = 0;
  let elvesStillWorking = true;

  while (presents.length > 0 || elvesStillWorking) {
    elvesStillWorking = false;
    for (const elf of elves) {
      if (!elf.hasPresent && presents.length !== 0) {
        const p = presents.shift();
        elf.assignPresent(Number(p));
        elvesStillWorking = true;
      }
      if (elf.hasPresent) {
        elf.processPresent();
        elvesStillWorking = true;
      }
    }
    if (elvesStillWorking) {
      time++;
    }
  }
  console.log(time);
}
```
