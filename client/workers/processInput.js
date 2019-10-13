import axios from 'axios'
import * as hilbertCurve from 'hilbert-curve'
import _ from 'lodash'
import pako from 'pako'

const order = 7
const reGzip = new RegExp('^application/(x-)?gzip$')

addEventListener('message', async event => {
  const { file, snps } = event.data

  let data
  if (typeof file === 'string') {
    const res = await axios.get(file, { responseType: 'blob' })
    data = res.data
  } else {
    data = file
  }

  const reader = new FileReader()
  const isGzip = reGzip.test(data.type)

  if (isGzip) {
    reader.readAsArrayBuffer(data)
  } else {
    reader.readAsText(data)
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
    let snpCount = 0
    //console.log('[start] read input file')

    for (let char of content) {
      if (char === '\n') {
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
          const snpId = fields[0]
          let rsId
          let isAffy = false
          if (snpId in snps.affy) {
            rsId = snps.affy[snpId].rsId
            isAffy = true
          } else {
            rsId = snpId
          }
          if (!(rsId in snps.rs)) {
            line = ''
            continue
          }
          snpCount += 1
          const index = snps.rs[rsId]
          for (const [sample, genotype] of _.zip(samples, fields.slice(1))) {
            let gt = Number.parseInt(genotype, 10)
            if (isAffy && snps.affy[snpId].allele === 'AlleleB') {
              if (gt === 0) {
                gt = 2
              } else if (gt === 2) {
                gt = 0
              }
            }
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
    //console.log(`[  end] read input file (n model snps=${snpCount})`)

    // TODO check that samples have at least 1% non-ref genotypes

    const results = []
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
      const sample = samples[sampleIndex]
      //console.log(`[start] processing sample ${sample}`)
      const data = genotypes[sample]
      //console.log('raw genotypes', _.countBy(data))
      const gts = hilbertCurve.construct(data, order)
      //console.log('binned genotypes', _.countBy(gts))

      const grayscaleValues = gts.map(gt => {
        if (gt === 2) {
          return 0
        }
        if (gt === 1) {
          return 0.5
        }
        return 1
      })

      //console.log('grayscale values', _.countBy(grayscaleValues))

      results.push({
        sample,
        hilbert: grayscaleValues
      })

      //console.log(`[  end] processing sample ${sample}`)
    }
    postMessage(results)
  }
})
