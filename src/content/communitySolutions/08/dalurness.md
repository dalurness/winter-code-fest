---
descriptions: ["go"]
---

## 2026

<details>
<summary>Show Go Solution</summary>

```go
package main

import (
	"fmt"
	"os"
	"log"
)

func main() {
	content, err := os.ReadFile("/workspace/days/08/kisses.txt")
	if err != nil {
		log.Fatalf("Failed to open file: %w", err)
	}

	letters := string(content)

	longestStart := 0
	longestEnd := 0
	sptr := 0
	eptr := 0
	inGroup := make(map[byte]int)

	for eptr < len(letters) {
		letter := letters[eptr]

		// check if new letter is unique to group
		i, ok := inGroup[letter]
		if !ok {
			inGroup[letter] = eptr
			if  eptr - sptr > longestEnd - longestStart {
				longestStart = sptr
				longestEnd = eptr
			}
			eptr += 1
			continue
		} else {
			// not unique to group. move up

			// need to remove all values from map where not relevant
			for j := sptr; j < i + 1; j++ {
				delete(inGroup, letters[j])
			}

			// set start to one past the existing duplicate
			sptr = i + 1
			// set duplicate in map
			inGroup[letter] = eptr
		}
		eptr += 1
	}

	fmt.Printf("[ %d, %d ]\n", longestStart, longestEnd)
}
```

</details>
