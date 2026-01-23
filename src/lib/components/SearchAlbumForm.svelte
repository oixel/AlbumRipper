<script lang="ts">
	import { Album } from '$lib/classes/Album.svelte';
	import { Track } from '$lib/classes/Track.svelte';

	let {
		albumName = $bindable(),
		artistName = $bindable(),
		isDeluxe = $bindable(),
		album = $bindable(),
		loading = $bindable(),
		expectedTracklistLength = $bindable(),
		editingAlbum = $bindable(),
		error = $bindable(),
		message = $bindable(),
		goToAlbumView
	}: {
		albumName: string;
		artistName: string;
		isDeluxe: boolean;
		album: Album | null;
		loading: boolean;
		expectedTracklistLength: number;
		editingAlbum: boolean;
		error: boolean;
		message: string;
		goToAlbumView: Function;
	} = $props();

	//
	async function getMusicBrainzMetadata(releasesIndex: number = 0) {
		// Wipe currently stored album
		album = null;

		// Find release ID for the most relevant track with given artist and album names
		const idSearchURL = `https://musicbrainz.org/ws/2/release/?query=artist:"${artistName}"${albumName ? ` AND release:"${albumName}"&fmt=json` : ''}`;
		const idSearchData = await fetch(idSearchURL).then((result) => result.json());

		// If no found album has a proper tracklist return no album
		if (releasesIndex >= idSearchData.releases.length) return null;

		if (idSearchData.releases && idSearchData.releases.length > 0) {
			// Initialize desired album to best search result
			let correctAlbum = idSearchData.releases[releasesIndex];

			// If deluxe album is desired, find deluxe version using the releases disambiguation tag
			if (isDeluxe) {
				for (let release of idSearchData.releases) {
					if (release.disambiguation == 'deluxe') {
						correctAlbum = release;
						break;
					}
				}
			}

			const id = correctAlbum.id;
			const dataSearchURL = `https://musicbrainz.org/ws/2/release/${id}?inc=recordings&fmt=json`;
			const data = await fetch(dataSearchURL).then((result) => result.json());

			if (data.media && data.media.length > 0) {
				const foundArtistName = correctAlbum['artist-credit'][0].name;
				let coverURL = `https://coverartarchive.org/release/${id}/front`;

				album = new Album(correctAlbum.title, foundArtistName, data.date.substr(0, 4), coverURL);
				goToAlbumView();

				const tracklist = data.media[0].tracks;

				if (!tracklist || !tracklist.length) {
					return getMusicBrainzMetadata(releasesIndex + 1);
				}

				expectedTracklistLength = tracklist.length;

				// Loop through all tracks in the tracklist and fille the album object with data
				for (let track of tracklist) {
					// Find all artists that worked on this track and store their names
					const artistsData = await fetch(
						`http://musicbrainz.org/ws/2/recording/${track.recording.id}?inc=releases+artists&fmt=json`
					).then((result) => result.json());
					const artists: Array<string> = artistsData['artist-credit'].map(
						(artist: any) => artist.name
					);

					// Create a new track object from the queried data
					let newTrack: Track = new Track(
						track.position,
						track.recording.title,
						artists,
						track.recording.length
					);

					// Queries for the song's video on YouTube by combining the track's info
					const query = `${artists.join(' ')} ${newTrack.name} official audio`;
					const data = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then((response) =>
						response.json()
					);

					// If a video was found for the song, store it in the object!
					if (data && data.video) {
						newTrack.videoURL = data.video.url;
					}

					// Prevent error if 'Go Back' is pressed while searching for tracks by returning out before appending
					if (!album) return;

					// Append this new song to the end of the album's tracklist array
					album.tracklist.push(newTrack);

					// Intentionally delay next query to prevent hitting API limit
					await new Promise((resolve) => setTimeout(resolve, 250));
				}
			} else {
				console.log('Album data not found.');
			}
		} else {
			error = true;
			message = `Album "${albumName}"${artistName ? ` by "${artistName}"` : ''} not found. Please try again!`;
		}

		//
		return null;
	}

	//
	async function search() {
		error = false;
		message = '';

		loading = true;

		try {
			await getMusicBrainzMetadata();
			if (album) message = `Successfully found songs in ${album.name}!`;
		} catch (err) {
			error = true;
			message = `ERROR while searching by name and artist: ${err}.`;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col items-center justify-center gap-4">
	<div class="flex w-full max-w-md items-center justify-center gap-4">
		<label for="album-name"><b>Album:</b></label>
		<input
			name="album-name"
			bind:value={albumName}
			disabled={loading}
			placeholder="Album Name"
			class="w-full border-2 py-1 pl-2"
		/>

		<div class="flex items-center justify-center gap-2">
			<input class="bg-red-300" type="checkbox" name="deluxe-toggle" bind:checked={isDeluxe} />
			<label for="deluxe-toggle" class="pb-1">Deluxe?</label>
		</div>
	</div>
	<div class="flex w-full max-w-md items-center justify-center gap-4">
		<label for="artist-name"><b>Artist:</b></label>
		<input
			name="artist-name"
			bind:value={artistName}
			disabled={loading}
			placeholder="Artist Name"
			class="w-full border-2 py-1 pl-2"
		/>
	</div>
</div>

<p class="mx-auto">
	<i>If the album is not what you expect or data is missing, refresh or search again!</i>
</p>

<button
	onclick={() => {
		search();
		editingAlbum = false;
	}}
	disabled={loading || !albumName}
	type="submit"
	class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
>
	{loading ? 'Searching...' : 'Search'}
</button>
