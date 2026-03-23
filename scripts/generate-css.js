const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { optimize } = require("svgo");

const SVG_DIR = path.join(__dirname, "../svg");
const OUTPUT_DIR = path.join(__dirname, "..");

const CDN_BASE = "https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/svg";
const MAX_VERSIONS = 5; // keep last 5 builds

// ✅ Validate SVG
function validateSVG(content, file) {
  if (!content.includes("<svg")) {
    throw new Error(`${file} is not a valid SVG`);
  }
  if (!content.includes("viewBox")) {
    throw new Error(`${file} missing viewBox`);
  }
}

// ✅ Normalize + optimize SVGs
function processSVGs() {
  const files = fs.readdirSync(SVG_DIR);

  files.forEach((file) => {
    if (!file.endsWith(".svg")) return;

    let filePath = path.join(SVG_DIR, file);

    // 🔹 Normalize prefix (handles ez-ez-*)
    let normalized = file.replace(/^ez-+/, "");
    normalized = "ez-" + normalized;

    const newPath = path.join(SVG_DIR, normalized);

    if (file !== normalized) {
      fs.renameSync(filePath, newPath);
      filePath = newPath;
      console.log(`Renamed ${file} → ${normalized}`);
    }

    let svg = fs.readFileSync(filePath, "utf-8");

    validateSVG(svg, normalized);

    const result = optimize(svg, {
      multipass: true,
      plugins: ["removeDimensions", "removeComments", "removeMetadata"],
    });

    fs.writeFileSync(filePath, result.data);
  });
}

// ✅ Generate CSS content
function generateCSSContent() {
  const files = fs.readdirSync(SVG_DIR);

  let css = `
.ez-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  background-color: currentColor;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}
`;

  files.forEach((file) => {
    if (!file.endsWith(".svg")) return;

    const clean = file.replace(".svg", "").replace(/^ez-/, "");

    css += `
.ez-icon-${clean} {
  -webkit-mask-image: url("${CDN_BASE}/${file}");
  mask-image: url("${CDN_BASE}/${file}");
}
`;
  });

  return css;
}

// ✅ Create hashed CSS file
function writeHashedCSS(css) {
  const hash = crypto.createHash("md5").update(css).digest("hex").slice(0, 8);

  const fileName = `icons.${hash}.css`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  fs.writeFileSync(filePath, css);

  return fileName;
}

// ✅ Create stable pointer file
function writePointerFile(hashedFileName) {
  const pointerCSS = `@import url("./${hashedFileName}");\n`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "icons.css"), pointerCSS);
}

// ✅ Cleanup old hashed files
function cleanupOldFiles() {
  const files = fs.readdirSync(OUTPUT_DIR);

  const hashedFiles = files
    .filter((f) => /^icons\.[a-f0-9]{8}\.css$/.test(f))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(OUTPUT_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  const filesToDelete = hashedFiles.slice(MAX_VERSIONS);

  filesToDelete.forEach((file) => {
    fs.unlinkSync(path.join(OUTPUT_DIR, file.name));
    console.log(`Deleted old file: ${file.name}`);
  });
}

// 🚀 RUN PIPELINE
function run() {
  processSVGs();

  const css = generateCSSContent();

  const hashedFile = writeHashedCSS(css);

  writePointerFile(hashedFile);

  cleanupOldFiles();

  console.log(`Build complete → ${hashedFile}`);
}

run();
