import {
	pgTable,
	serial,
	integer,
	timestamp,
	real,
	text,
	boolean,
	bigint,
	varchar,
	pgEnum,
	json,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Enums
// ============================================================================

export const telemetryFrequencyEnum = pgEnum('telemetry_frequency', ['high', 'medium', 'low']);

export const batteryStatusEnum = pgEnum('battery_status', [
	'Charging',
	'Discharging',
	'Full',
	'Not charging',
	'Unknown'
]);

export const batteryHealthEnum = pgEnum('battery_health', [
	'Good',
	'Overheat',
	'Dead',
	'Over voltage',
	'Failure',
	'Unknown'
]);

export const chargeTypeEnum = pgEnum('charge_type', ['Fast', 'Trickle', 'Standard', 'Unknown']);

export const usbTypeEnum = pgEnum('usb_type', [
	'Unknown',
	'SDP',
	'DCP',
	'CDP',
	'ACA',
	'C',
	'PD',
	'PD_DRP',
	'PD_PPS',
	'BrickID'
]);

export const networkInterfaceTypeEnum = pgEnum('network_interface_type', [
	'wifi',
	'cellular',
	'usb',
	'loopback',
	'other'
]);

export const blockDeviceTypeEnum = pgEnum('block_device_type', [
	'emmc',
	'sdcard',
	'zram',
	'loop',
	'other'
]);

export const rfKillTypeEnum = pgEnum('rfkill_type', ['bluetooth', 'wifi', 'wwan']);

// ============================================================================
// Core Tables
// ============================================================================

/** Registered devices sending telemetry */
export const devices = pgTable(
	'devices',
	{
		id: serial('id').primaryKey(),
		deviceId: varchar('device_id', { length: 255 }).notNull().unique(),
		name: varchar('name', { length: 255 }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('devices_device_id_idx').on(table.deviceId)]
);

/** Main telemetry reading entry - each API call creates one */
export const telemetryReadings = pgTable(
	'telemetry_readings',
	{
		id: serial('id').primaryKey(),
		deviceId: integer('device_id')
			.references(() => devices.id, { onDelete: 'cascade' })
			.notNull(),
		timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
		timestampMs: bigint('timestamp_ms', { mode: 'number' }).notNull(),
		frequency: telemetryFrequencyEnum('frequency').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('telemetry_readings_device_id_idx').on(table.deviceId),
		index('telemetry_readings_timestamp_idx').on(table.timestamp),
		index('telemetry_readings_frequency_idx').on(table.frequency)
	]
);

// ============================================================================
// Battery & Power Tables
// ============================================================================

/** Primary battery telemetry (RK818) */
export const batteryReadings = pgTable(
	'battery_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		capacity: integer('capacity').notNull(),
		status: batteryStatusEnum('status').notNull(),
		voltage: real('voltage').notNull(),
		current: real('current').notNull(),
		temperature: real('temperature').notNull(),
		chargeFull: integer('charge_full').notNull(),
		chargeFullDesign: integer('charge_full_design').notNull(),
		health: batteryHealthEnum('health').notNull(),
		present: boolean('present').notNull(),
		chargeType: chargeTypeEnum('charge_type').notNull(),
		energyFullDesign: real('energy_full_design').notNull()
	},
	(table) => [index('battery_readings_reading_id_idx').on(table.readingId)]
);

/** USB input power telemetry */
export const usbInputReadings = pgTable(
	'usb_input_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		present: boolean('present').notNull(),
		health: batteryHealthEnum('health').notNull(),
		inputCurrentLimit: real('input_current_limit').notNull(),
		inputVoltageLimit: real('input_voltage_limit').notNull()
	},
	(table) => [index('usb_input_readings_reading_id_idx').on(table.readingId)]
);

/** USB-C Power Delivery telemetry */
export const usbPdReadings = pgTable(
	'usb_pd_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		online: boolean('online').notNull(),
		voltage: real('voltage').notNull(),
		voltageMin: real('voltage_min').notNull(),
		voltageMax: real('voltage_max').notNull(),
		current: real('current').notNull(),
		currentMax: real('current_max').notNull(),
		usbType: usbTypeEnum('usb_type').notNull()
	},
	(table) => [index('usb_pd_readings_reading_id_idx').on(table.readingId)]
);

/** USB Type-C port status */
export const typeCPortReadings = pgTable(
	'typec_port_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		dataRole: varchar('data_role', { length: 50 }).notNull(),
		powerRole: varchar('power_role', { length: 50 }).notNull(),
		orientation: varchar('orientation', { length: 50 }).notNull(),
		powerOperationMode: varchar('power_operation_mode', { length: 50 }).notNull(),
		vconnSource: boolean('vconn_source').notNull()
	},
	(table) => [index('typec_port_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Thermal Tables
// ============================================================================

/** Thermal zone readings */
export const thermalZoneReadings = pgTable(
	'thermal_zone_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		zone: integer('zone').notNull(),
		type: varchar('type', { length: 100 }).notNull(),
		temperature: real('temperature').notNull(),
		tripPoints: json('trip_points')
	},
	(table) => [index('thermal_zone_readings_reading_id_idx').on(table.readingId)]
);

/** Cooling device readings */
export const coolingDeviceReadings = pgTable(
	'cooling_device_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		deviceIndex: integer('device_index').notNull(),
		type: varchar('type', { length: 100 }).notNull(),
		currentState: integer('current_state').notNull(),
		maxState: integer('max_state').notNull()
	},
	(table) => [index('cooling_device_readings_reading_id_idx').on(table.readingId)]
);

/** Thermal summary (convenience fields extracted from zones) */
export const thermalSummaryReadings = pgTable(
	'thermal_summary_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		batteryTemp: real('battery_temp').notNull(),
		cpuTemp: real('cpu_temp').notNull(),
		gpuTemp: real('gpu_temp').notNull()
	},
	(table) => [index('thermal_summary_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// CPU Tables
// ============================================================================

/** Per-CPU frequency telemetry */
export const cpuFrequencyReadings = pgTable(
	'cpu_frequency_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		cpu: integer('cpu').notNull(),
		currentFreq: integer('current_freq').notNull(),
		minFreq: integer('min_freq').notNull(),
		maxFreq: integer('max_freq').notNull(),
		hardwareMinFreq: integer('hardware_min_freq').notNull(),
		hardwareMaxFreq: integer('hardware_max_freq').notNull(),
		governor: varchar('governor', { length: 50 }).notNull()
	},
	(table) => [index('cpu_frequency_readings_reading_id_idx').on(table.readingId)]
);

/** CPU time statistics */
export const cpuTimeReadings = pgTable(
	'cpu_time_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		cpu: varchar('cpu', { length: 20 }).notNull(),
		user: bigint('user_time', { mode: 'number' }).notNull(),
		nice: bigint('nice_time', { mode: 'number' }).notNull(),
		system: bigint('system_time', { mode: 'number' }).notNull(),
		idle: bigint('idle_time', { mode: 'number' }).notNull(),
		iowait: bigint('iowait_time', { mode: 'number' }).notNull(),
		irq: bigint('irq_time', { mode: 'number' }).notNull(),
		softirq: bigint('softirq_time', { mode: 'number' }).notNull(),
		steal: bigint('steal_time', { mode: 'number' }).notNull()
	},
	(table) => [index('cpu_time_readings_reading_id_idx').on(table.readingId)]
);

/** CPU load average and uptime */
export const cpuLoadReadings = pgTable(
	'cpu_load_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		load1: real('load1').notNull(),
		load5: real('load5').notNull(),
		load15: real('load15').notNull(),
		runningProcesses: integer('running_processes').notNull(),
		totalProcesses: integer('total_processes').notNull(),
		uptime: real('uptime').notNull(),
		idleTime: real('idle_time').notNull(),
		onlineCpus: json('online_cpus').notNull(),
		offlineCpus: json('offline_cpus').notNull()
	},
	(table) => [index('cpu_load_readings_reading_id_idx').on(table.readingId)]
);

/** CPU frequency time-in-state statistics (medium frequency) */
export const cpuFrequencyStats = pgTable(
	'cpu_frequency_stats',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		cpu: integer('cpu').notNull(),
		timeInState: json('time_in_state').notNull(),
		totalTransitions: integer('total_transitions').notNull()
	},
	(table) => [index('cpu_frequency_stats_reading_id_idx').on(table.readingId)]
);

/** CPU idle state statistics (medium frequency) */
export const cpuIdleStats = pgTable(
	'cpu_idle_stats',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		cpu: integer('cpu').notNull(),
		states: json('states').notNull()
	},
	(table) => [index('cpu_idle_stats_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Memory Tables
// ============================================================================

/** System memory telemetry */
export const memoryReadings = pgTable(
	'memory_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		total: bigint('total', { mode: 'number' }).notNull(),
		free: bigint('free', { mode: 'number' }).notNull(),
		available: bigint('available', { mode: 'number' }).notNull(),
		buffers: bigint('buffers', { mode: 'number' }).notNull(),
		cached: bigint('cached', { mode: 'number' }).notNull(),
		swapTotal: bigint('swap_total', { mode: 'number' }).notNull(),
		swapFree: bigint('swap_free', { mode: 'number' }).notNull(),
		swapUsed: bigint('swap_used', { mode: 'number' }).notNull(),
		active: bigint('active', { mode: 'number' }).notNull(),
		inactive: bigint('inactive', { mode: 'number' }).notNull(),
		activeAnon: bigint('active_anon', { mode: 'number' }).notNull(),
		inactiveAnon: bigint('inactive_anon', { mode: 'number' }).notNull(),
		activeFile: bigint('active_file', { mode: 'number' }).notNull(),
		inactiveFile: bigint('inactive_file', { mode: 'number' }).notNull(),
		dirty: bigint('dirty', { mode: 'number' }).notNull(),
		writeback: bigint('writeback', { mode: 'number' }).notNull(),
		anonPages: bigint('anon_pages', { mode: 'number' }).notNull(),
		mapped: bigint('mapped', { mode: 'number' }).notNull(),
		shmem: bigint('shmem', { mode: 'number' }).notNull(),
		slab: bigint('slab', { mode: 'number' }).notNull(),
		sReclaimable: bigint('s_reclaimable', { mode: 'number' }).notNull(),
		sUnreclaim: bigint('s_unreclaim', { mode: 'number' }).notNull(),
		usedPercent: real('used_percent').notNull(),
		swapUsedPercent: real('swap_used_percent').notNull()
	},
	(table) => [index('memory_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Network Tables
// ============================================================================

/** Network interface telemetry */
export const networkInterfaceReadings = pgTable(
	'network_interface_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		address: varchar('address', { length: 100 }).notNull(),
		carrier: boolean('carrier').notNull(),
		carrierChanges: integer('carrier_changes').notNull(),
		operstate: varchar('operstate', { length: 50 }).notNull(),
		mtu: integer('mtu').notNull(),
		type: networkInterfaceTypeEnum('type').notNull(),
		// Stats embedded
		rxBytes: bigint('rx_bytes', { mode: 'number' }).notNull(),
		txBytes: bigint('tx_bytes', { mode: 'number' }).notNull(),
		rxPackets: bigint('rx_packets', { mode: 'number' }).notNull(),
		txPackets: bigint('tx_packets', { mode: 'number' }).notNull(),
		rxErrors: bigint('rx_errors', { mode: 'number' }).notNull(),
		txErrors: bigint('tx_errors', { mode: 'number' }).notNull(),
		rxDropped: bigint('rx_dropped', { mode: 'number' }).notNull(),
		txDropped: bigint('tx_dropped', { mode: 'number' }).notNull(),
		rxFifo: bigint('rx_fifo', { mode: 'number' }).notNull(),
		txFifo: bigint('tx_fifo', { mode: 'number' }).notNull(),
		rxFrame: bigint('rx_frame', { mode: 'number' }).notNull(),
		txCarrier: bigint('tx_carrier', { mode: 'number' }).notNull(),
		collisions: bigint('collisions', { mode: 'number' }).notNull()
	},
	(table) => [index('network_interface_readings_reading_id_idx').on(table.readingId)]
);

/** Network totals and wifi */
export const networkSummaryReadings = pgTable(
	'network_summary_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		totalRxBytes: bigint('total_rx_bytes', { mode: 'number' }).notNull(),
		totalTxBytes: bigint('total_tx_bytes', { mode: 'number' }).notNull(),
		// WiFi (optional)
		wifiSignalStrength: integer('wifi_signal_strength'),
		wifiLinkQuality: integer('wifi_link_quality'),
		wifiNoiseLevel: integer('wifi_noise_level'),
		wifiSsid: varchar('wifi_ssid', { length: 255 }),
		wifiFrequency: integer('wifi_frequency'),
		wifiBitrate: real('wifi_bitrate')
	},
	(table) => [index('network_summary_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// GPU Tables
// ============================================================================

/** GPU telemetry */
export const gpuReadings = pgTable(
	'gpu_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		currentFreq: integer('current_freq').notNull(),
		targetFreq: integer('target_freq').notNull(),
		minFreq: integer('min_freq').notNull(),
		maxFreq: integer('max_freq').notNull(),
		governor: varchar('governor', { length: 50 }).notNull(),
		availableFrequencies: json('available_frequencies').notNull(),
		pollingIntervalMs: integer('polling_interval_ms').notNull(),
		transitionStats: json('transition_stats'),
		totalTransitions: integer('total_transitions')
	},
	(table) => [index('gpu_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Storage Tables
// ============================================================================

/** Block device telemetry */
export const storageDeviceReadings = pgTable(
	'storage_device_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		parentDeviceId: integer('parent_device_id'),
		name: varchar('name', { length: 100 }).notNull(),
		type: blockDeviceTypeEnum('type').notNull(),
		size: bigint('size', { mode: 'number' }).notNull(),
		bytesRead: bigint('bytes_read', { mode: 'number' }).notNull(),
		bytesWritten: bigint('bytes_written', { mode: 'number' }).notNull(),
		// Stats embedded
		readsCompleted: bigint('reads_completed', { mode: 'number' }).notNull(),
		readsMerged: bigint('reads_merged', { mode: 'number' }).notNull(),
		sectorsRead: bigint('sectors_read', { mode: 'number' }).notNull(),
		readTimeMs: bigint('read_time_ms', { mode: 'number' }).notNull(),
		writesCompleted: bigint('writes_completed', { mode: 'number' }).notNull(),
		writesMerged: bigint('writes_merged', { mode: 'number' }).notNull(),
		sectorsWritten: bigint('sectors_written', { mode: 'number' }).notNull(),
		writeTimeMs: bigint('write_time_ms', { mode: 'number' }).notNull(),
		iosInProgress: integer('ios_in_progress').notNull(),
		ioTimeMs: bigint('io_time_ms', { mode: 'number' }).notNull(),
		weightedIoTimeMs: bigint('weighted_io_time_ms', { mode: 'number' }).notNull()
	},
	(table) => [index('storage_device_readings_reading_id_idx').on(table.readingId)]
);

/** Storage totals */
export const storageSummaryReadings = pgTable(
	'storage_summary_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		totalBytesRead: bigint('total_bytes_read', { mode: 'number' }).notNull(),
		totalBytesWritten: bigint('total_bytes_written', { mode: 'number' }).notNull(),
		totalIoTimeMs: bigint('total_io_time_ms', { mode: 'number' }).notNull()
	},
	(table) => [index('storage_summary_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Process Tables
// ============================================================================

/** Individual process telemetry */
export const processReadings = pgTable(
	'process_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		pid: integer('pid').notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		state: varchar('state', { length: 10 }).notNull(),
		ppid: integer('ppid').notNull(),
		pgrp: integer('pgrp').notNull(),
		session: integer('session').notNull(),
		userTimeMs: bigint('user_time_ms', { mode: 'number' }).notNull(),
		systemTimeMs: bigint('system_time_ms', { mode: 'number' }).notNull(),
		totalCpuTimeMs: bigint('total_cpu_time_ms', { mode: 'number' }).notNull(),
		cpuPercent: real('cpu_percent'),
		vsize: bigint('vsize', { mode: 'number' }).notNull(),
		rss: bigint('rss', { mode: 'number' }).notNull(),
		rssLimit: bigint('rss_limit', { mode: 'number' }).notNull(),
		memoryPercent: real('memory_percent').notNull(),
		numThreads: integer('num_threads').notNull(),
		nice: integer('nice').notNull(),
		priority: integer('priority').notNull(),
		startTime: real('start_time').notNull(),
		cmdline: text('cmdline').notNull(),
		oomScore: integer('oom_score').notNull(),
		readBytes: bigint('read_bytes', { mode: 'number' }),
		writeBytes: bigint('write_bytes', { mode: 'number' })
	},
	(table) => [index('process_readings_reading_id_idx').on(table.readingId)]
);

/** Process summary */
export const processSummaryReadings = pgTable(
	'process_summary_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		total: integer('total').notNull(),
		running: integer('running').notNull(),
		sleeping: integer('sleeping').notNull(),
		zombie: integer('zombie').notNull(),
		stopped: integer('stopped').notNull(),
		totalCpuTime: bigint('total_cpu_time', { mode: 'number' }).notNull(),
		contextSwitches: bigint('context_switches', { mode: 'number' }).notNull(),
		processesCreated: bigint('processes_created', { mode: 'number' }).notNull()
	},
	(table) => [index('process_summary_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Sensor Tables
// ============================================================================

/** Sensors telemetry (flattened) */
export const sensorReadings = pgTable(
	'sensor_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		// Ambient light
		illuminanceRaw: real('illuminance_raw').notNull(),
		illuminanceScale: real('illuminance_scale').notNull(),
		illuminanceLux: real('illuminance_lux').notNull(),
		// Proximity
		proximityRaw: real('proximity_raw').notNull(),
		proximityScale: real('proximity_scale').notNull(),
		nearLevel: real('near_level').notNull(),
		isNear: boolean('is_near').notNull(),
		// Accelerometer
		accelRawX: real('accel_raw_x').notNull(),
		accelRawY: real('accel_raw_y').notNull(),
		accelRawZ: real('accel_raw_z').notNull(),
		accelScale: real('accel_scale').notNull(),
		accelX: real('accel_x').notNull(),
		accelY: real('accel_y').notNull(),
		accelZ: real('accel_z').notNull(),
		accelMagnitude: real('accel_magnitude').notNull(),
		// Gyroscope
		gyroRawX: real('gyro_raw_x').notNull(),
		gyroRawY: real('gyro_raw_y').notNull(),
		gyroRawZ: real('gyro_raw_z').notNull(),
		gyroScale: real('gyro_scale').notNull(),
		gyroX: real('gyro_x').notNull(),
		gyroY: real('gyro_y').notNull(),
		gyroZ: real('gyro_z').notNull(),
		gyroMagnitude: real('gyro_magnitude').notNull(),
		// Magnetometer
		magRawX: real('mag_raw_x').notNull(),
		magRawY: real('mag_raw_y').notNull(),
		magRawZ: real('mag_raw_z').notNull(),
		magScale: real('mag_scale').notNull(),
		magX: real('mag_x').notNull(),
		magY: real('mag_y').notNull(),
		magZ: real('mag_z').notNull(),
		magHeading: real('mag_heading').notNull(),
		// ADC channels stored as JSON array
		adcChannels: json('adc_channels').notNull()
	},
	(table) => [index('sensor_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// System Tables
// ============================================================================

/** Display/backlight telemetry */
export const displayReadings = pgTable(
	'display_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		brightness: integer('brightness').notNull(),
		maxBrightness: integer('max_brightness').notNull(),
		brightnessPercent: real('brightness_percent').notNull(),
		power: boolean('power').notNull()
	},
	(table) => [index('display_readings_reading_id_idx').on(table.readingId)]
);

/** LED state readings */
export const ledReadings = pgTable(
	'led_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		brightness: integer('brightness').notNull(),
		maxBrightness: integer('max_brightness').notNull(),
		trigger: varchar('trigger', { length: 100 }).notNull()
	},
	(table) => [index('led_readings_reading_id_idx').on(table.readingId)]
);

/** RF kill state readings */
export const rfKillReadings = pgTable(
	'rfkill_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull(),
		type: rfKillTypeEnum('type').notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		softBlocked: boolean('soft_blocked').notNull(),
		hardBlocked: boolean('hard_blocked').notNull()
	},
	(table) => [index('rfkill_readings_reading_id_idx').on(table.readingId)]
);

/** System wakeup count */
export const systemWakeupReadings = pgTable(
	'system_wakeup_readings',
	{
		id: serial('id').primaryKey(),
		readingId: integer('reading_id')
			.references(() => telemetryReadings.id, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		wakeupCount: integer('wakeup_count').notNull()
	},
	(table) => [index('system_wakeup_readings_reading_id_idx').on(table.readingId)]
);

// ============================================================================
// Relations
// ============================================================================

export const devicesRelations = relations(devices, ({ many }) => ({
	telemetryReadings: many(telemetryReadings)
}));

export const telemetryReadingsRelations = relations(telemetryReadings, ({ one, many }) => ({
	device: one(devices, {
		fields: [telemetryReadings.deviceId],
		references: [devices.id]
	}),
	// Power
	batteryReadings: many(batteryReadings),
	usbInputReadings: many(usbInputReadings),
	usbPdReadings: many(usbPdReadings),
	typeCPortReadings: many(typeCPortReadings),
	// Thermal
	thermalZoneReadings: many(thermalZoneReadings),
	coolingDeviceReadings: many(coolingDeviceReadings),
	thermalSummary: one(thermalSummaryReadings),
	// CPU
	cpuFrequencyReadings: many(cpuFrequencyReadings),
	cpuTimeReadings: many(cpuTimeReadings),
	cpuLoad: one(cpuLoadReadings),
	cpuFrequencyStats: many(cpuFrequencyStats),
	cpuIdleStats: many(cpuIdleStats),
	// Memory
	memory: one(memoryReadings),
	// Network
	networkInterfaceReadings: many(networkInterfaceReadings),
	networkSummary: one(networkSummaryReadings),
	// GPU
	gpu: one(gpuReadings),
	// Storage
	storageDeviceReadings: many(storageDeviceReadings),
	storageSummary: one(storageSummaryReadings),
	// Processes
	processReadings: many(processReadings),
	processSummary: one(processSummaryReadings),
	// Sensors
	sensors: one(sensorReadings),
	// System
	display: one(displayReadings),
	ledReadings: many(ledReadings),
	rfKillReadings: many(rfKillReadings),
	systemWakeup: one(systemWakeupReadings)
}));

export const batteryReadingsRelations = relations(batteryReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [batteryReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const usbInputReadingsRelations = relations(usbInputReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [usbInputReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const usbPdReadingsRelations = relations(usbPdReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [usbPdReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const typeCPortReadingsRelations = relations(typeCPortReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [typeCPortReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const thermalZoneReadingsRelations = relations(thermalZoneReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [thermalZoneReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const coolingDeviceReadingsRelations = relations(coolingDeviceReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [coolingDeviceReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const thermalSummaryReadingsRelations = relations(thermalSummaryReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [thermalSummaryReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const cpuFrequencyReadingsRelations = relations(cpuFrequencyReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [cpuFrequencyReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const cpuTimeReadingsRelations = relations(cpuTimeReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [cpuTimeReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const cpuLoadReadingsRelations = relations(cpuLoadReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [cpuLoadReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const cpuFrequencyStatsRelations = relations(cpuFrequencyStats, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [cpuFrequencyStats.readingId],
		references: [telemetryReadings.id]
	})
}));

export const cpuIdleStatsRelations = relations(cpuIdleStats, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [cpuIdleStats.readingId],
		references: [telemetryReadings.id]
	})
}));

export const memoryReadingsRelations = relations(memoryReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [memoryReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const networkInterfaceReadingsRelations = relations(networkInterfaceReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [networkInterfaceReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const networkSummaryReadingsRelations = relations(networkSummaryReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [networkSummaryReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const gpuReadingsRelations = relations(gpuReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [gpuReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const storageDeviceReadingsRelations = relations(storageDeviceReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [storageDeviceReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const storageSummaryReadingsRelations = relations(storageSummaryReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [storageSummaryReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const processReadingsRelations = relations(processReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [processReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const processSummaryReadingsRelations = relations(processSummaryReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [processSummaryReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [sensorReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const displayReadingsRelations = relations(displayReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [displayReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const ledReadingsRelations = relations(ledReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [ledReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const rfKillReadingsRelations = relations(rfKillReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [rfKillReadings.readingId],
		references: [telemetryReadings.id]
	})
}));

export const systemWakeupReadingsRelations = relations(systemWakeupReadings, ({ one }) => ({
	reading: one(telemetryReadings, {
		fields: [systemWakeupReadings.readingId],
		references: [telemetryReadings.id]
	})
}));
