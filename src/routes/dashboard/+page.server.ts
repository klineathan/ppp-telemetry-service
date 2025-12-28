import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const deviceId = url.searchParams.get('deviceId');
	const hours = url.searchParams.get('hours') || '24';

	const queryParams = new URLSearchParams();
	if (deviceId) queryParams.set('deviceId', deviceId);
	queryParams.set('hours', hours);
	queryParams.set('limit', '1000');

	const response = await fetch(`/api/dashboard?${queryParams.toString()}`);
	const result = await response.json();

	return {
		dashboardData: result.success ? result.data : null,
		error: result.success ? null : result.error,
		hours: parseInt(hours, 10)
	};
};

