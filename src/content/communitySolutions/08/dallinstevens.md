---
descriptions: ["deno"]
---

### 2025 Solution Deno

### Output

```
1: Solutions - 1
2: Solutions - 1
3: Solutions - 3
4: Solutions - 4
5: Solutions - 7
6: Solutions - 14
7: Solutions - 23
8: Solutions - 39
9: Solutions - 71
10: Solutions - 123
11: Solutions - 211
12: Solutions - 372
13: Solutions - 647
14: Solutions - 1123
15: Solutions - 1967
16: Solutions - 3426
17: Solutions - 5961
18: Solutions - 10405
19: Solutions - 18134
20: Solutions - 31593
21: Solutions - 55094
22: Solutions - 96030
23: Solutions - 167357
24: Solutions - 291758
25: Solutions - 508564
26: Solutions - 886414
27: Solutions - 1545162
28: Solutions - 2693373
29: Solutions - 4694687
30: Solutions - 8183372
31: Solutions - 14264404
```

```ts
class TubeSleigh {
  private static memorizedSolutions: Map<string, number[][]> = new Map();
  private sequences: Generator<number[]>;
  private sleighLength: number;

  constructor(sleighLength: number) {
    this.sleighLength = sleighLength;
    this.sequences = this.solve(sleighLength, undefined);
  }

  public *solve(
    n: number,
    prev: number | undefined = undefined,
    prefix: number[] = []
  ): Generator<number[]> {
    if (n === 0) {
      yield prefix;
      return;
    }

    for (let i = 1; i <= n && i < 10; i++) {
      if (i !== prev) {
        for (const seq of this.solve(n - i, i, [...prefix, i])) {
          yield seq;
        }
      }
    }
  }

  public printSeq() {
    for (const seq of this.sequences) {
      console.log(seq.join(", "));
    }
  }

  public printSolutionsCount() {
    let count = 0;
    for (const _ of this.sequences) {
      count++;
    }
    console.log(`${this.sleighLength}: Solutions - ${count}`);
  }
}

if (import.meta.main) {
  for (let i = 1; i <= 31; i++) {
    const myTubeSleigh = new TubeSleigh(i);
    myTubeSleigh.printSolutionsCount();
  }
}
```
