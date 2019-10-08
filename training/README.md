# ancient model training

## Install all dependencies

```bash
make all
```

## Test run

```bash
make ancestry
```

## Convert the model to tensorflow.js

```bash
tensorflowjs_converter --input_format keras ancestry.h5 tfjsmodel
```
