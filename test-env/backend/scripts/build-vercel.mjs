import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "dist");

const copyPaths = [
  "api",
  "routes",
  "firebaseAdmin.js",
  "server.js",
  "package.json",
];

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyRecursive(sourcePath, destinationPath) {
  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    fs.mkdirSync(destinationPath, { recursive: true });
    for (const entry of fs.readdirSync(sourcePath)) {
      if (entry === "dist" || entry === "node_modules") continue;
      copyRecursive(
        path.join(sourcePath, entry),
        path.join(destinationPath, entry),
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

removePath(outputDir);
fs.mkdirSync(outputDir, { recursive: true });

for (const relativePath of copyPaths) {
  const sourcePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(sourcePath)) continue;

  const destinationPath = path.join(outputDir, relativePath);
  copyRecursive(sourcePath, destinationPath);
}

fs.writeFileSync(
  path.join(outputDir, "index.js"),
  'export { default } from "./api/index.js";\n',
);

console.log(`Built backend deployment artifact in ${outputDir}`);
