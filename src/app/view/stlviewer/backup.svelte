<script lang="ts">
	import * as THREE from 'three';
	import { STLLoader } from 'three/addons/loaders/STLLoader.js';
	import { onMount } from 'svelte';

	export let stlUrls: string[]; // STL 파일 URL 배열
	export let unitScale: number = 1; // 크기 단위 스케일

	export let width: string = '100%';
	export let height: string = '100%';

	let canvas: HTMLCanvasElement;
	let isDragging = false;
	let isRightClickDragging = false;
	let previousMousePosition = { x: 0, y: 0 };
	let group: THREE.Group;
	let camera: THREE.PerspectiveCamera;
	let currentZoom = 1;
	const minZoom = 0.1;
	const maxZoom = 10;

	onMount(async () => {
		const scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0xffffff); // 배경색을 흰색으로 설정

		const loader = new STLLoader();
		const meshes: THREE.Mesh[] = [];

		// 모든 STL 파일 로드
		await Promise.all(
			stlUrls.map(async (url) => {
				return new Promise<void>((resolve) => {
					loader.load(url, (geometry: THREE.BufferGeometry) => {
						const material = new THREE.MeshNormalMaterial();
						const mesh = new THREE.Mesh(geometry, material);
						mesh.rotation.x = Math.PI / -2; // x축을 기준으로 90도 회전
						meshes.push(mesh);
						resolve();
					});
				});
			})
		);

		// 모든 모델의 높이 계산 및 가장 낮은 높이 찾기
		let lowestY = Infinity;
		meshes.forEach((mesh) => {
			mesh.scale.set(unitScale, unitScale, unitScale);
			const boundingBox = new THREE.Box3().setFromObject(mesh);
			const minY = boundingBox.min.y;
			if (minY < lowestY) {
				lowestY = minY;
			}
		});

		// 모든 모델을 가장 낮은 높이에 맞추어 위치 조정
		meshes.forEach((mesh) => {
			const boundingBox = new THREE.Box3().setFromObject(mesh);
			const center = boundingBox.getCenter(new THREE.Vector3());
			mesh.position.y -= boundingBox.min.y - lowestY; // 위치 조정
			scene.add(mesh);
		});

		// 모든 모델을 하나의 그룹으로 묶고 크기 조정
		group = new THREE.Group();
		meshes.forEach((mesh) => {
			group.add(mesh);
		});
		scene.add(group);

		// 그룹의 크기에 맞춰 카메라 위치 조정
		const boundingBox = new THREE.Box3().setFromObject(group);
		const center = boundingBox.getCenter(new THREE.Vector3());
		const size = boundingBox.getSize(new THREE.Vector3());
		const maxDimension = Math.max(size.x, size.y, size.z); // 모든 축을 고려하여 최대 크기 계산
		const cameraDistance = maxDimension * 2;

		// x축과 y축이 0보다 큰 위치에서 바라보도록 카메라 위치 설정
		camera.position.set(Math.max(center.x, 0.1), Math.max(cameraDistance, 0.1), center.z);
		camera.lookAt(Math.max(center.x, 0.1), 0.1, center.z);

		// 렌더링
		function animate() {
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
		}
		animate();

		// 창 크기 변경 시 렌더러 크기 업데이트
		window.addEventListener('resize', () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		});
	});
</script>

<canvas
	bind:this={canvas}
	style={`width: ${width}; height: ${height};`}
	on:mousedown={(e) => {
		if (e.button === 2) {
			// 오른쪽 클릭
			isDragging = true;
			previousMousePosition = {
				x: e.clientX,
				y: e.clientY
			};
		} else if (e.button === 0) {
			// 왼쪽 클릭
			isRightClickDragging = true;
			previousMousePosition = {
				x: e.clientX,
				y: e.clientY
			};
		}
	}}
	on:mousemove={(e) => {
		const deltaMove = {
			x: e.clientX - previousMousePosition.x,
			y: e.clientY - previousMousePosition.y
		};
		if (isDragging && group) {
			group.rotation.y += deltaMove.x * 0.01;
			group.rotation.x += deltaMove.y * 0.01;
		} else if (isRightClickDragging && group) {
			group.position.x += deltaMove.x * 0.01;
			group.position.z += deltaMove.y * 0.01;
		}
		previousMousePosition = {
			x: e.clientX,
			y: e.clientY
		};
	}}
	on:mouseup={() => {
		isDragging = false;
		isRightClickDragging = false;
	}}
	on:wheel={(e) => {
		e.preventDefault();
		if (camera) {
			const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
			currentZoom *= zoomFactor;

			// 줌 제한 설정
			currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));

			camera.position.multiplyScalar(zoomFactor);
		}
	}}
	on:contextmenu={(e) => e.preventDefault()}
></canvas>

<style>
	canvas {
		display: block;
	}
</style>
