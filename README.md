# MPRIS Now Playing for OBS

将 MPRIS 播放器的当前播放信息转换为 OBS 可用的 overlay。

## 功能特点

- 支持任何支持 MPRIS 的音乐播放器（YesPlayMusic、Spotify、VLC 等）
- 提供简单的 HTTP API 获取当前播放信息
- 包含 OBS overlay 页面，可直接使用
- 支持专辑封面显示
- 长歌曲名和艺术家名自动滚动

## 安装

### 依赖

- Node.js 14+
- 支持 MPRIS 的音乐播放器（推荐使用Yesplaymusic）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/LCY-Official/mpris-nowplaying.git
cd mpris-nowplaying

# 安装依赖
cd mpris-proxy
npm install

```

## 使用

### 启动代理

```bash
# 普通模式
npm start

# 调试模式（显示详细日志）
npm run dev

```

### 启动 HTTP 服务器

```bash

cd ../overlay
python3 -m http.server 8000

```

## 在 OBS 中使用

添加浏览器源
URL: http://localhost:8000/overlay.html
宽度: 350px
高度: 70px
