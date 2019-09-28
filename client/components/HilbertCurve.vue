<template>
  <canvas ref="canvas" :width="width" :height="height"></canvas>
</template>

<script>
export default {
  props: {
    width: {
      type: Number
    },
    height: {
      type: Number
    },
    data: {
      type: Array
    }
  },
  methods: {
    offset(column, row, width) {
      return row * width + column
    }
  },
  mounted() {
    const canvas = this.$refs.canvas
    const ctx = canvas.getContext('2d')
    for (let x = 0; x < 128; x += 1) {
      for (let y = 0; y < 128; y += 1) {
        const value = this.data[this.offset(x, y, 128)] * 255
        ctx.fillStyle = `rgba(${value}, ${value}, ${value})`
        ctx.fillRect(x * 2, y * 2, 2, 2)
      }
    }
  }
}
</script>

<style scoped>
canvas {
  display: block;
}
</style>
