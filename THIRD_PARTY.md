# 第三方服务、模型与素材

## 代码与服务

| 组件 | 来源 | 许可/使用说明 |
|---|---|---|
| Next.js | https://github.com/vercel/next.js | MIT |
| React | https://github.com/facebook/react | MIT |
| SWR | https://github.com/vercel/swr | MIT |
| Zustand | https://github.com/pmndrs/zustand | MIT |
| Tailwind CSS | https://github.com/tailwindlabs/tailwindcss | MIT |
| FastAPI | https://github.com/fastapi/fastapi | MIT |
| faster-whisper | https://github.com/SYSTRAN/faster-whisper | MIT；模型权重须独立核实 |
| Piper | https://github.com/OHF-Voice/piper1-gpl | GPL-3.0；各音色模型有单独许可 |
| FFmpeg | https://ffmpeg.org/legal.html | 按实际发行构建的LGPL/GPL与组件许可 |
| OpenRouter | https://openrouter.ai/docs/api/reference/overview | 外部文本API，费用与条款取决于账号与所选模型 |
| Vercel | https://vercel.com/docs | 前端部署服务 |
| Caddy | https://github.com/caddyserver/caddy | Apache-2.0，选用的HTTPS网关 |

使用版本以 pnpm-lock.yaml 与 apps/api/uv.lock 为准；未复制 Open-LLM-VTuber、TalkingHead、Pipecat 或 LiveKit 的成品前端代码。

## 原创视觉素材

咖啡馆、海边照片和 Mira 42帧矢量角色由本仓库 `scripts/create_assets.py` 以SVG几何绘制，无外部人物图、知名角色或真人照片。Mira为26岁原创成年角色。项目只实现有限帧动画，不宣称Live2D、3D或音素口型同步。

## 演示音频

`apps/web/public/audio/*.wav` 是根据本仓库原创中文台词，用本地 Piper `zh_CN-huayan-medium` 生成的演示语音。复现脚本为 `scripts/create_mock_audio.py`，台词读取 `features/scene/model/turns.ts`，保证字幕与录音文本一致。

音色来源：https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN/huayan/medium

该音色 MODEL_CARD 的 Dataset License 写为 **Unknown**；模型不打包进源码仓库。本项目用于技术演示，**没有对示例音色或输出给出已获商业授权的保证**。若要公开商用或分发语音资产，先替换为明确许可的音色/自行录制音频，并重新生成对应文件。Piper 引擎的GPL许可与音色许可不能混为一谈。
