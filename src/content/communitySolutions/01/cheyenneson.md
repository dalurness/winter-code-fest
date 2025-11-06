---
descriptions: ["rust"]
---

### 2025 Solution Rust

```rust
use std::fs;
use std::collections::HashMap;

fn main() {
    let contents = fs::read_to_string("letters.txt")
        .expect("should be able to read file");

    let values_iter = contents.split_whitespace();
    let values_vec: Vec<&str> = values_iter.collect();
    let mut letters: HashMap<String, i32> = HashMap::new();

    for value in values_vec {
        if letters.contains_key(value) {
            letters.insert(value.to_string(), letters.get(value).unwrap() + 1);
        } else {
            letters.insert(value.to_string(), 1);
        }
        
    }

    let mut sorted: Vec<_> = letters.iter().collect();
    sorted.sort_by_key(|&(key, _)| key.parse::<i32>().unwrap());

    for (key, value) in sorted {
        println!("{key}: {value}");
    }
}
```
