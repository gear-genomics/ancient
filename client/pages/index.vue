<template>
  <div>...index page goes here...</div>
</template>

<script>
import * as tf from '@tensorflow/tfjs'

export default {
  async asyncData() {
    const model = await tf.loadLayersModel('/tfjs_artifacts/model.json')
    return { model }
  }
}
</script>

