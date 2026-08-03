import { mkdir, readFile, writeFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

const [major, minor] = packageJson.version.split(".");

const buildNumber = process.env.BUILD_NUMBER ?? "dev";
const commitSha = process.env.COMMIT_SHA?.slice(0, 7) ?? "local";

const buildInfo = {
  version: `${major}.${minor}.${buildNumber}`,
  commitSha,
  builtAt: new Date().toISOString(),
};

const targetDirectory = new URL("../src/app/core/generated/", import.meta.url);

const targetFile = new URL("build-info.ts", targetDirectory);

await mkdir(targetDirectory, { recursive: true });

await writeFile(
  targetFile,
  `export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)} as const;\n`,
);

console.log(`Generated Lootrack ${buildInfo.version}`);
