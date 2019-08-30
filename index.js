#! /usr/bin/env node

const program = require("commander");
const fs = require("fs");
const hilbertCurve = require("hilbert-curve");
const pako = require("pako");
const sharp = require("sharp");

program
  .option("-g, --grayscale", "grayscale image")
  .option("-w, --width <number>", "width of resized image", x =>
    Number.parseInt(x, 10)
  )
  .option("--no-image", "output raw values, no image")
  .arguments("<files...>");

program.parse(process.argv);
const files = program.args;

if (files.length === 0) {
  program.outputHelp();
  process.exit(1);
}

if (!program.image && (program.width || program.grayscale)) {
  console.warn(
    "[warning] `--no-image` specified, ignoring `--grayscale` and `--width`"
  );
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
  const parsed = Uint8Array.from(
    new TextDecoder("utf-8").decode(pako.inflate(data)).split("\n")
  );

  let genotypes, binned;
  if (!program.width) {
    genotypes = parsed;
  } else {
    binned = new Uint8Array(program.width * program.width);
    binSize = parsed.length / binned.length;
    for (let i = 0; i < binned.length; i += 1) {
      const chunk = parsed.slice(
        Math.ceil(i * binSize),
        Math.floor((i + 1) * binSize)
      );
      if (chunk.length > 0) {
        // TODO allow additional strategies
        binned[i] = Math.max(...chunk);
      }
    }
    genotypes = binned;
  }

  const levels = Math.ceil(Math.log2(Math.sqrt(genotypes.length)));
  const n = 2 ** levels;

  const imageData = new Uint8ClampedArray(n * n * 4);
  // r=0, g=1, b=2
  const genotypeChannel = "rgb";

  for (index = 0; index < genotypes.length; index += 1) {
    const point = hilbertCurve.indexToPoint(index, n);
    imageData[offset(point.x, point.y, "a", n)] = 255;
    if (program.grayscale && genotypes[index] !== 2) {
      const channelValue = genotypes[index] === 0 ? 255 : 127;
      imageData[offset(point.x, point.y, "r", n)] = channelValue;
      imageData[offset(point.x, point.y, "g", n)] = channelValue;
      imageData[offset(point.x, point.y, "b", n)] = channelValue;
    } else if (!program.grayscale) {
      imageData[
        offset(point.x, point.y, genotypeChannel[genotypes[index]], n)
      ] = 255;
    }
  }

  if (program.image) {
    const img = sharp(Buffer.from(imageData), {
      raw: { width: n, height: n, channels: 4 }
    });

    const prefix = file.split(".")[0];
    const outfile = program.width
      ? `${prefix}.${program.width}x${program.width}.png`
      : `${prefix}.png`;

    img.toFile(outfile, err => {
      if (err) {
        console.error(err);
      } else {
        console.log(`[done] ${outfile}`);
      }
    });
  }
}

function offset(column, row, channel, width) {
  const channels = "rgba";
  return row * (width * 4) + column * 4 + channels.indexOf(channel);
}
