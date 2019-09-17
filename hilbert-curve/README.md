# Genotype Hilbert Curves

## Install

```bash
npm install
```

## Usage

```bash
./index.js --help
Usage: index [options] <files...>

Options:
  -o, --order <number>  order of Hilbert curve
  --no-image            don't generate images
  -h, --help            output usage information
```

## Examples

```bash
# generate full-size, images and TSV files
# => HG00096.png, HG00097.png, HG00096.tsv, HG00097.tsv
./index.js HG00096.mut.gz HG00097.mut.gz

# compress hilbert curve to order 7 (128x128) and only generate TSV files
# => HG00096.128x128.tsv, HG00097.128x128.tsv
/index.js --order 7 --no-image HG00096.mut.gz HG00097.mut.gz
```
