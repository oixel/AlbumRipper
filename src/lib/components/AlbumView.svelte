<script lang="ts">
	import type { Album } from '$lib/classes/Album.svelte';
	import type { DownloadProgress } from '$lib/classes/DownloadProgress.svelte';
	import { Track } from '$lib/classes/Track.svelte';
	import TrackEntry from '$lib/components/TrackEntry.svelte';

	let {
		album = $bindable(),
		expectedTracklistLength,
		editing,
		loading,
		downloadProgress
	}: {
		album: Album;
		expectedTracklistLength: number;
		editing: boolean;
		loading: boolean;
		downloadProgress: DownloadProgress;
	} = $props();
</script>

<div class="flex items-center justify-center gap-5">
	<div class="flex flex-col items-center justify-center gap-2">
		{#if !editing}
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
			<div class="flex flex-col items-center justify-center gap-1">
				<div class="flex items-center justify-center gap-2">
					<label for="album-name"><b>Album:</b></label>

					{#if !editing}
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

					{#if !editing}
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

					{#if !editing}
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
						editing = !editing;
					}}><p>{editing ? '✅' : '✏️'}</p></button
				>
			{/if}
		</div>
	</div>
	<div class="flex max-h-72 flex-col items-center justify-center gap-2">
		<h2 class="font-bold">{album.name} Tracklist:</h2>
		<div class="flex h-fit w-xl max-w-xl flex-col gap-1 overflow-auto rounded-md border-2 p-2 px-4">
			<!-- Use MusicBrainz's special track ID so that key remains constant -->
			{#each album.tracklist as track, i (track.id)}
				<TrackEntry
					bind:track={album.tracklist[i]}
					{album}
					{editing}
					downloading={downloadProgress.downloading}
				/>
			{/each}
			{#if loading}
				<p>
					<i>
						Searching for songs in {album.name} ({album.tracklist
							.length}/{expectedTracklistLength})...
					</i>
				</p>
			{:else}
				<button
					class="bg-green-300"
					onclick={() => {
						album.tracklist.push(
							// Use randomUUID since customly defined tracks do not have MusicBrainz ID data
							new Track(crypto.randomUUID(), 1, album.tracklist.length + 1, '', [], 0)
						);
					}}>+ Add Track</button
				>
			{/if}
		</div>
	</div>
</div>
