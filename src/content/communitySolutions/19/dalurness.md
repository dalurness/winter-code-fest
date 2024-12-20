---
descriptions: ["gleam"]
---

### 2024 Solution Gleam

```gleam
import gleam/int
import gleam/io
import gleam/list
import gleam/string
import simplifile

pub fn main() {
  let filename = "bin.txt"
  case simplifile.read(filename) {
    Ok(file_contents) -> file_contents
    Error(_) -> {
      io.println("failed to read file: " <> filename)
      panic as "failed to read file"
    }
  }
  |> string.split("")
  |> list.sized_chunk(8)
  |> list.map(fn(l) {
    let joined_str = string.join(l, "")
    let assert Ok(int_val) = int.base_parse(joined_str, 2)
    let assert Ok(cp) = string.utf_codepoint(int_val)
    cp
  })
  |> string.from_utf_codepoints
  |> io.println
}
```

#### Output

```
Liam: NICE
Emma: NICE
Noah: NICE
Olivia: NICE
Sophia: NICE
Jackson: NICE
Ava: NAUGHTY
Aiden: NAUGHTY
Isabella: NICE
Lucas: NICE
Mia: NICE
Caden: NICE
Charlotte: NAUGHTY
Grayson: NICE
Amelia: NICE
Muhammad: NICE
Harper: NICE
Mason: NICE
Evelyn: NICE
Elijah: NAUGHTY
Abigail: NICE
Oliver: NICE
Emily: NAUGHTY
Jacob: NAUGHTY
Elizabeth: NAUGHTY
Michael: NICE
Mila: NAUGHTY
Alexander: NICE
Ella: NICE
William: NICE
Sofia: NICE
James: NICE
Camila: NICE
Benjamin: NICE
Avery: NAUGHTY
Henry: NICE
Scarlett: NAUGHTY
Daniel: NAUGHTY
Victoria: NICE
Matthew: NAUGHTY
Luna: NAUGHTY
Jackson: NICE
Grace: NICE
Logan: NICE
Chloe: NAUGHTY
Sebastian: NICE
Penelope: NAUGHTY
Levi: NICE
Layla: NICE
Mateo: NICE
Riley: NICE
David: NICE
Zoey: NICE
Samuel: NICE
Nora: NICE
Joseph: NICE
Lily: NICE
John: NICE
Eleanor: NICE
Henry: NICE
Hannah: NICE
Owen: NICE
Lillian: NAUGHTY
Jack: NAUGHTY
Addison: NAUGHTY
Wyatt: NICE
Aubrey: NAUGHTY
Luke: NAUGHTY
Ellie: NICE
Jayden: NICE
Stella: NAUGHTY
Dylan: NAUGHTY
Natalie: NAUGHTY
Nicholas: NICE
Zoe: NICE
Isaac: NICE
Leah: NICE
Olivia: NICE
Hazel: NICE
Charlie: NAUGHTY
Violet: NICE
Gabriel: NICE
Aurora: NICE
Julian: NICE
Savannah: NICE
Caleb: NAUGHTY
Audrey: NAUGHTY
Daniel: NICE
Brooklyn: NAUGHTY
Ryan: NAUGHTY
Claire: NICE
Tyler: NICE
Bella: NICE
William: NICE
Lucy: NICE
Zachary: NICE
Anna: NICE
Nathan: NICE
Samantha: NICE
Thomas: NICE
Genesis: NICE
Peter: NICE
Maya: NICE
Eli: NICE
Lily: NICE
Mateo: NICE
Emilia: NICE
Isaiah: NICE
Valentina: NICE
Anthony: NAUGHTY
Josephine: NICE
Joshua: NAUGHTY
Nova: NICE
Christopher: NICE
Naomi: NICE
Andrew: NAUGHTY
Madison: NICE
```
