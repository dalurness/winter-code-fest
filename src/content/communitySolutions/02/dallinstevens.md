---
descriptions: ["deno"]
---

### 2025 Solution Deno

```ts
if (import.meta.main) {
  const file = "large_message_encoded.txt";
  const text = await Deno.readTextFile(file);

  let decodedMessage = "";

  for (let i = 0; i < text.length; i++) {
    // Check if backslash indicating an encoded character
    if (text.charCodeAt(i) == 92) {
      const encodedNum = parseInt(text[i + 1] + text[i + 2]);
      // check if escaped backslash
      if (text.charCodeAt(i + 1) == 92) {
        decodedMessage += "\\";
        i++;
      }
      // check if character is lowercase letter
      else if (encodedNum >= 0 && encodedNum <= 25) {
        decodedMessage += String.fromCharCode(encodedNum + 97);
        i += 2;
      }
      // check if character is uppercase
      else if (encodedNum >= 26 && encodedNum <= 51) {
        decodedMessage += String.fromCharCode(encodedNum + 39);
        i += 2;
      }
    } else {
      decodedMessage += text[i];
    }
  }
  console.log(decodedMessage);
}
```
