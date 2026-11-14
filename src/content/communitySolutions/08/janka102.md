---
descriptions: ["go"]
---

## 2026

```go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"slices"
	// "strings"
)

func main() {
	file, err := os.Open("/workspace/days/08/kisses.txt")
	if err != nil {
		log.Fatalf("%v", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	// scanner = bufio.NewScanner(strings.NewReader("RGGBPRPGRBBRWOPRRPGRBRW"))

	scanner.Split(bufio.ScanRunes)

	start, line := 0, []rune{}
	bestStart, bestLine := start, line

	for scanner.Scan() {
		k := []rune(scanner.Text())[0]
		found := slices.Index(line, k)

		if found >= 0 {
			if len(line) > len(bestLine) {
				bestStart, bestLine = start, line
				fmt.Printf("[%d, %d] %s\n", bestStart, bestStart+len(bestLine)-1, string(bestLine))
			}

			start += found + 1
			line = line[found+1:]
		}

		line = append(line, k)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("%v", err)
	}

	// if the best is at the very end, then we need to check again
	if len(line) > len(bestLine) {
		bestStart, bestLine = start, line
	}

	fmt.Printf("[%d, %d] %s\n", bestStart, bestStart+len(bestLine)-1, string(bestLine))
}
```
