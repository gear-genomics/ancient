#!/bin/bash

rm -rf mutations/
mkdir mutations
for FILE in ../1000Genomes/1kgp.common.shared.vep.bcf ../pcawg/pcawg.common.shared.vep.bcf
do
    for SAMPLE in `bcftools view ${FILE} | grep -m 1 "^#CHROM" | cut -f 10-`
    do
	echo ${SAMPLE}
	if [ ! -f mutations/${SAMPLE}.mut.gz ]
	then
	    bcftools query -s ${SAMPLE} -f "%CHROM\t%POS[\t%GT]\n" ${FILE} | sed 's/0|0/0/' | sed 's/0|1/1/' | sed 's/1|0/1/' | sed 's/1|1/2/' | sort -k1,1V -k2,2n | uniq | cut -f 3 | gzip -c > mutations/${SAMPLE}.mut.gz
	fi
    done
done
