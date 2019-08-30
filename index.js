#! /usr/bin/env node

const program = require("commander");
const fs = require("fs");
const hilbertCurve = require("hilbert-curve");
const pako = require("pako");
const sharp = require("sharp");

program
  .option("-g, --grayscale", "grayscale image")
  .option("-w, --width <number>", "width of resized image", myParseInt)
  .arguments("<files...>");

program.parse(process.argv);
const files = program.args;

if (files.length === 0) {
  program.outputHelp();
  process.exit(1);
}

for (const file of files) {
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
    if (program.grayscale && genotypes[index] !== "2") {
      const channelValue = genotypes[index] === "0" ? 255 : 127;
      imageData[offset(point.x, point.y, "r", n)] = channelValue;
      imageData[offset(point.x, point.y, "g", n)] = channelValue;
      imageData[offset(point.x, point.y, "b", n)] = channelValue;
    } else if (!program.grayscale) {
      imageData[
        offset(point.x, point.y, genotypeChannel[genotypes[index]], n)
      ] = 255;
    }
  }

  const img = sharp(Buffer.from(imageData), {
    raw: { width: n, height: n, channels: 4 }
  });

  const prefix = file.split(".")[0];
  const outfile = program.width
    ? `${prefix}.${program.width}x${program.width}.png`
    : `${prefix}.png`;

  if (program.width) {
    img.resize({ width: program.width });
  }

  img.toFile(outfile, err => {
    if (err) {
      console.error(err);
    } else {
      console.log(`[done] ${outfile}`);
    }
  });
}

function offset(column, row, channel, width) {
  const channels = "rgba";
  return row * (width * 4) + column * 4 + channels.indexOf(channel);
}

function myParseInt(x) {
  return Number.parseInt(x, 10);
}
