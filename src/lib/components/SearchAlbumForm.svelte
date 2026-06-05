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
		editing = $bindable(),
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
		editing: boolean;
		error: boolean;
		message: string;
		goToAlbumView: Function;
	} = $props();

	let searchResults: Array<SearchResult> = $state([]);

	async function getSearchResults() {
		// Wipe previous search results
		searchResults = [];

		const searchURL = `https://musicbrainz.org/ws/2/release/?query=${artistName ? `artist:"${artistName}"` : ''}${albumName ? ` AND release:"${albumName}"` : ''}&fmt=json`;
		const searchData = await fetch(searchURL).then((result) => result.json());

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

	// Try to fetch from YouTube, but limit rate and retry if hitting request limit
	async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<any> {
		for (let i = 0; i < retries; i++) {
			const response = await fetch(url);
			if (response.status === 429) {
				// Wait longer each retry
				await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
				continue;
			}
			return response.json();
		}

		return null;
	}

	// Query MusicBrainz's data base for the selected album's metadata (album name, artist, cover art, and tracklist)
	async function getMusicBrainzMetadata(result: SearchResult) {
		// Wipe any old data
		album = null;
		message = '';

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

			// Ensure that all discs are accounted for when loading tracks
			const tracklist = releaseData.media.flatMap((disc: any) =>
				disc.tracks.map((track: any) => ({ ...track, disc: disc.position }))
			);
			expectedTracklistLength = tracklist.length;

			// Loop through all tracks in the tracklist and fill the album object with data
			for (let track of tracklist) {
				// Create a new track object from the queried data
				let newTrack: Track = new Track(
					track.id,
					track.disc,
					track.position,
					track.recording.title,
					result.artists,
					track.recording.length
				);

				// Queries for the song's video on YouTube by combining the track's info
				const query = `${result.artists.join(' ')} ${newTrack.name} official audio`;
				const data = await fetchWithRetry(`/api/search?q=${encodeURIComponent(query)}`);

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

	// Display count of release options
	async function searchForReleases() {
		error = false;
		message = '';

		loading = true;

		try {
			await getSearchResults();
			if (searchResults.length)
				message = `${searchResults.length} releases found for ${albumName ? `Album: ${albumName}` : ''} ${artistName ? `Artist: ${artistName}` : ''}!`;
			else {
				error = true;
				message = `No releases found for ${albumName ? `Album: ${albumName}` : ''} ${artistName ? `Artist: ${artistName}` : ''}.`;
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
					{#each searchResults as result (result.id)}
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
			editing = false;
		}}
		disabled={loading || (!albumName && !artistName)}
		type="submit"
		class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
	>
		{loading ? 'Searching...' : 'Search'}
	</button>
</div>
