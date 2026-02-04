# Chrome DevTools 截长图指南

## 推荐方法：移除高度限制 + 全页截图

这是最简单可靠的方法，一次截图完成，无需拼接。

### 步骤

**1. 打开页面**
```javascript
mcp__chrome-devtools__new_page(url="file://...或https://...")
```

**2. 移除高度限制（关键）**
```javascript
mcp__chrome-devtools__evaluate_script({
  function: `async () => {
    // 移除根元素高度限制
    const root = document.getElementById('root');
    if (root) {
      root.style.height = 'auto';
      root.classList.remove('h-screen');
    }

    // 移除 body 高度限制
    document.body.style.height = 'auto';
    document.body.style.overflow = 'auto';

    // 移除 html 高度限制
    document.documentElement.style.height = 'auto';

    // 等待页面重新计算
    await new Promise(r => setTimeout(r, 500));

    return {
      scrollHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight
    };
  }`
})
```

**3. 截取全页**
```javascript
mcp__chrome-devtools__take_screenshot({
  filePath: "/path/to/output.png",
  format: "png",
  fullPage: true  // 关键参数
})
```

**优点**：
- ✅ 一次截图完成，无需拼接
- ✅ 无内容重叠风险
- ✅ 适用于大多数页面

---

## 备选方法：分段截图 + 拼接

如果 `fullPage` 失效，或页面结构特殊，可使用此方法。

**⚠️ 警告：此方法容易产生内容重叠或间隙，仅作为备选方案**

### 步骤 1：检查滚动容器

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `async () => {
    const main = document.querySelector('main');
    return {
      scrollHeight: main.scrollHeight,
      clientHeight: main.clientHeight,
      needsScroll: main.scrollHeight > main.clientHeight
    };
  }`
})
```

### 步骤 2：截取多个部分

**⚠️ 滚动位置计算困难，容易出错**

```javascript
// 第一张：顶部
mcp__chrome_devtools__evaluate_script({ function: "() => { document.querySelector('main').scrollTop = 0; }" })
mcp__chrome_devtools__take_screenshot({ filePath: "part1.png" })

// 第二张：底部（位置难以精确计算）
mcp__chrome_devtools__evaluate_script({
  function: "() => { const m = document.querySelector('main'); m.scrollTop = m.scrollHeight - m.clientHeight; }"
})
mcp__chrome_devtools__take_screenshot({ filePath: "part2.png" })
```

**问题**：
- 第二张截图的滚动位置难以精确计算
- 稍有偏差就会导致内容重叠或有间隙
- sticky header 会使每张截图都包含 header

### 步骤 3：用 Python 拼接

由于每张截图都包含 sticky header，需要裁剪后拼接：

```bash
cd server
source .venv/bin/activate
python -c "
from PIL import Image

img1 = Image.open('part1.png')
img2 = Image.open('part2.png')

# 裁剪第二张的 header
header_height = 73
img2_cropped = img2.crop((0, header_height, img2.width, img2.height))

# 拼接
width, height1 = img1.size
_, height2 = img2_cropped.size
result = Image.new('RGB', (width, height1 + height2))
result.paste(img1, (0, 0))
result.paste(img2_cropped, (0, height1))
result.save('merged.png')
"
```

**仍然存在的问题**：
- 如果滚动位置不准确，内容仍有重叠/间隙
- 需要手动测量 header 高度

**建议**：优先使用方法一（移除高度限制）

### 步骤 1：检查滚动容器

```javascript
mcp__chrome-devtools__evaluate_script({
  function: `async () => {
    const main = document.querySelector('main');
    return {
      scrollHeight: main.scrollHeight,
      clientHeight: main.clientHeight,
      needsScroll: main.scrollHeight > main.clientHeight
    };
  }`
})
```

### 步骤 2：截取多个部分

**⚠️ 重要：正确计算滚动位置**

```javascript
// 首先获取滚动参数
mcp__chrome_devtools__evaluate_script({
  function: `async () => {
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const headerHeight = header?.offsetHeight || 73;
    const contentHeight = main.clientHeight - headerHeight;  // 每次截图的内容高度

    return {
      headerHeight,
      contentHeight,
      scrollHeight: main.scrollHeight,
      numScreenshots: Math.ceil(main.scrollHeight / contentHeight)
    };
  }`
})

// 第一张：顶部（完整截图）
mcp__chrome_devtools__evaluate_script({ function: "() => { document.querySelector('main').scrollTop = 0; }" })
await new Promise(r => setTimeout(r, 300))  // 等待滚动完成
mcp__chrome_devtools__take_screenshot({ filePath: "part1.png" })

// 第二张：滚动到第一张内容结束位置
mcp__chrome_devtools__evaluate_script({
  function: "() => { const m = document.querySelector('main'); const h = document.querySelector('header')?.offsetHeight || 73; m.scrollTop = m.clientHeight - h; }"
})
await new Promise(r => setTimeout(r, 300))
mcp__chrome_devtools__take_screenshot({ filePath: "part2.png" })
```

**关键点**：
- 第二张截图的 `scrollTop` = `clientHeight - headerHeight`
- 这样第二张的起始内容刚好是第一张的结束内容
- 每张截图的内容高度 = `clientHeight - headerHeight`

### 步骤 3：用 Python 拼接

**⚠️ 注意：确保使用正确的 Python 环境**

```bash
cd server
source .venv/bin/activate
uv pip install Pillow  # 如果还没安装

python -c "
from PIL import Image

img1 = Image.open('part1.png')
img2 = Image.open('part2.png')

# 裁剪第二张的 header
header_height = 73
img2_cropped = img2.crop((0, header_height, img2.width, img2.height))

# 拼接
width, height1 = img1.size
_, height2 = img2_cropped.size
result = Image.new('RGB', (width, height1 + height2))
result.paste(img1, (0, 0))
result.paste(img2_cropped, (0, height1))
result.save('merged.png')
"
```

---

## 常见问题

### Q: fullPage 截图内容不完整？

**原因**: 页面使用了 CSS 高度限制（`h-screen`, `overflow-hidden`）

**解决**: 执行步骤 3 移除限制

### Q: 页面有粘性头部导致拼接错位？

**解决**: 在拼接时裁剪掉第二张图的 header

但这仍无法解决滚动位置计算不准确导致的重叠/间隙问题。

### Q: 分段截图拼接有内容重叠？

**原因**: 滚动位置计算不准确

每张截图的滚动位置需要精确计算：
- 第 N 张的 scrollTop = (clientHeight - headerHeight) × (N-1)

稍有偏差就会导致：
- scrollTop 太小 → 内容重叠
- scrollTop 太大 → 内容间隙

**解决**：优先使用方法一（移除高度限制 + fullPage）

### Q: 图片太大无法加载？

**解决**: 使用 JPEG 格式压缩，或分段截图

```javascript
mcp__chrome_devtools__take_screenshot({
  format: "jpeg",
  quality: 80
})
```

### Q: Python 拼接报错 `ModuleNotFoundError: No module named 'PIL'`？

**原因**: Python 版本不匹配

安装 Pillow 的 Python 和运行脚本的 Python 不是同一个版本：
```bash
# uv pip 默认使用 Python 3.8.5
uv pip install Pillow  ✓ 安装到 3.8.5

# 但 python3 命令指向 3.13.x
python3 -c "from PIL import Image"  ✗ 找不到模块
```

**解决**:
1. **使用项目虚拟环境**（推荐）：
   ```bash
   cd server
   source .venv/bin/activate
   uv pip install Pillow
   python -c "from PIL import Image"
   ```

2. **或指定 Python 版本安装**：
   ```bash
   python3 -m pip install Pillow --user
   ```

3. **或检查当前 Python 版本**：
   ```bash
   which python3    # 查看 python3 路径
   python3 --version
   ```
