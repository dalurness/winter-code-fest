import gleam/int
import gleam/io
import gleam/list

pub fn main() -> Nil {
  list.each([1, 2, 3], fn(i) {
    io.println(int.to_string(i) <> ": Hello, Winter Code Fest!")
  })
}
