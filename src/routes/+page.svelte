<script lang="ts">
	let settingsOpen = false;
	let revealToken = false;

	//
	let searchByName = true;

	let url = '';
	let loading = false;
	let error = false;
	let message = '';

	let accessToken = '';

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
	<h1 class="text-center text-4xl select-none">{!settingsOpen ? 'Album Ripper' : 'Settings'}</h1>
	<button
		class="fixed h-12 w-12 self-end"
		onclick={() => {
			settingsOpen = !settingsOpen;
		}}
	>
		{!settingsOpen ? '⚙️' : '❌'}
	</button>

	<!-- Regular Ripper Menu -->
	{#if !settingsOpen}
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
			onclick={() => {
				searchByName ? downloadByName() : downloadByURL();
			}}
			disabled={loading || !url}
			class="mx-auto max-w-32 bg-black text-white
        {url && !loading
				? 'hover:scale-105 hover:cursor-pointer'
				: 'hover:cursor-not-allowed'} disabled:bg-gray-500"
		>
			{loading ? 'Downloading...' : 'Download'}
		</button>

		{#if message}<p class="{error ? 'text-red-500' : 'text-green-500'} italic">{message}</p>{/if}
	{:else}
		<label for="token-input" class="self-center font-bold">MusicBrainz API Access Token</label>
		<div class="flex w-full max-w-full flex-row justify-center gap-5 self-center">
			<input
				name="token-input"
				bind:value={accessToken}
				placeholder="Enter MusicBrainz token here"
				type={revealToken ? 'text' : 'password'}
				class="w-full max-w-lg border-2 py-1 pl-2"
			/>
			<button
				onclick={() => {
					revealToken = !revealToken;
				}}
				class="w-16"
			>
				{!revealToken ? 'Show' : 'Hide'}
			</button>
		</div>
	{/if}
</div>
