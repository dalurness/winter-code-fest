---
descriptions: ["rust"]
---

### 2025 Solution Rust

```rust
fn dfs(n: i32, total: i32, curr_val: usize, memo: &mut Vec<Vec<i32>>) -> i32{
    if total == n {
        return 1; // we found a valid solution!
    }

    // don't recompute solutions we found before
    if memo[total as usize][curr_val] != -1 {
        return memo[total as usize][curr_val];
    }

    let mut count = 0;

    // check for all possibilities that could add up to n or less
    for i in 1..std::cmp::min(n-total+1, 10) { // i can never be above 9
        if i != curr_val as i32 { // no repeats allowed
            count += dfs(n, total + i, i as usize, memo);
        }
    }

    memo[total as usize][curr_val] = count;
    count
}

fn main() {
    let sleigh_length = 30;
    let mut memo = vec![vec![-1;10]; (sleigh_length+1) as usize];
    println!("Solution for n={}: {} ", sleigh_length, dfs(sleigh_length, 0, 0, &mut memo));
}
```
