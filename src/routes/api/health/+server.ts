import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import type { ApiResponse } from '$lib/server/telemetry';

interface HealthStatus {
	status: 'healthy' | 'unhealthy';
	database: 'connected' | 'disconnected';
	uptime: number;
	version: string;
}

const startTime = Date.now();

/**
 * GET /api/health
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
	let dbStatus: 'connected' | 'disconnected' = 'disconnected';

	try {
		// Check database connectivity with a simple query
		await db.execute(sql`SELECT 1`);
		dbStatus = 'connected';
	} catch (error) {
		console.error('Database health check failed:', error);
		dbStatus = 'disconnected';
	}

	const healthStatus: HealthStatus = {
		status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
		database: dbStatus,
		uptime: Math.floor((Date.now() - startTime) / 1000),
		version: '1.0.0'
	};

	const response: ApiResponse<HealthStatus> = {
		success: dbStatus === 'connected',
		data: healthStatus,
		timestamp: new Date().toISOString()
	};

	// Always return 200 for health checks - database status is informational
	// This allows the container to be marked healthy even if DB is temporarily unavailable
	// Kamal needs a 200 response to consider the container healthy
	return json(response, {
		status: 200
	});
};

