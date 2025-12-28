<script lang="ts">
	let url = '';
	let loading = false;
	let statusMessage = '';

	async function downloadMP3() {
		loading = true;
		statusMessage = '';

		try {
			const response = await fetch('/api/download', {
				method: 'POST',
				headers: { 'Content-Type': 'applications/json' },
				body: JSON.stringify({ url })
			});

			if (response.ok && response.headers.get('Content-Type') == 'audio/mpeg') {
				const filename = 'song.mp3';

				const blob = await response.blob();
				const downloadUrl = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = downloadUrl;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(downloadUrl);
				document.body.removeChild(a);

				statusMessage = 'Download successful!';
			} else {
				const data = await response.json();
				statusMessage = `Ran into ERROR: ${data.error}`;
			}
		} catch (error) {
			statusMessage = 'Failed to download MP3...';
		} finally {
			loading = false;
		}
	}
</script>

<input bind:value={url} placeholder="YouTube URL" class="border-2" />

<button
	on:click={downloadMP3}
	disabled={loading}
	class="mx-5 rounded-md border-2 bg-black px-2 py-1 text-white hover:cursor-pointer disabled:bg-gray-500"
>
	{loading ? 'Downloading...' : 'Download'}
</button>

{#if statusMessage}<p class="text-red-500 italic">{statusMessage}</p>{/if}
