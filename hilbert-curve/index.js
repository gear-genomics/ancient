#! /usr/bin/env node

const program = require("commander");
const fs = require("fs");
const hilbertCurve = require("hilbert-curve");
const pako = require("pako");
const basename = require("path").basename;
const sharp = require("sharp");

program
  .option("-o, --order <number>", "order of Hilbert curve", x =>
    Number.parseInt(x, 10)
  )
  .option("--no-image", "don't generate images")
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
    processFile(data, file);
  });
}

function processFile(data, file) {
  // FIXME: gzip should be optional
  const parsed = Uint8Array.from(
    new TextDecoder("utf-8").decode(pako.inflate(data)).split("\n")
  );

  const genotypes = hilbertCurve.construct(parsed, program.order);
  const grayscaleValues = new Array(genotypes.length);
  grayscaleValues.fill(1);

  for (let i = 0; i < genotypes.length; i += 1) {
    if (genotypes[i] === 2) {
      grayscaleValues[i] = 0;
    } else if (genotypes[i] === 1) {
      grayscaleValues[i] = 0.5;
    }
  }

  const prefix = basename(file).split(".")[0];
  const tsvRow = [prefix].concat(...grayscaleValues);

  const valueFile = program.order
    ? `${prefix}.${2 ** program.order}x${2 ** program.order}.tsv`
    : `${prefix}.tsv`;

  fs.writeFile(valueFile, tsvRow.join("\t") + "\n", "utf8", err => {
    if (err) {
      throw err;
    }
  });

  if (program.image) {
    const imageData = grayscaleValues.map(x => x * 256 - 1);
    const img = sharp(Buffer.from(imageData), {
      raw: {
        width: Math.sqrt(imageData.length),
        height: Math.sqrt(imageData.length),
        channels: 1
      }
    });

    const imageFile = program.order
      ? `${prefix}.${2 ** program.order}x${2 ** program.order}.png`
      : `${prefix}.png`;

    img.toFile(imageFile, err => {
      if (err) {
        console.error(err);
      } else {
        console.log(`[done] ${imageFile}`);
      }
    });
  }
}
