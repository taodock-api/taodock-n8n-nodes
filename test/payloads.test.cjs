const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
	buildImageRequest,
	buildTextRequest,
	buildVideoRequest,
} = require('../dist/nodes/TaoDock/payloads');

test('builds multimodal text input and keeps explicit zero values', () => {
	assert.deepEqual(buildTextRequest('text-model', 'Describe this', 'Be concise', 'https://example.com/a.png', {
		temperature: 0,
		maximumTokens: 256,
		topP: 0,
		responseFormat: 'json_object',
	}), {
		model: 'text-model',
		messages: [
			{ role: 'system', content: 'Be concise' },
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'Describe this' },
					{ type: 'image_url', image_url: { url: 'https://example.com/a.png' } },
				],
			},
		],
		temperature: 0,
		max_tokens: 256,
		top_p: 0,
		response_format: { type: 'json_object' },
	});
});

test('maps image settings without changing protected fields', () => {
	assert.deepEqual(buildImageRequest('image-model', 'A lighthouse', {
		count: 2,
		seed: 0,
		aspectRatio: '16:9',
		referenceImageUrl: 'https://example.com/reference.png',
	}), {
		model: 'image-model',
		prompt: 'A lighthouse',
		response_format: 'b64_json',
		n: 2,
		seed: 0,
		aspect_ratio: '16:9',
		image_url: 'https://example.com/reference.png',
	});
});

test('maps video settings and preserves a false audio switch', () => {
	assert.deepEqual(buildVideoRequest('video-model', 'Ocean at dawn', {
		duration: 5,
		audio: false,
		seed: 0,
	}), {
		model: 'video-model',
		prompt: 'Ocean at dawn',
		duration: 5,
		audio: false,
		seed: 0,
	});
});
