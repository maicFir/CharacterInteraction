import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { IconButton } from '@/components/ui/icon-button';
import { useGenerateSceneApi } from '@/services';
import { patchScene, useScene } from '../model/store';
import { Toggle } from '@/components/ui/toggle';
import { scenePresets, scenePrompt, type SceneDefinition } from '../model/scene-definition';

export function SceneSettings({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (scene: SceneDefinition) => void;
}) {
  const musicEnabled = useScene((state) => state.musicEnabled);
  const musicError = useScene((state) => state.musicError);
  const showCharacter = useScene((state) => state.showCharacter);
  const mock = useScene((state) => state.mock);
  const current = useScene((state) => state.definition);
  const model = useScene((state) => state.selectedModel);
  const [prompt, setPrompt] = useState(() => scenePrompt(current));
  const [preview, setPreview] = useState<SceneDefinition | null>(null);
  const [message, setMessage] = useState('');
  const pending = useRef<AbortController | null>(null);
  const { trigger, loading } = useGenerateSceneApi();
  useEffect(() => () => pending.current?.abort(), []);
  const generate = async () => {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    setMessage('');
    setPreview(null);
    try {
      const generated = await trigger({
        prompt: prompt.trim(),
        model_id: model || undefined,
        signal: abort.signal,
      });
      if (!abort.signal.aborted) setPreview(generated);
    } catch (error) {
      if (!abort.signal.aborted)
        setMessage(error instanceof Error ? error.message : '生成失败，请重试。');
    }
  };
  return (
    <Dialog
      labelledBy="scene-settings-title"
      onClose={onClose}
      className="details-dialog scene-settings"
    >
      <IconButton icon="close" label="关闭场景设置" className="dialog-close" onClick={onClose} />
      <div className="eyebrow">STORY STUDIO</div>
      <h2 id="scene-settings-title">为下一次相遇，写个开场</h2>
      <p>
        当前：{current.title} · {current.character.name}
        。应用新场景后会清空当前对话，并切换角色设定。
      </p>
      <div className="character-visibility">
        <div>
          <strong>显示角色</strong>
          <p>隐藏人物后仍可继续语音和文字互动。</p>
        </div>
        <Toggle
          label="显示角色"
          checked={showCharacter}
          onChange={(value) => patchScene({ showCharacter: value })}
        />
      </div>
      <div className="character-visibility">
        <div>
          <strong>背景音乐</strong>
          <p>随机播放本地音乐；录音或连续语音对话时自动暂停。</p>
          {musicError && <p role="status">{musicError}</p>}
        </div>
        <Toggle
          label="背景音乐"
          checked={musicEnabled}
          onChange={(value) => patchScene({ musicEnabled: value, musicError: '' })}
        />
      </div>
      {mock ? (
        <>
          <h3>选择 Mock 场景</h3>
          <p>本地预设，无需调用模型。点击预览，再应用到首页。</p>
          <div className="scene-presets">
            {scenePresets.map((scene) => (
              <button
                type="button"
                key={scene.id}
                aria-pressed={preview?.id === scene.id}
                onClick={() => {
                  setPreview(scene);
                  setPrompt(scenePrompt(scene));
                  setMessage('');
                }}
              >
                <strong>{scene.title}</strong>
                <span>
                  {scene.character.name} · {scene.character.profession}
                </span>
                <small>
                  {scene.location} · {scene.weather}
                </small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p>
          真实生成 · 使用{model || '后端默认模型'}
          。生成角色、首页文案、话题和插画外观参数；模型费用遵循所选模型定价。
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!mock) void generate();
        }}
      >
        <label htmlFor="scene-prompt">场景提示文案</label>
        <textarea
          id="scene-prompt"
          className="scene-prompt"
          rows={5}
          minLength={10}
          maxLength={2000}
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setPreview(null);
          }}
          placeholder="描述时间、地点、角色年龄、职业、衣着、性格，以及正在发生的故事…"
          disabled={loading}
        />
        <div className="settings-form-footer">
          <small>{prompt.length} / 2000</small>
          {!mock && (
            <button
              type="submit"
              className="settings-primary"
              disabled={loading || prompt.trim().length < 10}
            >
              {loading ? '正在生成场景…' : '调用模型，生成预览'}
            </button>
          )}
        </div>
        {mock && <p>自定义提示词生成请关闭 Mock。当前模式可直接选择上方预设。</p>}
      </form>
      <p className="model-note">
        角色为可配置插画，支持发型、服装、配色与配饰；背景使用咖啡馆、书店、车站三种模板。照片为示例素材，语音音色沿用当前服务。
      </p>
      {message && <p role="alert">{message}</p>}
      {loading && (
        <p role="status">正在完善人物、文案与场景，通常需要数十秒。关闭设置可取消本次等待。</p>
      )}
      {preview && (
        <section className="scene-preview" aria-label="场景预览">
          <div className="eyebrow">SCENE PREVIEW</div>
          <h3>{preview.title}</h3>
          <p>
            {preview.headline.join('')}
            <br />
            {preview.intro.join('')}
          </p>
          <strong>
            {preview.character.name} · {preview.character.age} 岁 · {preview.character.profession}
          </strong>
          <p>
            {preview.character.appearance}
            <br />
            {preview.character.backstory}
          </p>
          <p>开场：{preview.opening_line}</p>
          <p>话题：{preview.topics.join(' / ')}</p>
          <button
            type="button"
            className="settings-primary"
            onClick={() => {
              onApply(preview);
              onClose();
            }}
          >
            应用场景
          </button>
        </section>
      )}
    </Dialog>
  );
}
