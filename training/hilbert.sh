#!/bin/bash

cd genotype-hilbert-curve/ 
for F in ../mutations/*.mut.gz
do
    ID=`echo ${F} | sed 's/^.*\///'`
    echo ${ID}
    ./index.js -g -w 128 --no-image ${F}
done
cd ../

cat genotype-hilbert-curve/*.tsv | gzip -c > images.tsv.gz
rm genotype-hilbert-curve/*.tsv
