require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary');
const cors = require('cors');
const multer = require('multer');
const path = require('path'); // 新增：导入path模块

// 导入 CloudinaryStorage
const CloudinaryStorage = require('multer-storage-cloudinary'); 

const Video = require('./models/Video');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 检查 Cloudinary 配置是否加载成功
const cloudName = cloudinary.config().cloud_name;
if (!cloudName) {
    console.error('❌ Cloudinary 配置失败！请检查 .env 文件中的 CLOUDINARY_CLOUD_NAME, API_KEY 和 API_SECRET 是否正确设置。');
} else {
    console.log(`✅ Cloudinary 已配置。Cloud Name: ${cloudName}`);
}

// Configure Multer for file upload
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'videos',
    resource_type: 'video',
    format: 'mp4',
    transformation: [{ quality: 'auto' }]
  }
});

const upload = multer({ storage: storage });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// API Routes
// Get all videos
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    console.error('Error in GET /api/videos:', err); 
    res.status(500).json({ message: err.message });
  }
});

// Get a single video
app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  } catch (err) {
    console.error('Error in GET /api/videos/:id:', err); 
    res.status(500).json({ message: err.message });
  }
});

// Upload a video
app.post('/api/videos', upload.single('video'), async (req, res) => {
    try {
        if (!req.file || !req.file.public_id) {
            return res.status(500).json({ message: "文件上传到 Cloudinary 失败，请检查中间件配置或网络连接。" });
        }

        const videoUrl = req.file.url || req.file.secure_url; 
        
        if (!videoUrl) {
            console.error('Cloudinary upload success, but req.file.url/secure_url is missing.');
            return res.status(500).json({ message: "上传成功，但无法获取 Cloudinary URL。" });
        }

        const thumbnailUrl = cloudinary.url(req.file.public_id, {
            resource_type: 'video',
            format: 'jpg',
            transformation: [{ width: 300, height: 200, crop: 'fill' }]
        });

        const video = new Video({
            title: req.body.title,
            description: req.body.description || '',
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl,
            publicId: req.file.public_id
        });

        await video.save();
        res.status(201).json(video);
    } catch (err) {
        console.error('FATAL ERROR in POST /api/videos:', err);
        res.status(500).json({ message: err.message || "内部服务器错误" });
    }
});

// Update a video title
app.patch('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (req.body.title) {
      video.title = req.body.title;
    }

    if (req.body.description) {
      video.description = req.body.description;
    }

    await video.save();
    res.json(video);
  } catch (err) {
    console.error('Error in PATCH /api/videos/:id:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete a video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' });

    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: 'Video deleted' });
  } catch (err) {
    console.error('Error in DELETE /api/videos/:id:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get recommended videos (excluding current video)
app.get('/api/videos/:id/recommended', async (req, res) => {
  try {
    const videos = await Video.find({ _id: { $ne: req.params.id } })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(videos);
  } catch (err) {
    console.error('Error in GET /api/videos/:id/recommended:', err);
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------
// 🎯 静态文件托管配置（优先匹配静态文件）
// ----------------------------------------------------
// 托管前端静态文件（HTML、CSS、JS等）
app.use(express.static(path.join(__dirname, '../frontend')));

// ----------------------------------------------------
// 🎯 兜底路由：所有未匹配的请求都返回 index.html（解决单页应用路由问题）
// （兼容旧版 path-to-regexp，用 '(.*)' 替代 '*'）
// ----------------------------------------------------
app.get('(.*)', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ----------------------------------------------------
// 🎯 错误处理中间件 (必须放在所有路由之后！)
// ----------------------------------------------------
app.use((err, req, res, next) => {
    // 检查错误是否来自 Multer
    if (err instanceof multer.MulterError) {
        console.error('❌ MULTER ERROR:', err.message);
        return res.status(500).json({ message: `文件上传中间件失败: ${err.message}` });
    }
    // 处理其他可能来自 CloudinaryStorage 的错误
    if (err) {
        console.error('❌ UNCAUGHT MIDDLEWARE ERROR:', err);
        return res.status(500).json({ message: err.message || '未捕获的服务器中间件错误' });
    }
    next();
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));