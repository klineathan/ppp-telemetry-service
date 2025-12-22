import { json, type RequestHandler } from '@sveltejs/kit';
import { processTelemetryBatch, type TelemetryPayload, type ApiResponse, type TelemetryAck } from '$lib/server/telemetry';

interface BatchPayload {
	payloads: TelemetryPayload[];
}

interface BatchAck {
	received: number;
	failed: number;
	ids: string[];
	errors: string[];
}

/**
 * POST /api/telemetry/batch
 * Receives batched telemetry payloads (for offline buffer flush)
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as BatchPayload;

		// Validate payload structure
		if (!body.payloads || !Array.isArray(body.payloads)) {
			const response: ApiResponse = {
				success: false,
				error: 'Missing or invalid payloads array',
				timestamp: new Date().toISOString()
			};
			return json(response, { status: 400 });
		}

		if (body.payloads.length === 0) {
			const response: ApiResponse = {
				success: false,
				error: 'Empty payloads array',
				timestamp: new Date().toISOString()
			};
			return json(response, { status: 400 });
		}

		// Validate each payload
		const validationErrors: string[] = [];
		for (let i = 0; i < body.payloads.length; i++) {
			const payload = body.payloads[i];
			if (!payload.deviceId || !payload.timestamp || !payload.frequency || !payload.data) {
				validationErrors.push(`Payload ${i}: Missing required fields`);
			} else if (!['high', 'medium', 'low'].includes(payload.frequency)) {
				validationErrors.push(`Payload ${i}: Invalid frequency '${payload.frequency}'`);
			}
		}

		if (validationErrors.length > 0) {
			const response: ApiResponse = {
				success: false,
				error: `Validation errors: ${validationErrors.join('; ')}`,
				timestamp: new Date().toISOString()
			};
			return json(response, { status: 400 });
		}

		// Process all payloads
		const results = await processTelemetryBatch(body.payloads);

		const batchAck: BatchAck = {
			received: results.length,
			failed: 0,
			ids: results.map((r) => r.readingId.toString()),
			errors: []
		};

		const response: ApiResponse<BatchAck> = {
			success: true,
			data: batchAck,
			timestamp: new Date().toISOString()
		};

		return json(response, { status: 201 });
	} catch (error) {
		console.error('Error processing telemetry batch:', error);

		const response: ApiResponse = {
			success: false,
			error: error instanceof Error ? error.message : 'Internal server error',
			timestamp: new Date().toISOString()
		};

		return json(response, { status: 500 });
	}
};

