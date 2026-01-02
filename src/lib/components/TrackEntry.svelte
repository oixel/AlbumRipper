<script lang="ts">
	import type { Track } from '$lib/classes/Track.svelte';
	import type { Album } from '$lib/classes/Album.svelte';

	let { track, album, loading }: { track: Track; album: Album; loading: boolean } = $props();

	let editing = $state(false);
</script>

<div class="flex gap-2">
	{#if !loading}
		<button
			class="flex h-8 w-8 items-center justify-center"
			onclick={() => {
				editing = !editing;
			}}
		>
			<p>{editing ? '✅' : '✏️'}</p>
		</button>
	{/if}

	{#if !editing}
		<p><b>Track #{track.number}</b> - {track.name}</p>
		<a href={track.videoURL} aria-label={`YouTube Video URL for track named ${track.name}`}
			>[ Video ]</a
		>
	{:else}
		<button
			class="flex h-8 w-8 items-center justify-center"
			onclick={() => {
				album.removeTrack(track);
				editing = false;
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
			bind:value={track.videoURL}
			placeholder="Track YouTube URL"
			class="w-full max-w-md self-center border-2 py-1 pl-2"
			type="url"
		/>
	{/if}
</div>
