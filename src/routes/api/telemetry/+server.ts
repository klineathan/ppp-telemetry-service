import { json, type RequestHandler } from '@sveltejs/kit';
import { processTelemetryPayload, type TelemetryPayload, type ApiResponse, type TelemetryAck } from '$lib/server/telemetry';

/**
 * POST /api/telemetry
 * Receives individual telemetry payloads from devices
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = (await request.json()) as TelemetryPayload;

		// Validate required fields
		if (!payload.deviceId || !payload.timestamp || !payload.frequency || !payload.data) {
			const response: ApiResponse = {
				success: false,
				error: 'Missing required fields: deviceId, timestamp, frequency, or data',
				timestamp: new Date().toISOString()
			};
			return json(response, { status: 400 });
		}

		// Validate frequency
		if (!['high', 'medium', 'low'].includes(payload.frequency)) {
			const response: ApiResponse = {
				success: false,
				error: `Invalid frequency: ${payload.frequency}. Must be 'high', 'medium', or 'low'`,
				timestamp: new Date().toISOString()
			};
			return json(response, { status: 400 });
		}

		// Process the telemetry
		const result = await processTelemetryPayload(payload);

		const ack: TelemetryAck = {
			received: true,
			id: result.readingId.toString(),
			timestamp: new Date().toISOString()
		};

		const response: ApiResponse<TelemetryAck> = {
			success: true,
			data: ack,
			timestamp: new Date().toISOString()
		};

		return json(response, { status: 201 });
	} catch (error) {
		console.error('Error processing telemetry:', error);

		const response: ApiResponse = {
			success: false,
			error: error instanceof Error ? error.message : 'Internal server error',
			timestamp: new Date().toISOString()
		};

		return json(response, { status: 500 });
	}
};

