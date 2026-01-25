<script lang="ts">
	import { Album } from '$lib/classes/Album.svelte';

	let {
		album = $bindable(),
		error = $bindable(),
		message = $bindable(),
		goToAlbumView
	}: {
		album: Album | null;
		error: boolean;
		message: String;
		goToAlbumView: Function;
	} = $props();

	let files: FileList | null | undefined = $state();

	// Detect file input
	$effect(() => {
		if (files) {
			new Response(files[0]).json().then(
				(albumFile) => {
					try {
						// Try to create album from properties in file
						album = new Album(
							albumFile.name,
							albumFile.artist,
							albumFile.year,
							albumFile.coverURL,
							albumFile.tracklist
						);

						// Open up the album view to display imported album
						goToAlbumView();
					} catch (_err) {
						// If imported file is JSON but does not match properties of Album type, then it is not a proper album
						console.log(_err);
						error = true;
						message = 'Failed to import album.\nAlbum file is formatted incorrectly.';
					}
				},
				(_err) => {
					error = true;
					message = 'Failed to import album. Not JSON.';
				}
			);
		}
	});
</script>

<label for="album-input" class="underline">Import album .JSON file:</label>
<input
	name="album-input"
	type="file"
	accept="application/json"
	bind:files
	class="w-1/3 bg-red-200 text-center file:mr-5 file:w-1/2 file:rounded-md file:border-2 file:px-1"
/>
