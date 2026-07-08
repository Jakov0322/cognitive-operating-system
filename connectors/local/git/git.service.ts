import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { getRepoRoot } from "../../../core/shared/workspace";

const execFileAsync = promisify(execFile);

export class GitService {
  constructor(private readonly repositoryPath: string = getRepoRoot()) {}

  async log(): Promise<string> {
    const { stdout } = await execFileAsync(
      "git",
      [
        "log",
        "--name-only",
        "--pretty=format:%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s",
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