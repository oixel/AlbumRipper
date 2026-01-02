<script lang="ts">
	import type { Track } from '$lib/classes/Track';

	let { track }: { track: Track } = $props();

	let editing = $state(false);
</script>

<div class="ml-4 flex gap-2">
	<button
		class="flex h-8 w-8 items-center justify-center"
		onclick={() => {
			editing = !editing;
		}}
	>
		<p>{editing ? '✅' : '✏️'}</p>
	</button>

	{#if !editing}
		<p><b>Track #{track.number}</b> - {track.name}</p>
		<a href={track.videoURL} aria-label={`YouTube Video URL for track named ${track.name}`}
			>[ Video ]</a
		>
	{:else}
		<input
			bind:value={track.number}
			placeholder="Track #"
			class="w-12 self-center border-2 py-1 pl-2"
			type="number"
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
