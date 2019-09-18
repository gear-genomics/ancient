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
      <section v-for="(res, i) in results" :key="i" class="mt-6">
        <v-card class="px-6 py-4 mb-6">
          <v-card-title class="mb-2 card-header">{{ res.sample }}</v-card-title>
          <div class="vis-container">
            <div class="canvas-container pa-2 grey--text text--lighten-2">
              <HilbertCurve :width="256" :height="256" :data="res.hilbert"/>
            </div>
            <div class="chart-container">
              <BarChart :spec="res.vlSpec"/>
            </div>
          </div>
        </v-card>
      </section>
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
import BarChart from '@/components/BarChart'
import HilbertCurve from '@/components/HilbertCurve'

import 'filepond/dist/filepond.min.css'

const FilePond = vueFilePond()
loadModel()
loadSnps()

const order = 7

const rsIds = {}
let model
// TODO possible to store this in model?
const modelClassNames = ['AFR', 'AMR', 'EAS', 'EUR', 'SAS']
let numSnps

async function loadModel() {
  model = await tf.loadLayersModel('/tfjs_artifacts/model.json')
}

async function loadSnps() {
  const snpReq = await axios.get('/snps.txt.gz', {
    responseType: 'arraybuffer'
  })

  const snpData = new TextDecoder('utf-8').decode(pako.inflate(snpReq.data))

  console.log('[start] read snp data')

  let line = ''
  let index = 0
  for (let char of snpData) {
    if (char === '\n') {
      const [chrom, pos, rsId] = line.split('\t')
      rsIds[rsId] = { index, chrom, pos }
      index += 1
      line = ''
    } else {
      line += char
    }
  }

  numSnps = index

  console.log(`[  end] read snp data (n=${numSnps})`)
}

export default {
  data() {
    return {
      error: {
        show: false,
        message: ''
      },
      results: []
    }
  },
  components: {
    BarChart,
    FilePond,
    HilbertCurve
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
        let count = 0
        let snpCount = 0
        console.log('[start] read input file')
        for (let char of contents) {
          if (char === '\n') {
            count += 1
            if (count % 100000 === 0) {
              console.log(`    processed ${count} lines`)
            }
            if (line.startsWith('#')) {
              line = ''
              continue
            }
            const fields = line.split('\t')
            if (!samples) {
              samples = fields.slice(1)
              for (const sample of samples) {
                genotypes[sample] = new Uint8Array(numSnps)
              }
            } else {
              const rsId = fields[0]
              if (!(rsId in rsIds)) {
                line = ''
                continue
              }
              snpCount += 1
              const index = rsIds[rsId].index
              for (const [sample, genotype] of _.zip(
                samples,
                fields.slice(1)
              )) {
                let gt = Number.parseInt(genotype, 10)
                // TODO figure out how to deal with those properly
                if (gt < 0 || gt > 2) {
                  gt = 0
                }
                genotypes[sample][index] = gt
              }
            }
            line = ''
          } else {
            line += char
          }
        }
        console.log(`[  end] read input file (n model snps=${snpCount})`)

        // TODO check that samples have at least 1% non-ref genotypes

        const _results = []
        for (
          let sampleIndex = 0;
          sampleIndex < samples.length;
          sampleIndex += 1
        ) {
          const sample = samples[sampleIndex]
          console.log(`[start] processing sample ${sample}`)
          const data = genotypes[sample]
          console.log('raw genotypes', _.countBy(data))
          const gts = hilbertCurve.construct(data, order)
          console.log('binned genotypes', _.countBy(gts))

          const grayscaleValues = new Array(gts.length)
          grayscaleValues.fill(1)

          for (let i = 0; i < gts.length; i += 1) {
            if (gts[i] === 2) {
              grayscaleValues[i] = 0
            } else if (gts[i] === 1) {
              grayscaleValues[i] = 0.5
            }
          }

          console.log('grayscale values', _.countBy(grayscaleValues))

          const imageDataTensor = tf.tensor1d(grayscaleValues)
          const xs = tf.reshape(imageDataTensor, [-1, 128, 128, 1])
          const pred = model.predict(xs)

          const probs = pred.dataSync()
          const vlSpec = {
            data: { values: [] },
            mark: 'bar',
            encoding: {
              y: { field: 'class', type: 'nominal' },
              x: { field: 'probability', type: 'quantitative' }
            },
            $schema:
              'https://vega.github.io/schema/vega-lite/v4.0.0-beta.1.json'
          }
          probs.forEach((prob, i) => {
            vlSpec.data.values.push({
              class: modelClassNames[i],
              probability: prob
            })
          })

          _results.push({
            sample,
            prediction: probs,
            vlSpec,
            hilbert: grayscaleValues
          })

          console.log(`[  end] processing sample ${sample}`)
        }

        this.results = _results
      }
    }
  }
}
</script>

<style scoped>
.vis-container {
  display: flex;
  align-items: center;
}

.chart-container {
  margin: 0 0 0 2rem;
}

canvas {
  display: block;
}

.canvas-container {
  border: 1px solid;
}

@media (max-width: 700px) {
  .vis-container,
  .card-header {
    flex-direction: column;
  }

  .chart-container {
    margin: 2rem 0 0 0;
  }
}
</style>


