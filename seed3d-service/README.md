# Seed3D and Model Lab Service

This CloudRun service keeps the existing Seed3D proxy and adds a versioned glTF
Transform boundary for Xiaonian. Source GLB files are never overwritten.

## Endpoints

- `GET /healthz`
- `POST /api/generate-3d`
- `GET /api/task-status?taskId=...`
- `GET /api/model-lab/capabilities`
- `POST /api/model-lab/inspect`
- `POST /api/model-lab/transform`

The two Model Lab POST endpoints require Mini Program identity headers injected
by `wx.cloud.callContainer`. Production access should enable only `MINIAPP` and
`OA`; do not expose model processing through unrestricted `PUBLIC` access.

## Transform request

```json
{
  "source": "cloud://.../model.glb",
  "assetId": "work-3-black",
  "parentVersionId": "optional-parent-version",
  "operations": [
    { "type": "scale", "value": [1, 1, 0.75] },
    { "type": "center" },
    { "type": "prune" }
  ]
}
```

Each successful transform writes two immutable objects:

```text
model-lab/<owner-hash>/<asset-id>/versions/<version-id>.glb
model-lab/<owner-hash>/<asset-id>/manifests/<version-id>.json
```

Rollback changes only the selected version pointer. It does not delete or
rewrite the original model or any generated revision.

## Compatibility

Draco, Meshopt, and texture conversion are exposed as experimental backend
operations. A generated compressed model must not become the Mini Program
default until its corresponding decoder has been configured in `GLTFLoader`.
