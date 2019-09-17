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
  const imageData = new Uint8Array(genotypes.length);
  imageData.fill(255);

  for (let i = 0; i < genotypes.length; i += 1) {
    if (genotypes[i] === 2) {
      imageData[i] = 0;
    } else if (genotypes[i] === 1) {
      imageData[i] = 127;
    }
  }

  const prefix = basename(file).split(".")[0];
  const tsvRow = [prefix];
  for (let i = 0; i < imageData.length; i += 1) {
    if (imageData[i] === 0) {
      tsvRow.push(1);
    } else if (imageData[i] === 127) {
      tsvRow.push(0.5);
    } else {
      tsvRow.push(0);
    }
  }

  const valueFile = program.order
    ? `${prefix}.${2 ** program.order}x${2 ** program.order}.tsv`
    : `${prefix}.tsv`;

  fs.writeFile(valueFile, tsvRow.join("\t") + "\n", "utf8", err => {
    if (err) {
      throw err;
    }
  });

  if (program.image) {
    const img = sharp(Buffer.from(imageData), {
      raw: {
        width: Math.sqrt(imageData.length),
        height: Math.sqrt(imageData.length),
        channels: 1
      }
    });

    const imageFile = program.width
      ? `${prefix}.${2 ** program.width}x${2 ** program.width}.png`
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

function offset(column, row, width) {
  return row * width + column;
}
