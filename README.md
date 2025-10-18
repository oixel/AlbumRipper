# AlbumRipper
A tool designed to easily download albums for portable music players.

## Planning
Currently I am looking towards two different APIs that might allow the streamlining of finding tracklists.
1) [Discog API](https://www.discogs.com/developers)
2) [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API)

I am leaning more towards MusicBrainz as it is entirely free and does not require any API keys.

---

For use with MusicBrainz queries can be done as such:
For finding a specific album (e.g. Getting Killed): `https://musicbrainz.org/ws/2/release/?query=album:Getting_Killed`
- This will return a lot of XML data, but the main goal is the find the correct album's "MusicBrainz ID" (MBID)
- This can be found in the release tag...

_For example:_
`<release id="0bf006ce-45a5-4963-89cb-cd285fd768bb" ns2:score="100">`

If we then take this ID into another query: `https://musicbrainz.org/ws/2/release/0bf006ce-45a5-4963-89cb-cd285fd768bb?inc=recordings&fmt=json`
- This will then return the tracklist information!

To get the cover art, another query can be used: `https://coverartarchive.org/release/0bf006ce-45a5-4963-89cb-cd285fd768bb`

_NOTE:_
- The initial query returns a LOT of results (5000+).
- Need to figure out two main things:
  1) How to filter out by artist in addition (if user inputs an artist)
  2) How to filter out by "format" of 'Digital Media'
    - The non-Digital Media formats have poor quality cover art
