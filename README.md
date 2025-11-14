# 有声有色 - 视频分享平台

一个简单的视频分享平台，支持视频上传、播放和管理功能。

## 功能特点

- **首页**：展示视频缩略图网格，点击缩略图跳转到播放页面
- **播放页面**：播放视频，显示视频标题，推荐类似视频
- **管理员页面**：上传视频，编辑视频标题和描述，删除视频

## 技术栈

- **前端**：HTML, CSS (Tailwind CSS), JavaScript
- **后端**：Node.js, Express
- **数据库**：MongoDB
- **云存储**：Cloudinary (用于视频存储和处理)

## 项目结构

```
video-sharing-app/
├── backend/          # 后端代码
│   ├── models/       # 数据模型
│   │   └── Video.js  # 视频模型
│   ├── .env          # 环境变量
│   ├── index.js      # 主服务器文件
│   ├── package.json  # 后端依赖
│   └── ...
├── frontend/         # 前端代码
│   ├── index.html    # 首页
│   ├── play.html     # 视频播放页面
│   ├── admin.html    # 管理员页面
│   └── ...
└── README.md         # 项目说明
```

## 安装与运行

### 前提条件

- Node.js (v14+)
- npm (v6+)
- MongoDB 账户
- Cloudinary 账户

### 安装步骤

1. 克隆项目

```bash
git clone <repository-url>
cd video-sharing-app
```

2. 安装后端依赖

```bash
cd backend
npm install
```

3. 配置环境变量

在 `backend/.env` 文件中配置以下变量：

```env
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.kiqay5i.mongodb.net/?appName=Cluster0
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
PORT=5000
```

4. 运行后端服务器

```bash
npm start
```

5. 运行前端页面

可以使用任何静态文件服务器来运行前端页面，例如：

```bash
# 回到项目根目录
cd ..

# 使用 Python 简单服务器
cd frontend
python -m http.server 3000
```

或者直接在浏览器中打开 `frontend/index.html` 文件。

## 使用说明

### 访问网站

- 首页：`http://localhost:3000/index.html`
- 视频播放页面：`http://localhost:3000/play.html?id=<video-id>`
- 管理员页面：`http://localhost:3000/admin.html`

### 管理员功能

1. **上传视频**：
   - 访问管理员页面
   - 填写视频标题和描述
   - 选择视频文件
   - 点击"上传视频"按钮

2. **编辑视频**：
   - 在管理员页面找到要编辑的视频
   - 点击"编辑"按钮
   - 修改标题和描述
   - 点击"保存"按钮

3. **删除视频**：
   - 在管理员页面找到要删除的视频
   - 点击"删除"按钮
   - 确认删除操作

## API 端点

- **GET /api/videos** - 获取所有视频
- **GET /api/videos/:id** - 获取单个视频
- **POST /api/videos** - 上传新视频
- **PATCH /api/videos/:id** - 更新视频信息
- **DELETE /api/videos/:id** - 删除视频
- **GET /api/videos/:id/recommended** - 获取推荐视频

## 注意事项

- 视频上传大小限制取决于 Cloudinary 账户设置
- 目前没有用户认证系统，任何人都可以访问管理员页面
- 建议在生产环境中添加用户认证和授权功能
- 建议添加视频转码功能，以支持不同设备和网络条件

## 许可证

MIT
