<template>
  <div>
    <v-alert class="mt-4" v-model="error.show" dismissible type="error">{{ error.message }}</v-alert>
    <v-container>
      <FilePond ref="upload"/>
      <v-btn outlined color="primary" @click="run">
        <v-icon left>fas fa-rocket</v-icon>Run inference
      </v-btn>
    </v-container>
  </div>
</template>

<script>
import * as tf from '@tensorflow/tfjs'
import vueFilePond from 'vue-filepond'
import 'filepond/dist/filepond.min.css'

const FilePond = vueFilePond()

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
      console.log('running analysis...', inputFile)
    }
  },
  async asyncData() {
    const model = await tf.loadLayersModel('/tfjs_artifacts/model.json')
    return { model }
  }
}
</script>

