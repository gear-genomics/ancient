const fs = require("fs");
const hilbertCurve = require("hilbert-curve");
const pako = require("pako");
const sharp = require("sharp");

const input = fs.readFileSync("HG00096.mut.gz");
const genotypes = new TextDecoder("utf-8")
  .decode(pako.inflate(input))
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

img.toFile("out.png", err => {
  if (err) {
    console.error(err);
  }
});

img.resize({ width: 128 }).toFile("out.128x128.png", err => {
  if (err) {
    console.error(err);
  }
});

function offset(column, row, channel, width) {
  const channels = "rgba";
  return row * (width * 4) + column * 4 + channels.indexOf(channel);
}
