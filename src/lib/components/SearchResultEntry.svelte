<script lang="ts">
	import type { SearchResult } from '$lib/interfaces/SearchResult.svelte';

	let {
		result,
		selectResult
	}: {
		result: SearchResult;
		selectResult: Function;
	} = $props();
</script>

<p>
	<b>Album:</b>
	{result.title}
	<b>Artist{result.artists.length > 1 ? 's' : ''}:</b>
	{result.artists.join('; ')}
	<b>Track Count:</b>
	{result.trackCount}
	<b>Deluxe:</b>
	{result.isDeluxe ? 'Yes' : 'No'}
	<b>Release Date:</b>
	{result.releaseDate}
</p>

<button onclick={() => selectResult(result)}> Select </button>
