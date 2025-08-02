<script lang="ts">
  export let title: string = '';
  export let description: string = '';
</script>

<div class="flex items-center justify-between rounded-lg px-4 py-6">
  <div class="flex flex-col">
    <h2 class="text-3xl font-extrabold text-violet-500 leading-tight">{title}</h2>
    {#if description}
      <span class="mt-1 text-sm font-medium text-gray-500">{description}</span>
    {/if}
  </div>
  <div class="flex items-center">
    <slot />
  </div>
</div>

<style>
  /* 배경 없는 느낌을 위해 bg-white만, 그림자 없음 */
  /* 필요시 스타일 확장 가능 */
</style>
