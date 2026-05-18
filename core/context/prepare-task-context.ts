import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function run(command: string, args: string[]) {
  console.log(`\n> ${command} ${args.join(" ")}`);

  const { stdout, stderr } = await execFileAsync(command, args, {
    maxBuffer: 1024 * 1024 * 20,
    shell: true,
  });

  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
}

async function main() {
  const task = process.argv.slice(2).join(" ").trim();

  if (!task) {
    throw new Error(
      'Provide task. Example: npm run context:prepare -- "refactor github connector"'
    );
  }

  await run("npm", ["run", "rank:context", "--", task]);
  await run("npm", ["run", "context:compress", "--", task]);
  await run("npm", ["run", "context:task", "--", task]);

  console.log("\nTask context prepared.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});