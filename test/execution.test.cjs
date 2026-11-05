const assert = require('node:assert/strict');
const { test } = require('node:test');

const { Taodock } = require('../dist/nodes/TaoDock/Taodock.node');

function executionContext(parameters, apiResponse) {
	const requests = [];
	return {
		requests,
		context: {
			getInputData: () => [{ json: {} }],
			getNodeParameter: (name, _index, fallback) =>
				Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
			getNode: () => ({
				name: 'TaoDock',
				type: 'taodock',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
			continueOnFail: () => false,
			helpers: {
				httpRequestWithAuthentication: async (_credential, request) => {
					requests.push(request);
					return apiResponse;
				},
				prepareBinaryData: async (data, fileName, mimeType) => ({
					data: data.toString('base64'),
					fileName,
					mimeType,
				}),
			},
		},
	};
}

test('executes a text generation request', async () => {
	const fixture = executionContext(
		{
			resource: 'text',
			operation: 'generate',
			model: 'text-model',
			prompt: 'Hello',
			systemMessage: '',
			imageUrl: '',
			textSettings: {},
		},
		{
			model: 'text-model',
			choices: [{ message: { content: 'Hi' } }],
			usage: { total_tokens: 2 },
		},
	);

	const [items] = await Taodock.prototype.execute.call(fixture.context);
	assert.equal(fixture.requests[0].url, 'https://taodock.com/v1/chat/completions');
	assert.equal(fixture.requests[0].body.model, 'text-model');
	assert.equal(items[0].json.content, 'Hi');
});

test('converts an encoded image response to binary data', async () => {
	const fixture = executionContext(
		{
			resource: 'image',
			operation: 'generate',
			model: 'image-model',
			prompt: 'A harbor',
			imageSettings: { outputFormat: 'png' },
			editImage: false,
			binaryProperty: 'result',
		},
		{ data: [{ b64_json: Buffer.from('image').toString('base64') }] },
	);

	const [items] = await Taodock.prototype.execute.call(fixture.context);
	assert.equal(fixture.requests[0].url, 'https://taodock.com/v1/images/generations');
	assert.equal(items[0].binary.result.data, Buffer.from('image').toString('base64'));
	assert.equal(items[0].binary.result.mimeType, 'image/png');
});

test('returns a newly created video task without polling when wait is zero', async () => {
	const fixture = executionContext(
		{
			resource: 'video',
			operation: 'create',
			model: 'video-model',
			prompt: 'A city at night',
			videoSettings: {},
			waitSeconds: 0,
			binaryProperty: 'data',
		},
		{ id: 'task-1', status: 'queued' },
	);

	const [items] = await Taodock.prototype.execute.call(fixture.context);
	assert.equal(fixture.requests[0].url, 'https://taodock.com/v1/videos');
	assert.equal(items[0].json.task_id, 'task-1');
	assert.equal(items[0].json.status, 'queued');
});
