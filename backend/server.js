const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const ensureUploadDir = async () => {
  try {
    await fs.access(path.join(__dirname, 'uploads'));
  } catch {
    await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
  }
};

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Admin@1234',
  database: process.env.DB_NAME || 'restaurant_admin',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|webm|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, videos, and PDF files are allowed'));
    }
  }
});

// Utility function to handle database errors
const handleDbError = (error, res, message = 'Database error') => {
  console.error(message + ':', error);
  res.status(500).json({ error: message, details: error.message });
};

// RESTAURANTS API ROUTES

// Get all restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM restaurants ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    handleDbError(error, res, 'Error fetching restaurants');
  }
});

// Get single restaurant
app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    handleDbError(error, res, 'Error fetching restaurant');
  }
});

// Create restaurant
app.post('/api/restaurants', upload.single('image_path'), async (req, res) => {
  try {
    const { name, start_time, end_time, description, cuisine, rating } = req.body;
    
    // Validate required fields
    if (!name || !start_time || !end_time || !cuisine) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    const [result] = await pool.execute(
      'INSERT INTO restaurants (name, start_time, end_time, description, cuisine, rating, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, start_time, end_time, description || '', cuisine, rating || 5, imagePath]
    );

    // Fetch the created restaurant
    const [newRestaurant] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newRestaurant[0]);
  } catch (error) {
    handleDbError(error, res, 'Error creating restaurant');
  }
});

// Update restaurant
app.put('/api/restaurants/:id', upload.single('image_path'), async (req, res) => {
  try {
    const { name, start_time, end_time, description, cuisine, rating } = req.body;
    const restaurantId = req.params.id;

    // Check if restaurant exists
    const [existing] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    let imagePath = existing[0].image_path;
    if (req.file) {
      // Delete old image if it exists
      if (existing[0].image_path) {
        try {
          await fs.unlink(path.join(__dirname, existing[0].image_path));
        } catch (err) {
          console.log('Could not delete old image:', err.message);
        }
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    await pool.execute(
      'UPDATE restaurants SET name = ?, start_time = ?, end_time = ?, description = ?, cuisine = ?, rating = ?, image_path = ? WHERE id = ?',
      [name, start_time, end_time, description || '', cuisine, rating || 5, imagePath, restaurantId]
    );

    // Fetch updated restaurant
    const [updatedRestaurant] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    res.json(updatedRestaurant[0]);
  } catch (error) {
    handleDbError(error, res, 'Error updating restaurant');
  }
});

// Delete restaurant
app.delete('/api/restaurants/:id', async (req, res) => {
  try {
    const restaurantId = req.params.id;

    // Get restaurant details for file cleanup
    const [restaurant] = await pool.execute(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (restaurant.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Delete associated image file
    if (restaurant[0].image_path) {
      try {
        await fs.unlink(path.join(__dirname, restaurant[0].image_path));
      } catch (err) {
        console.log('Could not delete image file:', err.message);
      }
    }

    // Delete restaurant
    await pool.execute('DELETE FROM restaurants WHERE id = ?', [restaurantId]);

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'Error deleting restaurant');
  }
});

// DINING EVENTS API ROUTES

// Get all dining events
app.get('/api/dining-events', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM dining_events ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    handleDbError(error, res, 'Error fetching dining events');
  }
});

// Get single dining event
app.get('/api/dining-events/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM dining_events WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Dining event not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    handleDbError(error, res, 'Error fetching dining event');
  }
});

// Create dining event
app.post('/api/dining-events', async (req, res) => {
  try {
    const { eventname, cuisine, start_time, end_time, day, restaurant_id } = req.body;

    // Validate required fields
    if (!eventname || !cuisine || !start_time || !end_time || !day) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      'INSERT INTO dining_events (eventname, cuisine, start_time, end_time, day, restaurant_id) VALUES (?, ?, ?, ?, ?, ?)',
      [eventname, cuisine, start_time, end_time, day, restaurant_id || null]
    );

    // Fetch the created dining event
    const [newEvent] = await pool.execute(
      'SELECT * FROM dining_events WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newEvent[0]);
  } catch (error) {
    handleDbError(error, res, 'Error creating dining event');
  }
});

// Update dining event
app.put('/api/dining-events/:id', async (req, res) => {
  try {
    const { eventname, cuisine, start_time, end_time, day, restaurant_id } = req.body;
    const eventId = req.params.id;

    // Check if event exists
    const [existing] = await pool.execute(
      'SELECT * FROM dining_events WHERE id = ?',
      [eventId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Dining event not found' });
    }

    await pool.execute(
      'UPDATE dining_events SET eventname = ?, cuisine = ?, start_time = ?, end_time = ?, day = ?, restaurant_id = ? WHERE id = ?',
      [eventname, cuisine, start_time, end_time, day, restaurant_id || null, eventId]
    );

    // Fetch updated event
    const [updatedEvent] = await pool.execute(
      'SELECT * FROM dining_events WHERE id = ?',
      [eventId]
    );

    res.json(updatedEvent[0]);
  } catch (error) {
    handleDbError(error, res, 'Error updating dining event');
  }
});

// Delete dining event
app.delete('/api/dining-events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM dining_events WHERE id = ?',
      [eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Dining event not found' });
    }

    res.json({ message: 'Dining event deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'Error deleting dining event');
  }
});

// MEDIA FILES API ROUTES

// Get all media files
app.get('/api/media', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM media_files ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    handleDbError(error, res, 'Error fetching media files');
  }
});

// Upload media files
app.post('/api/media/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const location = req.body.locations ? req.body.locations[i] : '';
      const restaurant = req.body.restaurants ? req.body.restaurants[i] : '';
      const mediaType = req.body.mediaTypes ? req.body.mediaTypes[i] : '';

      const [result] = await pool.execute(
        'INSERT INTO media_files (name, original_name, file_path, file_type, file_size, location, restaurant, media_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          file.filename,
          file.originalname,
          `/uploads/${file.filename}`,
          file.mimetype,
          file.size,
          location || '',
          restaurant || '',
          mediaType || ''
        ]
      );

      // Fetch the created media file
      const [newFile] = await pool.execute(
        'SELECT * FROM media_files WHERE id = ?',
        [result.insertId]
      );

      uploadedFiles.push(newFile[0]);
    }

    res.status(201).json(uploadedFiles);
  } catch (error) {
    handleDbError(error, res, 'Error uploading media files');
  }
});

// Delete media file
app.delete('/api/media/:id', async (req, res) => {
  try {
    const mediaId = req.params.id;

    // Get media file details for file cleanup
    const [mediaFile] = await pool.execute(
      'SELECT * FROM media_files WHERE id = ?',
      [mediaId]
    );

    if (mediaFile.length === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    // Delete physical file
    if (mediaFile[0].file_path) {
      try {
        await fs.unlink(path.join(__dirname, mediaFile[0].file_path));
      } catch (err) {
        console.log('Could not delete media file:', err.message);
      }
    }

    // Delete from database
    await pool.execute('DELETE FROM media_files WHERE id = ?', [mediaId]);

    res.json({ message: 'Media file deleted successfully' });
  } catch (error) {
    handleDbError(error, res, 'Error deleting media file');
  }
});

// Update media file metadata
app.put('/api/media/:id', async (req, res) => {
  try {
    const { location, restaurant, media_type } = req.body;
    const mediaId = req.params.id;

    // Check if media file exists
    const [existing] = await pool.execute(
      'SELECT * FROM media_files WHERE id = ?',
      [mediaId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Media file not found' });
    }

    await pool.execute(
      'UPDATE media_files SET location = ?, restaurant = ?, media_type = ? WHERE id = ?',
      [location || '', restaurant || '', media_type || '', mediaId]
    );

    // Fetch updated media file
    const [updatedFile] = await pool.execute(
      'SELECT * FROM media_files WHERE id = ?',
      [mediaId]
    );

    res.json(updatedFile[0]);
  } catch (error) {
    handleDbError(error, res, 'Error updating media file');
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize server
const startServer = async () => {
  try {
    await ensureUploadDir();
    await testConnection();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server...');
  await pool.end();
  process.exit(0);
});

module.exports = async (req, res) => {
  await ensureUploadDir();
  await testConnection();
  return app(req, res);
};
