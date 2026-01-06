<script lang="ts">
	import type { Album } from '$lib/classes/Album.svelte';
	import type { DownloadProgress } from '$lib/classes/DownloadProgress.svelte';
	import TrackEntry from '$lib/components/TrackEntry.svelte';

	let {
		album,
		expectedTracklistLength,
		editingAlbum,
		loading,
		downloadProgress
	}: {
		album: Album;
		expectedTracklistLength: number;
		editingAlbum: boolean;
		loading: boolean;
		downloadProgress: DownloadProgress;
	} = $props();
</script>

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
			<div class="flex flex-col items-center justify-center gap-1">
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
		<div class="flex h-fit w-xl max-w-xl flex-col gap-1 overflow-auto rounded-md border-2 p-2 px-4">
			{#each album.tracklist as track}
				<TrackEntry {track} {album} {loading} downloading={downloadProgress.downloading} />
			{/each}
			{#if loading}
				<p>
					<i>
						Search for songs in {album.name} ({album.tracklist.length}/{expectedTracklistLength})...
					</i>
				</p>
			{/if}
		</div>
	</div>
</div>
