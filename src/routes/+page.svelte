<script lang="ts">
	import { Album } from '$lib/classes/Album.svelte';
	import { Track } from '$lib/classes/Track';
	import TrackEntry from '$lib/components/TrackEntry.svelte';

	//
	let searchByName = $state(true);
	let artistName = $state('');
	let albumName = $state('');
	let album: Album | null = $state(null);
	let editingAlbum = $state(false);

	let url = $state('');
	let loading = $state(false);
	let error = $state(false);
	let message = $state('');

	async function getMusicBrainzMetadata() {
		const idSearchURL = `https://musicbrainz.org/ws/2/release/?query=artist:"${artistName}" AND release:"${albumName}"&fmt=json`;

		const idSearchResponse = await fetch(idSearchURL);
		const idSearchData = await idSearchResponse.json();

		if (idSearchData.releases && idSearchData.releases.length > 0) {
			const id = idSearchData.releases[0].id;
			const dataSearchURL = `https://musicbrainz.org/ws/2/release/${id}?inc=recordings&fmt=json`;

			console.log('ID:', id);

			const dataSearchResponse = await fetch(dataSearchURL);
			const data = await dataSearchResponse.json();

			if (data.media && data.media.length > 0) {
				let coverURL = `https://coverartarchive.org/release/${id}/front`;
				const coverResponse = await fetch(coverURL);

				// Overwrite cover URL with unknown album cover image
				if (!coverResponse.ok) {
					console.log('No album cover found...');
				} else {
					console.log('Cover URL:', coverURL);
				}

				album = new Album(idSearchData.releases[0].title, coverURL);

				const tracklist = data.media[0].tracks;

				// Loop through all tracks in the tracklist and fille the album object with data
				for (let track of tracklist) {
					let newTrack: Track = new Track(
						track.recording.title,
						artistName,
						track.position,
						track.recording.length
					);

					const query = `${newTrack.artist} ${newTrack.name} official audio`;
					const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
					const data = await response.json();

					// If a video was found for the song, store it in the object!
					if (data && data.video) {
						newTrack.videoURL = data.video.url;
					}

					// Append this new song to the end of the album's tracklist array
					album.tracklist.push(newTrack);

					// Intentionally delay next query to prevent hitting API limit
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			} else {
				console.log('Album data not found.');
			}
		} else {
			error = true;
			message = `Album "${albumName}" by "${artistName}" not found. Please try again!`;
		}

		//
		return null;
	}

	async function downloadSong() {
		loading = true;
		error = false;
		message = '';

		try {
			const response = await fetch('/api/download', {
				method: 'POST',
				headers: { 'Content-Type': 'applications/json' },
				body: JSON.stringify({ url })
			});

			if (response.ok && response.headers.get('Content-Type') == 'audio/mpeg') {
				// Grab the file's proper filename (created with metadata)
				const filename = response.headers.get('File-Name') as string;

				// Create an invisible link with the content and force download it
				const blob = await response.blob();
				const downloadUrl = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = downloadUrl;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(downloadUrl);
				document.body.removeChild(a);

				message = 'Download successful!';
			} else {
				const data = await response.json();
				message = `Ran into ERROR: ${data.error}`;
				error = true;
			}
		} catch (_) {
			error = true;
			message = 'Failed to download MP3...';
		} finally {
			loading = false;
		}
	}

	async function downloadPlaylist() {
		error = true;
		message = 'Download by Playlist feature is not yet implemented...';
		console.log(message);
	}

	async function searchByNameAndArtist() {
		error = false;
		message = '';

		loading = true;

		album = null;

		try {
			await getMusicBrainzMetadata();
		} catch (err) {
			error = true;
			message = `ERROR while searching by name and artist: ${err}.`;
		} finally {
			loading = false;
		}
	}

	// Downloads either playlist or single song based on URL passed in
	async function downloadByURL() {
		url.includes('playlist') ? await downloadPlaylist() : await downloadSong();
	}
</script>

<div class="flex flex-col gap-5">
	<h1 class="text-center text-4xl select-none">Album Ripper</h1>

	<!-- Regular Ripper Menu -->
	<div class="mx-auto">
		<button
			onclick={() => {
				message = '';
				searchByName = true;
			}}
			class={searchByName ? 'bg-yellow-200 font-bold' : 'bg-white'}
		>
			By Name
		</button>
		<button
			onclick={() => {
				message = '';
				searchByName = false;
			}}
			class={!searchByName ? 'bg-yellow-200 font-bold' : 'bg-white'}
		>
			By URL
		</button>
	</div>

	{#if searchByName}
		<div class="flex flex-col justify-center gap-4">
			<input
				bind:value={artistName}
				placeholder="Artist"
				class="w-full max-w-md self-center border-2 py-1 pl-2"
			/>
			<input
				bind:value={albumName}
				placeholder="Album Name"
				class="w-full max-w-md self-center border-2 py-1 pl-2"
			/>
		</div>

		<button
			onclick={() => {
				searchByNameAndArtist();
				editingAlbum = false;
			}}
			disabled={loading || (searchByName && (!artistName || !albumName))}
			class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
		>
			{loading ? 'Searching...' : 'Search'}
		</button>

		{#if album}
			<div class="flex items-center justify-center gap-5">
				<div class="flex flex-col items-center justify-center gap-2">
					{#if !editingAlbum}
						<img
							src={album.coverURL}
							alt={`Album cover for the album ${album.name}`}
							class="aspect-square h-64"
						/>
					{:else}
						<textarea
							bind:value={album.coverURL}
							placeholder="Album Cover Image URL"
							class="aspect-square h-64 resize-none border-2 py-1 pl-2 wrap-break-word"
						></textarea>
					{/if}
					<div class="flex items-center justify-center gap-4">
						{#if !editingAlbum}
							<p class="text-md font-bold">{album.name}</p>
						{:else}
							<input bind:value={album.name} placeholder="Album Name" class="border-2 py-1 pl-2" />
						{/if}
						<button
							class="flex h-8 w-8 items-center justify-center"
							onclick={() => {
								editingAlbum = !editingAlbum;
							}}><p>{editingAlbum ? '✅' : '✏️'}</p></button
						>
					</div>
				</div>
				<div class="flex max-h-64 flex-col items-center justify-center gap-2">
					<h2 class="font-bold">{album.name} Tracklist:</h2>
					<div
						class="flex h-fit w-lg max-w-lg flex-col gap-1 overflow-auto rounded-md border-2 p-2"
					>
						{#each album.tracklist as track}
							<TrackEntry {track} />
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<p class="text-center italic">
			Use <u>YouTube Music</u> URL for proper metadata
		</p>

		<input
			bind:value={url}
			placeholder="YouTube Playlist/Song URL"
			class="w-full max-w-lg self-center border-2 py-1 pl-2"
		/>

		<button
			onclick={() => {
				downloadByURL();
			}}
			disabled={loading || (!searchByName && !url)}
			class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
		>
			{loading ? 'Downloading...' : 'Download'}
		</button>
	{/if}

	{#if message}<p class="{error ? 'text-red-500' : 'text-green-500'} italic">{message}</p>{/if}
</div>
