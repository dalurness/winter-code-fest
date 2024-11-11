---
descriptions: ["rust"]
---
```rust
use std::fs;
use std::collections::VecDeque;

struct Elf {
    work_minutes: usize,
    multiplier: f32,
}

fn main() {
    let mut elves = Vec::new();
    for _ in 0..4 {
        elves.push(Elf{
            work_minutes: 0,
            multiplier: 0.0,
        })
    }
    elves[0].multiplier = 1.4;
    elves[1].multiplier = 0.7;
    elves[2].multiplier = 1.1;
    elves[3].multiplier = 1.0;

    let contents = fs::read_to_string("../../presents.txt");
    let raw_data = match contents {
        Ok(data) => data,
        Err(_) => panic!("failed to get from file"),
    };

    let mut present_minutes: VecDeque<&str> = raw_data.split_whitespace().collect();

    let mut total_minutes: i64 = 0;
    
    loop {
        if present_minutes.len() > 0 {
            for elf in elves.iter_mut() {
                if elf.work_minutes == 0 {
                    println!("Elf has no minutes! Getting present...");
                    let next_minutes: usize = match present_minutes.pop_front() {
                        Some(minutes) => minutes.parse().unwrap(),
                        None => continue,
                    };
                    println!("Next present minutes: {:?}", next_minutes);
                    let multiplied_minutes = next_minutes as f32 / elf.multiplier;
                    elf.work_minutes = multiplied_minutes.ceil() as usize;
                    // walking time
                    elf.work_minutes = elf.work_minutes + 1;
                    println!("Elf minutes set to: {:?}", elf.work_minutes);
                }
            }
        }
        // if everything is done
        if elves.iter().filter(|elf| elf.work_minutes > 0).count() == 0 {
            println!("Everything is done!");
            break;
        }

        total_minutes += 1;

        elves.iter_mut().for_each(|elf| if elf.work_minutes > 0 {elf.work_minutes -= 1});
    }

    println!("{:?}", total_minutes);
}

```
