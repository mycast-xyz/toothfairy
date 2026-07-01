<script lang="ts">
	// 치과 청구서 리스트 컴포넌트
	export let data: any;
</script>

<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
	<thead class="bg-gray-50 dark:bg-gray-800">
		<tr>
			<th
				scope="col"
				class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
			>
				<span>회사명</span>
			</th>
			<th
				scope="col"
				class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
			>
				캡
			</th>
			<th
				scope="col"
				class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
			>
				<span>파샬</span>
			</th>
			<th
				scope="col"
				class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
			>
				<span>커스텀</span>
				<i class="float-right ml-auto"></i>
			</th>
			<th
				scope="col"
				class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
			>
				<span>올온포</span>
				<i class="float-right ml-auto"></i>
			</th>
		</tr>
	</thead>
	<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
		{#each data.info?.dental ?? [] as item}
			<tr>
				<th
					class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
				>
					<span>{item.name}</span>
				</th>
				<td
					class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
				>
					<a href={`/setting/invoice/${item.id}?date=${data.param.date}&item=cap`}>
						<span>출력: {item.invoice.cap.normal}, 리메이크: {item.invoice.cap.remake}</span>
					</a>
				</td>
				<td
					class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
				>
					<a href={`/setting/invoice/${item.id}?date=${data.param.date}&item=partial`}>
						<span>출력: {item.invoice.partial.normal}, 리메이크: {item.invoice.partial.remake}</span
						>
					</a>
				</td>
				<td
					class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
				>
					<a href={`/setting/invoice/${item.id}?date=${data.param.date}&item=custom`}>
						<span>출력: {item.invoice.custom.normal}, 리메이크: {item.invoice.custom.remake}</span>
					</a>
				</td>
				<td
					class="cursor-pointer px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400 rtl:text-right"
				>
					<a href={`/setting/invoice/${item.id}?date=${data.param.date}&item=allonfour`}>
						<span
							>출력: {item.invoice.allonfour.normal}, 리메이크: {item.invoice.allonfour
								.remake}</span
						>
					</a>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
