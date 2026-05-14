import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class GitService {
  constructor(private readonly repositoryPath: string = process.cwd()) {}

  async log(): Promise<string> {
    const { stdout } = await execFileAsync(
      "git",
      [
        "log",
        "--pretty=format:%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e",
        "--name-only",
      ],
      {
        cwd: this.repositoryPath,
        maxBuffer: 1024 * 1024 * 20,
      }
    );

    return stdout;
  }

  async getRepositoryName(): Promise<string> {
    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "--show-toplevel"],
      { cwd: this.repositoryPath }
    );

    return stdout.trim().split(/[\\/]/).pop() ?? "unknown-repository";
  }
}