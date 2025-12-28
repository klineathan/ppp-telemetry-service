import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { desc, eq, and, gte, sql } from 'drizzle-orm';

export interface DashboardData {
	devices: DeviceInfo[];
	selectedDevice: DeviceInfo | null;
	battery: BatteryTimeSeries[];
	thermal: ThermalTimeSeries[];
	cpuLoad: CpuLoadTimeSeries[];
	memory: MemoryTimeSeries[];
	topProcesses: TopProcess[];
	systemInfo: SystemInfo | null;
	networkStats: NetworkStats | null;
	gpuInfo: GpuInfo | null;
}

interface DeviceInfo {
	id: number;
	deviceId: string;
	name: string | null;
	lastSeenAt: Date;
}

interface BatteryTimeSeries {
	timestamp: Date;
	capacity: number;
	voltage: number;
	current: number;
	temperature: number;
	status: string;
	health: string;
}

interface ThermalTimeSeries {
	timestamp: Date;
	cpuTemp: number;
	gpuTemp: number;
	batteryTemp: number;
}

interface CpuLoadTimeSeries {
	timestamp: Date;
	load1: number;
	load5: number;
	load15: number;
	uptime: number;
}

interface MemoryTimeSeries {
	timestamp: Date;
	usedPercent: number;
	swapUsedPercent: number;
	available: number;
	total: number;
}

interface TopProcess {
	pid: number;
	name: string;
	cpuPercent: number | null;
	memoryPercent: number;
	state: string;
	cmdline: string;
}

interface SystemInfo {
	uptime: number;
	totalProcesses: number;
	runningProcesses: number;
	onlineCpus: number[];
	displayBrightness: number | null;
}

interface NetworkStats {
	totalRxBytes: number;
	totalTxBytes: number;
	wifiSignal: number | null;
	wifiSsid: string | null;
}

interface GpuInfo {
	currentFreq: number;
	governor: string;
	minFreq: number;
	maxFreq: number;
}

/**
 * GET /api/dashboard
 * Returns dashboard data for visualization
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const deviceIdParam = url.searchParams.get('deviceId');
		const hoursParam = url.searchParams.get('hours');
		const hours = hoursParam ? parseInt(hoursParam, 10) : 24;
		const limitParam = url.searchParams.get('limit');
		const limit = limitParam ? parseInt(limitParam, 10) : 500;

		// Get all devices
		const devices = await db.query.devices.findMany({
			orderBy: [desc(schema.devices.lastSeenAt)]
		});

		if (devices.length === 0) {
			return json({
				success: true,
				data: {
					devices: [],
					selectedDevice: null,
					battery: [],
					thermal: [],
					cpuLoad: [],
					memory: [],
					topProcesses: [],
					systemInfo: null,
					networkStats: null,
					gpuInfo: null
				} satisfies DashboardData
			});
		}

		// Select device (use provided or first available)
		const selectedDevice = deviceIdParam
			? devices.find((d) => d.deviceId === deviceIdParam) || devices[0]
			: devices[0];

		const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

		// Get high-frequency readings for the selected device within time range
		const readings = await db.query.telemetryReadings.findMany({
			where: and(
				eq(schema.telemetryReadings.deviceId, selectedDevice.id),
				gte(schema.telemetryReadings.timestamp, cutoffTime)
			),
			orderBy: [desc(schema.telemetryReadings.timestamp)],
			limit
		});

		const readingIds = readings.map((r) => r.id);

		// Fetch battery data
		const batteryData: BatteryTimeSeries[] = [];
		if (readingIds.length > 0) {
			const batteryReadings = await db.query.batteryReadings.findMany({
				where: sql`${schema.batteryReadings.readingId} = ANY(ARRAY[${sql.raw(readingIds.join(','))}]::int[])`,
				with: {
					reading: true
				}
			});

			for (const br of batteryReadings) {
				batteryData.push({
					timestamp: br.reading.timestamp,
					capacity: br.capacity,
					voltage: br.voltage,
					current: br.current,
					temperature: br.temperature,
					status: br.status,
					health: br.health
				});
			}
		}

		// Fetch thermal summary data
		const thermalData: ThermalTimeSeries[] = [];
		if (readingIds.length > 0) {
			const thermalReadings = await db.query.thermalSummaryReadings.findMany({
				where: sql`${schema.thermalSummaryReadings.readingId} = ANY(ARRAY[${sql.raw(readingIds.join(','))}]::int[])`,
				with: {
					reading: true
				}
			});

			for (const tr of thermalReadings) {
				thermalData.push({
					timestamp: tr.reading.timestamp,
					cpuTemp: tr.cpuTemp,
					gpuTemp: tr.gpuTemp,
					batteryTemp: tr.batteryTemp
				});
			}
		}

		// Fetch CPU load data
		const cpuLoadData: CpuLoadTimeSeries[] = [];
		if (readingIds.length > 0) {
			const cpuLoadReadings = await db.query.cpuLoadReadings.findMany({
				where: sql`${schema.cpuLoadReadings.readingId} = ANY(ARRAY[${sql.raw(readingIds.join(','))}]::int[])`,
				with: {
					reading: true
				}
			});

			for (const cl of cpuLoadReadings) {
				cpuLoadData.push({
					timestamp: cl.reading.timestamp,
					load1: cl.load1,
					load5: cl.load5,
					load15: cl.load15,
					uptime: cl.uptime
				});
			}
		}

		// Fetch memory data
		const memoryData: MemoryTimeSeries[] = [];
		if (readingIds.length > 0) {
			const memoryReadings = await db.query.memoryReadings.findMany({
				where: sql`${schema.memoryReadings.readingId} = ANY(ARRAY[${sql.raw(readingIds.join(','))}]::int[])`,
				with: {
					reading: true
				}
			});

			for (const mr of memoryReadings) {
				memoryData.push({
					timestamp: mr.reading.timestamp,
					usedPercent: mr.usedPercent,
					swapUsedPercent: mr.swapUsedPercent,
					available: Number(mr.available),
					total: Number(mr.total)
				});
			}
		}

		// Fetch top processes (from most recent medium-frequency reading)
		const topProcesses: TopProcess[] = [];
		const latestMediumReading = await db.query.telemetryReadings.findFirst({
			where: and(
				eq(schema.telemetryReadings.deviceId, selectedDevice.id),
				eq(schema.telemetryReadings.frequency, 'medium')
			),
			orderBy: [desc(schema.telemetryReadings.timestamp)]
		});

		if (latestMediumReading) {
			const processes = await db.query.processReadings.findMany({
				where: eq(schema.processReadings.readingId, latestMediumReading.id),
				orderBy: [desc(schema.processReadings.memoryPercent)],
				limit: 15
			});

			for (const p of processes) {
				topProcesses.push({
					pid: p.pid,
					name: p.name,
					cpuPercent: p.cpuPercent,
					memoryPercent: p.memoryPercent,
					state: p.state,
					cmdline: p.cmdline
				});
			}
		}

		// Get latest system info
		let systemInfo: SystemInfo | null = null;
		if (cpuLoadData.length > 0) {
			const latestCpuLoad = cpuLoadData[0];
			const latestCpuLoadReading = await db.query.cpuLoadReadings.findFirst({
				where: eq(schema.cpuLoadReadings.readingId, readings[0]?.id ?? 0)
			});

			let displayBrightness: number | null = null;
			const latestLowReading = await db.query.telemetryReadings.findFirst({
				where: and(
					eq(schema.telemetryReadings.deviceId, selectedDevice.id),
					eq(schema.telemetryReadings.frequency, 'low')
				),
				orderBy: [desc(schema.telemetryReadings.timestamp)]
			});
			if (latestLowReading) {
				const display = await db.query.displayReadings.findFirst({
					where: eq(schema.displayReadings.readingId, latestLowReading.id)
				});
				if (display) {
					displayBrightness = display.brightnessPercent;
				}
			}

			systemInfo = {
				uptime: latestCpuLoad.uptime,
				totalProcesses: latestCpuLoadReading?.totalProcesses ?? 0,
				runningProcesses: latestCpuLoadReading?.runningProcesses ?? 0,
				onlineCpus: (latestCpuLoadReading?.onlineCpus as number[]) ?? [],
				displayBrightness
			};
		}

		// Get latest network stats
		let networkStats: NetworkStats | null = null;
		if (readingIds.length > 0) {
			const latestNetworkReading = await db.query.networkSummaryReadings.findFirst({
				where: eq(schema.networkSummaryReadings.readingId, readings[0]?.id ?? 0)
			});
			if (latestNetworkReading) {
				networkStats = {
					totalRxBytes: Number(latestNetworkReading.totalRxBytes),
					totalTxBytes: Number(latestNetworkReading.totalTxBytes),
					wifiSignal: latestNetworkReading.wifiSignalStrength,
					wifiSsid: latestNetworkReading.wifiSsid
				};
			}
		}

		// Get latest GPU info
		let gpuInfo: GpuInfo | null = null;
		if (latestMediumReading) {
			const gpuReading = await db.query.gpuReadings.findFirst({
				where: eq(schema.gpuReadings.readingId, latestMediumReading.id)
			});
			if (gpuReading) {
				gpuInfo = {
					currentFreq: gpuReading.currentFreq,
					governor: gpuReading.governor,
					minFreq: gpuReading.minFreq,
					maxFreq: gpuReading.maxFreq
				};
			}
		}

		// Sort time series data chronologically
		batteryData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
		thermalData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
		cpuLoadData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
		memoryData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

		const dashboardData: DashboardData = {
			devices: devices.map((d) => ({
				id: d.id,
				deviceId: d.deviceId,
				name: d.name,
				lastSeenAt: d.lastSeenAt
			})),
			selectedDevice: {
				id: selectedDevice.id,
				deviceId: selectedDevice.deviceId,
				name: selectedDevice.name,
				lastSeenAt: selectedDevice.lastSeenAt
			},
			battery: batteryData,
			thermal: thermalData,
			cpuLoad: cpuLoadData,
			memory: memoryData,
			topProcesses,
			systemInfo,
			networkStats,
			gpuInfo
		};

		return json({
			success: true,
			data: dashboardData,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Error fetching dashboard data:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Internal server error',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};

