const fs = require("fs");
const hilbertCurve = require("hilbert-curve");
const pako = require("pako");
const basename = require("path").basename;
const sharp = require("sharp");

// FIXME: configurable
const IMAGE_RESIZE_WIDTH = 128;

if (process.argv.length === 2) {
  console.log(
    `Usage: ${basename(process.argv[1])} <file1.gz> [<file2.gz>, ...]`
  );
}

for (const file of process.argv.slice(2)) {
  fs.readFile(file, (err, data) => {
    if (err) {
      throw err;
    }
    generateImage(data, file);
  });
}

function generateImage(data, file) {
  // FIXME: gzip should be optional
  const genotypes = new TextDecoder("utf-8")
    .decode(pako.inflate(data))
    .split("\n");

  const levels = Math.ceil(Math.log2(Math.sqrt(genotypes.length)));
  const n = 2 ** levels;

  const imageData = new Uint8ClampedArray(n * n * 4);
  const genotypeChannel = {
    "0": "r",
    "1": "g",
    "2": "b"
  };

  for (index = 0; index < genotypes.length; index += 1) {
    const point = hilbertCurve.indexToPoint(index, n);
    imageData[offset(point.x, point.y, "a", n)] = 255;
    imageData[
      offset(point.x, point.y, genotypeChannel[genotypes[index]], n)
    ] = 255;
  }

  const img = sharp(Buffer.from(imageData), {
    raw: { width: n, height: n, channels: 4 }
  });

  const prefix = file.split(".")[0];

  const x = img.toFile(`${prefix}.png`, err => {
    if (err) {
      console.error(err);
    } else {
      console.log(`[done] ${prefix}.png`);
    }
  });

  img
    .resize({ width: IMAGE_RESIZE_WIDTH })
    .toFile(
      `${prefix}.${IMAGE_RESIZE_WIDTH}x${IMAGE_RESIZE_WIDTH}.png`,
      err => {
        if (err) {
          console.error(err);
        } else {
          console.log(
            `[done] ${prefix}.${IMAGE_RESIZE_WIDTH}x${IMAGE_RESIZE_WIDTH}.png`
          );
        }
      }
    );
}

function offset(column, row, channel, width) {
  const channels = "rgba";
  return row * (width * 4) + column * 4 + channels.indexOf(channel);
}
