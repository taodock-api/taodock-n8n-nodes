import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TaoDockApi implements ICredentialType {
	name = 'taodockApi';

	displayName = 'TaoDock API';

	icon: Icon = {
		light: 'file:../nodes/TaoDock/taodock.svg',
		dark: 'file:../nodes/TaoDock/taodock.dark.svg',
	};

	documentationUrl = 'https://docs.taodock.com';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create a key at https://taodock.com/keys',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://taodock.com/v1',
			url: '/models',
			method: 'GET',
			qs: { scope: 'authorized' },
		},
	};
}
