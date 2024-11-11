---
descriptions: ["rust"]
---
```rust
use std::{fs::{self, File}, io::Write};

struct Renderer {
    locx: isize,
    locy: isize,
    maxx: isize,
    maxy: isize,
    print_locations: Vec<(isize, isize, char)>,
}

impl Renderer {
    fn new() -> Renderer {
        Renderer { locx: 0, locy: 0, maxx: 0, maxy: 0, print_locations: Vec::new() }
    }

    fn consume(&mut self, instruction: &str) {
        if instruction == "LR" {
            self.loc_reset();
            return;
        }
        
        let mut instruction_chars = instruction.chars();
        let instr = instruction_chars.nth(0).unwrap();
        let val = instruction_chars.collect::<String>();
        match instr {
            'D' => {
                let num: isize = val.parse().unwrap();
                self.down(num);
            },
            'U' => {
                let num: isize = val.parse().unwrap();
                self.up(num);
            },
            'R' => {
                let num: isize = val.parse().unwrap();
                self.right(num);
            },
            'L' => {
                let num: isize = val.parse().unwrap();
                self.left(num);
            },
            'P' => {
                self.paint(val.chars().nth(0).unwrap());
            },
            _ => panic!("unknown instruction")
        };
    }

    fn loc_reset(&mut self) {
        self.locx = 0;
        self.locy = 0;
    }

    fn down(&mut self, amount: isize) {
        self.locy = self.locy + amount;
        if self.locy > self.maxy {
            self.maxy = self.locy
        }
    }

    fn up(&mut self, amount: isize) {
        let new_amount = self.locy - amount;
        if new_amount > -1 {
            self.locy = new_amount;
        } else {
            panic!("Can't go up anymore!");
        }
    }

    fn left(&mut self, amount: isize) {

        let new_amount = self.locx - amount;
        if new_amount > -1 {
            self.locx = new_amount;
        } else {
            panic!("Can't go left anymore!");
        }
    }

    fn right(&mut self, amount: isize) {
        self.locx = self.locx + amount;
        if self.locx > self.maxx {
            self.maxx = self.locx;
        }
    }

    fn paint(&mut self, c: char) {
        self.print_locations.push((self.locx, self.locy, c));
    }

    fn get_rendered(self) -> String {
        let mut return_string = String::new();
        for i in 0..self.maxy+1 {
            for j in 0..self.maxx+1 {
                let items: Vec<&(isize, isize, char)> = self.print_locations.iter().filter(|x| x.0 == j && x.1 == i).collect();
                if items.len() > 0 {
                    return_string.push(items[0].2);
                } else {
                    return_string.push(' ');
                }
            }
            return_string.push('\n');
        }

        return_string
    }
}

fn main() {
    for i in 0..6 {
        let contents = fs::read_to_string(format!("../{:?}.txt", i));
        let raw_data = match contents {
            Ok(data) => data,
            Err(_) => panic!("failed to get from file"),
        };
    
        let instructions: Vec<&str> = raw_data.split_whitespace().collect();
        let mut renderer = Renderer::new();

        for instr in instructions {
            renderer.consume(instr)
        }

        let write_file_result = File::create(format!("{:?}_output.txt", i));
        let mut write_file = match write_file_result {
            Ok(f) => f,
            Err(_) => panic!("failed to open write file"),
        };

        write_file.write_all(renderer.get_rendered().as_bytes()).unwrap();
    }
}
```
