---
descriptions: ["rust"]
---

### 2025 Solution Rust

```rust
use std::fs;

fn main() {
    let contents = fs::read_to_string("small_message_encoded.txt")
        .expect("should be able to read file");
    let mut ans = String::from("");
    let chars: Vec<char> = contents.chars().collect();

    let mut index = 0;
    while index < chars.len() {
        let c = contents.chars().nth(index).unwrap();

        if c == '\\' {
            // there will either be a 2-digit number or a \
            if chars[index + 1] == '\\' {
                ans.push_str("\\");
                index += 2;
            } else {
                let num_str: String = chars[index+1..index + 3].iter().collect();
                let mut num: i32 = num_str.parse().unwrap();

                if num > 25 {
                    // A - Z are encoded as 26 - 51, A is 65 in ASCII
                    num += 39;
                } else {
                    // a - z are encoded as 00 - 25, a is 97 in ASCII
                    num += 97;
                }

                let char = num as u8;
                let char_2 = char as char;
                ans.push_str(&char_2.to_string());
                index += 3;
            }
        } else {
            ans.push(c);
            index += 1;
        }
    }

    println!("{ans}");
}
```
