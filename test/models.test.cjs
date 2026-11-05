const assert = require('node:assert/strict');
const { test } = require('node:test');

const { authorizedModelOptions } = require('../dist/nodes/TaoDock/models');

test('normalizes, sorts, and deduplicates authorized models', () => {
	assert.deepEqual(
		authorizedModelOptions({
			data: [
				{ id: 'z-model' },
				{ id: 'a-model', name: 'Alpha' },
				'a-model',
				{ id: '' },
			],
		}),
		[
			{ name: 'a-model', value: 'a-model' },
			{ name: 'z-model', value: 'z-model' },
		],
	);
});

test('returns no options for malformed responses', () => {
	assert.deepEqual(authorizedModelOptions(null), []);
	assert.deepEqual(authorizedModelOptions({ data: {} }), []);
});
