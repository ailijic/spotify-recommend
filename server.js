// server.js

start()
function start () {
  'use strict'

  const unirest = require('unirest')
  const express = require('express')
  const events = require('events')

  const getFromApi = (endpoint, args) => {
    const emitter = new events.EventEmitter()
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end((response) => {
             if (response.ok) {
               emitter.emit('end', response.body)
             } else {
               emitter.emit('error', response.code)
             }
           })
    return emitter
  }

  const app = express()
  app.use(express.static('public'))

  app.get('/search/:name', (req, res) => {
    const searchReq = getFromApi('search', {
      q: req.params.name,
      limit: 1,
      type: 'artist'
    })

    searchReq.on('error', (code) => {
      res.sendStatus(code)
    })

    searchReq.on('end', (item) => {
      let artists = item.artists.items[0]

      const endpoint = `artists/${artists.id}/related-artists`
      const relatedArtist = getFromApi(endpoint)

      relatedArtist.on('end', (item) => {
        artists.related = item.artists

        // Get Top Tracks
        let artistsRetrieved = 0
        function ifComplete (artistsRetrieved) {
          if (artistsRetrieved === artists.related.length) {
            res.json(artists)
          }
        }
        artists.related.forEach((artist, index) => {
          const endpoint = `artists/${artist.id}/top-tracks?country=US`
          const topTracks = getFromApi(endpoint)

          topTracks.on('end', (obj) => {
            artists.related[index].tracks = obj.tracks
            artistsRetrieved += 1
            ifComplete(artistsRetrieved)
          })

          topTracks.on('error', (code) => {
            res.sendStatus(code)
          })
        })
      })

      relatedArtist.on('error', (code) => {
        res.sendStatus(code)
      })
    })
  })

  app.listen(process.env.PORT || 8080)
}
