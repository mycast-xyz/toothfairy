<script lang="ts">
	// 헤더바
	import HeaderBar from './HeaderBar.svelte';
	import HospitalInfo from './HospitalInfo.svelte';
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

<main class="">
	<article class="pc-main w-full">
		<div class="mb-4">
			<HeaderBar {currentStep} />
		</div>
		<article class="w-full">
			{#if currentStep == 1}
				<HospitalInfo {nextStep} />
			{:else if currentStep == 2}
				<PatientInfo {nextStep} {prevStep} />
			{:else if currentStep == 3}
				<TreatmentInfo {nextStep} {prevStep} />
			{/if}
		</article>
	</article>
</main>
