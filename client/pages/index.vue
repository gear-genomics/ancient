<template>
  <div>
    <v-alert class="mt-4" v-model="error.show" dismissible type="error">
      {{ error.message }}
    </v-alert>
    <v-container>
      <FilePond ref="upload" />
      <div class="text-center">
        <v-btn outlined color="primary" @click="run">
          <v-icon left>fas fa-rocket</v-icon>Run inference
        </v-btn>
      </div>
      <section v-for="(res, i) in results" :key="i" class="mt-6">
        <v-card class="px-6 py-4 mb-6">
          <v-card-title class="mb-2 card-header">{{ res.sample }}</v-card-title>
          <div class="vis-container">
            <canvas :id="`canvas${i}`" width="256" height="256"></canvas>
            <div :id="`chart${i}`" class="chart-container"></div>
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
import vegaEmbed from 'vega-embed'
import vueFilePond from 'vue-filepond'
import 'filepond/dist/filepond.min.css'

const FilePond = vueFilePond()
loadModel()
loadSnps()

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

function offset(column, row, width) {
  return row * width + column
}

function drawHilbertCurve(sampleIndex, data) {
  const canvas = document.querySelector(`#canvas${sampleIndex}`)
  const ctx = canvas.getContext('2d')
  for (let x = 0; x < 256; x += 2) {
    for (let y = 0; y < 256; y += 2) {
      const value = data[offset(x / 2, y / 2, 128)]
      ctx.fillStyle = `rgba(0,0,0,${value})`
      ctx.fillRect(x, y, 2, 2)
    }
  }
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
          const gts = new Uint8Array(128 * 128)
          const binSize = data.length / gts.length
          for (let i = 0; i < gts.length; i += 1) {
            const chunk = data.slice(
              Math.ceil(i * binSize),
              Math.floor((i + 1) * binSize)
            )
            if (chunk.length > 0) {
              // TODO allow additional strategies
              gts[i] = Math.max(...chunk)
            }
          }
          const levels = Math.ceil(Math.log2(Math.sqrt(gts.length)))
          const n = 2 ** levels

          const imageData = new Float32Array(n * n)

          for (let index = 0; index < gts.length; index += 1) {
            const point = hilbertCurve.indexToPoint(index, n)
            const gt = gts[index]
            if (gt === 0) {
              imageData[offset(point.x, point.y, n)] = 0
            } else if (gt === 1) {
              imageData[offset(point.x, point.y, n)] = 0.5
            } else {
              imageData[offset(point.x, point.y, n)] = 1
            }
          }

          const imageDataTensor = tf.tensor1d(imageData)
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
            hilbert: imageData
          })

          console.log(`[  end] processing sample ${sample}`)
        }

        this.results = _results

        setTimeout(() => {
          for (
            let sampleIndex = 0;
            sampleIndex < samples.length;
            sampleIndex += 1
          ) {
            drawHilbertCurve(sampleIndex, this.results[sampleIndex].hilbert)
            vegaEmbed(`#chart${sampleIndex}`, this.results[sampleIndex].vlSpec)
          }
        }, 100)
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


