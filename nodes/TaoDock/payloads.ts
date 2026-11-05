import type { IDataObject } from 'n8n-workflow';

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function buildTextRequest(
	model: string,
	prompt: string,
	systemMessage: string,
	imageUrl: string,
	settings: IDataObject,
): IDataObject {
	const image = nonEmptyString(imageUrl);
	const userContent = image
		? [
				{ type: 'text', text: prompt },
				{ type: 'image_url', image_url: { url: image } },
			]
		: prompt;
	const messages: Array<Record<string, unknown>> = [];
	const system = nonEmptyString(systemMessage);
	if (system) messages.push({ role: 'system', content: system });
	messages.push({ role: 'user', content: userContent });

	const body: IDataObject = { model, messages };
	const temperature = finiteNumber(settings.temperature);
	const maximumTokens = finiteNumber(settings.maximumTokens);
	const topP = finiteNumber(settings.topP);
	const reasoningEffort = nonEmptyString(settings.reasoningEffort);
	const responseFormat = nonEmptyString(settings.responseFormat);
	if (temperature !== undefined) body.temperature = temperature;
	if (maximumTokens !== undefined) body.max_tokens = maximumTokens;
	if (topP !== undefined) body.top_p = topP;
	if (reasoningEffort) body.reasoning_effort = reasoningEffort;
	if (responseFormat) body.response_format = { type: responseFormat };
	return body;
}

export function buildImageRequest(
	model: string,
	prompt: string,
	settings: IDataObject,
): IDataObject {
	const body: IDataObject = { model, prompt, response_format: 'b64_json' };
	const size = nonEmptyString(settings.size);
	const quality = nonEmptyString(settings.quality);
	const outputFormat = nonEmptyString(settings.outputFormat);
	const aspectRatio = nonEmptyString(settings.aspectRatio);
	const negativePrompt = nonEmptyString(settings.negativePrompt);
	const referenceImageUrl = nonEmptyString(settings.referenceImageUrl);
	const count = finiteNumber(settings.count);
	const seed = finiteNumber(settings.seed);
	if (size) body.size = size;
	if (quality) body.quality = quality;
	if (outputFormat) body.output_format = outputFormat;
	if (aspectRatio) body.aspect_ratio = aspectRatio;
	if (negativePrompt) body.negative_prompt = negativePrompt;
	if (referenceImageUrl) body.image_url = referenceImageUrl;
	if (count !== undefined) body.n = count;
	if (seed !== undefined) body.seed = seed;
	return body;
}

export function buildVideoRequest(
	model: string,
	prompt: string,
	settings: IDataObject,
): IDataObject {
	const body: IDataObject = { model, prompt };
	const duration = finiteNumber(settings.duration);
	const resolution = nonEmptyString(settings.resolution);
	const aspectRatio = nonEmptyString(settings.aspectRatio);
	const mode = nonEmptyString(settings.mode);
	const imageUrl = nonEmptyString(settings.imageUrl);
	const lastFrameUrl = nonEmptyString(settings.lastFrameUrl);
	const inputVideoUrl = nonEmptyString(settings.inputVideoUrl);
	const negativePrompt = nonEmptyString(settings.negativePrompt);
	const seed = finiteNumber(settings.seed);
	if (duration !== undefined) body.duration = duration;
	if (resolution) body.resolution = resolution;
	if (aspectRatio) body.aspect_ratio = aspectRatio;
	if (mode) body.mode = mode;
	if (imageUrl) body.image_url = imageUrl;
	if (lastFrameUrl) body.last_frame_url = lastFrameUrl;
	if (inputVideoUrl) body.input_video_url = inputVideoUrl;
	if (negativePrompt) body.negative_prompt = negativePrompt;
	if (typeof settings.audio === 'boolean') body.audio = settings.audio;
	if (seed !== undefined) body.seed = seed;
	return body;
}
