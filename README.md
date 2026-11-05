# TaoDock for n8n

Use TaoDock text, image, and video models in n8n workflows. The node supports model discovery for your API key, binary media output, video task polling, and n8n error routing.

## Credentials

Create an API key at [TaoDock](https://taodock.com/keys), then add a **TaoDock API** credential in n8n. The credential is sent only to the TaoDock API at `https://taodock.com/v1`.

## Actions

- **Text · Generate:** send text or multimodal chat input and receive the full response plus convenient content and usage fields.
- **Image · Generate:** create or edit images and emit each result as n8n binary data.
- **Video · Create:** start a video task, optionally wait for completion, and emit the finished video as binary data.
- **Video · Get Status / Download:** inspect or retrieve an existing video task.

Models are loaded from the authorized model list associated with the selected credential. Model-specific options remain optional so workflows work across different model families.

## Development

```bash
npm ci
npm run lint
npm test
npm run build
```

Use `npm run dev` to run the node development environment.

## Links

- [Documentation](https://docs.taodock.com)
- [Models](https://taodock.com/models)
- [Pricing](https://taodock.com/api/pricing)
- [Usage logs](https://taodock.com/usage-logs/common)
- [Privacy policy](https://taodock.com/privacy-policy)

## License

MIT © TaoDock
