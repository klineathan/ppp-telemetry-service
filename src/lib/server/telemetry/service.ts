/**
 * Telemetry service - handles database operations for incoming telemetry
 */

import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import type {
	TelemetryPayload,
	TelemetryFrequency,
	HighFrequencyTelemetry,
	MediumFrequencyTelemetry,
	LowFrequencyTelemetry,
	BlockDeviceTelemetry
} from './types';

export interface TelemetryInsertResult {
	readingId: number;
	deviceId: number;
}

/**
 * Get or create a device by deviceId
 */
async function getOrCreateDevice(deviceId: string): Promise<number> {
	// Try to find existing device
	const existing = await db.query.devices.findFirst({
		where: eq(schema.devices.deviceId, deviceId)
	});

	if (existing) {
		// Update last seen timestamp
		await db
			.update(schema.devices)
			.set({ lastSeenAt: new Date() })
			.where(eq(schema.devices.id, existing.id));
		return existing.id;
	}

	// Create new device
	const [newDevice] = await db
		.insert(schema.devices)
		.values({ deviceId, name: deviceId })
		.returning({ id: schema.devices.id });

	return newDevice.id;
}

/**
 * Create the main telemetry reading record
 */
async function createReading(
	deviceDbId: number,
	timestamp: Date,
	timestampMs: number,
	frequency: TelemetryFrequency
): Promise<number> {
	const [reading] = await db
		.insert(schema.telemetryReadings)
		.values({
			deviceId: deviceDbId,
			timestamp,
			timestampMs,
			frequency
		})
		.returning({ id: schema.telemetryReadings.id });

	return reading.id;
}

/**
 * Insert high-frequency telemetry data
 */
async function insertHighFrequencyData(
	readingId: number,
	data: HighFrequencyTelemetry
): Promise<void> {
	const { power, thermal, cpu, memory, network } = data;

	// Power telemetry
	await Promise.all([
		// Battery
		db.insert(schema.batteryReadings).values({
			readingId,
			capacity: power.battery.capacity,
			status: power.battery.status,
			voltage: power.battery.voltage,
			current: power.battery.current,
			temperature: power.battery.temperature,
			chargeFull: power.battery.chargeFull,
			chargeFullDesign: power.battery.chargeFullDesign,
			health: power.battery.health,
			present: power.battery.present,
			chargeType: power.battery.chargeType,
			energyFullDesign: power.battery.energyFullDesign
		}),

		// USB Input
		db.insert(schema.usbInputReadings).values({
			readingId,
			present: power.usbInput.present,
			health: power.usbInput.health,
			inputCurrentLimit: power.usbInput.inputCurrentLimit,
			inputVoltageLimit: power.usbInput.inputVoltageLimit
		}),

		// USB PD
		db.insert(schema.usbPdReadings).values({
			readingId,
			online: power.usbCPd.online,
			voltage: power.usbCPd.voltage,
			voltageMin: power.usbCPd.voltageMin,
			voltageMax: power.usbCPd.voltageMax,
			current: power.usbCPd.current,
			currentMax: power.usbCPd.currentMax,
			usbType: power.usbCPd.usbType
		}),

		// Type-C Port
		db.insert(schema.typeCPortReadings).values({
			readingId,
			dataRole: power.typeCPort.dataRole,
			powerRole: power.typeCPort.powerRole,
			orientation: power.typeCPort.orientation,
			powerOperationMode: power.typeCPort.powerOperationMode,
			vconnSource: power.typeCPort.vconnSource
		}),

		// Thermal zones
		...thermal.zones.map((zone) =>
			db.insert(schema.thermalZoneReadings).values({
				readingId,
				zone: zone.zone,
				type: zone.type,
				temperature: zone.temperature,
				tripPoints: zone.tripPoints ?? null
			})
		),

		// Cooling devices
		...thermal.coolingDevices.map((device) =>
			db.insert(schema.coolingDeviceReadings).values({
				readingId,
				deviceIndex: device.index,
				type: device.type,
				currentState: device.currentState,
				maxState: device.maxState
			})
		),

		// Thermal summary
		db.insert(schema.thermalSummaryReadings).values({
			readingId,
			batteryTemp: thermal.batteryTemp,
			cpuTemp: thermal.cpuTemp,
			gpuTemp: thermal.gpuTemp
		}),

		// CPU frequencies
		...cpu.frequencies.map((freq) =>
			db.insert(schema.cpuFrequencyReadings).values({
				readingId,
				cpu: freq.cpu,
				currentFreq: freq.currentFreq,
				minFreq: freq.minFreq,
				maxFreq: freq.maxFreq,
				hardwareMinFreq: freq.hardwareMinFreq,
				hardwareMaxFreq: freq.hardwareMaxFreq,
				governor: freq.governor
			})
		),

		// CPU times
		...cpu.cpuTimes.map((time) =>
			db.insert(schema.cpuTimeReadings).values({
				readingId,
				cpu: time.cpu,
				user: time.user,
				nice: time.nice,
				system: time.system,
				idle: time.idle,
				iowait: time.iowait,
				irq: time.irq,
				softirq: time.softirq,
				steal: time.steal
			})
		),

		// CPU load
		db.insert(schema.cpuLoadReadings).values({
			readingId,
			load1: cpu.loadAverage.load1,
			load5: cpu.loadAverage.load5,
			load15: cpu.loadAverage.load15,
			runningProcesses: cpu.loadAverage.runningProcesses,
			totalProcesses: cpu.loadAverage.totalProcesses,
			uptime: cpu.uptime,
			idleTime: cpu.idleTime,
			onlineCpus: cpu.onlineCpus,
			offlineCpus: cpu.offlineCpus
		}),

		// Memory
		db.insert(schema.memoryReadings).values({
			readingId,
			total: memory.total,
			free: memory.free,
			available: memory.available,
			buffers: memory.buffers,
			cached: memory.cached,
			swapTotal: memory.swapTotal,
			swapFree: memory.swapFree,
			swapUsed: memory.swapUsed,
			active: memory.active,
			inactive: memory.inactive,
			activeAnon: memory.activeAnon,
			inactiveAnon: memory.inactiveAnon,
			activeFile: memory.activeFile,
			inactiveFile: memory.inactiveFile,
			dirty: memory.dirty,
			writeback: memory.writeback,
			anonPages: memory.anonPages,
			mapped: memory.mapped,
			shmem: memory.shmem,
			slab: memory.slab,
			sReclaimable: memory.sReclaimable,
			sUnreclaim: memory.sUnreclaim,
			usedPercent: memory.usedPercent,
			swapUsedPercent: memory.swapUsedPercent
		}),

		// Network interfaces
		...network.interfaces.map((iface) =>
			db.insert(schema.networkInterfaceReadings).values({
				readingId,
				name: iface.name,
				address: iface.address,
				carrier: iface.carrier,
				carrierChanges: iface.carrierChanges,
				operstate: iface.operstate,
				mtu: iface.mtu,
				type: iface.type,
				rxBytes: iface.stats.rxBytes,
				txBytes: iface.stats.txBytes,
				rxPackets: iface.stats.rxPackets,
				txPackets: iface.stats.txPackets,
				rxErrors: iface.stats.rxErrors,
				txErrors: iface.stats.txErrors,
				rxDropped: iface.stats.rxDropped,
				txDropped: iface.stats.txDropped,
				rxFifo: iface.stats.rxFifo,
				txFifo: iface.stats.txFifo,
				rxFrame: iface.stats.rxFrame,
				txCarrier: iface.stats.txCarrier,
				collisions: iface.stats.collisions
			})
		),

		// Network summary
		db.insert(schema.networkSummaryReadings).values({
			readingId,
			totalRxBytes: network.totalRxBytes,
			totalTxBytes: network.totalTxBytes,
			wifiSignalStrength: network.wifi?.signalStrength ?? null,
			wifiLinkQuality: network.wifi?.linkQuality ?? null,
			wifiNoiseLevel: network.wifi?.noiseLevel ?? null,
			wifiSsid: network.wifi?.ssid ?? null,
			wifiFrequency: network.wifi?.frequency ?? null,
			wifiBitrate: network.wifi?.bitrate ?? null
		})
	]);
}

/**
 * Insert storage device recursively (for partitions)
 */
async function insertStorageDevice(
	readingId: number,
	device: BlockDeviceTelemetry,
	parentDeviceId: number | null = null
): Promise<void> {
	const [inserted] = await db
		.insert(schema.storageDeviceReadings)
		.values({
			readingId,
			parentDeviceId,
			name: device.name,
			type: device.type,
			size: device.size,
			bytesRead: device.bytesRead,
			bytesWritten: device.bytesWritten,
			readsCompleted: device.stats.readsCompleted,
			readsMerged: device.stats.readsMerged,
			sectorsRead: device.stats.sectorsRead,
			readTimeMs: device.stats.readTimeMs,
			writesCompleted: device.stats.writesCompleted,
			writesMerged: device.stats.writesMerged,
			sectorsWritten: device.stats.sectorsWritten,
			writeTimeMs: device.stats.writeTimeMs,
			iosInProgress: device.stats.iosInProgress,
			ioTimeMs: device.stats.ioTimeMs,
			weightedIoTimeMs: device.stats.weightedIoTimeMs
		})
		.returning({ id: schema.storageDeviceReadings.id });

	// Insert partitions recursively
	if (device.partitions) {
		for (const partition of device.partitions) {
			await insertStorageDevice(readingId, partition, inserted.id);
		}
	}
}

/**
 * Insert medium-frequency telemetry data
 */
async function insertMediumFrequencyData(
	readingId: number,
	data: MediumFrequencyTelemetry
): Promise<void> {
	const { cpuStats, gpu, storage, processes } = data;

	// CPU frequency stats
	const cpuFreqStatsInserts =
		cpuStats.frequencyStats?.map((stat) =>
			db.insert(schema.cpuFrequencyStats).values({
				readingId,
				cpu: stat.cpu,
				timeInState: stat.timeInState,
				totalTransitions: stat.totalTransitions
			})
		) ?? [];

	// CPU idle stats
	const cpuIdleStatsInserts =
		cpuStats.idleStats?.map((stat) =>
			db.insert(schema.cpuIdleStats).values({
				readingId,
				cpu: stat.cpu,
				states: stat.states
			})
		) ?? [];

	// Process readings
	const processInserts = processes.processes.map((proc) =>
		db.insert(schema.processReadings).values({
			readingId,
			pid: proc.pid,
			name: proc.name,
			state: proc.state,
			ppid: proc.ppid,
			pgrp: proc.pgrp,
			session: proc.session,
			userTimeMs: proc.userTimeMs,
			systemTimeMs: proc.systemTimeMs,
			totalCpuTimeMs: proc.totalCpuTimeMs,
			cpuPercent: proc.cpuPercent ?? null,
			vsize: proc.vsize,
			rss: proc.rss,
			rssLimit: proc.rssLimit,
			memoryPercent: proc.memoryPercent,
			numThreads: proc.numThreads,
			nice: proc.nice,
			priority: proc.priority,
			startTime: proc.startTime,
			cmdline: proc.cmdline,
			oomScore: proc.oomScore,
			readBytes: proc.readBytes ?? null,
			writeBytes: proc.writeBytes ?? null
		})
	);

	await Promise.all([
		...cpuFreqStatsInserts,
		...cpuIdleStatsInserts,

		// GPU
		db.insert(schema.gpuReadings).values({
			readingId,
			currentFreq: gpu.frequency.currentFreq,
			targetFreq: gpu.frequency.targetFreq,
			minFreq: gpu.frequency.minFreq,
			maxFreq: gpu.frequency.maxFreq,
			governor: gpu.frequency.governor,
			availableFrequencies: gpu.frequency.availableFrequencies,
			pollingIntervalMs: gpu.frequency.pollingIntervalMs,
			transitionStats: gpu.transitionStats ?? null,
			totalTransitions: gpu.totalTransitions ?? null
		}),

		// Storage summary
		db.insert(schema.storageSummaryReadings).values({
			readingId,
			totalBytesRead: storage.totalBytesRead,
			totalBytesWritten: storage.totalBytesWritten,
			totalIoTimeMs: storage.totalIoTimeMs
		}),

		// Process summary
		db.insert(schema.processSummaryReadings).values({
			readingId,
			total: processes.summary.total,
			running: processes.summary.running,
			sleeping: processes.summary.sleeping,
			zombie: processes.summary.zombie,
			stopped: processes.summary.stopped,
			totalCpuTime: processes.totalCpuTime,
			contextSwitches: processes.contextSwitches,
			processesCreated: processes.processesCreated
		}),

		...processInserts
	]);

	// Insert storage devices (recursive, so done separately)
	for (const device of storage.devices) {
		await insertStorageDevice(readingId, device);
	}
}

/**
 * Insert low-frequency telemetry data
 */
async function insertLowFrequencyData(
	readingId: number,
	data: LowFrequencyTelemetry
): Promise<void> {
	const { sensors, system } = data;

	// LED readings
	const ledInserts = system.leds.map((led) =>
		db.insert(schema.ledReadings).values({
			readingId,
			name: led.name,
			brightness: led.brightness,
			maxBrightness: led.maxBrightness,
			trigger: led.trigger
		})
	);

	// RF Kill readings
	const rfKillInserts = system.rfkill.map((rf) =>
		db.insert(schema.rfKillReadings).values({
			readingId,
			type: rf.type,
			name: rf.name,
			softBlocked: rf.softBlocked,
			hardBlocked: rf.hardBlocked
		})
	);

	await Promise.all([
		// Sensors
		db.insert(schema.sensorReadings).values({
			readingId,
			illuminanceRaw: sensors.ambientLight.illuminanceRaw,
			illuminanceScale: sensors.ambientLight.illuminanceScale,
			illuminanceLux: sensors.ambientLight.illuminanceLux,
			proximityRaw: sensors.proximity.proximityRaw,
			proximityScale: sensors.proximity.proximityScale,
			nearLevel: sensors.proximity.nearLevel,
			isNear: sensors.proximity.isNear,
			accelRawX: sensors.accelerometer.raw.x,
			accelRawY: sensors.accelerometer.raw.y,
			accelRawZ: sensors.accelerometer.raw.z,
			accelScale: sensors.accelerometer.scale,
			accelX: sensors.accelerometer.acceleration.x,
			accelY: sensors.accelerometer.acceleration.y,
			accelZ: sensors.accelerometer.acceleration.z,
			accelMagnitude: sensors.accelerometer.magnitude,
			gyroRawX: sensors.gyroscope.raw.x,
			gyroRawY: sensors.gyroscope.raw.y,
			gyroRawZ: sensors.gyroscope.raw.z,
			gyroScale: sensors.gyroscope.scale,
			gyroX: sensors.gyroscope.angularVelocity.x,
			gyroY: sensors.gyroscope.angularVelocity.y,
			gyroZ: sensors.gyroscope.angularVelocity.z,
			gyroMagnitude: sensors.gyroscope.magnitude,
			magRawX: sensors.magnetometer.raw.x,
			magRawY: sensors.magnetometer.raw.y,
			magRawZ: sensors.magnetometer.raw.z,
			magScale: sensors.magnetometer.scale,
			magX: sensors.magnetometer.magneticField.x,
			magY: sensors.magnetometer.magneticField.y,
			magZ: sensors.magnetometer.magneticField.z,
			magHeading: sensors.magnetometer.heading,
			adcChannels: sensors.adcChannels
		}),

		// Display
		db.insert(schema.displayReadings).values({
			readingId,
			brightness: system.display.brightness,
			maxBrightness: system.display.maxBrightness,
			brightnessPercent: system.display.brightnessPercent,
			power: system.display.power
		}),

		// System wakeup
		db.insert(schema.systemWakeupReadings).values({
			readingId,
			wakeupCount: system.wakeupCount
		}),

		...ledInserts,
		...rfKillInserts
	]);
}

/**
 * Process a single telemetry payload
 */
export async function processTelemetryPayload(
	payload: TelemetryPayload
): Promise<TelemetryInsertResult> {
	// Get or create device
	const deviceDbId = await getOrCreateDevice(payload.deviceId);

	// Parse timestamp
	const timestamp = new Date(payload.timestamp);

	// Create main reading record
	const readingId = await createReading(deviceDbId, timestamp, payload.timestampMs, payload.frequency);

	// Insert frequency-specific data
	switch (payload.frequency) {
		case 'high':
			await insertHighFrequencyData(readingId, payload.data as HighFrequencyTelemetry);
			break;
		case 'medium':
			await insertMediumFrequencyData(readingId, payload.data as MediumFrequencyTelemetry);
			break;
		case 'low':
			await insertLowFrequencyData(readingId, payload.data as LowFrequencyTelemetry);
			break;
	}

	return { readingId, deviceId: deviceDbId };
}

/**
 * Process multiple telemetry payloads in batch
 */
export async function processTelemetryBatch(
	payloads: TelemetryPayload[]
): Promise<TelemetryInsertResult[]> {
	const results: TelemetryInsertResult[] = [];

	for (const payload of payloads) {
		const result = await processTelemetryPayload(payload);
		results.push(result);
	}

	return results;
}

