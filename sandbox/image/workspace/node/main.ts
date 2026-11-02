import process from "node:process";

interface Greeting {
  name: string;
  times: number;
}

function greet({ name, times }: Greeting): string[] {
  const lines: string[] = [];
  for (let i = 1; i <= times; i++) {
    lines.push(`${i}: Hello, ${name}!`);
  }
  return lines;
}

const name: string = process.argv[2] ?? "Winter Code Fest";
const lines = greet({ name, times: 3 });
console.log(lines.join("\n"));
console.log(`Node ${process.version}`);
