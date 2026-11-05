import type { INodePropertyOptions } from 'n8n-workflow';

interface ModelRecord {
	id?: unknown;
	name?: unknown;
}

export function authorizedModelOptions(response: unknown): INodePropertyOptions[] {
	if (!response || typeof response !== 'object') return [];

	const data = (response as { data?: unknown }).data;
	if (!Array.isArray(data)) return [];

	const models = new Map<string, string>();
	for (const item of data) {
		const record: ModelRecord = typeof item === 'string' ? { id: item } : (item as ModelRecord);
		const id = typeof record?.id === 'string' ? record.id.trim() : '';
		if (!id) continue;
		const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : id;
		models.set(id, name);
	}

	return [...models]
		.sort(([firstId], [secondId]) => firstId.localeCompare(secondId))
		.map(([value, name]) => ({ name: name === value ? name : `${name} (${value})`, value }));
}
