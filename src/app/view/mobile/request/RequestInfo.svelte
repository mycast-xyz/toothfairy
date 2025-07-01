<script lang="ts">
	// 헤더바
	import HeaderBar from './HeaderBar.svelte';
	import PatientInfo from './PatientInfo.svelte';
	import TreatmentInfo from './TreatmentInfo.svelte';

	// 컴포넌트 처리
	let currentStep = $state(1);
	let maxStep = $state(3);

	// 컴포넌트 이동 처리
	function nextStep() {
		if (currentStep < maxStep) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function goToStep(step: number) {
		if (step >= 1 && step <= maxStep) {
			currentStep = step;
		}
	}
</script>

<main class="mt-12 min-h-screen flex-1 bg-gray-100 p-4">
	<article class="pc-main w-full">
		<article class="w-full pt-3">
			<HeaderBar {currentStep} />

			{#if currentStep == 1}
				<PatientInfo {nextStep} />
			{:else if currentStep == 2}
				<TreatmentInfo {nextStep} />
			{:else if currentStep == 3}
				<TreatmentInfo {nextStep} />
			{/if}
		</article>
	</article>
</main>
