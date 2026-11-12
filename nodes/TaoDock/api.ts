import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

const API_BASE_URL = 'https://taodock.com/v1';

type TaoDockContext = IExecuteFunctions | ILoadOptionsFunctions;

interface TaoDockRequestOptions {
	body?: IDataObject;
	qs?: IDataObject;
	encoding?: 'arraybuffer';
	returnFullResponse?: boolean;
	timeout?: number;
}

export async function taoDockRequest<T>(
	context: TaoDockContext,
	method: IHttpRequestMethods,
	path: string,
	options: TaoDockRequestOptions = {},
): Promise<T> {
	const request: IHttpRequestOptions = {
		method,
		url: `${API_BASE_URL}/${path.replace(/^\/+/, '')}`,
		headers: { 'X-TaoDock-Client': 'n8n-nodes-taodock/0.1.4' },
		json: options.encoding === undefined,
		...options,
	};

	return (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'taodockApi',
		request,
	)) as T;
}
