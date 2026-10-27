import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useBackendHealthApi } from '@/services';
import { useScene } from '../model/store';
import type { SceneController } from '../runtime/scene-controller';

export function ExperienceDialog({
  onClose,
  controller,
}: {
  onClose: () => void;
  controller: SceneController;
}) {
  const definition = useScene((state) => state.definition);
  const mock = useScene((state) => state.mock);
  const entered = useScene((state) => state.entered);
  const { data: health } = useBackendHealthApi(!mock);
  return (
    <Dialog labelledBy="details-title" onClose={onClose} className="details-dialog">
      <IconButton icon="close" label="关闭体验说明" className="dialog-close" onClick={onClose} />
      <div className="eyebrow">ABOUT THE EXPERIENCE</div>
      <h2 id="details-title">一段可以被打断的相遇</h2>
      <p>
        {definition.character.name}{' '}
        是原创成年角色。你可以用文字或按住麦克风交流；再次按下麦克风会立即打断回复。
      </p>
      <dl>
        <dt>Mock 模式</dt>
        <dd>
          使用本地预设文本与插画，不调用后端。默认场景带录制语音；其他场景使用设备本地中文语音，无可用语音时仅显示字幕。Mock
          按钮模拟倾听和打断，不访问麦克风；松开后使用当前场景的预设问题，不识别真实语音。
        </dd>
        <dt>真实模式</dt>
        <dd>
          连接后端 STT → OpenRouter LLM →
          TTS。可开启连续语音：麦克风持续本地检测，停顿后自动提交；角色说话或思考时直接开口即可打断。也可按住录音。字幕与语音同步开始；离开页面会结束麦克风监听，录音处理后删除。
        </dd>
        <dt>当前后端</dt>
        <dd>
          {mock
            ? '未连接（Mock）'
            : health
              ? `LLM ${health.llm_configured ? '已配置' : '未配置'} · STT ${health.stt} · TTS ${health.tts}`
              : '尚未连接或服务不可达'}
        </dd>
      </dl>
      <p className="privacy-note">
        Mock 不访问麦克风；真实模式会把语音发送到配置的后端，并按部署者选择的模型服务处理。
      </p>
      {mock && entered ? (
        <button
          className="failure-button"
          onClick={() => {
            onClose();
            controller.simulateFailure();
          }}
        >
          测试一次语音失败与恢复
          <Icon name="refresh" />
        </button>
      ) : null}
    </Dialog>
  );
}
