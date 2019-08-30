# Genotype Hilbert Curves

## Install

```bash
npm install
```

## Examples

```bash
# generate full-size, color images => HG00096.png, HG00097.png
./index.js HG00096.mut.gz HG00097.mut.gz

# generate full-size, grayscale images => HG00096.png, HG00097.png
./index.js -g HG00096.mut.gz HG00097.mut.gz

# generate 128x128, color images => HG00096.128x128.png, HG00097.128x128.png
./index.js -w 128 HG00096.mut.gz HG00097.mut.gz

# generate 128x128, grayscale images => HG00096.128x128.png, HG00097.128x128.png
./index.js -g -w 128 HG00096.mut.gz HG00097.mut.gz
```
