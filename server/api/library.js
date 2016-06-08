import Providers from '../providers/index'
import KoaRouter from 'koa-router'

let router = KoaRouter()
let debug = require('debug')
let log = debug('app:library')
let error = debug('app:library:error')
let isScanning

// all artists and songs (normalized)
router.get('/api/library', async (ctx, next) => {
  let rows, songs
  let artistIds = [] // ordered alphabetically
  let artists = {} // indexed by artistId

  log('Artist list requested')

  // get artists
  rows = await ctx.db.all('SELECT id, name FROM artists ORDER BY name')

  rows.forEach(function(row){
    artistIds.push(row.id)
    artists[row.id] = row
    artists[row.id].children = []
  })

  // assign songs to artists
  songs = await ctx.db.all('SELECT artistId, uid, title, plays FROM songs ORDER BY title')

  songs.forEach(function(row){
    artists[row.artistId].children.push(row)
  })

  log('Responding with %s songs by %s artists', songs.length, artistIds.length)
  ctx.body = {result: artistIds, entities: {artists}}
})

// scan for new songs
router.get('/api/library/scan', async (ctx, next) => {
  if (isScanning) {
    log('Scan already in progress; skipping request')
    return
  }

  isScanning = true

  for (let provider in Providers) {
    log('Getting configuration for provider "%s"', provider)

    // get provider's full config
    let rows = await ctx.db.all('SELECT * FROM config WHERE domain = ?', [provider])
    let config = rows2obj(rows)

    if (typeof config !== 'object') {
      log('Error reading configuration')
      continue
    }

    if (!config.enabled) {
      log('Provider not enabled; skipping')
      continue
    }

    // call each provider's scan method, passing config object and
    // koa context (from which we can access the db, and possibly
    // send progress updates down the wire?)
    //
    // these scans could eventually be asynchronous (by removing 'await')
    // but doing it synchronously for now
    log('Provider \'%s\' starting scan', provider)
    Providers[provider].scan(config, ctx)
    log('Provider \'%s\' finished', provider)
  }

  isScanning = false
})

export default router

// helper
function rows2obj(rows) {
  if (!rows) return false

  let out = {}
  rows.forEach(function(row){
    let {key, val} = row

    // simple transform for booleans
    if (val === '0') val = false
    if (val === '1') val = true

    if (typeof out[key] !== 'undefined') {
      if (Array.isArray(out[key])) {
        return out[key].push(val)
      } else {
        return out[key] = [out[key], val]
      }
    }

    out[key] = val
  })
  return out
}