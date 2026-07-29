const sharp = require("sharp");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");

async function generate() {
  // 1. apple-touch-icon.png (180x180) from favicon.svg
  await sharp(path.join(publicDir, "favicon.svg"))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png (180x180)");

  // 2. og-image.png (1200x630) from og-image.svg
  await sharp(path.join(publicDir, "og-image.svg"))
    .resize(1200, 630)
    .png()
    .toFile(path.join(publicDir, "og-image.png"));
  console.log("✓ og-image.png (1200x630)");
}

generate().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
