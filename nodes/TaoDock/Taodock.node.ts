import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

import { taoDockRequest } from './api';
import { authorizedModelOptions } from './models';
import { buildImageRequest, buildTextRequest, buildVideoRequest } from './payloads';

interface TextResponse extends IDataObject {
	choices?: Array<{ message?: { content?: string } }>;
	model?: string;
	usage?: IDataObject;
}

interface ImageResponse extends IDataObject {
	data?: Array<{ b64_json?: string; url?: string }>;
}

interface BinaryResponse {
	body: ArrayBuffer;
	headers?: Record<string, string | string[] | undefined>;
}

const modelProperty = (
	resources: string[],
	operations?: string[],
): INodeTypeDescription['properties'][number] => ({
	displayName: 'Model Name or ID',
	name: 'model',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getAuthorizedModels' },
	default: '',
	required: true,
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	displayOptions: {
		show: { resource: resources, ...(operations ? { operation: operations } : {}) },
	},
});

const binaryProperty = (
	resources: string[],
	operations?: string[],
): INodeTypeDescription['properties'][number] => ({
	displayName: 'Binary Property',
	name: 'binaryProperty',
	type: 'string',
	default: 'data',
	required: true,
	description: 'Name of the binary property that receives the generated file',
	displayOptions: {
		show: { resource: resources, ...(operations ? { operation: operations } : {}) },
	},
});

function imageMediaType(format: string): string {
	if (format === 'jpeg') return 'image/jpeg';
	if (format === 'webp') return 'image/webp';
	return 'image/png';
}

function extractTaskId(task: IDataObject): string {
	const value = task.id ?? task.task_id;
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

async function downloadVideo(
	context: IExecuteFunctions,
	taskId: string,
	binaryName: string,
	itemIndex: number,
	model?: string,
): Promise<INodeExecutionData> {
	const response = await taoDockRequest<BinaryResponse>(
		context,
		'GET',
		`videos/${encodeURIComponent(taskId)}/content`,
		{
			encoding: 'arraybuffer',
			returnFullResponse: true,
			timeout: 10 * 60 * 1000,
		},
	);
	const header = response.headers?.['content-type'];
	const mimeType = (Array.isArray(header) ? header[0] : header)?.split(';')[0] || 'video/mp4';
	return {
		json: { task_id: taskId, status: 'completed', ...(model ? { model } : {}) },
		binary: {
			[binaryName]: await context.helpers.prepareBinaryData(
				Buffer.from(response.body),
				`${taskId}.mp4`,
				mimeType,
			),
		},
		pairedItem: { item: itemIndex },
	};
}

export class Taodock implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TaoDock',
		name: 'taodock',
		icon: { light: 'file:taodock.svg', dark: 'file:taodock.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Use TaoDock AI models in n8n workflows',
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		defaults: { name: 'TaoDock' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'taodockApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'text',
				options: [
					{ name: 'Image', value: 'image' },
					{ name: 'Text', value: 'text' },
					{ name: 'Video', value: 'video' },
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'generate',
				displayOptions: { show: { resource: ['text'] } },
				options: [
					{
						name: 'Generate',
						value: 'generate',
						action: 'Generate text',
						description: 'Generate a text or multimodal response',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'generate',
				displayOptions: { show: { resource: ['image'] } },
				options: [
					{
						name: 'Generate',
						value: 'generate',
						action: 'Generate an image',
						description: 'Generate or edit images',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'create',
				displayOptions: { show: { resource: ['video'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a video',
						description: 'Start a video generation task',
					},
					{
						name: 'Download',
						value: 'download',
						action: 'Download a video',
						description: 'Download a completed video task',
					},
					{
						name: 'Get Status',
						value: 'status',
						action: 'Get video task status',
						description: 'Get the current state of a video task',
					},
				],
			},
			modelProperty(['text']),
			modelProperty(['image']),
			modelProperty(['video'], ['create']),
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				description: 'Instruction or content to send to the model',
				displayOptions: {
					show: { resource: ['text', 'image', 'video'], operation: ['generate', 'create'] },
				},
			},
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				displayOptions: { show: { resource: ['text'] } },
			},
			{
				displayName: 'Image URL',
				name: 'imageUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/image.png',
				description: 'Optional image to include with the text prompt',
				displayOptions: { show: { resource: ['text'] } },
			},
			{
				displayName: 'Options',
				name: 'textSettings',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['text'] } },
				options: [
					{
						displayName: 'Maximum Output Tokens',
						name: 'maximumTokens',
						type: 'number',
						default: 1024,
						typeOptions: { minValue: 1 },
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						type: 'options',
						default: 'medium',
						options: [
							{ name: 'High', value: 'high' },
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
						],
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						default: 'text',
						options: [
							{ name: 'JSON Object', value: 'json_object' },
							{ name: 'Text', value: 'text' },
						],
					},
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
					},
				],
			},
			{
				displayName: 'Edit Existing Image',
				name: 'editImage',
				type: 'boolean',
				default: false,
				description: 'Whether to use the image edit endpoint',
				displayOptions: { show: { resource: ['image'] } },
			},
			{
				displayName: 'Options',
				name: 'imageSettings',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['image'] } },
				options: [
					{ displayName: 'Aspect Ratio', name: 'aspectRatio', type: 'string', default: '' },
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1, maxValue: 10 },
					},
					{ displayName: 'Negative Prompt', name: 'negativePrompt', type: 'string', default: '' },
					{
						displayName: 'Output Format',
						name: 'outputFormat',
						type: 'options',
						default: 'png',
						options: [
							{ name: 'JPEG', value: 'jpeg' },
							{ name: 'PNG', value: 'png' },
							{ name: 'WebP', value: 'webp' },
						],
					},
					{ displayName: 'Quality', name: 'quality', type: 'string', default: '' },
					{
						displayName: 'Reference Image URL',
						name: 'referenceImageUrl',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: 0,
						typeOptions: { minValue: 0 },
					},
					{ displayName: 'Size', name: 'size', type: 'string', default: '' },
				],
			},
			binaryProperty(['image']),
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['video'], operation: ['status', 'download'] } },
			},
			{
				displayName: 'Wait for Completion',
				name: 'waitSeconds',
				type: 'number',
				default: 0,
				description: 'Maximum number of seconds to wait. Zero returns the task immediately.',
				typeOptions: { minValue: 0, maxValue: 1800 },
				displayOptions: { show: { resource: ['video'], operation: ['create'] } },
			},
			{
				displayName: 'Options',
				name: 'videoSettings',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['video'], operation: ['create'] } },
				options: [
					{ displayName: 'Aspect Ratio', name: 'aspectRatio', type: 'string', default: '' },
					{
						displayName: 'Duration',
						name: 'duration',
						type: 'number',
						default: 5,
						typeOptions: { minValue: 1 },
						description: 'Requested video length in seconds',
					},
					{ displayName: 'First Frame URL', name: 'imageUrl', type: 'string', default: '' },
					{
						displayName: 'Generate Audio',
						name: 'audio',
						type: 'boolean',
						default: false,
					},
					{ displayName: 'Input Video URL', name: 'inputVideoUrl', type: 'string', default: '' },
					{ displayName: 'Last Frame URL', name: 'lastFrameUrl', type: 'string', default: '' },
					{ displayName: 'Mode', name: 'mode', type: 'string', default: '' },
					{ displayName: 'Negative Prompt', name: 'negativePrompt', type: 'string', default: '' },
					{ displayName: 'Resolution', name: 'resolution', type: 'string', default: '' },
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: 0,
						typeOptions: { minValue: 0 },
					},
				],
			},
			binaryProperty(['video'], ['create', 'download']),
		],
	};

	methods = {
		loadOptions: {
			async getAuthorizedModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await taoDockRequest<unknown>(this, 'GET', 'models', {
					qs: { scope: 'authorized' },
				});
				return authorizedModelOptions(response);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const input = this.getInputData();
		const output: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < input.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const pairedItem = { item: itemIndex };

				if (resource === 'text') {
					const model = this.getNodeParameter('model', itemIndex) as string;
					const response = await taoDockRequest<TextResponse>(this, 'POST', 'chat/completions', {
						body: buildTextRequest(
							model,
							this.getNodeParameter('prompt', itemIndex) as string,
							this.getNodeParameter('systemMessage', itemIndex, '') as string,
							this.getNodeParameter('imageUrl', itemIndex, '') as string,
							this.getNodeParameter('textSettings', itemIndex, {}) as IDataObject,
						),
					});
					output.push({
						json: {
							content: response.choices?.[0]?.message?.content ?? '',
							model: response.model ?? model,
							usage: response.usage ?? {},
							response,
						},
						pairedItem,
					});
					continue;
				}

				if (resource === 'image') {
					const model = this.getNodeParameter('model', itemIndex) as string;
					const settings = this.getNodeParameter('imageSettings', itemIndex, {}) as IDataObject;
					const edit = this.getNodeParameter('editImage', itemIndex, false) as boolean;
					const binaryName = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;
					const response = await taoDockRequest<ImageResponse>(
						this,
						'POST',
						edit ? 'images/edits' : 'images/generations',
						{
							body: buildImageRequest(
								model,
								this.getNodeParameter('prompt', itemIndex) as string,
								settings,
							),
						},
					);
					const results = response.data ?? [];
					if (results.length === 0) {
						throw new NodeOperationError(this.getNode(), 'TaoDock returned no image data', {
							itemIndex,
						});
					}
					const format = typeof settings.outputFormat === 'string' ? settings.outputFormat : 'png';

					for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
						const result = results[resultIndex];
						let content: Buffer;
						let mimeType = imageMediaType(format);
						if (result.b64_json) {
							content = Buffer.from(result.b64_json, 'base64');
						} else if (result.url) {
							const downloaded = (await this.helpers.httpRequest({
								method: 'GET',
								url: result.url,
								encoding: 'arraybuffer',
								returnFullResponse: true,
							})) as BinaryResponse;
							content = Buffer.from(downloaded.body);
							const header = downloaded.headers?.['content-type'];
							mimeType =
								(Array.isArray(header) ? header[0] : header)?.split(';')[0] || mimeType;
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`Image result ${resultIndex + 1} has no file data`,
								{ itemIndex },
							);
						}
						output.push({
							json: { model, result_index: resultIndex + 1 },
							binary: {
								[binaryName]: await this.helpers.prepareBinaryData(
									content,
									`taodock-image-${resultIndex + 1}.${format}`,
									mimeType,
								),
							},
							pairedItem,
						});
					}
					continue;
				}

				if (operation === 'status') {
					const taskId = this.getNodeParameter('taskId', itemIndex) as string;
					const task = await taoDockRequest<IDataObject>(
						this,
						'GET',
						`videos/${encodeURIComponent(taskId)}`,
					);
					output.push({ json: task, pairedItem });
					continue;
				}

				const binaryName = this.getNodeParameter('binaryProperty', itemIndex, 'data') as string;
				if (operation === 'download') {
					const taskId = this.getNodeParameter('taskId', itemIndex) as string;
					output.push(await downloadVideo(this, taskId, binaryName, itemIndex));
					continue;
				}

				const model = this.getNodeParameter('model', itemIndex) as string;
				let task = await taoDockRequest<IDataObject>(this, 'POST', 'videos', {
					body: buildVideoRequest(
						model,
						this.getNodeParameter('prompt', itemIndex) as string,
						this.getNodeParameter('videoSettings', itemIndex, {}) as IDataObject,
					),
				});
				const taskId = extractTaskId(task);
				if (!taskId) {
					throw new NodeOperationError(
						this.getNode(),
						'The video task response did not include an ID',
						{ itemIndex },
					);
				}

				const waitSeconds = this.getNodeParameter('waitSeconds', itemIndex, 0) as number;
				const deadline = Date.now() + waitSeconds * 1000;
				while (
					!['completed', 'failed'].includes(String(task.status ?? '').toLowerCase()) &&
					Date.now() < deadline
				) {
					await sleep(5000);
					task = await taoDockRequest<IDataObject>(
						this,
						'GET',
						`videos/${encodeURIComponent(taskId)}`,
					);
				}

				const status = String(task.status ?? 'queued').toLowerCase();
				if (status === 'failed') {
					const message =
						task.error && typeof task.error === 'object'
							? String((task.error as IDataObject).message ?? 'Video generation failed')
							: 'Video generation failed';
					throw new NodeOperationError(this.getNode(), message, { itemIndex });
				}
				if (status === 'completed' && waitSeconds > 0) {
					output.push(await downloadVideo(this, taskId, binaryName, itemIndex, model));
				} else {
					output.push({ json: { ...task, task_id: taskId }, pairedItem });
				}
			} catch (error) {
				const normalized = error instanceof Error ? error : new Error(String(error));
				if (this.continueOnFail()) {
					output.push({ json: { error: normalized.message }, pairedItem: { item: itemIndex } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), normalized, { itemIndex });
			}
		}

		return [output];
	}
}
