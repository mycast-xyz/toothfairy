<script lang="ts">
	import * as THREE from 'three';
	import { STLLoader } from 'three/addons/loaders/STLLoader.js';
	import { onMount } from 'svelte';

	export let stlUrls: string[];
	export let unitScale: number = 1;

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

	$: stlUrls, renderSTL(); // stlUrls 변경 시 renderSTL 함수 호출

	async function renderSTL() {
		if (!canvas) return; // 캔버스 요소가 없으면 함수 종료

		const scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setClearColor(0xffffff);

		const loader = new STLLoader();
		const meshes: THREE.Mesh[] = [];

		await Promise.all(
			stlUrls.map(async (url) => {
				return new Promise<void>((resolve) => {
					loader.load(url, (geometry: THREE.BufferGeometry) => {
						const material = new THREE.MeshNormalMaterial();
						const mesh = new THREE.Mesh(geometry, material);
						mesh.rotation.x = Math.PI / -2;
						meshes.push(mesh);
						resolve();
					});
				});
			})
		);

		let lowestY = Infinity;
		meshes.forEach((mesh) => {
			mesh.scale.set(unitScale, unitScale, unitScale);
			const boundingBox = new THREE.Box3().setFromObject(mesh);
			const minY = boundingBox.min.y;
			if (minY < lowestY) {
				lowestY = minY;
			}
		});

		meshes.forEach((mesh) => {
			const boundingBox = new THREE.Box3().setFromObject(mesh);
			mesh.position.y -= boundingBox.min.y - lowestY;
			scene.add(mesh);
		});

		group = new THREE.Group();
		meshes.forEach((mesh) => {
			group.add(mesh);
		});
		scene.add(group);

		const boundingBox = new THREE.Box3().setFromObject(group);
		const center = boundingBox.getCenter(new THREE.Vector3());
		const size = boundingBox.getSize(new THREE.Vector3());
		const maxDimension = Math.max(size.x, size.y, size.z);
		const cameraDistance = maxDimension * 2;

		camera.position.set(Math.max(center.x, 0.1), Math.max(cameraDistance, 0.1), center.z);
		camera.lookAt(Math.max(center.x, 0.1), 0.1, center.z);

		function animate() {
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
		}
		animate();

		window.addEventListener('resize', () => {
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		});
	}

	onMount(() => {
		renderSTL(); // 컴포넌트 마운트 시 초기 렌더링
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
