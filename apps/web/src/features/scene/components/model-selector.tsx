import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useOpenRouterModelsApi } from '@/services';
import { useScene } from '../model/store';

export function ModelSelector({ onSelect }: { onSelect: (model: string) => void }) {
  const mock = useScene((state) => state.mock);
  const selected = useScene((state) => state.selectedModel);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(true);
  const [inputError, setInputError] = useState('');
  const { data, error, isLoading, refresh } = useOpenRouterModelsApi(!mock);
  const current = selected || data?.default_model || '后端默认';
  const models = (data?.data || []).filter(
    (model) =>
      (!freeOnly || model.is_free) &&
      `${model.id} ${model.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <button
        type="button"
        className="model-trigger"
        disabled={mock}
        onClick={() => setOpen(true)}
        title={mock ? '关闭 Mock 后选择真实文本模型' : current}
      >
        {mock ? '模型 · Mock' : `模型 · ${current}`}
      </button>
      {open && (
        <Dialog
          labelledBy="model-title"
          onClose={() => setOpen(false)}
          className="details-dialog model-dialog"
        >
          <div className="model-heading">
            <h2 id="model-title">选择文本模型</h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="关闭模型选择">
              关闭
            </button>
          </div>
          <p>
            来自 OpenRouter
            官方目录。切换后将重新建立会话，清空当前对话；语音识别和合成服务保持当前配置。
          </p>
          <p>当前：{current}</p>
          <form
            className="model-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              const match = data?.data.find((model) => model.id === search.trim());
              if (!match) {
                setInputError('请输入官方目录中的完整模型 ID，或点击下方模型选择。');
                return;
              }
              if (freeOnly && !match.is_free) {
                setInputError('这是付费模型，请先关闭“仅显示免费模型”，查看价格后选择。');
                return;
              }
              onSelect(match.id);
              setOpen(false);
              setInputError('');
            }}
          >
            <input
              className="model-search"
              aria-label="搜索或输入完整模型 ID"
              placeholder="搜索名称，或输入完整模型 ID"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setInputError('');
              }}
            />
            <button type="submit" disabled={!data?.selection_enabled || !search.trim()}>
              使用此 ID
            </button>
          </form>
          {inputError && <p role="alert">{inputError}</p>}
          <label className="model-filter">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(event) => setFreeOnly(event.target.checked)}
            />
            仅显示免费模型
          </label>
          <p className="model-note">
            价格单位：美元 / 百万 token（输入 /
            输出）。免费模型仍受配额、限流和可用性限制。选择付费模型会使用你的 OpenRouter 余额。
          </p>
          {isLoading && <p role="status">正在加载官方模型目录…</p>}
          {error && (
            <div role="alert">
              <p>{error.message}</p>
              <button type="button" onClick={() => void refresh()}>
                重试加载
              </button>
            </div>
          )}
          {data && !data.selection_enabled && (
            <p>当前后端未启用 OpenRouter，请检查 LLM_PROVIDER。</p>
          )}
          {data && <h3>可选模型（{models.length}）</h3>}
          <div className="model-list" role="region" tabIndex={0} aria-label="可用文本模型，可滚动">
            {models.map((model) => (
              <button
                type="button"
                className="model-option"
                key={model.id}
                aria-pressed={current === model.id}
                onClick={() => {
                  onSelect(model.id);
                  setOpen(false);
                }}
              >
                <strong>
                  {model.name}
                  {model.is_free ? ' · 免费' : ''}
                </strong>
                <small>{model.id}</small>
                <span>
                  {model.input_price_per_million ?? '未知'} /{' '}
                  {model.output_price_per_million ?? '未知'} · 上下文{' '}
                  {model.context_length.toLocaleString()}
                </span>
                <span>
                  {model.supported_parameters.includes('response_format')
                    ? '支持 JSON 输出'
                    : '场景 JSON 输出需实测'}
                </span>
              </button>
            ))}
            {data && models.length === 0 && <p>没有符合条件的模型，请调整搜索或筛选条件。</p>}
          </div>
        </Dialog>
      )}
    </>
  );
}
