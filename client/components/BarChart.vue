<template>
  <div ref="barChart"></div>
</template>

<script>
import vegaEmbed from 'vega-embed'

export default {
  props: {
    spec: {
      type: Object
    }
  },
  mounted() {
    vegaEmbed(this.$refs.barChart, this.spec)
  }
}
</script>

