package main

import (
	"fmt"
	"os"
	"runtime"
)

func main() {
	name := "Winter Code Fest"
	if len(os.Args) > 1 {
		name = os.Args[1]
	}

	for i := 1; i <= 3; i++ {
		fmt.Printf("%d: Hello, %s!\n", i, name)
	}
	fmt.Println(runtime.Version())
}
