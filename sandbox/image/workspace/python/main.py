import platform
import sys

name = sys.argv[1] if len(sys.argv) > 1 else "Winter Code Fest"

for i in range(1, 4):
    print(f"{i}: Hello, {name}!")
print(f"Python {platform.python_version()}")
