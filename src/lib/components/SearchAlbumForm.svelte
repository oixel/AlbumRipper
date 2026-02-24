<script lang="ts">
	import { Album } from '$lib/classes/Album.svelte';
	import { Track } from '$lib/classes/Track.svelte';
	import type { SearchResult } from '$lib/interfaces/SearchResult.svelte';
	import SearchResultEntry from './SearchResultEntry.svelte';

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
	let searchResults: Array<SearchResult> = $state([]);

	async function getSearchResults() {
		// Wipe previous search results
		searchResults = [];

		const searchURL = `https://musicbrainz.org/ws/2/release/?query=artist:"${artistName}"${albumName ? ` AND release:"${albumName}"&fmt=json` : ''}`;
		const searchData = await fetch(searchURL).then((result) => result.json());

		//
		if (!searchData.releases || searchData.releases.length <= 0) {
			error = true;
			message = `Album "${albumName}"${artistName ? ` by "${artistName}"` : ''} not found. Please try again!`;
			return null;
		}

		const releases = searchData.releases;

		for (let i = 0; i < releases.length; i++) {
			const release = releases[i];

			const searchResult: SearchResult = {
				title: release.title ?? 'Unknown Album',
				artists: release['artist-credit'].map((artist: { name: any }) => artist.name),
				trackCount: release['track-count'] ?? -1,
				isDeluxe: release.disambiguation?.toLowerCase().includes('deluxe') ?? false,
				releaseDate: Object.hasOwn(release, 'release-events')
					? release['release-events'][0].date
					: 'N/A',
				id: release.id
			};

			searchResults.push(searchResult);
		}
	}

	// Query MusicBrainz's data base for the selected album's metadata (album name, artist, cover art, and tracklist)
	async function getMusicBrainzMetadata(result: SearchResult) {
		// Wipe currently stored album
		album = null;

		//
		const dataSearchURL = `https://musicbrainz.org/ws/2/release/${result.id}?inc=recordings&fmt=json`;
		const releaseData = await fetch(dataSearchURL).then((result) => result.json());

		if (releaseData.media && releaseData.media.length > 0) {
			let coverURL = `https://coverartarchive.org/release/${result.id}/front`;

			album = new Album(
				result.title,
				result.artists.join('; '),
				result.releaseDate.substring(0, 4),
				coverURL
			);
			goToAlbumView();

			//
			const tracklist = releaseData.media[0].tracks;
			expectedTracklistLength = tracklist.length;

			// Loop through all tracks in the tracklist and fille the album object with data
			for (let track of tracklist) {
				// Create a new track object from the queried data
				let newTrack: Track = new Track(
					track.position,
					track.recording.title,
					result.artists,
					track.recording.length
				);

				// Queries for the song's video on YouTube by combining the track's info
				const query = `${result.artists.join(' ')} ${newTrack.name} official audio`;
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

		return null;
	}

	//
	async function searchForReleases() {
		error = false;
		message = '';

		loading = true;

		try {
			await getSearchResults();
			if (searchResults.length)
				message = `${searchResults.length} releases found for ${albumName}!`;
			else {
				error = true;
				message = `No releases found for ${albumName}.`;
			}
		} catch (err) {
			error = true;
			message = `ERROR while searching for releases: ${err}.`;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4">
	<h2 class="text-2xl font-bold underline select-none">Search</h2>
	<div class="flex w-full max-w-md items-center justify-center gap-4">
		<label for="album-name" class="select-none"><b>Album:</b></label>
		<input
			name="album-name"
			bind:value={albumName}
			disabled={loading}
			placeholder="Album Name"
			class="w-full border-2 py-1 pl-2"
		/>
	</div>
	<div class="flex w-full max-w-md items-center justify-center gap-4">
		<label for="artist-name" class="select-none"><b>Artist:</b></label>
		<input
			name="artist-name"
			bind:value={artistName}
			disabled={loading}
			placeholder="Artist Name"
			class="w-full border-2 py-1 pl-2"
		/>
	</div>

	{#if searchResults.length}
		<h3 class="font-bold">Results:</h3>
		<div class="aspect-video max-h-1/2 overflow-scroll border-2 px-3">
			<table>
				<tbody>
					<tr class="sticky top-0 bg-white">
						<th class="max-w-32 overflow-hidden text-nowrap text-ellipsis whitespace-nowrap"
							>Album</th
						>
						<th>Artist(s)</th>
						<th>Track(s)</th>
						<th>Deluxe</th>
						<th>Release</th>
						<th></th>
					</tr>
					{#each searchResults as result}
						<SearchResultEntry
							{result}
							selectResult={(release: SearchResult) => getMusicBrainzMetadata(release)}
						/>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<button
		onclick={() => {
			searchForReleases();
			editingAlbum = false;
		}}
		disabled={loading || !albumName}
		type="submit"
		class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
	>
		{loading ? 'Searching...' : 'Search'}
	</button>
</div>
