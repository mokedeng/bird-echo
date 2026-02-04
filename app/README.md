# Bird Echo - 前端应用

Bird Echo 的 React 前端应用，提供鸟类识别的用户界面。

## 技术栈

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **Lucide React** - 图标库

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 3000)
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
app/
├── screens/              # 页面组件
│   ├── HomeScreen.tsx       # 主页，带录制按钮
│   ├── RecordingScreen.tsx  # 录音界面
│   └── ResultsScreen.tsx    # 结果展示
├── hooks/               # 自定义 Hooks
│   └── useMediaRecorder.ts  # 录音 Hook
├── services/            # API 层
│   └── api.ts
├── components/          # UI 组件
│   ├── Icons.tsx           # 图标组件
│   └── Waveform.tsx        # 波形组件
├── types.ts             # TypeScript 类型定义
├── App.tsx              # 根组件
└── index.css            # 全局样式
```

## 状态管理

所有状态集中在 `App.tsx` 中，不使用 Redux 或 Context API：

```typescript
- currentTab: "home" | "library" | "profile"
- showRecording: boolean
- analysisResult: AnalysisData | null
- audioBlob: Blob | null          // 保存录音用于回放
- isAnalyzing: boolean
- error: string | null
```

## 核心功能

### 实时录音

使用原生 MediaRecorder API 录制音频，通过 `useMediaRecorder` Hook 封装：

```typescript
const { isRecording, recordingTime, start, stop } = useMediaRecorder({
  onStop: (blob) => {
    // 发送到后端分析
    api.analyzeAudio(blob);
  },
  onError: (error) => {
    console.error(error);
  },
});
```

**取消录音**: 点击 Cancel 按钮会正确取消录音并返回首页，不会触发 API 分析。

### 音频回放

在结果页面可以回放录音，通过 HTML Audio API 实现：

```typescript
// 播放/暂停按钮切换
// 自动清理 Blob URL 防止内存泄漏
```

### 音频分析

通过 `services/api.ts` 与后端通信：

```typescript
const result = await api.analyzeAudio(audioBlob);
```

### 结果展示

- 时间轴热力图显示检测时间段
- 置信度控制标记透明度
- 自动从 Wikipedia 获取鸟类图片

## 环境配置

创建 `.env` 文件（可选）：

```env
VITE_API_URL=http://localhost:3001
```

## 样式约定

- 使用 Tailwind CSS 工具类
- 颜色主题：绿色系（nature/eco 风格）
- 圆角、阴影营造现代化界面
- 响应式设计

## 图片加载策略

- **首页**: 使用 Wikipedia 100px 缩略图（~2KB）
- **结果页**: 使用 Wikipedia 440px 标准尺寸
- 所有图片都有加载骨架屏和错误回退

## 浏览器兼容性

- Chrome/Android: WebM + Opus
- Firefox: WebM 或 OGG
- Safari/iOS: MP4
- 后端统一转换为 WAV

## 开发注意事项

1. **相对导入**: 所有 API 调用使用 `services/api.ts`
2. **类型同步**: `types.ts` 与后端 `models.py` 保持同步
3. **错误处理**: 所有异步操作都包含错误处理
4. **加载状态**: 使用骨架屏提升用户体验
