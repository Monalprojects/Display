const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Admin@1234',
  database: process.env.DB_NAME || 'signage_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  dest: 'backend/uploads',
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|webm|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and PDF files are allowed'));
    }
  }
});

// Default password function (no hashing)
const defaultPassword = (password) => {
  return password; // Return password as-is without hashing
};

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Media files table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS media_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        url VARCHAR(500) NOT NULL,
        size BIGINT NOT NULL,
        duration INT DEFAULT 5,
        priority INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        start_date DATE,
        end_date DATE,
        upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create default admin user
    const defaultUsername = 'admin';
    const defaultPass = defaultPassword('admin123');
    
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?', 
      [defaultUsername]
    );
    
    if (rows.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
        [defaultUsername, defaultPass, 'admin']
      );
      console.log('Default admin user created');
    }

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    process.exit(1);
  }
}

// Test database connection and initialize
async function connectToDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();
    await initializeDatabase();
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    console.error('Please make sure MySQL is running and the database exists');
    process.exit(1);
  }
}

// Initialize database connection
connectToDatabase();

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Compare password directly (no hashing)
    if (password === user.password) {
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Database error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Media Files Routes

// Get all media files
app.get('/api/media', async (req, res) => {
  const query = `
    SELECT 
      id, name, original_name, type, file_path, url, size, 
      duration, priority, status, start_date, end_date, upload_time
    FROM media_files 
    ORDER BY upload_time DESC
  `;
  
  try {
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching media files:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload media files
app.post('/api/media/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Parse settings from form data
    let settings = {};
    try {
      if (req.body.settings) {
        settings = JSON.parse(req.body.settings);
      }
    } catch (e) {
      console.error('Error parsing settings:', e);
      // Fallback to individual fields
      settings = {
        duration: req.body.duration || 30,
        priority: req.body.priority || 0,
        startDate: req.body.startDate || null,
        endDate: req.body.endDate || null
      };
    }

    const { duration = 30, priority = 0, startDate, endDate } = settings;

    const insertPromises = req.files.map(async (file) => {
      console.log('Processing file:', file.filename);
      
      let fileType = 'unknown';
if (file.mimetype.startsWith('image/')) {
  fileType = 'image';
} else if (file.mimetype.startsWith('video/')) {
  fileType = 'video';
} else if (file.mimetype === 'application/pdf') {
  fileType = 'pdf';
}

      const fileUrl = `http://localhost:5000/uploads/${file.filename}`;

      const query = `
        INSERT INTO media_files 
        (name, original_name, type, file_path, url, size, duration, priority, status, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `;
      
      try {
        const [result] = await pool.execute(query, [
          file.filename,
          file.originalname,
          fileType,
          file.path,
          fileUrl,
          file.size,
          parseInt(duration),
          parseInt(priority),
          startDate || null,
          endDate || null
        ]);

        console.log('File inserted with ID:', result.insertId);
        return {
          id: result.insertId,
          name: file.filename,
          original_name: file.originalname,
          type: fileType,
          url: fileUrl,
          size: file.size,
          duration: parseInt(duration),
          priority: parseInt(priority),
          status: 'active',
          start_date: startDate || null,
          end_date: endDate || null,
          upload_time: new Date().toISOString()
        };
      } catch (error) {
        console.error('Database insertion error:', error);
        throw error;
      }
    });

    const results = await Promise.all(insertPromises);
    console.log('All files processed successfully:', results.length);
    res.json({
      success: true,
      files: results
    });

  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Update media file - ENHANCED VERSION with partial updates
app.put('/api/media/:id', async (req, res) => {
  const { id } = req.params;
  const { duration, priority, start_date, end_date, status } = req.body;

  // Validate ID
  const mediaId = parseInt(id);
  if (isNaN(mediaId)) {
    return res.status(400).json({ error: 'Invalid media ID' });
  }

  try {
    // First, get the current record to handle partial updates
    const [currentRows] = await pool.execute(
      'SELECT duration, priority, start_date, end_date, status FROM media_files WHERE id = ?',
      [mediaId]
    );

    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const currentData = currentRows[0];

    // Use existing values if new ones are not provided
    const safeDuration = duration !== undefined && duration !== null ? parseInt(duration) : currentData.duration;
    const safePriority = priority !== undefined && priority !== null ? parseInt(priority) : currentData.priority;
    const safeStartDate = start_date !== undefined ? (start_date || null) : currentData.start_date;
    const safeEndDate = end_date !== undefined ? (end_date || null) : currentData.end_date;
    const safeStatus = status !== undefined && status !== null ? status : currentData.status;

    // Validate numeric values
    if (isNaN(safeDuration) || safeDuration < 1) {
      return res.status(400).json({ error: 'Duration must be a positive number' });
    }

    if (isNaN(safePriority)) {
      return res.status(400).json({ error: 'Priority must be a number' });
    }

    // Validate status
    if (!['active', 'inactive'].includes(safeStatus)) {
      return res.status(400).json({ error: 'Status must be either "active" or "inactive"' });
    }

    const query = `
      UPDATE media_files 
      SET duration = ?, priority = ?, start_date = ?, end_date = ?, status = ?
      WHERE id = ?
    `;

    const [result] = await pool.execute(query, [
      safeDuration,
      safePriority,
      safeStartDate,
      safeEndDate,
      safeStatus,
      mediaId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    // Return the updated data
    const [updatedRows] = await pool.execute(
      'SELECT id, name, original_name, type, file_path, url, size, duration, priority, status, start_date, end_date, upload_time FROM media_files WHERE id = ?',
      [mediaId]
    );

    res.json({ 
      success: true, 
      data: updatedRows[0] 
    });

  } catch (error) {
    console.error('Error updating media file:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete media file
app.delete('/api/media/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // First get the file info to delete the physical file
    const [rows] = await pool.execute(
      'SELECT file_path FROM media_files WHERE id = ?', 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const filePath = rows[0].file_path;

    // Delete from database
    const [result] = await pool.execute('DELETE FROM media_files WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting physical file:', err.message);
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting media file:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle media file status
app.patch('/api/media/:id/toggle-status', async (req, res) => {
  const { id } = req.params;

  try {
    // First get current status
    const [rows] = await pool.execute(
      'SELECT status FROM media_files WHERE id = ?', 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    const newStatus = rows[0].status === 'active' ? 'inactive' : 'active';

    const [result] = await pool.execute(
      'UPDATE media_files SET status = ? WHERE id = ?', 
      [newStatus, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Error updating status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Unexpected error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  try {
    await pool.end();
    console.log('Database connection pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
  }
  process.exit(0);
});