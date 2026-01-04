<script lang="ts">
	import { Album } from '$lib/classes/Album.svelte';
	import { Track } from '$lib/classes/Track.svelte';
	import TrackEntry from '$lib/components/TrackEntry.svelte';

	//
	let isNameSearch = $state(true);
	let artistName = $state('');
	let albumName = $state('');
	let album: Album | null = $state(null);
	let tracklistLength: number = $state(0);
	let editingAlbum = $state(false);
	let audioQuality = $state(5);

	let url = $state('');
	let loading = $state(false);
	let error = $state(false);
	let message = $state('');

	async function getMusicBrainzMetadata() {
		// Wipe currently stored album
		album = null;

		// Find release ID for the most relevant track with given artist and album names
		const idSearchURL = `https://musicbrainz.org/ws/2/release/?query=artist:"${artistName}" AND release:"${albumName}"&fmt=json`;
		const idSearchData = await fetch(idSearchURL).then((result) => result.json());

		if (idSearchData.releases && idSearchData.releases.length > 0) {
			const id = idSearchData.releases[0].id;
			const dataSearchURL = `https://musicbrainz.org/ws/2/release/${id}?inc=recordings&fmt=json`;
			const data = await fetch(dataSearchURL).then((result) => result.json());

			if (data.media && data.media.length > 0) {
				let coverURL = `https://coverartarchive.org/release/${id}/front`;
				const coverResponse = await fetch(coverURL);

				// Grabs best search result or
				// let correctAlbum = idSearchData.releases[0];

				album = new Album(
					idSearchData.releases[0].title,
					artistName,
					data.date.substr(0, 4),
					coverURL
				);

				const tracklist = data.media[0].tracks;
				tracklistLength = tracklist.length;

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

	async function searchByNames() {
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

	//
	let downloadProgress = $state({
		downloading: false,
		downloadCount: 0,
		total: 0,
		currentTrack: '',
		status: '',
		downloadID: ''
	});

	//
	async function downloadByNames() {
		if (!album || album.tracklist.length == 0) return;

		// Exit out of album edit mode
		editingAlbum = false;

		// Reset all variables from previous download
		downloadProgress.downloadCount = 0;
		downloadProgress.total = 0;
		downloadProgress.currentTrack = '';
		downloadProgress.status = '';
		downloadProgress.downloading = true;

		error = false;
		message = '';

		try {
			// Start the download
			const startResponse = await fetch('/api/download', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					album: {
						name: album.name,
						artist: album.artist,
						year: album.year,
						coverURL: album.coverURL,
						tracklist: album.tracklist.map((track) => ({
							name: track.name,
							artists: track.artists,
							number: track.number,
							duration: track.duration,
							videoURL: track.videoURL
						}))
					},
					audioQuality: audioQuality
				})
			});

			if (!startResponse.ok) {
				throw new Error('Failed to start download.');
			}

			//
			const { downloadID } = await startResponse.json();
			downloadProgress.downloadID = downloadID;

			// Continuously poll for progress on downloads every second
			const pollInterval = setInterval(async () => {
				try {
					const statusResponse = await fetch(`/api/download?id=${downloadID}&isStatusCheck=true`);

					if (!statusResponse.ok) {
						clearInterval(pollInterval);
						error = true;
						message = 'Failed to get download status.';
						return;
					}

					const status = await statusResponse.json();

					//
					downloadProgress.downloadCount = status.downloadCount;
					downloadProgress.total = status.total;
					downloadProgress.status = status.status;
					downloadProgress.currentTrack = status.currentTrack || '';

					//
					if (status.error) {
						clearInterval(pollInterval);
						error = true;
						message = `Error: ${status.error}`;
						downloadProgress.downloading = false;
						return;
					}

					// Download the file when status indicates done
					if (status.done && album) {
						clearInterval(pollInterval);

						//
						const zipFileResponse = await fetch(
							`/api/download?id=${downloadID}&isStatusCheck=false`
						);

						if (zipFileResponse.ok) {
							// Create an invisible link with the content and force download it
							const blob = await zipFileResponse.blob();
							const downloadUrl = window.URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = downloadUrl;
							a.download = `${album.name} - ${album.artist}.zip`;
							document.body.appendChild(a);
							a.click();
							window.URL.revokeObjectURL(downloadUrl);
							document.body.removeChild(a);

							message = 'Album download successful!';
						} else {
							error = true;
							message = 'Failed to download file.';
						}

						downloadProgress.downloading = false;
					}
				} catch (err) {
					clearInterval(pollInterval);
					error = true;
					message = 'ERROR while checking download status.';
					downloadProgress.downloading = false;
					console.error('Polling ERROR:', err);
				}
			}, 1000);
		} catch (err) {
			error = true;
			message = err instanceof Error ? err.message : 'Unknown error';
			downloadProgress.downloading = false;
			console.error('Download ERROR:', err);
		}
	}

	// Downloads either playlist or single song based on URL passed in
	async function downloadByURL() {
		url.includes('playlist') ? await downloadPlaylist() : await downloadSong();
	}
</script>

<svelte:head>
	<title>Album Ripper</title>
</svelte:head>

<div class="flex flex-col gap-5">
	<h1 class="text-center text-4xl select-none">Album Ripper</h1>

	<!-- Regular Ripper Menu -->
	<div class="mx-auto">
		<button
			onclick={() => {
				message = '';
				isNameSearch = true;
			}}
			class={isNameSearch ? 'bg-yellow-200 font-bold' : 'bg-white'}
		>
			By Name
		</button>
		<button
			onclick={() => {
				message = '';
				isNameSearch = false;
			}}
			class={!isNameSearch ? 'bg-yellow-200 font-bold' : 'bg-white'}
		>
			By URL
		</button>
	</div>

	{#if isNameSearch}
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
				searchByNames();
				editingAlbum = false;
			}}
			disabled={loading || (isNameSearch && (!artistName || !albumName))}
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
						<div class="flex flex-col items-center justify-center gap-2">
							<div class="flex items-center justify-center gap-2">
								<label for="album-name"><b>Album:</b></label>

								{#if !editingAlbum}
									<p>{album.name}</p>
								{:else}
									<input
										bind:value={album.name}
										name="album-name"
										placeholder="Album Name"
										class="border-2 py-1 pl-2"
									/>
								{/if}
							</div>
							<div class="flex items-center justify-center gap-2">
								<label for="album-artist"><b>Album Artist:</b></label>

								{#if !editingAlbum}
									<p>{album.artist}</p>
								{:else}
									<input
										bind:value={album.artist}
										name="album-artist"
										placeholder="Artist Name"
										class="border-2 py-1 pl-2"
									/>
								{/if}
							</div>
							<div class="flex items-center justify-center gap-2">
								<label for="album-year"><b>Release Year:</b></label>

								{#if !editingAlbum}
									<p>{album.year}</p>
								{:else}
									<input
										bind:value={album.year}
										name="album-year"
										placeholder="Release Year"
										class="border-2 py-1 pl-2"
										type="number"
										min="0"
										max={new Date().getFullYear()}
									/>
								{/if}
							</div>
						</div>
						{#if !loading && !downloadProgress.downloading}
							<button
								class="flex h-8 w-8 items-center justify-center"
								onclick={() => {
									editingAlbum = !editingAlbum;
								}}><p>{editingAlbum ? '✅' : '✏️'}</p></button
							>
						{/if}
					</div>
				</div>
				<div class="flex max-h-72 flex-col items-center justify-center gap-2">
					<h2 class="font-bold">{album.name} Tracklist:</h2>
					<div
						class="flex h-fit w-xl max-w-xl flex-col gap-1 overflow-auto rounded-md border-2 p-2 px-4"
					>
						{#each album.tracklist as track}
							<TrackEntry {track} {album} {loading} downloading={downloadProgress.downloading} />
						{/each}
						{#if loading}
							<p>
								<i>
									Search for songs in {album.name} ({album.tracklist.length}/{tracklistLength})...
								</i>
							</p>
						{/if}
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
			onclick={() => downloadByURL()}
			disabled={loading || (!isNameSearch && !url)}
			class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
		>
			{loading ? 'Downloading...' : 'Download'}
		</button>
	{/if}

	{#if message}
		<p class="{error ? 'text-red-500' : 'text-green-500'} self-center italic">
			{message}
		</p>
	{/if}

	{#if isNameSearch && album && album.tracklist.length == tracklistLength}
		<div class="flex items-center justify-center gap-2">
			<label for="audio-quality" class="font-bold">Audio Quality:</label>
			<input
				bind:value={audioQuality}
				name="audio-quality"
				placeholder="Audo Quality"
				class="w-12 self-center border-2 py-1 pl-2"
				type="number"
				min="1"
				max="10"
			/>
		</div>
		<p class="self-center">
			<i>NOTE: The highest quality (10) will be roughly 3x the memory of the lowest quality (1).</i>
		</p>
		<button
			onclick={() => downloadByNames()}
			disabled={downloadProgress.downloading}
			class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
		>
			{downloadProgress.downloading ? 'Downloading...' : 'Download'}
		</button>
	{/if}

	{#if downloadProgress.downloading}
		<p class="self-center">
			<b>Downloading Track:</b>
			{downloadProgress.downloadCount} / {downloadProgress.total}
		</p>
		<p class="self-center">
			<b>Current Status -</b>
			{downloadProgress.status}
		</p>
	{/if}
</div>
