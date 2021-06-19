import axios from 'axios'
import { Express } from 'express'

export default function setupMMLAerialImageryAPIRoutes(app: Express) {
  app.get('/ortokuva/:z/:x/:y.jpg', async (req, res) => {
    const { z, x, y } = req.params
    const url = `https://karttamoottori.maanmittauslaitos.fi/maasto/wmts/1.0.0/ortokuva/default/WGS84_Pseudo-Mercator/${z}/${y}/${x}.jpg`
    try {
      const fwdRes = await axios({
        url,
        headers: { Referer: '' },
        responseType: 'arraybuffer'
      })
      res
        .status(fwdRes.status)
        .header(fwdRes.headers)
        .header('Cache-Control', 'public, max-age=1209600, s-maxage=2764800')
        .send(fwdRes.data)
    } catch (e) {
      console.error(`Error while fetching MML ortokuva`, e)
      res.status(500).send()
    }
  })
}
