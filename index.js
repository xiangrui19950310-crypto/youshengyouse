// index.js

// 1. 引入 dotenv 并加载 .env 文件中的环境变量
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
// VVV 关键修复：使用解构赋值引入 formidable VVV
const { formidable } = require('formidable'); 
const fs = require('fs'); 
const cors = require('cors'); 
const app = express();
const port = 3000;

// 获取环境变量
const MONGO_URI = process.env.MONGO_URI;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// --- 数据库连接 (MongoDB) ---
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 连接成功！');

    // VVV 在这里添加您的 Video Model 定义 VVV
    const videoSchema = new mongoose.Schema({
        cloudinaryId: {
            type: String,
            required: true,
            unique: true
        },
        title: {
            type: String,
            required: true
        },
        // 存储 Cloudinary 提供的完整 URL
        url: {
            type: String,
            required: true
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    });

    global.Video = mongoose.model('Video', videoSchema);
    console.log('✅ Video Mongoose 模型已定义！');
    // ^^^ 您的 Video Model 定义结束 ^^^

  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    // 退出进程，因为数据库连接是关键
    process.exit(1); 
  }
}

// --- 媒体云配置 (Cloudinary) ---
function configureCloudinary() {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
        console.error('❌ Cloudinary 配置信息不完整，请检查 .env 文件。');
        return;
    }
    
    cloudinary.config({
        cloud_name: CLOUD_NAME,
        api_key: API_KEY,
        api_secret: API_SECRET,
        secure: true // 推荐使用 HTTPS
    });
    console.log('✅ Cloudinary 配置成功！');
}


// --- 启动函数 ---
async function startServer() {
  // 尝试连接数据库
  await connectDB();
  
  // 配置 Cloudinary
  configureCloudinary();

  // VVV 启用 CORS 中间件 VVV
  app.use(cors()); 

  // Middleware for parsing JSON body
  app.use(express.json()); 

  // Simple GET route
  app.get('/', (req, res) => {
    res.send('Backend is running and services are connected!');
  });
  
  // ------------------------------------------------------------------
  // *** 视频管理后台路由 (Video Admin Routes) ***
  // ------------------------------------------------------------------

  // 1. **获取所有视频列表** (Read All)
  app.get('/admin/videos', async (req, res) => {
      try {
          const videos = await global.Video.find().sort({ uploadDate: -1 });
          res.status(200).json({
              message: '视频列表获取成功',
              videos: videos
          });
      } catch (error) {
          console.error('获取视频列表失败:', error);
          res.status(500).json({ message: '服务器错误，无法获取视频列表' });
      }
  });

  // 2. **上传新视频** (Create)
  app.post('/admin/videos', (req, res) => {
      // ** formidable 现在是构造函数，可以正常调用 **
      const form = formidable({ 
          multiples: false, 
          maxFileSize: 200 * 1024 * 1024 
      });

      form.parse(req, async (err, fields, files) => {
          if (err) {
              console.error('文件解析错误:', err);
              return res.status(400).json({ message: '文件解析失败' });
          }
          
          const videoFile = files.videoFile && files.videoFile[0];
          const title = fields.title && fields.title[0];

          if (!videoFile || !title) {
              return res.status(400).json({ message: '缺少视频文件或标题' });
          }

          try {
              // 1. 上传到 Cloudinary
              const uploadResult = await cloudinary.uploader.upload(videoFile.filepath, {
                  resource_type: "video", 
                  folder: "admin_videos", 
              });

              // 2. 保存到 MongoDB
              const newVideo = new global.Video({
                  cloudinaryId: uploadResult.public_id,
                  title: title,
                  url: uploadResult.secure_url 
              });
              await newVideo.save();

              // 3. 清理本地临时文件
              fs.unlinkSync(videoFile.filepath);

              res.status(201).json({
                  message: '视频上传并保存成功',
                  video: newVideo
              });

          } catch (uploadError) {
              console.error('Cloudinary/MongoDB 操作失败:', uploadError);
              if (videoFile && fs.existsSync(videoFile.filepath)) {
                  fs.unlinkSync(videoFile.filepath);
              }
              res.status(500).json({ message: '视频上传或数据库保存失败', error: uploadError.message });
          }
      });
  });


  // 3. **编辑视频标题** (Update)
  app.put('/admin/videos/:id', async (req, res) => {
      const { id } = req.params; 
      const { title } = req.body;

      if (!title) {
          return res.status(400).json({ message: '缺少新的视频标题' });
      }
      
      try {
          const video = await global.Video.findByIdAndUpdate(
              id,
              { $set: { title: title } },
              { new: true, runValidators: true } 
          );

          if (!video) {
              return res.status(404).json({ message: '未找到该视频' });
          }

          res.status(200).json({
              message: '视频标题更新成功',
              video: video
          });
      } catch (error) {
          console.error('更新视频标题失败:', error);
          res.status(500).json({ message: '服务器错误，无法更新视频标题' });
      }
  });


  // 4. **删除视频** (Delete)
  app.delete('/admin/videos/:id', async (req, res) => {
      const { id } = req.params; 
      
      try {
          // 1. 从 MongoDB 查找并删除
          const video = await global.Video.findByIdAndDelete(id);

          if (!video) {
              return res.status(404).json({ message: '未找到该视频' });
          }
          
          // 2. 从 Cloudinary 删除
          const cloudinaryId = video.cloudinaryId;
          const deleteResult = await cloudinary.uploader.destroy(cloudinaryId, {
              resource_type: "video" 
          });
          
          res.status(200).json({
              message: '视频删除成功',
              deletedVideoId: id,
              cloudinaryResult: deleteResult
          });
          
      } catch (error) {
          console.error('删除视频失败:', error);
          res.status(500).json({ message: '服务器错误，无法删除视频' });
      }
  });

  // 5. **获取单个视频详情** (Read One) - 【新增路由】
  app.get('/admin/videos/:id', async (req, res) => {
      const { id } = req.params; 
      try {
          const video = await global.Video.findById(id);

          if (!video) {
              return res.status(404).json({ message: '未找到该视频' });
          }

          res.status(200).json({
              message: '视频详情获取成功',
              video: video
          });
      } catch (error) {
          console.error('获取单个视频详情失败:', error);
          // 对于无效的 MongoDB ID，Mongoose 会抛出 CastError，返回 400 更合适
          const statusCode = error.name === 'CastError' ? 400 : 500;
          res.status(statusCode).json({ message: '服务器错误或ID格式无效', error: error.message });
      }
  });
  
  // ------------------------------------------------------------------

  // Start the server
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

// 运行启动函数
startServer();