---
descriptions: ["rust"]
---

### 2026 Solution Rust

```rust
use std::fs;

fn main() {
    let contents = fs::read_to_string("src/assembly_codes.txt")
        .expect("should find file");

    let mut count = 0;
    let mut added = 0;
    let mut removed = 0;

    for line in contents.split_whitespace() {
        let mut line_str = String::from(line);
        let mut a_ct = 0;
        let mut valid = true;

        if line_str.pop() != Some('P') {
            valid = false;
        }

        if line_str.pop() == Some('C') {
            valid = false;
        }

        for c in line_str.chars() {
            match c {
                'A' => {
                    a_ct += 1;
                    added += 1;
                }
                'R' => {
                    removed += 1;
                    if a_ct > 0 {
                        a_ct -= 1;
                    } else {
                        valid = false;
                    }
                }
                'C' => {
                    added += 1;
                    valid = false;
                }
                'P' => {
                    removed += 1;
                    valid = false;
                }
                _ => {
                    println!("Invalid input!");
                }
            }
        }

        if valid {
            count += 1;
        }
    }

    println!("Part 1: {count}");
    println!("Part 2: {added}, {removed}");
}
```
