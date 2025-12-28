<script lang="ts">
	//
	let searchByName = true;

	let url = '';
	let loading = false;
	let error = false;
	let message = '';

	async function downloadSong() {
		loading = true;
		error = false;
		message = '';

		try {
			const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
			const data = await response.json();

			if (response.ok) {
				console.log(data);
			} else {
				console.error('Error:', data.error);
			}

			// const response = await fetch('/api/download', {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'applications/json' },
			// 	body: JSON.stringify({ url })
			// });

			// if (response.ok && response.headers.get('Content-Type') == 'audio/mpeg') {
			// 	const filename = 'song.mp3';

			// 	// Create an invisible link with the content and force download it
			// 	const blob = await response.blob();
			// 	const downloadUrl = window.URL.createObjectURL(blob);
			// 	const a = document.createElement('a');
			// 	a.href = downloadUrl;
			// 	a.download = filename;
			// 	document.body.appendChild(a);
			// 	a.click();
			// 	window.URL.revokeObjectURL(downloadUrl);
			// 	document.body.removeChild(a);

			// 	message = 'Download successful!';
			// } else {
			// 	const data = await response.json();
			// 	message = `Ran into ERROR: ${data.error}`;
			// 	error = true;
			// }
		} catch (error) {
			message = 'Failed to download MP3...';
			error = true;
		} finally {
			loading = false;
		}
	}

	async function downloadPlaylist() {
		error = true;
		message = 'Download by Playlist feature is not yet implemented...';
		console.log(message);
	}

	async function downloadByName() {
		error = true;
		message = 'Download by Name feature is not yet implemented...';
		console.log(message);
	}

	// Downloads either playlist or single song based on URL passed in
	async function downloadByURL() {
		url.includes('playlist') ? await downloadPlaylist() : await downloadSong();
	}
</script>

<div class="flex flex-col gap-5">
	<h1 class="text-center text-4xl select-none">Album Ripper</h1>
	<div class="mx-auto">
		<button
			on:click={() => {
				message = '';
				searchByName = true;
			}}
			class="rounded-md border-2 px-2 py-1 transition-transform duration-75 hover:scale-105 hover:cursor-pointer
            {searchByName ? 'bg-yellow-200 font-bold' : 'bg-white'}"
		>
			By Name
		</button>
		<button
			on:click={() => {
				message = '';
				searchByName = false;
			}}
			class="rounded-md border-2 px-2 py-1 transition-transform duration-75 hover:scale-105 hover:cursor-pointer
            {!searchByName ? 'bg-yellow-200 font-bold' : 'bg-white'}"
		>
			By URL
		</button>
	</div>

	{#if !searchByName}
		<p class="text-center italic">
			Use <u>YouTube Music</u> URL for proper metadata
		</p>
	{/if}

	<input
		bind:value={url}
		placeholder={searchByName ? 'Album Name' : 'YouTube Playlist/Song URL'}
		class="w-full max-w-lg self-center border-2 py-1 pl-2"
	/>

	<button
		on:click={() => {
			searchByName ? downloadByName() : downloadByURL();
		}}
		disabled={loading || !url}
		class="mx-auto max-w-32 rounded-md border-2 bg-black px-2 py-1 text-white transition-transform duration-75
        {url
			? 'hover:scale-105 hover:cursor-pointer'
			: 'hover:cursor-not-allowed'} disabled:bg-gray-500"
	>
		{loading ? 'Downloading...' : 'Download'}
	</button>

	{#if message}<p class="{error ? 'text-red-500' : 'text-green-500'} italic">{message}</p>{/if}
</div>
