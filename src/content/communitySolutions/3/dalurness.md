---
descriptions: ["rust"]
---
```rust
use std::fs;

fn is_valid_code(code: &str) -> bool {
    validate_check_package(code) && validate_add_remove(code)
}

fn validate_add_remove(code: &str) -> bool {
    let mut stack = Vec::new();
    for l in code.chars() {
        if l == 'A' {
            stack.push(true);
        } else if l == 'R' {
            match stack.pop() {
                Some(_) => (),
                None => return false,
            }
        }
    }
    true
}

fn validate_check_package(code : &str) -> bool {
    let mut code_it = code.chars().rev();
    
    code.matches('P').count() == 1 && 
    code.matches('C').count() == 1 && 
    code_it.nth(0).unwrap() == 'P' && 
    code_it.nth(0).unwrap() == 'C'
}

fn main() {
    let contents = fs::read_to_string("../../assembly_codes.txt");
    let raw_data = match contents {
        Ok(data) => data,
        Err(_) => panic!("failed to get from file"),
    };

    let assembly_codes: Vec<&str> = raw_data.split_whitespace().collect();

    let valid_codes: Vec<&str> = assembly_codes.iter().flat_map(|c| if is_valid_code(c) {vec!{*c}} else {Vec::new()} ).collect();

    println!("Valid Codes: {:?}", valid_codes.len());

    let mut added = 0;
    let mut removed = 0;

    for code in assembly_codes {
        let mut code_chars = code.chars();
        // remove the last two because we don't need them anymore
        code_chars.next_back();
        code_chars.next_back();
        for c in code_chars {
            if c == 'A' || c == 'C' {
                added += 1;
            } else if c == 'R' || c == 'P' {
                removed += 1;
            }
        }
    }

    println!("Added: {:?}", added);
    println!("Removed: {:?}", removed);
}
```
