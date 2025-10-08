# [2.12.0](https://github.com/mrgoonie/human-mcp/compare/v2.11.0...v2.12.0) (2025-10-08)


### Features

* add design description command for analyzing screenshots and generating implementation plans ([4cf58a9](https://github.com/mrgoonie/human-mcp/commit/4cf58a9942853f2377afaafd3d7734e0d863e168))
* **hands:** add Playwright screenshot capture tools ([e6298b9](https://github.com/mrgoonie/human-mcp/commit/e6298b9192c2f7357e8a5fa52cbccc214012877f))

# [2.11.0](https://github.com/mrgoonie/human-mcp/compare/v2.10.1...v2.11.0) (2025-10-03)


### Bug Fixes

* **build:** externalize native dependencies for ONNX Runtime deployment ([6f33bc9](https://github.com/mrgoonie/human-mcp/commit/6f33bc9060a9c362cd823955f3202e56f82fcf27))
* **docker:** migrate from Alpine to Debian for glibc compatibility ([db8d552](https://github.com/mrgoonie/human-mcp/commit/db8d552a84948a3f9de8f73c5d502ee19658f003))


### Features

* add comprehensive UI/UX design system and agent capabilities ([55d4116](https://github.com/mrgoonie/human-mcp/commit/55d411630da440a10c0264c220d2e222c9d729b1))

## [2.10.1](https://github.com/mrgoonie/human-mcp/compare/v2.10.0...v2.10.1) (2025-10-02)


### Bug Fixes

* **hands:** correct mask, bg removal ([718d877](https://github.com/mrgoonie/human-mcp/commit/718d877ff358e5aea898606665ed01f7677c56e9))
* **jimp:** enhance image masking tool with proper grayscale alpha masking ([3e04b15](https://github.com/mrgoonie/human-mcp/commit/3e04b15c0ccd565847fae56222a8b71b1f21fe6f))

# [2.10.0](https://github.com/mrgoonie/human-mcp/compare/v2.9.0...v2.10.0) (2025-10-01)


### Features

* **hands:** add Jimp image editing tools ([e7ec6b1](https://github.com/mrgoonie/human-mcp/commit/e7ec6b14741353a2e6a4471752da46572713da69))

# [2.9.0](https://github.com/mrgoonie/human-mcp/compare/v2.8.4...v2.9.0) (2025-09-30)


### Features

* **gemini:** add separate image model configuration ([9baa811](https://github.com/mrgoonie/human-mcp/commit/9baa811e699a4b47f5e4a9f9c04fdd666665d6aa))

## [2.8.4](https://github.com/mrgoonie/human-mcp/compare/v2.8.3...v2.8.4) (2025-09-30)


### Bug Fixes

* **hands:** implement text-based image editing for Gemini 2.5 Flash ([79391a8](https://github.com/mrgoonie/human-mcp/commit/79391a8186f6896496c3f8e197c42bc09055ee56))

## [2.8.3](https://github.com/mrgoonie/human-mcp/compare/v2.8.2...v2.8.3) (2025-09-30)


### Bug Fixes

* **hands:** disable unsupported image editing tools ([e18284d](https://github.com/mrgoonie/human-mcp/commit/e18284d02838022ad940353b2654cf4f60146205))

## [2.8.2](https://github.com/mrgoonie/human-mcp/compare/v2.8.1...v2.8.2) (2025-09-30)


### Bug Fixes

* **hands:** optimize HTTP transport responses to prevent tool execution failures ([7e2475a](https://github.com/mrgoonie/human-mcp/commit/7e2475a03db2efbe1aa2203bb1e18df9f7fe545a))

## [2.8.1](https://github.com/mrgoonie/human-mcp/compare/v2.8.0...v2.8.1) (2025-09-30)


### Bug Fixes

* **hands:** use correct Gemini model for image editing and add debug logging ([8fc5618](https://github.com/mrgoonie/human-mcp/commit/8fc561804ca9d20e3d262f08299e890af8a3b8eb))

# [2.8.0](https://github.com/mrgoonie/human-mcp/compare/v2.7.0...v2.8.0) (2025-09-30)


### Features

* **hands:** implement file path support for image editing tools ([5f81792](https://github.com/mrgoonie/human-mcp/commit/5f817922fc4cf3ac86cbc8b1535ea7682f7cfb46))

# [2.7.0](https://github.com/mrgoonie/human-mcp/compare/v2.6.0...v2.7.0) (2025-09-30)


### Features

* **hands:** add image editing tool with multi-operation support ([f3a5f7c](https://github.com/mrgoonie/human-mcp/commit/f3a5f7cecbdf33179f1ccf6678a1c6e608f2b067))

# [2.6.0](https://github.com/mrgoonie/human-mcp/compare/v2.5.0...v2.6.0) (2025-09-29)


### Bug Fixes

* **brain-tools:** standardize sequential thinking tool to use reasoning namespace ([d87c04d](https://github.com/mrgoonie/human-mcp/commit/d87c04d945866f7256e4748e2c06292f14187185))
* **deps:** sync bun.lock with package.json for wav dependencies ([d2632be](https://github.com/mrgoonie/human-mcp/commit/d2632be988a9970a5e042cd41b4ee582ad65d3fe))
* **mouth-tools:** resolve audio generation and playback issues ([37c6528](https://github.com/mrgoonie/human-mcp/commit/37c65287b2bc24dcac1591a869d67d21b19ff8a3))
* **tests:** resolve mock contamination and improve test isolation ([f4e1a8d](https://github.com/mrgoonie/human-mcp/commit/f4e1a8df008d2a6d97b194b67591d46698086c16))


### Features

* **brain_tools:** add optimization plan and initial implementation artifacts ([062f821](https://github.com/mrgoonie/human-mcp/commit/062f821183ef12617299fde9a350166c3254123d))
* **media-generation:** optimize token usage with automatic file storage ([461bdf6](https://github.com/mrgoonie/human-mcp/commit/461bdf64bbe0c571a36e196b715dcb0992590f94))

# [2.5.0](https://github.com/mrgoonie/human-mcp/compare/v2.4.1...v2.5.0) (2025-09-29)


### Features

* **logging:** enhance logging infrastructure and analysis ([a82167d](https://github.com/mrgoonie/human-mcp/commit/a82167d35c1b1954a6d6522dbe4a57cb4462ae33))

## [2.4.1](https://github.com/mrgoonie/human-mcp/compare/v2.4.0...v2.4.1) (2025-09-29)


### Bug Fixes

* **eyes_analyze:** enhance image analysis with retry and fallback mechanisms ([8f46f96](https://github.com/mrgoonie/human-mcp/commit/8f46f969e3891392526f838847cfbc6a48011878))

# [2.4.0](https://github.com/mrgoonie/human-mcp/compare/v2.3.0...v2.4.0) (2025-09-28)


### Features

* **eyes_analyze:** improve API reliability and image processing ([c53c4f9](https://github.com/mrgoonie/human-mcp/commit/c53c4f9f6226b843a7e7d1e3be7752ca9e9b48fc))

# [2.3.0](https://github.com/mrgoonie/human-mcp/compare/v2.2.0...v2.3.0) (2025-09-22)


### Bug Fixes

* **typescript:** resolve null safety in image content block parsing ([4ddaa3e](https://github.com/mrgoonie/human-mcp/commit/4ddaa3eb0e9e7aae7e294ca603ca3f12a395636c))


### Features

* improve dev workflows and image generation response format ([15f2f51](https://github.com/mrgoonie/human-mcp/commit/15f2f51890b3cb262dd303c0f7ec1aeadded15c2))

# [2.2.0](https://github.com/mrgoonie/human-mcp/compare/v2.1.0...v2.2.0) (2025-09-21)


### Bug Fixes

* **typescript:** resolve compilation errors in brain tools and hands tools ([c96ab09](https://github.com/mrgoonie/human-mcp/commit/c96ab09b6b05c5f0c6032ed5c777392ec6ce1a23))


### Features

* **brain:** implement advanced reasoning capabilities ([b181b1e](https://github.com/mrgoonie/human-mcp/commit/b181b1eeaef201d6a333e9319e1dd4865f799adc))

# [2.1.0](https://github.com/mrgoonie/human-mcp/compare/v2.0.0...v2.1.0) (2025-09-21)


### Features

* **hands:** complete Phase 5 - Professional Video Generation with Veo 3.0 API ([21edbc9](https://github.com/mrgoonie/human-mcp/commit/21edbc9e6a783953de32310d76230da776244ec6))

# [2.0.0](https://github.com/mrgoonie/human-mcp/compare/v1.4.0...v2.0.0) (2025-09-21)


### Bug Fixes

* **ci:** resolve TypeScript compilation errors for Bun compatibility ([cf63114](https://github.com/mrgoonie/human-mcp/commit/cf6311453ec2c7028198a750fe2c908705085179))
* update lockfile to sync with package.json dependencies ([647c862](https://github.com/mrgoonie/human-mcp/commit/647c86285679dcc3f7727b2d59a774d8c5ea7280))


### Features

* add document processing capabilities to eyes tools ([082cae7](https://github.com/mrgoonie/human-mcp/commit/082cae779d99d1221d05dc4f30021371d1909ec2))
* **hands:** implement image generation tool using Gemini Imagen API ([a8304a5](https://github.com/mrgoonie/human-mcp/commit/a8304a5293eb76465fcc7a55263b74505e03a8e2))
* **mouth:** implement comprehensive speech generation tools ([ebbae52](https://github.com/mrgoonie/human-mcp/commit/ebbae52cdb345888221a4eebd473ad7ad0a29f1e))


### BREAKING CHANGES

* **hands:** None - additive feature implementation

Closes: Phase 5 Content Generation milestone

# [1.4.0](https://github.com/mrgoonie/human-mcp/compare/v1.3.0...v1.4.0) (2025-09-15)


### Features

* add OpenCode STDIO compatibility and R2 skip logic ([ea1d03a](https://github.com/mrgoonie/human-mcp/commit/ea1d03a753a34598baf64d26170bedeaead63deb))

# [1.3.0](https://github.com/mrgoonie/human-mcp/compare/v1.2.1...v1.3.0) (2025-09-15)


### Bug Fixes

* **test:** resolve SSE transport timeouts and server lifecycle issues ([53baad5](https://github.com/mrgoonie/human-mcp/commit/53baad54c3482e3dfc4c22865f2c04c390718a04))


### Features

* add OpenCode agent definitions for code review, debugging, docs, git and planning ([69ef21f](https://github.com/mrgoonie/human-mcp/commit/69ef21fc018a20320cb0cf2113ea01785500b313))
* **transport:** add Cloudflare R2 HTTP transport file access ([8459b83](https://github.com/mrgoonie/human-mcp/commit/8459b8322172019a9b2cee944c02471113444c19))
* **transport:** implement SSE fallback for legacy MCP client compatibility ([a2a8041](https://github.com/mrgoonie/human-mcp/commit/a2a8041220577597061efd37e6e1ae167ae40ec5))

## [1.2.1](https://github.com/mrgoonie/human-mcp/compare/v1.2.0...v1.2.1) (2025-09-08)


### Bug Fixes

* update tool names to comply with MCP validation pattern ([3c23e10](https://github.com/mrgoonie/human-mcp/commit/3c23e101e843095fb33703dd9431a89936c18308))

# [1.2.0](https://github.com/mrgoonie/human-mcp/compare/v1.1.0...v1.2.0) (2025-09-08)


### Features

* make HTTP transport config options configurable via config object ([d9da0f1](https://github.com/mrgoonie/human-mcp/commit/d9da0f1ec01b53dd21ace64e781d6bec269bd763))

# [1.1.0](https://github.com/mrgoonie/human-mcp/compare/v1.0.2...v1.1.0) (2025-09-08)


### Features

* add HTTP transport with Docker deployment ([971af50](https://github.com/mrgoonie/human-mcp/commit/971af50cae5ccb50b83a70c29099e4c801b8fcad))

## [1.0.2](https://github.com/mrgoonie/human-mcp/compare/v1.0.1...v1.0.2) (2025-09-08)


### Bug Fixes

* **ci:** configure NPM package for public publishing ([3222450](https://github.com/mrgoonie/human-mcp/commit/3222450edae2f40e86cba29dea5c3dfd35bf4fd1))

## [1.0.1](https://github.com/mrgoonie/human-mcp/compare/v1.0.0...v1.0.1) (2025-09-08)


### Bug Fixes

* **config:** update NPM publishing configuration for scoped package ([caa26cd](https://github.com/mrgoonie/human-mcp/commit/caa26cd36d6967a935921b62e7478f4074cac671))

# 1.0.0 (2025-09-08)


### Bug Fixes

* resolve timeout issues and improve MCP SDK integration ([ccd7f8d](https://github.com/mrgoonie/human-mcp/commit/ccd7f8d44dc9b8f9e5432092e40fa6dd99759dae))
* **tests:** resolve type mismatches and schema alignment ([f68308b](https://github.com/mrgoonie/human-mcp/commit/f68308bc476be2e47a35da92d9b766c0c2d02a93))


### Features

* add claude agent definitions for code review, database, debugging, docs and git management ([8203456](https://github.com/mrgoonie/human-mcp/commit/8203456615ca498074657a07a25cea99b9d538fb))
* add semantic-release automation with GitHub Actions ([3733a38](https://github.com/mrgoonie/human-mcp/commit/3733a38b1ab90ef37e44af2726ec0b3cec88932e))
