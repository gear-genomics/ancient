<template>
  <div>
    <v-alert class="mt-4" v-model="error.show" type="error">{{ error.message }}</v-alert>
    <v-container class="pb-12">
      <div class="file-input-container mt-2">
        <FilePond ref="upload" class="file-input"/>
      </div>
      <div class="text-center">
        <v-btn
          outlined
          color="primary"
          @click="run(false)"
          :disabled="isLoadingSnps || isProcessingInput"
        >
          <v-icon left>fas fa-rocket</v-icon>Run inference
        </v-btn>
        <v-btn
          outlined
          color="primary"
          @click="run(true)"
          :disabled="isLoadingSnps || isProcessingInput"
        >
          <v-icon left>fas fa-eye</v-icon>Show example
        </v-btn>
      </div>
      <div class="text-center grey--text text--darken-1 mt-4 status-container">
        <div v-if="isLoadingSnps">
          <v-icon left>fas fa-cog fa-spin</v-icon>Loading SNP database...
        </div>
        <div v-else-if="isProcessingInput">
          <v-icon left>fas fa-cog fa-spin</v-icon>Crunching input data...
        </div>
      </div>
      <section v-for="res in results" :key="res.sample" class="mt-6">
        <v-card class="px-6 py-4">
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
import pkg from '@/package.json'
import vueFilePond from 'vue-filepond'
import BarChart from '@/components/BarChart'
import HilbertCurve from '@/components/HilbertCurve'
import * as tf from '@tensorflow/tfjs'

import 'filepond/dist/filepond.min.css'

import snpsUrl from '@/assets/snps.txt.gz'
import exampleUrl from '@/assets/example.tsv.gz'

const FilePond = vueFilePond()
let model

// TODO possible to store this in model?
const modelClassNames = [
  { value: 'AFR', label: 'Africa' },
  { value: 'AMR', label: 'America' },
  { value: 'EAS', label: 'East Asia' },
  { value: 'EUR', label: 'Europe' },
  { value: 'SAS', label: 'South Asia' }
]

export default {
  data() {
    return {
      error: {
        show: false,
        message: ''
      },
      results: [],
      snps: null,
      isLoadingSnps: false,
      isProcessingInput: false
    }
  },
  components: {
    BarChart,
    FilePond,
    HilbertCurve
  },
  methods: {
    run(isExample = false) {
      let inputFile
      if (!isExample) {
        inputFile = this.$refs.upload.getFile()
        if (!inputFile) {
          this.error.message = 'Error: please provide an input file.'
          this.error.show = true
          return
        }
      }

      this.error.show = false
      this.results = []
      this.isProcessingInput = true

      this.$_processInput.postMessage({
        file: isExample ? exampleUrl : inputFile.file,
        snps: this.snps
      })

      this.$_processInput.onmessage = event => {
        const { data } = event
        this.isProcessingInput = false

        for (const sample of data) {
          const pred = tf.tidy(() => {
            const hilbertTensor = tf.tensor1d(sample.hilbert)
            const xs = tf.reshape(hilbertTensor, [-1, 128, 128, 1])
            return model.predict(xs)
          })

          const probs = pred.dataSync()
          const vlSpec = {
            title: 'Probability of ancestry',
            data: { values: [] },
            mark: 'bar',
            encoding: {
              y: {
                field: 'population',
                type: 'nominal',
                axis: { title: null }
              },
              x: {
                field: 'probability',
                type: 'quantitative',
                axis: { title: null }
              }
            },
            $schema:
              'https://vega.github.io/schema/vega-lite/v4.0.0-beta.9.json'
          }
          probs.forEach((prob, i) => {
            vlSpec.data.values.push({
              population: modelClassNames[i].label,
              probability: prob
            })
          })

          sample.vlSpec = vlSpec
        }

        this.results = data
      }
    }
  },
  async created() {
    try {
      model = await tf.loadLayersModel(
        `${__webpack_public_path__}tfjs_artifacts.${pkg.version}/model.json`
      )
    } catch {
      this.error.message = 'Model failed to load.'
      this.error.show = true
      return
    }

    this.$_processInput = new Worker('@/workers/processInput.js', {
      type: 'module'
    })
    const loadSnps = new Worker('@/workers/loadSnps.js', {
      type: 'module'
    })
    loadSnps.onmessage = event => {
      this.snps = event.data
      this.isLoadingSnps = false
    }
    this.isLoadingSnps = true
    loadSnps.postMessage({ url: snpsUrl })
  }
}
</script>

<style scoped>
.file-input-container,
.v-card {
  max-width: 1200px;
  margin: 0 auto;
}

.file-input >>> .filepond--root {
  font-family: inherit;
}

.file-input >>> .filepond--panel-root {
  background-color: transparent;
  border: 1px solid #64605e;
}

.status-container {
  font-family: 'Comfortaa', sans-serif;
}

.vis-container {
  display: flex;
  align-items: center;
}

.chart-container {
  margin: 0 0 0 2rem;
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
