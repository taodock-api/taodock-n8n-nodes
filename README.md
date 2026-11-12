# Taodock for n8n

[![Validate](https://github.com/taodock-api/taodock-n8n-nodes/actions/workflows/validate.yml/badge.svg)](https://github.com/taodock-api/taodock-n8n-nodes/actions/workflows/validate.yml)
[![npm](https://img.shields.io/npm/v/n8n-nodes-taodock?logo=npm&logoColor=white)](https://www.npmjs.com/package/n8n-nodes-taodock)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](LICENSE)
[![n8n](https://img.shields.io/badge/n8n-community%20node-ea4b71)](https://docs.n8n.io/integrations/community-nodes/)

One node for **text, image and video generation** across leading AI models —
powered by the [Taodock](https://taodock.com/) unified AI API.
**One API key, one bill, no per-provider credential sprawl.**

The node reads the model list authorized by your key at runtime, so new models
appear in the dropdown without a package update.

## Features

- **Three resources in one node** — `Text`, `Image`, and `Video`, each with its
  own operations and options.
- **Model discovery from your key** — the model dropdown is loaded from
  `GET /v1/models?scope=authorized`; nothing is hardcoded.
- **Media-ready output** — generated images and videos are emitted as n8n
  binary data, ready for Google Drive, S3, Slack, HTTP upload, or the next node.
- **Async video handled for you** — create a task, optionally wait for
  completion, and get the finished MP4 as binary in a single execution.
- **Usable as an AI Agent tool** — the node sets `usableAsTool`, so it can be
  attached to an n8n AI Agent and driven by an LLM.
- **Per-item error routing** — honours *Continue On Fail* so one failed item
  does not kill a batch run.

## Requirements

- A **self-hosted n8n** instance running on Node.js 22 or newer (community nodes
  are not installable on n8n Cloud unless the package is a verified node)
- A Taodock API key — [create one](https://taodock.com/keys)

## Install

Install from the n8n UI:

1. Open **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-taodock` and confirm.
3. Reload n8n; **Taodock** appears in the node panel.

Manual installation for a local n8n:

```bash
cd ~/.n8n/custom     # create the directory if it does not exist
npm install n8n-nodes-taodock
```

For Docker deployments, install the package into the custom extensions folder:

```bash
docker exec -it <n8n-container> npm install n8n-nodes-taodock \
  --prefix /home/node/.n8n/custom
```

## Credentials

1. Create a key at <https://taodock.com/keys>.
2. In n8n, add a **Taodock API** credential and paste the key.
3. n8n verifies the credential against `GET https://taodock.com/v1/models?scope=authorized`.

The key is sent only to `https://taodock.com/v1` as a bearer token.

## Operations

| Resource | Operation | What it does | Output |
|---|---|---|---|
| Text | Generate | Text or multimodal chat completion with system message, image URL, temperature, top-p, max tokens, reasoning effort, JSON response format | `content`, `model`, `usage`, raw `response` |
| Image | Generate | Generate or edit images (up to 10 per call) with aspect ratio, size, quality, seed, negative prompt, PNG/JPEG/WebP output | One item per image, file as binary data |
| Video | Create | Start a video task; set *Wait for Completion* to poll until done and return the MP4, or 0 to return the task immediately | Task JSON, or binary MP4 when waited |
| Video | Get Status | Inspect an existing video task | Task JSON |
| Video | Download | Download a finished video task | Binary MP4 |

### Example: summarise incoming text with any model

1. Add a **Webhook** node that receives a `text` field.
2. Add a **Taodock** node → Resource `Text`, Operation `Generate`.
3. Set Model from the dropdown, put `={{ $json.text }}` in **Prompt**, and add
   a system message such as `You are a concise technical editor.`
4. Enable **Response Format → JSON Object** and pipe the result into your
   downstream nodes using `{{ $json.content }}`.

### Example: generate an image and store it

1. **Taodock** → Resource `Image`, Operation `Generate`, prompt, `Size`/`Aspect Ratio`.
2. Leave **Binary Property** as `data`.
3. Connect **Google Drive → Upload** (or S3) and map the binary property `data`.

## Privacy and data flow

Prompts, media references, model settings, and the API key are sent to
`https://taodock.com/v1` when a workflow executes. Generated media returned as a
temporary URL is downloaded immediately into n8n binary data. The package
contains **no analytics and no telemetry**. Details:
[PRIVACY.md](PRIVACY.md) · [Taodock privacy policy](https://taodock.com/privacy-policy).

## Compatibility

| Component | Version |
|---|---|
| n8n | 1.x, self-hosted |
| Node.js | 22 or newer |
| n8n nodes API | 1 |

## Development

```bash
npm ci
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # builds, then runs node:test suites
npm run build       # n8n-node build
npm run dev         # local node development environment
```

Continuous validation runs on every push via the
[Validate workflow](.github/workflows/validate.yml).

## Releasing

Publishing is automated. Pushing a `v*` tag runs the
[Publish workflow](.github/workflows/publish.yml), which verifies the tag matches
`package.json`, runs lint, typecheck, tests and build, then publishes to npm with
a provenance attestation:

```bash
npm version patch --no-git-tag-version
git commit -am "Release v0.1.4"
git tag v0.1.4
git push origin main --tags
```

The workflow uses a repository-scoped npm granular token while the package's
Trusted Publisher record is being repaired. Releases still run in GitHub Actions
with `--provenance`, so npm can verify the source repository, commit, and workflow.
The token is scoped only to the publish step and should be removed after OIDC
publishing is verified. To test the pipeline without publishing, run the workflow
manually with *Dry run* enabled.

## Links

- [Documentation](https://docs.taodock.com)
- [Models](https://taodock.com/models)
- [Pricing](https://taodock.com/api/pricing)
- [Usage logs](https://taodock.com/usage-logs/common)
- [npm package](https://www.npmjs.com/package/n8n-nodes-taodock)

## More Taodock integrations

| Integration | Repository |
|---|---|
| WordPress AI provider | [taodock-api/taodock-wordpress](https://github.com/taodock-api/taodock-wordpress) |
| Dify tools & plugins | [taodock-api/taodock-dify-tools](https://github.com/taodock-api/taodock-dify-tools) |
| AstrBot plugin | [taodock-api/taodock-astrbot-plugin](https://github.com/taodock-api/taodock-astrbot-plugin) |
| MCP server | [taodock-api/taodock-mcp](https://github.com/taodock-api/taodock-mcp) |
| TypeScript AI SDK | [taodock-api/taodock-ai-sdk](https://github.com/taodock-api/taodock-ai-sdk) |

## License

MIT © Taodock
