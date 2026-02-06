````markdown
# OpenClaw-Last.fm

A openclaw Skill with Last.fm API

## Requirements

- Last.fm API Key ([Get in website](https://www.last.fm/api))

## How to request API

- Root URL: `https://ws.audioscrobbler.com/2.0/` (GET/POST)

### Required parameters

- `api_key`: API Key
- `method`: Method name
- `format`: XML (default) or JSON

---

## Methods

Below are commonly used Last.fm methods grouped by resource type.  
All requests use the same base URL and append query parameters.

---

### Artist

#### `artist.getInfo`

Get detailed information about a specific artist (bio, images, stats, tags, similar artists, etc.).

**Example request (JSON):**

```http
GET https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=Radiohead&api_key=YOUR_API_KEY&format=json
```
````

#### `artist.getTopTracks`

Get the top tracks for an artist, ordered by playcount.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=Radiohead&api_key=YOUR_API_KEY&format=json
```

#### `artist.getTopAlbums`

Get the top albums for an artist, ordered by playcount.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=Radiohead&api_key=YOUR_API_KEY&format=json
```

#### `artist.search`

Search for artists by name and get a list of matching artists.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=Radiohead&api_key=YOUR_API_KEY&format=json
```

---

### Album

#### `album.getInfo`

Get album metadata (tracks, tags, playcount, cover art, etc.) for a given artist and album.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=album.getinfo&artist=Radiohead&album=OK+Computer&api_key=YOUR_API_KEY&format=json
```

#### `album.getTopTags`

Get the most popular tags applied to a specific album.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=album.gettoptags&artist=Radiohead&album=OK+Computer&api_key=YOUR_API_KEY&format=json
```

#### `album.search`

Search for albums by name and get possible matches.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=album.search&album=OK+Computer&api_key=YOUR_API_KEY&format=json
```

---

### Track

#### `track.getInfo`

Get detailed metadata for a track, including album, duration, listeners, playcount, and wiki (if available).

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=track.getinfo&artist=Radiohead&track=Karma+Police&api_key=YOUR_API_KEY&format=json
```

#### `track.getTopTags`

Get the most popular tags for a given track.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=track.gettoptags&artist=Radiohead&track=Karma+Police&api_key=YOUR_API_KEY&format=json
```

#### `track.search`

Search for tracks by name (and optionally by artist) and get a list of matches.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=track.search&track=Karma+Police&api_key=YOUR_API_KEY&format=json
```

---

### User

#### `user.getInfo`

Get profile information about a user (playcount, country, age (if public), images, etc.).

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=someusername&api_key=YOUR_API_KEY&format=json
```

#### `user.getRecentTracks`

Get the list of recently scrobbled tracks by a user, including timestamps and “now playing” status.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=someusername&limit=20&api_key=YOUR_API_KEY&format=json
```

#### `user.getTopArtists`

Get a user’s top artists over a specific period (overall, 7day, 1month, 3month, 6month, 12month).

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=someusername&period=1month&limit=20&api_key=YOUR_API_KEY&format=json
```

#### `user.getTopTracks`

Get a user’s top tracks over a selected period.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=someusername&period=3month&limit=20&api_key=YOUR_API_KEY&format=json
```

---

### Library

#### `library.getArtists`

Get a paginated list of all artists in a user’s library with play counts and tag counts.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=library.getartists&user=someusername&limit=10&page=1&api_key=YOUR_API_KEY&format=json
```

#### `library.getAlbums`

Get albums from a user’s library, optionally filtered by artist.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=library.getalbums&user=someusername&limit=10&page=1&api_key=YOUR_API_KEY&format=json
```

#### `library.getTracks`

Get tracks from a user’s library with their play counts.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=library.gettracks&user=someusername&limit=10&page=1&api_key=YOUR_API_KEY&format=json
```

---

### Chart

#### `chart.getTopArtists`

Get the global top artists chart on Last.fm.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=YOUR_API_KEY&format=json
```

#### `chart.getTopTracks`

Get the global top tracks chart.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=YOUR_API_KEY&format=json
```

#### `chart.getTopTags`

Get the global top tags chart.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=chart.gettoptags&api_key=YOUR_API_KEY&format=json
```

---

### Tag

#### `tag.getInfo`

Get metadata for a tag (description, reach, total uses, etc.).

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=tag.getinfo&tag=k-pop&api_key=YOUR_API_KEY&format=json
```

#### `tag.getTopArtists`

Get top artists associated with a specific tag.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=k-pop&api_key=YOUR_API_KEY&format=json
```

#### `tag.getTopTracks`

Get top tracks associated with a tag.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=k-pop&api_key=YOUR_API_KEY&format=json
```

#### `tag.getTopAlbums`

Get top albums associated with a tag.

**Example request:**

```http
GET https://ws.audioscrobbler.com/2.0/?method=tag.gettopalbums&tag=k-pop&api_key=YOUR_API_KEY&format=json
```

---
