<script lang="ts">
	import type { Track } from '$lib/classes/Track.svelte';
	import type { Album } from '$lib/classes/Album.svelte';

	let {
		track = $bindable(),
		album,
		loading,
		downloading
	}: { track: Track; album: Album; loading: boolean; downloading: boolean } = $props();

	let artistsString = $derived(track.artists.join('; '));

	// Either returns a valid, sanitized YouTube URL or forces input to be empty to bring up red "[ Video Missing ]" text
	function cleanVideoURL() {
		try {
			const url = new URL(track.videoURL);

			if (
				(url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com') &&
				url.pathname == '/watch'
			) {
				// Clean up regular YouTube URL
				const videoID = url.searchParams.get('v');
				track.videoURL = videoID ? `https://www.youtube.com/watch?v=${videoID}` : '';
			} else if (url.hostname === 'youtu.be') {
				// Clean up shortened URL
				const videoID = url.pathname.slice(1);
				track.videoURL = videoID ? `https://www.youtube.com/watch?v=${videoID}` : '';
			} else {
				track.videoURL = '';
			}
		} catch {
			console.log('invalid url');
			track.videoURL = '';
		}
	}

	cleanVideoURL(); // Clean videoURL when track is initially loaded
</script>

<div class="flex gap-2">
	{#if !loading && !downloading}
		<button
			class="flex h-8 w-8 items-center justify-center"
			onclick={() => {
				// Update artists array in Track object if it has been changed
				if (track.editing && artistsString != track.artists.join('; ')) {
					track.artists = artistsString.replaceAll('; ', ';').split(';');
				}

				track.editing = !track.editing;
			}}
		>
			<p>{track.editing ? '✅' : '✏️'}</p>
		</button>
	{/if}

	{#if !track.editing}
		<p class="flex-1">
			<b>Track #{track.number}</b> - {track.name}
			<b>Artist{track.artists.length > 1 ? 's' : ''}:</b>
			{track.artists.join('; ')}
		</p>
		{#if track.videoURL}
			<a
				class="flex-nowrap"
				href={track.videoURL}
				// Informs SvelteKit that the videoURL is not a local path
				rel="external"
				aria-label={`YouTube Video URL for track named ${track.name}`}
				target="_blank"
			>
				[ Video ]
			</a>
		{:else}
			<p class="text-red-500 select-none">[ Video Missing ]</p>
		{/if}
	{:else if !downloading}
		<button
			class="flex h-8 w-8 items-center justify-center"
			onclick={() => {
				album.removeTrack(track);
				track.editing = false;
			}}
		>
			<p>🗑️</p>
		</button>
		<input
			bind:value={track.number}
			placeholder="Track #"
			class="w-12 self-center border-2 py-1 pl-2"
			type="number"
			min="1"
		/>
		<input
			bind:value={track.name}
			placeholder="Track Name"
			class="w-full max-w-md self-center border-2 py-1 pl-2"
		/>
		<input
			bind:value={artistsString}
			placeholder="Track Artist(s)"
			class="w-full max-w-md self-center border-2 py-1 pl-2"
		/>
		<input
			bind:value={track.videoURL}
			placeholder="YouTube URL"
			class="w-full max-w-md self-center border-2 py-1 pl-2"
			type="url"
			onfocusout={cleanVideoURL}
		/>
	{/if}
</div>
