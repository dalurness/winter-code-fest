---
descriptions: ["go"]
---

## 2026

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

var fileNames = []string{"input1.txt", "input2.txt", "input3.txt", "input4.txt"}

func decompress(filePath string) (result string, err error) {
	file, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(file)
	if err != nil {
		return
	}

	fileSplit := bytes.SplitN(raw, []byte("\n\n"), 2)
	if len(fileSplit) != 2 {
		err = fmt.Errorf("Invalid parts")
		return
	}

	rules := make([][2][]byte, 0)
	for line := range bytes.SplitSeq(fileSplit[0], []byte("\n")) {
		lineSplit := bytes.SplitN(line, []byte(" => "), 2)
		if len(lineSplit) != 2 {
			err = fmt.Errorf("Invalid rule")
			return
		}

		old := lineSplit[0]
		var new string
		err = json.Unmarshal(lineSplit[1], &new)
		if err != nil {
			return
		}

		rules = append(rules, [2][]byte{old, []byte(new)})
	}

	body := fileSplit[1]
	for i := len(rules) - 1; i >= 0; i-- {
		old, new := rules[i][0], rules[i][1]
		body = bytes.ReplaceAll(body, old, new)
	}

	result = string(body)
	return
}

func main() {
	for _, file := range fileNames {
		fmt.Printf("%s\n", file)
		result, err := decompress("/workspace/days/06/" + file)
		if err != nil {
			fmt.Printf("err %s\n", err)
		} else {
			fmt.Printf("%s\n", result)
		}
	}
}
```
