# Privacy

This package sends configured prompts, media references, model settings, and API credentials to `https://taodock.com/v1` when a workflow executes. It requests the authorized model list from the same API when n8n loads model choices.

Generated media can be returned as encoded data or a temporary download URL. When a URL is returned, the node downloads that result immediately and stores it as n8n binary data. The package does not include analytics or telemetry.

Workflow owners control n8n execution data retention. Review the [Taodock privacy policy](https://taodock.com/privacy-policy) and your n8n retention settings before processing sensitive data.
