```python
lowercase = "abcdefghijklmnopqrstuvwxyz"
full_alpha = [l for l in lowercase] + [l.upper() for l in lowercase]

decode_map = {f"{full_alpha.index(l):02}": l for l in full_alpha}

writefile = open("output.txt", "w", encoding="utf8")
readfile = open("../small_message_encoded.txt", encoding="utf8")
data = readfile.read()

i = 0
while i < len(data):
    if data[i] == '\\':
        # handle backslashes
        if data[i + 1] == '\\':
            writefile.write('\\')
        else:
            code = data[i+1] + data[i+2]
            writefile.write(decode_map.get(code))
            i = i + 2
    else:
        writefile.write(data[i])
    i = i + 1
readfile.close()
writefile.close()
```