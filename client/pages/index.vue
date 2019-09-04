<template>
  <div>
    <v-alert class="mt-4" v-model="error.show" dismissible type="error">{{ error.message }}</v-alert>
    <v-container>
      <FilePond ref="upload"/>
      <div class="text-center">
        <v-btn outlined color="primary" @click="run">
          <v-icon left>fas fa-rocket</v-icon>Run inference
        </v-btn>
      </div>
    </v-container>
  </div>
</template>

<script>
import axios from 'axios'
import * as hilbertCurve from 'hilbert-curve'
import _ from 'lodash'
import pako from 'pako'
import * as tf from '@tensorflow/tfjs'
import vueFilePond from 'vue-filepond'
import 'filepond/dist/filepond.min.css'

const FilePond = vueFilePond()
loadData()

const rsIds = {}
const affyIdToRsId = {}
let model
let numSnps

async function loadData() {
  const snpReq = await axios.get('/snps.txt.gz', {
    responseType: 'arraybuffer'
  })

  const snpData = new TextDecoder('utf-8').decode(pako.inflate(snpReq.data))

  console.log('[start] read snp data')

  let line = ''
  let index = 0
  for (let char of snpData) {
    if (char === '\n') {
      const [chrom, pos, rsId, affyId] = line.split('\t')
      rsIds[rsId] = { index, chrom, pos, affyId }
      affyIdToRsId[affyId] = rsId
      index += 1
      line = ''
    } else {
      line += char
    }
  }

  numSnps = index

  console.log(`[  end] read snp data (n=${numSnps})`)

  // for (const line of lines(snpData)) {
  //   const [chrom, pos, rsId, affyId] = line.split('\t')
  //   rsIds[rsId] = { index: numSnps, chrom, pos, affyId }
  //   affyIdToRsId[affyId] = rsId
  //   numSnps += 1
  // }

  model = await tf.loadLayersModel('/tfjs_artifacts/model.json')
}

export default {
  data() {
    return {
      error: {
        show: false,
        message: ''
      }
    }
  },
  components: {
    FilePond
  },
  methods: {
    run() {
      const inputFile = this.$refs.upload.getFile()
      if (!inputFile) {
        this.error.message = 'Error: please provide an input file.'
        this.error.show = true
        return
      }
      this.error.show = false

      let samples
      const genotypes = {}

      const reader = new FileReader()
      reader.readAsText(inputFile.file)
      reader.onload = event => {
        const contents = event.target.result
        let line = ''
        let count = 1
        console.log('[start] read input file')
        for (let char of contents) {
          if (char === '\n') {
            if (count % 100000 === 0) {
              console.log(`    processed ${count} lines`)
            }
            count += 1
            if (line.startsWith('#')) {
              line = ''
              continue
            }
            const fields = line.split('\t')
            if (!samples) {
              samples = fields.slice(1)
              for (const sample of samples) {
                genotypes[sample] = new Uint8Array(numSnps)
                genotypes[sample].fill(255)
              }
            } else {
              const affyId = fields[0]
              const rsId = affyIdToRsId[affyId]
              if (!rsId) {
                line = ''
                continue
              }
              const index = rsIds[rsId].index
              for (const [sample, genotype] of _.zip(
                samples,
                fields.slice(1)
              )) {
                genotypes[sample][index] = Number.parseInt(genotype, 10)
              }
            }
            line = ''
          } else {
            line += char
          }
        }
        console.log('[  end] read input file')
      }
    }
  }
}
</script>

