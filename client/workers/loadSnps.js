import axios from 'axios'
import pako from 'pako'

async function load() {
  const snpReq = await axios.get(`${process.env.baseUrl}snps.txt.gz`, {
    responseType: 'arraybuffer'
  })

  const snpData = new TextDecoder('utf-8').decode(pako.inflate(snpReq.data))

  let line = ''
  let index = 0
  const snps = {
    rs: {},
    affy: {}
  }

  //console.log('[start] read snp data')

  for (let char of snpData) {
    if (char === '\n') {
      const [, , rsId, affyId, affyAllele] = line.split('\t')
      snps.rs[rsId] = index
      snps.affy[affyId] = { rsId, allele: affyAllele }
      index += 1
      line = ''
    } else {
      line += char
    }
  }

  //console.log(`[  end] read snp data (n=${index})`)
  return snps
}

addEventListener('message', async () => {
  const snps = await load()
  postMessage(snps)
})
