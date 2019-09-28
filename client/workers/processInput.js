import * as hilbertCurve from 'hilbert-curve'
import _ from 'lodash'
import pako from 'pako'
import * as tf from '@tensorflow/tfjs'

let model
;(async () => {
  model = await tf.loadLayersModel('/tfjs_artifacts/model.json')
})()

const order = 7
// TODO possible to store this in model?
const modelClassNames = ['AFR', 'AMR', 'EAS', 'EUR', 'SAS']

addEventListener('message', event => {
  const { file, snps } = event.data
  const reader = new FileReader()
  const isGzip = file.type === 'application/gzip'

  if (isGzip) {
    reader.readAsArrayBuffer(file)
  } else {
    reader.readAsText(file)
  }

  const numSnps = Object.keys(snps.rs).length
  let samples
  const genotypes = {}

  reader.onload = event => {
    let content = event.target.result
    if (isGzip) {
      content = pako.ungzip(content, { to: 'string' })
    }
    let line = ''
    let count = 0
    let snpCount = 0
    console.log('[start] read input file')
    for (let char of content) {
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
          if (!(rsId in snps.rs)) {
            line = ''
            continue
          }
          snpCount += 1
          const index = snps.rs[rsId]
          for (const [sample, genotype] of _.zip(samples, fields.slice(1))) {
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

    const results = []
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const sample = samples[sampleIndex]
      console.log(`[start] processing sample ${sample}`)
      const data = genotypes[sample]
      console.log('raw genotypes', _.countBy(data))
      const gts = hilbertCurve.construct(data, order)
      console.log('binned genotypes', _.countBy(gts))

      const grayscaleValues = gts.map(gt => {
        if (gt === 2) {
          return 0
        }
        if (gt === 1) {
          return 0.5
        }
        return 1
      })

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
        $schema: 'https://vega.github.io/schema/vega-lite/v4.0.0-beta.1.json'
      }
      probs.forEach((prob, i) => {
        vlSpec.data.values.push({
          class: modelClassNames[i],
          probability: prob
        })
      })

      results.push({
        sample,
        prediction: probs,
        vlSpec,
        hilbert: grayscaleValues
      })

      console.log(`[  end] processing sample ${sample}`)
    }
    postMessage(results)
  }
})
