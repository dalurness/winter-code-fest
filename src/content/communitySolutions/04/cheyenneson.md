---
descriptions: ["rust"]
---

### 2025 Solution Rust

```rust
use std::fs;

fn solution(contents: &str) {
    let mut location = (0,0);
    let mut lines: Vec<(i32, i32, char)> = Vec::new();

    for line in contents.lines() {
        let a = line.as_bytes()[0] as char;
        let b = &line[1..];

        match a {
            'U' => {
                let num: i32 = b.parse().unwrap();
                location.1 -= num;
            }
            'D' => {
                let num: i32 = b.parse().unwrap();
                location.1 += num;
            }
            'L' => {
                if b == "R" {
                    location = (0,0);
                } else {
                    let num: i32 = b.parse().unwrap();
                    location.0 -= num;
                }
            }
            'R' => {
                let num: i32 = b.parse().unwrap();
                location.0 += num;
            }
            'P' => {
                lines.push((location.0, location.1, b.chars().next().unwrap()));
            }
            _ => {
                println!("Error!");
            }
        }
    }

    // render
    lines.sort_by_key(|item| (item.1, item.0));
    let mut prev_line = 0;
    let mut prev_x = 0;

    for line in lines {
        while prev_line != line.1 {
            println!();
            prev_x = 0;
            prev_line += 1;
        }
        while prev_x != line.0 {
            print!(" ");
            prev_x += 1;
        }
        print!("{}", line.2);
        prev_x += 1;
    }

    println!("\n");
}

fn main() {
    for entry in fs::read_dir("../days/04").unwrap() {
        let path = entry.unwrap().path();

        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("txt") {
            println!("{}: \n", path.to_str().unwrap());
            solution(&fs::read_to_string(&path).unwrap());
        }
    }
}
```
