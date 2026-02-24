<script lang="ts">
	import { Album } from '$lib/classes/Album.svelte';
	import { DownloadProgress } from '$lib/classes/DownloadProgress.svelte';
	import AlbumView from '$lib/components/AlbumView.svelte';
	import ImportAlbumPage from '$lib/components/ImportAlbumPage.svelte';
	import SearchAlbumForm from '$lib/components/SearchAlbumForm.svelte';

	// Tracks which method is used to create Album object
	let prevPageState: '' | 'search' | 'import' | 'album' = $state('');
	let pageState: '' | 'search' | 'import' | 'album' = $state('');

	// Tracks the state of current operation
	let loading: boolean = $state(false);
	let error = $state(false);
	let message = $state('');

	//
	let browser = $state('firefox');

	// Tracks quality of audio downloaded from YouTube videos (1-10 where 10 is highest quality)
	let audioQuality = $state(5);

	// Bindable values from input fields
	let artistName = $state('');
	let albumName = $state('');
	let isDeluxe = $state(false);

	// Album attributes
	let album: Album | null = $state(null);
	let expectedTracklistLength: number = $state(0); // Gets set in SearchAlbumForm to prevent editing while tracklist loads
	let editingAlbum = $state(false);

	let downloadProgress = new DownloadProgress();

	// Format filename based on available Album metadata
	function getFilename() {
		const albumName = album?.name.length ? album.name : 'Unknown Album';
		const artistName = album?.artist.length ? album.artist : 'Unknown Artist';
		return `${albumName} - ${artistName}`;
	}

	// Takes current Album and loops through it, downloading each track individually
	async function downloadAlbum() {
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
					browser: browser,
					audioQuality: audioQuality
				})
			});

			// If initial response resulted in an error, download start failed
			if (!startResponse.ok) {
				throw new Error('Failed to start download.');
			}

			// Grab ID created in the download initialization
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

					// Grab attributes of download progress from download status' object
					downloadProgress.downloadCount = status.downloadCount;
					downloadProgress.total = status.total;
					downloadProgress.status = status.status;
					downloadProgress.currentTrack = status.currentTrack || '';

					// If an error has occurred while downloading, cancel download and display it
					if (status.error) {
						clearInterval(pollInterval);
						error = true;
						message = `ERROR while downloading: ${status.error}`;
						downloadProgress.downloading = false;
						return;
					}

					// Download the file when status indicates done
					if (status.done && album) {
						clearInterval(pollInterval);

						// If download is complete, fetch the ZIP file contents
						const zipFileResponse = await fetch(
							`/api/download?id=${downloadID}&isStatusCheck=false`
						);

						// If ZIP file was grabbed successfully, download it in browser!
						if (zipFileResponse.ok) {
							// Prevent downloading empty albums (no valid videos)
							if (downloadProgress.downloadCount == 0) {
								error = true;
								message = 'No files downloaded. Check video URLs.';

								downloadProgress.downloading = false;
								return;
							}

							// Create an invisible link with the content and force download it
							const blob = await zipFileResponse.blob();
							const downloadUrl = window.URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = downloadUrl;
							a.download = `${getFilename()}.zip`;
							document.body.appendChild(a);
							a.click();
							window.URL.revokeObjectURL(downloadUrl);
							document.body.removeChild(a);

							message = `Album download successful - (${downloadProgress.downloadCount} / ${album.tracklist.length}) tracks downloaded!`;
						} else {
							error = true;
							message = 'Failed to download file.';
						}

						downloadProgress.downloading = false;
					}
				} catch (err) {
					// On any error, cancel download and display polling error
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

	// Takes current Album's data and converts it to an importable .JSON file
	async function exportAlbum() {
		if (!album) return;

		// Convert album object into a convertable JavaScript value
		const exportedAlbum = {
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
		};

		// Convert converted object into JSON format
		const albumJSON = JSON.stringify(exportedAlbum, null, 2);

		// Download JSON file from browser
		const a = document.createElement('a');
		a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(albumJSON);
		a.download = `${getFilename()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
</script>

<svelte:head>
	<title>Album Ripper</title>
</svelte:head>

{#if pageState}
	<button
		type="button"
		class="absolute self-start"
		onclick={() => {
			album = null;

			// Reset error state
			error = false;
			message = '';

			// Returns user to Search or Import pages from AlbumView page if they were previously there
			if (pageState == 'album' && prevPageState) pageState = prevPageState;
			else {
				// Otherwise, simply return to start option screen
				pageState = '';
				prevPageState = '';
			}
		}}>← Go Back</button
	>
{/if}

<form class="flex h-full min-h-full flex-col items-center gap-5">
	<h1 class="text-center text-4xl select-none">Album Ripper</h1>

	{#if !pageState}
		<div class="flex w-full flex-col items-center gap-2">
			<button
				class="w-1/4"
				onclick={() => {
					pageState = 'search';
					prevPageState = 'search';
				}}
			>
				Search for Album
			</button>
			<button
				class="w-1/4"
				onclick={() => {
					album = new Album();
					pageState = 'album';
				}}
			>
				Create BLANK Album
			</button>
			<button
				class="w-1/4"
				onclick={() => {
					pageState = 'import';
					prevPageState = 'import';
				}}
			>
				Import Album (.json)
			</button>
		</div>
	{:else if pageState == 'search'}
		<SearchAlbumForm
			bind:albumName
			bind:artistName
			bind:isDeluxe
			bind:album
			bind:loading
			bind:expectedTracklistLength
			bind:editingAlbum
			bind:error
			bind:message
			goToAlbumView={() => {
				pageState = 'album';
			}}
		/>
	{:else if pageState == 'import'}
		<ImportAlbumPage
			bind:album
			bind:error
			bind:message
			goToAlbumView={() => {
				pageState = 'album';
			}}
		/>
	{:else if pageState == 'album' && album}
		<AlbumView {album} {expectedTracklistLength} {editingAlbum} {loading} {downloadProgress} />
	{/if}

	{#if message}
		<p class="{error ? 'text-red-500' : 'text-green-500'} max-w-1/2 self-center italic">
			{message}
		</p>
	{/if}

	{#if album && album.tracklist.length && ((prevPageState == 'search' && !loading) || prevPageState != 'search')}
		<div class="flex items-center justify-center gap-2">
			<div
				class="group relative inline-block cursor-pointer border-b-2 border-dotted font-bold select-none"
			>
				Browser Cookies:
				<span
					class="absolute bottom-full left-1/2 z-10 mb-2 hidden min-w-80 -translate-x-1/2 transform rounded-md bg-black px-2 py-1 text-xs text-white group-hover:block"
					>Permits downloading of age-restricted tracks, if a non age-restricted YouTube account is
					stored in the chosen browser's cache.</span
				>
			</div>
			<select
				class="rounded-md border-2 p-2 disabled:cursor-not-allowed disabled:border-white disabled:bg-gray-500 disabled:text-white"
				bind:value={browser}
				disabled={downloadProgress.downloading}
			>
				<option value="firefox">Firefox</option>
				<option value="chrome">Chrome</option>
				<option value="safari">Safari</option>
				<option value="edge">Edge</option>
				<option value="opera">Opera</option>
				<option value="brave">Brave</option>
			</select>
		</div>
		<div class="flex items-center justify-center gap-2">
			<div
				class="group relative inline-block cursor-pointer border-b-2 border-dotted font-bold select-none"
			>
				Audio Quality:
				<span
					class="absolute bottom-full left-1/2 z-10 mb-2 hidden min-w-80 -translate-x-1/2 transform rounded-md bg-black px-2 py-1 text-xs text-white group-hover:block"
					>NOTE: The highest quality (10) will be roughly 3x the memory of the lowest quality (1).</span
				>
			</div>
			<input
				bind:value={audioQuality}
				placeholder="Audo Quality"
				class="w-12 self-center border-2 py-1 pl-2 disabled:cursor-not-allowed disabled:border-white disabled:bg-gray-500"
				type="number"
				min="1"
				max="10"
				disabled={downloadProgress.downloading}
			/>
		</div>
		<div>
			<button
				onclick={() => downloadAlbum()}
				disabled={downloadProgress.downloading}
				class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
			>
				{downloadProgress.downloading ? 'Downloading...' : 'Download'}
			</button>
			<button
				onclick={() => exportAlbum()}
				class="mx-auto max-w-32 bg-black text-white not-disabled:hover:font-bold not-disabled:hover:text-black disabled:cursor-not-allowed disabled:bg-gray-500"
			>
				Export
			</button>
		</div>
	{/if}

	{#if downloadProgress.downloading}
		{#if downloadProgress.total != 0}
			<p class="self-center">
				<b>Download Progress:</b>
				{downloadProgress.downloadCount} / {downloadProgress.total}
			</p>
		{/if}
		<p class="self-center">
			<b>Current Status -</b>
			{downloadProgress.status}
		</p>
	{/if}
</form>
