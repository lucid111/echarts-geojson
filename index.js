const fs = require('node:fs')
const https = require('node:https')
const process = require('node:process')

const level = 'district'
// const level = 'province'

const areaData = []

// 删除旧的map文件夹
fs.rmSync('map', { recursive: true, force: true })

// 创建map文件夹
fs.mkdirSync('map')

const addGeoJson = (list, name, adcode, full = true) => {
  https.get(`https://geo.datav.aliyun.com/areas_v3/bound/${ adcode }${ full ? '_full' : '' }.json`, (res) => {
    const chunkList = []
    console.log('statusCode:', adcode, name, res.statusCode);

    res.on('data', chunk => chunkList.push(chunk))

    res.on('end', () => {
      const data = JSON.parse(Buffer.concat(chunkList).toString())

      // 删除name为空的项
      data.features = data.features.filter(item => item.properties.name)

      data.features.forEach(item => {
        // 添加cp，否则area name会根据边界计算中心，导致位置显示不准确
        item.properties.cp = item.properties.center

        // 海南省 geometry.coordinates，只需要保留第一个数组，其他的数组都是南沙群岛的细节
        if (item.properties.name === '海南省') {
          item.geometry.coordinates = item.geometry.coordinates.slice(0, 1)
        }

        const subAreaData = {
          name: item.properties.name,
          adcode: item.properties.adcode,
        }
        list.push(subAreaData)

        // 不是指定level继续加载子级
        if (item.properties.level !== level && item.properties.childrenNum) {
          subAreaData.children = []
          addGeoJson(subAreaData.children, item.properties.name, item.properties.adcode)
        }
      })

      fs.appendFile(`map/${adcode}.json`, JSON.stringify(data), (err) => {
        if (err) throw err;
        console.log(`添加 map/${adcode}.json 文件`)
      })
    })
  }).on('error', (e) => {
    console.error(e);
  })
}

addGeoJson(areaData, '全国', 100000)

process.on('beforeExit', (code) => {
  console.log('areaData', areaData);
  fs.appendFile(`areaData.json`, JSON.stringify(areaData), (err) => {
    console.log('err', err);
    console.log(`添加 areaData.json 文件`)
    process.exit(0)
  })
});
 