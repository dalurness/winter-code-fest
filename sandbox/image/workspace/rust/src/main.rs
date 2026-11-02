use std::env;

fn main() {
    let name = env::args().nth(1).unwrap_or_else(|| "Winter Code Fest".to_string());

    for i in 1..=3 {
        println!("{i}: Hello, {name}!");
    }
}
