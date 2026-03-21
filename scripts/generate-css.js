const fs = require("fs");
const path = require("path");
const { optimize } = require("svgo");

const SVG_DIR = path.join(__dirname, "../svg");
const OUTPUT = path.join(__dirname, "../icons.css");

const CDN_BASE = "https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/svg";

// Validate SVG
function validateSVG(content, file) {
  if (!content.includes("<svg")) {
    throw new Error(`${file} is not valid SVG`);
  }
  if (!content.includes("viewBox")) {
    throw new Error(`${file} missing viewBox`);
  }
}

// Process SVGs
function processSVGs() {
  const files = fs.readdirSync(SVG_DIR);

  files.forEach((file) => {
    if (!file.endsWith(".svg")) return;

    let filePath = path.join(SVG_DIR, file);

    // Normalize prefix
    let name = file.replace(/^ez-+/, "");
    name = "ez-" + name;

    const newPath = path.join(SVG_DIR, name);

    if (file !== name) {
      fs.renameSync(filePath, newPath);
      filePath = newPath;
    }

    let svg = fs.readFileSync(filePath, "utf-8");

    validateSVG(svg, name);

    const result = optimize(svg, {
      multipass: true,
      plugins: ["removeDimensions", "removeComments", "removeMetadata"],
    });

    fs.writeFileSync(filePath, result.data);
  });
}

// Generate CSS
function generateCSS() {
  const files = fs.readdirSync(SVG_DIR);

  let css = `
.icon {
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
.icon-${clean} {
  -webkit-mask-image: url("${CDN_BASE}/${file}");
  mask-image: url("${CDN_BASE}/${file}");
}
`;
  });

  fs.writeFileSync(OUTPUT, css);
}

processSVGs();
generateCSS();
