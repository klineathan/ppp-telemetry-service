<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		TimeScale,
		Title,
		Tooltip,
		Legend,
		Filler,
		CategoryScale
	} from 'chart.js';

	// Register Chart.js components
	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		TimeScale,
		Title,
		Tooltip,
		Legend,
		Filler,
		CategoryScale
	);

	let { data } = $props();

	// Reactive state
	let selectedDeviceId = $state(data.dashboardData?.selectedDevice?.deviceId || '');
	let selectedHours = $state(data.hours || 24);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	// Chart instances
	let batteryChart: Chart | null = null;
	let thermalChart: Chart | null = null;
	let cpuChart: Chart | null = null;
	let memoryChart: Chart | null = null;

	// Canvas refs
	let batteryCanvas: HTMLCanvasElement;
	let thermalCanvas: HTMLCanvasElement;
	let cpuCanvas: HTMLCanvasElement;
	let memoryCanvas: HTMLCanvasElement;

	// Format helpers
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (days > 0) return `${days}d ${hours}h ${mins}m`;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	}

	function formatTime(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Chart colors
	const colors = {
		battery: { line: '#22c55e', fill: 'rgba(34, 197, 94, 0.1)' },
		voltage: { line: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)' },
		current: { line: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)' },
		cpuTemp: { line: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)' },
		gpuTemp: { line: '#f97316', fill: 'rgba(249, 115, 22, 0.1)' },
		batteryTemp: { line: '#a855f7', fill: 'rgba(168, 85, 247, 0.1)' },
		load1: { line: '#06b6d4', fill: 'rgba(6, 182, 212, 0.1)' },
		load5: { line: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.1)' },
		load15: { line: '#ec4899', fill: 'rgba(236, 72, 153, 0.1)' },
		memory: { line: '#10b981', fill: 'rgba(16, 185, 129, 0.2)' },
		swap: { line: '#f43f5e', fill: 'rgba(244, 63, 94, 0.1)' }
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			intersect: false,
			mode: 'index' as const
		},
		plugins: {
			legend: {
				display: true,
				position: 'top' as const,
				labels: {
					color: '#9ca3af',
					font: { family: "'JetBrains Mono', monospace", size: 11 },
					boxWidth: 12,
					padding: 15
				}
			},
			tooltip: {
				backgroundColor: 'rgba(17, 24, 39, 0.95)',
				titleColor: '#f3f4f6',
				bodyColor: '#d1d5db',
				borderColor: 'rgba(75, 85, 99, 0.5)',
				borderWidth: 1,
				padding: 12,
				titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
				bodyFont: { family: "'JetBrains Mono', monospace", size: 11 }
			}
		},
		scales: {
			x: {
				grid: { color: 'rgba(75, 85, 99, 0.3)' },
				ticks: { color: '#6b7280', font: { size: 10 } }
			},
			y: {
				grid: { color: 'rgba(75, 85, 99, 0.3)' },
				ticks: { color: '#6b7280', font: { size: 10 } }
			}
		},
		elements: {
			point: { radius: 0, hoverRadius: 4 },
			line: { tension: 0.3 }
		}
	};

	function createBatteryChart() {
		if (!batteryCanvas || !data.dashboardData?.battery?.length) return;

		const batteryData = data.dashboardData.battery;
		const labels = batteryData.map((d: { timestamp: Date }) => formatTime(d.timestamp));

		batteryChart = new Chart(batteryCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Capacity %',
						data: batteryData.map((d: { capacity: number }) => d.capacity),
						borderColor: colors.battery.line,
						backgroundColor: colors.battery.fill,
						fill: true,
						yAxisID: 'y'
					},
					{
						label: 'Voltage (V)',
						data: batteryData.map((d: { voltage: number }) => d.voltage),
						borderColor: colors.voltage.line,
						backgroundColor: 'transparent',
						yAxisID: 'y1'
					},
					{
						label: 'Current (A)',
						data: batteryData.map((d: { current: number }) => d.current),
						borderColor: colors.current.line,
						backgroundColor: 'transparent',
						yAxisID: 'y2'
					}
				]
			},
			options: {
				...chartOptions,
				scales: {
					x: chartOptions.scales.x,
					y: {
						...chartOptions.scales.y,
						position: 'left',
						min: 0,
						max: 100,
						title: { display: true, text: 'Capacity %', color: '#6b7280' }
					},
					y1: {
						...chartOptions.scales.y,
						position: 'right',
						min: 3.0,
						max: 4.5,
						title: { display: true, text: 'Voltage (V)', color: '#6b7280' },
						grid: { drawOnChartArea: false }
					},
					y2: {
						display: false,
						min: -2,
						max: 2
					}
				}
			}
		});
	}

	function createThermalChart() {
		if (!thermalCanvas || !data.dashboardData?.thermal?.length) return;

		const thermalData = data.dashboardData.thermal;
		const labels = thermalData.map((d: { timestamp: Date }) => formatTime(d.timestamp));

		thermalChart = new Chart(thermalCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'CPU °C',
						data: thermalData.map((d: { cpuTemp: number }) => d.cpuTemp),
						borderColor: colors.cpuTemp.line,
						backgroundColor: colors.cpuTemp.fill,
						fill: true
					},
					{
						label: 'GPU °C',
						data: thermalData.map((d: { gpuTemp: number }) => d.gpuTemp),
						borderColor: colors.gpuTemp.line,
						backgroundColor: 'transparent'
					},
					{
						label: 'Battery °C',
						data: thermalData.map((d: { batteryTemp: number }) => d.batteryTemp),
						borderColor: colors.batteryTemp.line,
						backgroundColor: 'transparent'
					}
				]
			},
			options: {
				...chartOptions,
				scales: {
					x: chartOptions.scales.x,
					y: {
						...chartOptions.scales.y,
						min: 20,
						max: 80,
						title: { display: true, text: 'Temperature °C', color: '#6b7280' }
					}
				}
			}
		});
	}

	function createCpuChart() {
		if (!cpuCanvas || !data.dashboardData?.cpuLoad?.length) return;

		const cpuData = data.dashboardData.cpuLoad;
		const labels = cpuData.map((d: { timestamp: Date }) => formatTime(d.timestamp));

		cpuChart = new Chart(cpuCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Load 1m',
						data: cpuData.map((d: { load1: number }) => d.load1),
						borderColor: colors.load1.line,
						backgroundColor: colors.load1.fill,
						fill: true
					},
					{
						label: 'Load 5m',
						data: cpuData.map((d: { load5: number }) => d.load5),
						borderColor: colors.load5.line,
						backgroundColor: 'transparent'
					},
					{
						label: 'Load 15m',
						data: cpuData.map((d: { load15: number }) => d.load15),
						borderColor: colors.load15.line,
						backgroundColor: 'transparent'
					}
				]
			},
			options: {
				...chartOptions,
				scales: {
					x: chartOptions.scales.x,
					y: {
						...chartOptions.scales.y,
						min: 0,
						suggestedMax: 4,
						title: { display: true, text: 'Load Average', color: '#6b7280' }
					}
				}
			}
		});
	}

	function createMemoryChart() {
		if (!memoryCanvas || !data.dashboardData?.memory?.length) return;

		const memData = data.dashboardData.memory;
		const labels = memData.map((d: { timestamp: Date }) => formatTime(d.timestamp));

		memoryChart = new Chart(memoryCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Memory Used %',
						data: memData.map((d: { usedPercent: number }) => d.usedPercent),
						borderColor: colors.memory.line,
						backgroundColor: colors.memory.fill,
						fill: true
					},
					{
						label: 'Swap Used %',
						data: memData.map((d: { swapUsedPercent: number }) => d.swapUsedPercent),
						borderColor: colors.swap.line,
						backgroundColor: 'transparent'
					}
				]
			},
			options: {
				...chartOptions,
				scales: {
					x: chartOptions.scales.x,
					y: {
						...chartOptions.scales.y,
						min: 0,
						max: 100,
						title: { display: true, text: 'Usage %', color: '#6b7280' }
					}
				}
			}
		});
	}

	function destroyCharts() {
		batteryChart?.destroy();
		thermalChart?.destroy();
		cpuChart?.destroy();
		memoryChart?.destroy();
		batteryChart = null;
		thermalChart = null;
		cpuChart = null;
		memoryChart = null;
	}

	function initCharts() {
		destroyCharts();
		createBatteryChart();
		createThermalChart();
		createCpuChart();
		createMemoryChart();
	}

	async function handleDeviceChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedDeviceId = select.value;
		await updateDashboard();
	}

	async function handleHoursChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedHours = parseInt(select.value, 10);
		await updateDashboard();
	}

	async function updateDashboard() {
		const params = new URLSearchParams();
		if (selectedDeviceId) params.set('deviceId', selectedDeviceId);
		params.set('hours', selectedHours.toString());
		await goto(`/dashboard?${params.toString()}`, { replaceState: true, invalidateAll: true });
	}

	async function refresh() {
		await goto($page.url.toString(), { replaceState: true, invalidateAll: true });
	}

	onMount(() => {
		initCharts();
		// Auto-refresh every 30 seconds
		refreshInterval = setInterval(refresh, 30000);
	});

	onDestroy(() => {
		destroyCharts();
		if (refreshInterval) clearInterval(refreshInterval);
	});

	// Re-init charts when data changes
	$effect(() => {
		if (data.dashboardData) {
			// Use setTimeout to ensure canvas is rendered
			setTimeout(initCharts, 50);
		}
	});

	// Derived values
	const latestBattery = $derived(
		data.dashboardData?.battery?.length
			? data.dashboardData.battery[data.dashboardData.battery.length - 1]
			: null
	);
	const latestThermal = $derived(
		data.dashboardData?.thermal?.length
			? data.dashboardData.thermal[data.dashboardData.thermal.length - 1]
			: null
	);
	const latestCpuLoad = $derived(
		data.dashboardData?.cpuLoad?.length
			? data.dashboardData.cpuLoad[data.dashboardData.cpuLoad.length - 1]
			: null
	);
	const latestMemory = $derived(
		data.dashboardData?.memory?.length
			? data.dashboardData.memory[data.dashboardData.memory.length - 1]
			: null
	);

	// Get battery discharge rate
	const dischargeRate = $derived.by(() => {
		if (
			!data.dashboardData?.battery?.length ||
			data.dashboardData.battery.length < 2 ||
			latestBattery?.status !== 'Discharging'
		)
			return null;
		const first = data.dashboardData.battery[0];
		const last = data.dashboardData.battery[data.dashboardData.battery.length - 1];
		const timeDiffHours =
			(new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 3600000;
		if (timeDiffHours < 0.1) return null;
		const capacityDiff = first.capacity - last.capacity;
		return capacityDiff / timeDiffHours;
	});

	const estimatedTimeRemaining = $derived.by(() => {
		if (!dischargeRate || dischargeRate <= 0 || !latestBattery) return null;
		const hoursRemaining = latestBattery.capacity / dischargeRate;
		return formatUptime(hoursRemaining * 3600);
	});
</script>

<svelte:head>
	<title>PinePhone Pro Dashboard</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="dashboard">
	<header class="header">
		<div class="header-left">
			<h1>
				<span class="icon">📱</span>
				PinePhone Pro Telemetry
			</h1>
			<p class="subtitle">Performance & Battery Analytics</p>
		</div>

		<div class="controls">
			{#if data.dashboardData?.devices?.length}
				<div class="control-group">
					<label for="device-select">Device</label>
					<select id="device-select" value={selectedDeviceId} onchange={handleDeviceChange}>
						{#each data.dashboardData.devices as device}
							<option value={device.deviceId}>{device.name || device.deviceId}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="control-group">
				<label for="hours-select">Time Range</label>
				<select id="hours-select" value={selectedHours} onchange={handleHoursChange}>
					<option value={1}>Last 1 hour</option>
					<option value={6}>Last 6 hours</option>
					<option value={12}>Last 12 hours</option>
					<option value={24}>Last 24 hours</option>
					<option value={48}>Last 48 hours</option>
					<option value={168}>Last 7 days</option>
				</select>
			</div>

			<button class="refresh-btn" onclick={refresh}>
				<span>↻</span> Refresh
			</button>
		</div>
	</header>

	{#if data.error}
		<div class="error-card">
			<p>⚠️ {data.error}</p>
		</div>
	{:else if !data.dashboardData?.devices?.length}
		<div class="empty-state">
			<div class="empty-icon">📊</div>
			<h2>No Telemetry Data</h2>
			<p>No devices have sent telemetry data yet. Connect a PinePhone Pro and start the telemetry client to see data here.</p>
		</div>
	{:else}
		<!-- Stats Cards -->
		<div class="stats-grid">
			<div class="stat-card battery">
				<div class="stat-icon">🔋</div>
				<div class="stat-content">
					<span class="stat-value">{latestBattery?.capacity ?? '--'}%</span>
					<span class="stat-label">Battery</span>
					{#if latestBattery}
						<span class="stat-sub {latestBattery.status === 'Charging' ? 'charging' : latestBattery.status === 'Discharging' ? 'discharging' : ''}">
							{latestBattery.status}
							{#if estimatedTimeRemaining}
								• ~{estimatedTimeRemaining} remaining
							{/if}
						</span>
					{/if}
				</div>
			</div>

			<div class="stat-card thermal">
				<div class="stat-icon">🌡️</div>
				<div class="stat-content">
					<span class="stat-value">{latestThermal?.cpuTemp?.toFixed(1) ?? '--'}°C</span>
					<span class="stat-label">CPU Temp</span>
					{#if latestThermal}
						<span class="stat-sub">GPU: {latestThermal.gpuTemp.toFixed(1)}°C</span>
					{/if}
				</div>
			</div>

			<div class="stat-card cpu">
				<div class="stat-icon">⚡</div>
				<div class="stat-content">
					<span class="stat-value">{latestCpuLoad?.load1?.toFixed(2) ?? '--'}</span>
					<span class="stat-label">CPU Load (1m)</span>
					{#if data.dashboardData?.systemInfo}
						<span class="stat-sub">{data.dashboardData.systemInfo.onlineCpus.length} cores online</span>
					{/if}
				</div>
			</div>

			<div class="stat-card memory">
				<div class="stat-icon">💾</div>
				<div class="stat-content">
					<span class="stat-value">{latestMemory?.usedPercent?.toFixed(1) ?? '--'}%</span>
					<span class="stat-label">Memory Used</span>
					{#if latestMemory}
						<span class="stat-sub">{formatBytes(latestMemory.available)} available</span>
					{/if}
				</div>
			</div>

			{#if data.dashboardData?.systemInfo}
				<div class="stat-card uptime">
					<div class="stat-icon">⏱️</div>
					<div class="stat-content">
						<span class="stat-value">{formatUptime(data.dashboardData.systemInfo.uptime)}</span>
						<span class="stat-label">Uptime</span>
						<span class="stat-sub">{data.dashboardData.systemInfo.totalProcesses} processes</span>
					</div>
				</div>
			{/if}

			{#if data.dashboardData?.networkStats}
				<div class="stat-card network">
					<div class="stat-icon">📶</div>
					<div class="stat-content">
						<span class="stat-value">
							{data.dashboardData.networkStats.wifiSignal
								? `${data.dashboardData.networkStats.wifiSignal} dBm`
								: '--'}
						</span>
						<span class="stat-label">WiFi Signal</span>
						<span class="stat-sub">{data.dashboardData.networkStats.wifiSsid || 'Not connected'}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Charts Grid -->
		<div class="charts-grid">
			<div class="chart-card">
				<h3>🔋 Battery & Power</h3>
				<div class="chart-container">
					<canvas bind:this={batteryCanvas}></canvas>
				</div>
			{#if dischargeRate && dischargeRate > 0}
				<div class="chart-insight">
					<span class="insight-icon">💡</span>
					Battery draining at <strong>{dischargeRate.toFixed(2)}%/hour</strong>
				</div>
			{/if}
			</div>

			<div class="chart-card">
				<h3>🌡️ Thermal</h3>
				<div class="chart-container">
					<canvas bind:this={thermalCanvas}></canvas>
				</div>
				{#if latestThermal && latestThermal.cpuTemp > 60}
					<div class="chart-insight warning">
						<span class="insight-icon">⚠️</span>
						CPU temperature is elevated. Consider reducing workload.
					</div>
				{/if}
			</div>

			<div class="chart-card">
				<h3>⚡ CPU Load</h3>
				<div class="chart-container">
					<canvas bind:this={cpuCanvas}></canvas>
				</div>
				{#if latestCpuLoad && latestCpuLoad.load1 > 3}
					<div class="chart-insight warning">
						<span class="insight-icon">⚠️</span>
						High CPU load detected. This will increase battery drain.
					</div>
				{/if}
			</div>

			<div class="chart-card">
				<h3>💾 Memory</h3>
				<div class="chart-container">
					<canvas bind:this={memoryCanvas}></canvas>
				</div>
				{#if latestMemory && latestMemory.swapUsedPercent > 50}
					<div class="chart-insight warning">
						<span class="insight-icon">⚠️</span>
						High swap usage. Consider closing unused apps.
					</div>
				{/if}
			</div>
		</div>

		<!-- Process Table -->
		{#if data.dashboardData?.topProcesses?.length}
			<div class="processes-card">
				<h3>📊 Top Processes by Memory Usage</h3>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>PID</th>
								<th>Name</th>
								<th>State</th>
								<th>CPU %</th>
								<th>Memory %</th>
								<th>Command</th>
							</tr>
						</thead>
						<tbody>
							{#each data.dashboardData.topProcesses as proc}
								<tr>
									<td class="mono">{proc.pid}</td>
									<td class="process-name">{proc.name}</td>
									<td>
										<span class="state-badge state-{proc.state.toLowerCase()}">{proc.state}</span>
									</td>
									<td class="mono">{proc.cpuPercent?.toFixed(1) ?? '--'}</td>
									<td class="mono">
										<span class="mem-bar" style="--mem-pct: {proc.memoryPercent}%"></span>
										{proc.memoryPercent.toFixed(1)}%
									</td>
									<td class="cmdline" title={proc.cmdline}>{proc.cmdline.slice(0, 60)}{proc.cmdline.length > 60 ? '...' : ''}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Insights Section -->
		<div class="insights-card">
			<h3>💡 Performance Insights</h3>
			<div class="insights-grid">
				<div class="insight">
					<h4>Battery Optimization</h4>
					<ul>
						{#if latestBattery && latestBattery.current < -1}
							<li class="warn">High current draw ({Math.abs(latestBattery.current).toFixed(2)}A). Check for power-hungry apps.</li>
						{/if}
						{#if data.dashboardData?.systemInfo?.displayBrightness && data.dashboardData.systemInfo.displayBrightness > 70}
							<li class="warn">Display brightness at {data.dashboardData.systemInfo.displayBrightness.toFixed(0)}%. Lowering can save power.</li>
						{/if}
						{#if data.dashboardData?.gpuInfo && data.dashboardData.gpuInfo.currentFreq === data.dashboardData.gpuInfo.maxFreq}
							<li class="warn">GPU running at max frequency. Consider GPU governor optimization.</li>
						{/if}
						{#if !latestBattery || latestBattery.current >= -1}
							<li class="good">Current draw is within normal range.</li>
						{/if}
					</ul>
				</div>

				<div class="insight">
					<h4>Thermal Management</h4>
					<ul>
						{#if latestThermal && latestThermal.cpuTemp > 55}
							<li class="warn">CPU temperature is elevated ({latestThermal.cpuTemp.toFixed(1)}°C).</li>
						{:else if latestThermal}
							<li class="good">Thermal levels are healthy.</li>
						{/if}
						{#if latestThermal && latestThermal.batteryTemp > 40}
							<li class="warn">Battery temperature is high. Avoid charging while under load.</li>
						{/if}
					</ul>
				</div>

				<div class="insight">
					<h4>Memory & Processes</h4>
					<ul>
						{#if latestMemory && latestMemory.usedPercent > 80}
							<li class="warn">Memory usage is high ({latestMemory.usedPercent.toFixed(1)}%).</li>
						{:else if latestMemory}
							<li class="good">Memory usage is healthy.</li>
						{/if}
						{#if data.dashboardData?.topProcesses?.length}
							{@const topMem = data.dashboardData.topProcesses[0]}
							{#if topMem.memoryPercent > 20}
								<li class="info">{topMem.name} is using {topMem.memoryPercent.toFixed(1)}% memory.</li>
							{/if}
						{/if}
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<footer class="footer">
		<p>
			Last updated: {new Date().toLocaleString()} • Auto-refresh every 30s
		</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
		min-height: 100vh;
		font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
		color: #e2e8f0;
	}

	.dashboard {
		max-width: 1600px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.1);
	}

	.header-left h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: linear-gradient(135deg, #22d3ee, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-left .icon {
		font-size: 1.5rem;
		-webkit-text-fill-color: initial;
	}

	.subtitle {
		margin: 0.5rem 0 0 0;
		color: #64748b;
		font-size: 0.9rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.control-group label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		font-weight: 600;
	}

	.control-group select {
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid rgba(148, 163, 184, 0.2);
		background: rgba(30, 41, 59, 0.8);
		color: #e2e8f0;
		font-family: inherit;
		font-size: 0.875rem;
		cursor: pointer;
		min-width: 140px;
	}

	.control-group select:focus {
		outline: none;
		border-color: #22d3ee;
		box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
		border: none;
		border-radius: 8px;
		color: white;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.refresh-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
	}

	.error-card {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 12px;
		padding: 1.5rem;
		color: #fca5a5;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: rgba(30, 41, 59, 0.5);
		border-radius: 16px;
		border: 1px solid rgba(148, 163, 184, 0.1);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		margin: 0 0 0.5rem 0;
		color: #e2e8f0;
	}

	.empty-state p {
		color: #64748b;
		max-width: 400px;
		margin: 0 auto;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: rgba(30, 41, 59, 0.6);
		border-radius: 12px;
		padding: 1.25rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		transition: all 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		border-color: rgba(148, 163, 184, 0.2);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}

	.stat-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		font-family: 'JetBrains Mono', monospace;
		line-height: 1.1;
	}

	.stat-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		font-weight: 600;
	}

	.stat-sub {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.stat-sub.charging {
		color: #22c55e;
	}

	.stat-sub.discharging {
		color: #f59e0b;
	}

	.stat-card.battery .stat-value {
		color: #22c55e;
	}

	.stat-card.thermal .stat-value {
		color: #ef4444;
	}

	.stat-card.cpu .stat-value {
		color: #06b6d4;
	}

	.stat-card.memory .stat-value {
		color: #10b981;
	}

	.stat-card.uptime .stat-value {
		color: #a78bfa;
	}

	.stat-card.network .stat-value {
		color: #f59e0b;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 1200px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}

	.chart-card {
		background: rgba(30, 41, 59, 0.6);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
	}

	.chart-card h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #e2e8f0;
	}

	.chart-container {
		height: 280px;
		position: relative;
	}

	.chart-insight {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(34, 211, 238, 0.1);
		border-radius: 8px;
		font-size: 0.85rem;
		color: #94a3b8;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.chart-insight.warning {
		background: rgba(245, 158, 11, 0.1);
		color: #fbbf24;
	}

	.insight-icon {
		font-size: 1rem;
	}

	.processes-card {
		background: rgba(30, 41, 59, 0.6);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
		margin-bottom: 2rem;
	}

	.processes-card h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.table-container {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	th {
		text-align: left;
		padding: 0.75rem 1rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		border-bottom: 1px solid rgba(148, 163, 184, 0.1);
	}

	td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(148, 163, 184, 0.05);
		color: #cbd5e1;
	}

	tr:hover td {
		background: rgba(148, 163, 184, 0.05);
	}

	.mono {
		font-family: 'JetBrains Mono', monospace;
	}

	.process-name {
		font-weight: 500;
		color: #e2e8f0;
	}

	.state-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		font-family: 'JetBrains Mono', monospace;
	}

	.state-badge.state-s {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.state-badge.state-r {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.state-badge.state-d {
		background: rgba(245, 158, 11, 0.2);
		color: #f59e0b;
	}

	.state-badge.state-z {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	td:has(.mem-bar) {
		position: relative;
	}

	.mem-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--mem-pct);
		background: linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
		pointer-events: none;
	}

	.cmdline {
		color: #64748b;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		max-width: 300px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.insights-card {
		background: rgba(30, 41, 59, 0.6);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
		margin-bottom: 2rem;
	}

	.insights-card h3 {
		margin: 0 0 1.25rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.insights-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.insight h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: #94a3b8;
	}

	.insight ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.insight li {
		padding: 0.5rem 0;
		font-size: 0.85rem;
		color: #cbd5e1;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.insight li::before {
		content: '•';
		color: #64748b;
	}

	.insight li.warn::before {
		content: '⚠️';
	}

	.insight li.good::before {
		content: '✅';
	}

	.insight li.info::before {
		content: 'ℹ️';
	}

	.footer {
		text-align: center;
		padding: 1.5rem;
		color: #475569;
		font-size: 0.8rem;
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}

		.header {
			flex-direction: column;
		}

		.controls {
			width: 100%;
		}

		.control-group select {
			flex: 1;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-card {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.stat-value {
			font-size: 1.5rem;
		}
	}
</style>

