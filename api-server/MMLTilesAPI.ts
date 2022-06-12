import axios from 'axios'
import { Express, Request, Response } from 'express'
import Config from './Config'

export default function setupMMLTilesAPIRoutes(app: Express) {
  app.get('/ortokuva/:z/:x/:y.jpg', async (req, res) => {
    const { z, x, y } = req.params
    const url = `https://tiles.kartat.kapsi.fi/ortokuva/${z}/${x}/${y}.jpg`
    await proxyRequest(url, req, res)
  })
  app.get('/maastokartta/:z/:x/:y.jpg', async (req, res) => {
    const { z, x, y } = req.params
    const nlsApiKey = Config.nlsApiKey
    const url = `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/maastokartta/default/WGS84_Pseudo-Mercator/${z}/${y}/${x}.jpg?api-key=${nlsApiKey}`
    await proxyRequest(url, req, res)
  })
}

async function proxyRequest(toUrl: string, req: Request, res: Response) {
  try {
    const fwdRes = await axios({
      url: toUrl,
      headers: { Referer: '' },
      responseType: 'stream'
    })

    res
      .status(fwdRes.status)
      .header(fwdRes.headers)
      .header('Cache-Control', 'public, max-age=1209600, s-maxage=2764800')
    fwdRes.data.pipe(res)
  } catch (e) {
    console.error(`Error while fetching MML tile`, e)
    res.status(500).send()
  }
}
