```elixir
writeString = case File.read("../letters.txt") do
  {:ok, body} -> body
  {:error, _reason} -> IO.puts("failed to get file")
end
|> String.split(" ", trim: true)
|> Enum.reduce(Map.new(), fn code, acc -> case Map.has_key?(acc, String.to_integer(code)) do
    false -> Map.put(acc, String.to_integer(code), 1)
    true -> {_old, newMap} = Map.get_and_update!(acc, String.to_integer(code), fn current_value ->
      {current_value, current_value + 1}
    end)
    newMap
  end
end)
|> Enum.sort_by(fn {k,v} -> {v,k} end, :desc)
|> Enum.reduce("", fn {k, v}, acc -> acc <> Integer.to_string(k) <> ": " <> Integer.to_string(v) <> "\n" end)

{:ok, file} = File.open("output.txt", [:write])
IO.binwrite(file, writeString)
```