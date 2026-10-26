# Next Session Handoff

Updated: 2026-07-18

## Official WeChat article task

- The user will decide the article topic tomorrow. Do not choose a topic before they confirm it.
- After the topic is confirmed, prepare a technical draft and a curated image-material list for the teammate responsible for WeChat Official Account layout.
- Images may be selected from the current WeChat Mini Program and its CloudBase assets. For every selected image, provide its purpose, suggested placement, caption, and cloud path.
- Reference article from another teammate: https://mp.weixin.qq.com/s/kp72swVFXJqMxg95st3Wpg
- The reference URL could not be fetched on 2026-07-18 because the reader request timed out. Retry reading it when the article work starts.

## Current Volume Five rule

- Work one and work two must use identical board-stage and paper dimensions.
- Only work two's printed image content is enlarged to 116%; do not enlarge its board-stage or paper container.
- The exploded color-layer view must use the currently selected work's own four backend split layers.

## Xiaonian workflow integration (long-term handoff)

- Product sentence: the user can tell Xiaonian, “Use this image to create a four-color Foshan woodblock print, connect it to Volume Five, and notify me when the four 3D boards are ready.”
- Xiaonian is the conversational front door, not a holder of CloudBase/Seed3D secrets. It calls a backend tool gateway with strict schemas and allowlisted operations.
- Planned allowlist: `createNianhuaWork`, `splitWorkColors`, `generateBoardModels`, `getWorkStatus`, `retryFailedModel`, `publishWork`, `openVolumeFive`, `openWorkAR`.
- UI commands returned by the gateway are also allowlisted, for example `NAVIGATE_VOLUME` and `SELECT_WORK`; the Mini Program validates them before acting.
- Long-running work is asynchronous: create an immediate 2D Volume Five work, submit four Seed3D jobs in parallel, validate/compress each GLB, update a work Manifest, then notify Xiaonian. Failed colors are retried independently.
- Future Volume Five work data should be dynamic Manifest records rather than hard-coded constants. Manifest fields include original, four layers, four boards, four models, status, quality, workflowVersion, visibility, and ownerOpenid.

## AR and compliance research (2026-07-18)

- Tavily research found official XR-Frame supports glTF/GLB, AR, plane tracking, Marker/OSD examples, and an optimization toolkit. Official overview: https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview
- Official VisionKit supports `wx.createVKSession`, plane anchors, hit testing, and placing 3D models. Official base guide: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/visionkit/base.html
- XR-Frame docs state practical client requirements around WeChat 8.0.29+/8.0.30+, base library 2.27.1 minimum and 2.32.0 recommended, and only one `xr-frame` at a time.
- A third-party EZXR Mini Program plugin exists and supports 3DoF, 6DoF, Marker and XR-Frame-compatible AR, but it may require commercial terms, plugin review, and extra integration work. Do not add it before checking the Mini Program backend.
- Current recommendation: first use official XR-Frame/VisionKit with no third-party plugin and no new industry category. No source found saying XR-Frame/VisionKit alone automatically requires re备案. Keep separate checks for: service-category review, plugin addition/review, server-domain/ICP requirements, and备案 information changes.
- Official备案 guidance: https://developers.weixin.qq.com/miniprogram/product/record/record_guidelines.html and FAQ: https://developers.weixin.qq.com/miniprogram/product/record/record_faq.html. If主体 or Mini Program备案 information changes, use the platform's 变更备案 flow; adding a renderer alone is not evidence that a new备案 is required.
