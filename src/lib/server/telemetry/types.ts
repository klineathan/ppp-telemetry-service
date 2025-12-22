/**
 * Telemetry API types - matches the ppp-telemetry-client payload structures
 */

// ============================================================================
// Enums and Literals
// ============================================================================

export type TelemetryFrequency = 'high' | 'medium' | 'low';

export type BatteryStatus = 'Charging' | 'Discharging' | 'Full' | 'Not charging' | 'Unknown';
export type BatteryHealth = 'Good' | 'Overheat' | 'Dead' | 'Over voltage' | 'Failure' | 'Unknown';
export type ChargeType = 'Fast' | 'Trickle' | 'Standard' | 'Unknown';
export type UsbType =
	| 'Unknown'
	| 'SDP'
	| 'DCP'
	| 'CDP'
	| 'ACA'
	| 'C'
	| 'PD'
	| 'PD_DRP'
	| 'PD_PPS'
	| 'BrickID';
export type DataRole = 'host' | 'device' | '[host]' | '[device]';
export type PowerRole = 'source' | 'sink' | '[source]' | '[sink]';
export type PowerOperationMode = 'default' | '1.5A' | '3.0A' | 'usb_power_delivery';

export type OperationalState =
	| 'up'
	| 'down'
	| 'unknown'
	| 'lowerlayerdown'
	| 'notpresent'
	| 'dormant';
export type NetworkInterfaceType = 'wifi' | 'cellular' | 'usb' | 'loopback' | 'other';

export type BlockDeviceType = 'emmc' | 'sdcard' | 'zram' | 'loop' | 'other';

export type ProcessState = 'R' | 'S' | 'D' | 'Z' | 'T' | 't' | 'X' | 'I';

export type TripPointType = 'passive' | 'active' | 'critical' | 'hot';

export type RfKillType = 'bluetooth' | 'wifi' | 'wwan';

// ============================================================================
// Battery & Power Types
// ============================================================================

export interface BatteryTelemetry {
	capacity: number;
	status: BatteryStatus;
	voltage: number;
	current: number;
	temperature: number;
	chargeFull: number;
	chargeFullDesign: number;
	health: BatteryHealth;
	present: boolean;
	chargeType: ChargeType;
	energyFullDesign: number;
}

export interface UsbInputTelemetry {
	present: boolean;
	health: BatteryHealth;
	inputCurrentLimit: number;
	inputVoltageLimit: number;
}

export interface UsbCPdTelemetry {
	online: boolean;
	voltage: number;
	voltageMin: number;
	voltageMax: number;
	current: number;
	currentMax: number;
	usbType: UsbType;
}

export interface TypeCPortTelemetry {
	dataRole: DataRole;
	powerRole: PowerRole;
	orientation: string;
	powerOperationMode: PowerOperationMode;
	vconnSource: boolean;
}

export interface PowerTelemetry {
	battery: BatteryTelemetry;
	usbInput: UsbInputTelemetry;
	usbCPd: UsbCPdTelemetry;
	typeCPort: TypeCPortTelemetry;
}

// ============================================================================
// Thermal Types
// ============================================================================

export interface TripPoint {
	index: number;
	temperature: number;
	type: TripPointType;
}

export interface ThermalZoneTelemetry {
	zone: number;
	type: string;
	temperature: number;
	tripPoints?: TripPoint[];
}

export interface CoolingDeviceTelemetry {
	index: number;
	type: string;
	currentState: number;
	maxState: number;
}

export interface ThermalTelemetry {
	zones: ThermalZoneTelemetry[];
	coolingDevices: CoolingDeviceTelemetry[];
	batteryTemp: number;
	cpuTemp: number;
	gpuTemp: number;
}

// ============================================================================
// CPU Types
// ============================================================================

export interface CpuFrequencyTelemetry {
	cpu: number;
	currentFreq: number;
	minFreq: number;
	maxFreq: number;
	hardwareMinFreq: number;
	hardwareMaxFreq: number;
	governor: string;
}

export interface CpuTimeTelemetry {
	cpu: string;
	user: number;
	nice: number;
	system: number;
	idle: number;
	iowait: number;
	irq: number;
	softirq: number;
	steal: number;
}

export interface LoadAverage {
	load1: number;
	load5: number;
	load15: number;
	runningProcesses: number;
	totalProcesses: number;
}

export interface CpuTimeInState {
	frequency: number;
	timeMs: number;
}

export interface CpuFrequencyStats {
	cpu: number;
	timeInState: CpuTimeInState[];
	totalTransitions: number;
}

export interface CpuIdleStateTelemetry {
	index: number;
	name: string;
	description: string;
	usage: number;
	timeUs: number;
	latencyUs: number;
}

export interface CpuIdleTelemetry {
	cpu: number;
	states: CpuIdleStateTelemetry[];
}

export interface CpuTelemetry {
	frequencies: CpuFrequencyTelemetry[];
	frequencyStats?: CpuFrequencyStats[];
	idleStats?: CpuIdleTelemetry[];
	cpuTimes: CpuTimeTelemetry[];
	loadAverage: LoadAverage;
	uptime: number;
	idleTime: number;
	onlineCpus: number[];
	offlineCpus: number[];
}

// ============================================================================
// Memory Types
// ============================================================================

export interface MemoryTelemetry {
	total: number;
	free: number;
	available: number;
	buffers: number;
	cached: number;
	swapTotal: number;
	swapFree: number;
	swapUsed: number;
	active: number;
	inactive: number;
	activeAnon: number;
	inactiveAnon: number;
	activeFile: number;
	inactiveFile: number;
	dirty: number;
	writeback: number;
	anonPages: number;
	mapped: number;
	shmem: number;
	slab: number;
	sReclaimable: number;
	sUnreclaim: number;
	usedPercent: number;
	swapUsedPercent: number;
}

// ============================================================================
// Network Types
// ============================================================================

export interface NetworkInterfaceStats {
	rxBytes: number;
	txBytes: number;
	rxPackets: number;
	txPackets: number;
	rxErrors: number;
	txErrors: number;
	rxDropped: number;
	txDropped: number;
	rxFifo: number;
	txFifo: number;
	rxFrame: number;
	txCarrier: number;
	collisions: number;
}

export interface NetworkInterfaceTelemetry {
	name: string;
	address: string;
	carrier: boolean;
	carrierChanges: number;
	operstate: OperationalState | string;
	mtu: number;
	stats: NetworkInterfaceStats;
	type: NetworkInterfaceType;
}

export interface WifiTelemetry {
	signalStrength?: number;
	linkQuality?: number;
	noiseLevel?: number;
	ssid?: string;
	frequency?: number;
	bitrate?: number;
}

export interface NetworkTelemetry {
	interfaces: NetworkInterfaceTelemetry[];
	wifi?: WifiTelemetry;
	totalRxBytes: number;
	totalTxBytes: number;
}

// ============================================================================
// GPU Types
// ============================================================================

export interface GpuFrequencyTelemetry {
	currentFreq: number;
	targetFreq: number;
	minFreq: number;
	maxFreq: number;
	governor: string;
	availableFrequencies: number[];
	pollingIntervalMs: number;
}

export interface GpuTransitionStats {
	fromFreq: number;
	toFreq: number;
	count: number;
}

export interface GpuTelemetry {
	frequency: GpuFrequencyTelemetry;
	transitionStats?: GpuTransitionStats[];
	totalTransitions?: number;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface BlockDeviceStats {
	readsCompleted: number;
	readsMerged: number;
	sectorsRead: number;
	readTimeMs: number;
	writesCompleted: number;
	writesMerged: number;
	sectorsWritten: number;
	writeTimeMs: number;
	iosInProgress: number;
	ioTimeMs: number;
	weightedIoTimeMs: number;
}

export interface BlockDeviceTelemetry {
	name: string;
	type: BlockDeviceType;
	size: number;
	stats: BlockDeviceStats;
	bytesRead: number;
	bytesWritten: number;
	partitions?: BlockDeviceTelemetry[];
}

export interface StorageTelemetry {
	devices: BlockDeviceTelemetry[];
	totalBytesRead: number;
	totalBytesWritten: number;
	totalIoTimeMs: number;
}

// ============================================================================
// Process Types
// ============================================================================

export interface ProcessTelemetry {
	pid: number;
	name: string;
	state: ProcessState | string;
	ppid: number;
	pgrp: number;
	session: number;
	userTimeMs: number;
	systemTimeMs: number;
	totalCpuTimeMs: number;
	cpuPercent?: number;
	vsize: number;
	rss: number;
	rssLimit: number;
	memoryPercent: number;
	numThreads: number;
	nice: number;
	priority: number;
	startTime: number;
	cmdline: string;
	oomScore: number;
	readBytes?: number;
	writeBytes?: number;
}

export interface ProcessSummary {
	total: number;
	running: number;
	sleeping: number;
	zombie: number;
	stopped: number;
}

export interface ProcessesTelemetry {
	processes: ProcessTelemetry[];
	summary: ProcessSummary;
	totalCpuTime: number;
	contextSwitches: number;
	processesCreated: number;
}

// ============================================================================
// Sensor Types
// ============================================================================

export interface Vector3D {
	x: number;
	y: number;
	z: number;
}

export interface AmbientLightTelemetry {
	illuminanceRaw: number;
	illuminanceScale: number;
	illuminanceLux: number;
}

export interface ProximityTelemetry {
	proximityRaw: number;
	proximityScale: number;
	nearLevel: number;
	isNear: boolean;
}

export interface AccelerometerTelemetry {
	raw: Vector3D;
	scale: number;
	acceleration: Vector3D;
	magnitude: number;
}

export interface GyroscopeTelemetry {
	raw: Vector3D;
	scale: number;
	angularVelocity: Vector3D;
	magnitude: number;
}

export interface MagnetometerTelemetry {
	raw: Vector3D;
	scale: number;
	magneticField: Vector3D;
	heading: number;
}

export interface AdcChannelTelemetry {
	channel: number;
	raw: number;
	scale: number;
	voltage: number;
}

export interface SensorsTelemetry {
	ambientLight: AmbientLightTelemetry;
	proximity: ProximityTelemetry;
	accelerometer: AccelerometerTelemetry;
	gyroscope: GyroscopeTelemetry;
	magnetometer: MagnetometerTelemetry;
	adcChannels: AdcChannelTelemetry[];
}

// ============================================================================
// System Types
// ============================================================================

export interface DisplayTelemetry {
	brightness: number;
	maxBrightness: number;
	brightnessPercent: number;
	power: boolean;
}

export interface LedTelemetry {
	name: string;
	brightness: number;
	maxBrightness: number;
	trigger: string;
}

export interface RfKillTelemetry {
	type: RfKillType;
	name: string;
	softBlocked: boolean;
	hardBlocked: boolean;
}

export interface SystemTelemetry {
	display: DisplayTelemetry;
	leds: LedTelemetry[];
	rfkill: RfKillTelemetry[];
	wakeupCount: number;
}

// ============================================================================
// Payload Types
// ============================================================================

export interface HighFrequencyTelemetry {
	power: PowerTelemetry;
	thermal: ThermalTelemetry;
	cpu: Pick<
		CpuTelemetry,
		'frequencies' | 'cpuTimes' | 'loadAverage' | 'uptime' | 'idleTime' | 'onlineCpus' | 'offlineCpus'
	>;
	memory: MemoryTelemetry;
	network: NetworkTelemetry;
}

export interface MediumFrequencyTelemetry {
	cpuStats: Pick<CpuTelemetry, 'frequencyStats' | 'idleStats'>;
	gpu: GpuTelemetry;
	storage: StorageTelemetry;
	processes: ProcessesTelemetry;
}

export interface LowFrequencyTelemetry {
	sensors: SensorsTelemetry;
	system: SystemTelemetry;
}

export interface TelemetryPayload {
	deviceId: string;
	timestamp: string;
	timestampMs: number;
	frequency: TelemetryFrequency;
	data: HighFrequencyTelemetry | MediumFrequencyTelemetry | LowFrequencyTelemetry;
}

export interface TelemetryAck {
	received: boolean;
	id: string;
	timestamp: string;
}

export interface BatchTelemetryPayload {
	payloads: TelemetryPayload[];
}

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: string;
}

