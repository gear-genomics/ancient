<template>
  <div>
    <v-alert class="mt-4" v-model="error.show" dismissible type="error">{{ error.message }}</v-alert>
    <v-container class="pb-12">
      <div class="file-input-container mt-2">
        <FilePond ref="upload" class="file-input"/>
      </div>
      <div class="text-center">
        <v-btn outlined color="primary" @click="run" :disabled="isLoadingSnps || isProcessingInput">
          <v-icon left>fas fa-rocket</v-icon>Run inference
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
import vueFilePond from 'vue-filepond'
import BarChart from '@/components/BarChart'
import HilbertCurve from '@/components/HilbertCurve'

import 'filepond/dist/filepond.min.css'

const FilePond = vueFilePond()

export default {
  data() {
    return {
      error: {
        show: false,
        message: ''
      },
      results: [],
      snps: null,
      isLoadingSnps: true,
      isProcessingInput: false
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
      this.results = []
      this.isProcessingInput = true
      this.$_processInput.postMessage({
        file: inputFile.file,
        snps: this.snps
      })
      this.$_processInput.onmessage = event => {
        const payload = event.data
        if (payload.type === 'result') {
          this.results.push(payload.value)
        } else if (payload.type === 'EOM') {
          this.isProcessingInput = false
        }
      }
    }
  },
  created() {
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
    loadSnps.postMessage(null)
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


