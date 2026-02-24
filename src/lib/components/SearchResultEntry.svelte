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

<tr>
	<td class="max-w-32 overflow-hidden text-nowrap text-ellipsis whitespace-nowrap"
		>{result.title}</td
	>
	<td>{result.artists.join('; ')}</td>
	<td>{result.trackCount}</td>
	<td>{result.isDeluxe ? 'Yes' : 'No'}</td>
	<td>{result.releaseDate}</td>
	<td><button onclick={() => selectResult(result)}> Select </button> </td>
</tr>
