<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>PinePhone Pro Telemetry</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="landing">
	<div class="hero">
		<div class="logo-container">
			<div class="logo">📱</div>
			<div class="pulse"></div>
		</div>
		<h1>PinePhone Pro<br />Telemetry Service</h1>
		<p class="tagline">Real-time performance monitoring and battery analytics for your PinePhone Pro</p>

		<div class="actions">
			<a href="/dashboard" class="btn btn-primary">
				<span class="icon">📊</span>
				Open Dashboard
			</a>
			<a href="/api/health" class="btn btn-secondary">
				<span class="icon">🔗</span>
				API Status
			</a>
		</div>
	</div>

	<div class="features">
		<div class="feature">
			<div class="feature-icon">🔋</div>
			<h3>Battery Tracking</h3>
			<p>Monitor discharge rates, voltage curves, and estimate remaining battery life</p>
		</div>
		<div class="feature">
			<div class="feature-icon">🌡️</div>
			<h3>Thermal Monitoring</h3>
			<p>Track CPU, GPU, and battery temperatures to prevent throttling</p>
		</div>
		<div class="feature">
			<div class="feature-icon">⚡</div>
			<h3>CPU Analytics</h3>
			<p>Visualize load averages, frequency scaling, and core utilization</p>
		</div>
		<div class="feature">
			<div class="feature-icon">💾</div>
			<h3>Memory Insights</h3>
			<p>Monitor RAM usage, swap activity, and identify memory-hungry processes</p>
		</div>
	</div>

	<div class="endpoints">
		<h2>API Endpoints</h2>
		<div class="endpoint-list">
			<div class="endpoint">
				<code class="method post">POST</code>
				<code class="path">/api/telemetry</code>
				<span class="desc">Submit telemetry reading</span>
			</div>
			<div class="endpoint">
				<code class="method post">POST</code>
				<code class="path">/api/telemetry/batch</code>
				<span class="desc">Submit batch of readings</span>
			</div>
			<div class="endpoint">
				<code class="method get">GET</code>
				<code class="path">/api/dashboard</code>
				<span class="desc">Fetch dashboard data</span>
			</div>
			<div class="endpoint">
				<code class="method get">GET</code>
				<code class="path">/api/health</code>
				<span class="desc">Service health check</span>
			</div>
		</div>
	</div>

	<footer>
		<p>PinePhone Pro Telemetry Service • Built with SvelteKit & Drizzle</p>
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

	.landing {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
	}

	.hero {
		text-align: center;
		padding: 4rem 0;
	}

	.logo-container {
		position: relative;
		display: inline-block;
		margin-bottom: 2rem;
	}

	.logo {
		font-size: 5rem;
		position: relative;
		z-index: 1;
	}

	.pulse {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 120px;
		height: 120px;
		background: radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0.7;
		}
		50% {
			transform: translate(-50%, -50%) scale(1.2);
			opacity: 0.3;
		}
	}

	h1 {
		font-size: 3rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		background: linear-gradient(135deg, #22d3ee, #a78bfa, #f472b6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		line-height: 1.2;
	}

	.tagline {
		font-size: 1.2rem;
		color: #64748b;
		max-width: 500px;
		margin: 0 auto 2.5rem auto;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.75rem;
		border-radius: 12px;
		font-family: inherit;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
	}

	.btn-primary {
		background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
		color: white;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
	}

	.btn-secondary {
		background: rgba(30, 41, 59, 0.8);
		color: #e2e8f0;
		border: 1px solid rgba(148, 163, 184, 0.2);
	}

	.btn-secondary:hover {
		background: rgba(51, 65, 85, 0.8);
		border-color: rgba(148, 163, 184, 0.3);
	}

	.icon {
		font-size: 1.2rem;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		margin: 4rem 0;
	}

	.feature {
		background: rgba(30, 41, 59, 0.5);
		border-radius: 16px;
		padding: 1.5rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
		text-align: center;
		transition: all 0.2s;
	}

	.feature:hover {
		transform: translateY(-4px);
		border-color: rgba(148, 163, 184, 0.2);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
	}

	.feature-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.feature p {
		margin: 0;
		font-size: 0.9rem;
		color: #94a3b8;
	}

	.endpoints {
		background: rgba(30, 41, 59, 0.5);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid rgba(148, 163, 184, 0.1);
	}

	.endpoints h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.endpoint-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.endpoint {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(15, 23, 42, 0.5);
		border-radius: 8px;
	}

	.method {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.method.get {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.method.post {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.path {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.9rem;
		color: #e2e8f0;
		background: transparent;
	}

	.desc {
		color: #64748b;
		font-size: 0.85rem;
		margin-left: auto;
	}

	footer {
		text-align: center;
		padding: 3rem 0;
		color: #475569;
		font-size: 0.85rem;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}

		.tagline {
			font-size: 1rem;
		}

		.endpoint {
			flex-wrap: wrap;
		}

		.desc {
			width: 100%;
			margin-left: 0;
			margin-top: 0.5rem;
		}
	}
</style>
