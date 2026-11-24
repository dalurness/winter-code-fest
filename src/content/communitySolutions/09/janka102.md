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
	"net/http"
	"unicode/utf8"
)

const santaLetterPage = `<!doctype html>
<html>
<head>
<script>
function onSubmit(e) {
	e.preventDefault();
	const form = e.target;

	const statusEl = document.querySelector("#status");
	statusEl.textContent = "Sending...";

	fetch(form.action, {
		method: form.method,
		body: [
			"Dear Santa,",
			form.body.value.trim(),
			"",
			form.presents.value.trim(),
			"",
			"Thank you!",
			form.name.value.trim(),
		].join("\n"),
	})
		.then((res) => res.text())
		.then((body) => (statusEl.textContent = body))
		.catch(() => (statusEl.textContent = "Error sending, try again."));
}
</script>
</head>
<body>
<form method="post" action="/santaletter" onsubmit="onSubmit(event)">
	<p>Dear Santa,</p>
	<input name="body" minlength="1" placeholder="Message" />
	<br/>
	<textarea name="presents" placeholder="Presents"></textarea>
	<p>Thank you!</p>
	<input name="name" minlength="1" placeholder="Name" />
	<br/>
	<button>Send</button>
</form>
<p id="status"></p>
</body>
</html>`

func logReq(r *http.Request) {
	fmt.Printf("%s %s\n", r.Method, r.URL)
}

func main() {
	http.HandleFunc("GET /santaletter", func(w http.ResponseWriter, r *http.Request) {
		logReq(r)
		fmt.Fprintln(w, santaLetterPage)
	})

	http.HandleFunc("POST /santaletter", func(w http.ResponseWriter, r *http.Request) {
		logReq(r)
		if r.Body == nil {
			w.WriteHeader(http.StatusBadRequest)
			fmt.Println("no body")
			return
		}

		scanner := bufio.NewScanner(r.Body)
		state := "start"

		var name string
		var presents []rune

		for scanner.Scan() {
			line := scanner.Text()
			switch state {
			case "start":
				if line == "Dear Santa," {
					state = "body"
				} else {
					break
				}
			case "body":
				state = "body-end"
			case "body-end":
				if line == "" {
					state = "presents"
				} else {
					break
				}
			case "presents":
				if line != "" {
					first, _ := utf8.DecodeRuneInString(line)
					presents = append(presents, first)
				} else {
					state = "thanks"
				}
			case "thanks":
				if line == "Thank you!" {
					state = "name"
				} else {
					break
				}

			case "name":
				name = line
				state = "end"
			case "end":
				if line != "" {
					state = "err"
					break
				}
			}
		}

		if state != "end" {
			fmt.Printf("not at 'end': '%s'\n", state)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		if err := scanner.Err(); err != nil {
			fmt.Println("bad scanner")
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		fmt.Printf("%s: %s\n", name, string(presents))

		fmt.Fprintln(w, `Received. Please allow up to 366 days to process.`)
	})

	fmt.Println("Listening on 8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```
