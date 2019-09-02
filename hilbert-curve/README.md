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
  -g, --grayscale       grayscale image
  -w, --width <number>  width of resized image
  --no-image            don't generate images
  -h, --help            output usage information
```

## Examples

```bash
# generate full-size, color images & RGB value files
# => HG00096.png, HG00097.png, HG00096.tsv, HG00097.tsv
./index.js HG00096.mut.gz HG00097.mut.gz

# generate RGB value files only
# => HG00096.tsv, HG00097.tsv
./index.js --no-image HG00096.mut.gz HG00097.mut.gz

# generate full-size, grayscale images & grayscale value files
# => HG00096.png, HG00097.png, HG00096.tsv, HG00097.tsv
./index.js -g HG00096.mut.gz HG00097.mut.gz

# compress hilbert curve to level 7 (n=128) and generate grayscale image and value files
# => HG00096.128x128.png, HG00097.128x128.png, HG00096.128x128.tsv, HG00097.128x128.tsv
/index.js -g -w 128 HG00096.mut.gz HG00097.mut.gz
```
