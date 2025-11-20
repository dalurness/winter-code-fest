---
descriptions: ["deno"]
---

### 2025 Solution Deno

```ts
class LetterCounter {
  private counts: Map<string, number>;

  constructor() {
    this.counts = new Map<string, number>();
  }

  public async processFile(filename: string): Promise<void> {
    const file = await Deno.open(filename);
    const buffer = new Uint8Array(1024);

    let leftover = "";
    let bytesRead: number | null;

    while ((bytesRead = await file.read(buffer)) !== null) {
      const chunk =
        leftover + new TextDecoder().decode(buffer.subarray(0, bytesRead));
      leftover = this.processChunk(chunk);
    }
  }

  public printCounts(): void {
    const sortedCounts = Array.from(this.counts.entries()).sort(
      ([aKey], [bKey]) => {
        return aKey.localeCompare(bKey, undefined, { numeric: true });
      }
    );

    for (const [letter, count] of sortedCounts) {
      console.log(`${letter}: ${count}`);
    }
  }

  private processChunk(chunk: string): string {
    const letters = chunk.split(/\s+/);
    const leftover = letters.pop() || "";
    for (const letter of letters) {
      this.addToCount(letter);
    }
    return leftover;
  }

  private addToCount(letter: string): void {
    const currentCount = this.counts.get(letter) || 0;
    this.counts.set(letter, currentCount + 1);
  }
}

if (import.meta.main) {
  const file = "letters_challenge.txt";

  const myLetterCounter = new LetterCounter();

  await myLetterCounter.processFile(file);

  myLetterCounter.printCounts();
}
```
