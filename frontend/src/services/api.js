const API_BASE_URL = 'http://localhost:5000/api';

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  // Don't set Content-Type for FormData (let browser set it with boundary)
  if (options.body instanceof FormData) {
    delete defaultOptions.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Media API
export const mediaAPI = {
  // Get all media files
  getAll: async () => {
    return await apiRequest('/media');
  },

  // Upload media files
  upload: async (formData) => {
    return await apiRequest('/media/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Delete media file
  delete: async (id) => {
    return await apiRequest(`/media/${id}`, {
      method: 'DELETE',
    });
  },

  // Update media file metadata
  update: async (id, data) => {
    return await apiRequest(`/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Get single media file
  getById: async (id) => {
    return await apiRequest(`/media/${id}`);
  },
};

// Restaurant API
export const restaurantAPI = {
  // Get all restaurants
  getAll: async () => {
    return await apiRequest('/restaurants');
  },

  // Get single restaurant
  getById: async (id) => {
    return await apiRequest(`/restaurants/${id}`);
  },

  // Create restaurant
  create: async (data) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(data).forEach(key => {
      if (key !== 'image_path') {
        formData.append(key, data[key]);
      }
    });

    // Add image file if present
    if (data.image_path && data.image_path instanceof File) {
      formData.append('image_path', data.image_path);
    }

    return await apiRequest('/restaurants', {
      method: 'POST',
      body: formData,
    });
  },

  // Update restaurant
  update: async (id, data) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(data).forEach(key => {
      if (key !== 'image_path') {
        formData.append(key, data[key]);
      }
    });

    // Add image file if present
    if (data.image_path && data.image_path instanceof File) {
      formData.append('image_path', data.image_path);
    }

    return await apiRequest(`/restaurants/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  // Delete restaurant
  delete: async (id) => {
    return await apiRequest(`/restaurants/${id}`, {
      method: 'DELETE',
    });
  },
};

// Dining Events API
export const diningEventsAPI = {
  // Get all dining events
  getAll: async () => {
    return await apiRequest('/dining-events');
  },

  // Get single dining event
  getById: async (id) => {
    return await apiRequest(`/dining-events/${id}`);
  },

  // Create dining event
  create: async (data) => {
    return await apiRequest('/dining-events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update dining event
  update: async (id, data) => {
    return await apiRequest(`/dining-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete dining event
  delete: async (id) => {
    return await apiRequest(`/dining-events/${id}`, {
      method: 'DELETE',
    });
  },
};

// Health check API
export const healthAPI = {
  check: async () => {
    return await apiRequest('/health');
  },
};

// Utility functions
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) {
    return 'image';
  } else if (fileType.startsWith('video/')) {
    return 'video';
  } else if (fileType === 'application/pdf') {
    return 'pdf';
  } else {
    return 'file';
  }
};

export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, JPG, PNG, or GIF image.');
  }

  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload an image smaller than 10MB.');
  }

  return true;
};

export const validateMediaFile = (file) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'video/mp4', 'video/avi', 'video/mov', 'video/webm',
    'application/pdf'
  ];
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image, video, or PDF file.');
  }

  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload a file smaller than 100MB.');
  }

  return true;
};

// Error handling utility
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return defaultMessage;
};

// URL builder utility
export const buildMediaUrl = (filePath) => {
  if (!filePath) return '';
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http')) {
    return filePath;
  }
  
  // Build URL with base server URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  return `${baseUrl}${filePath}`;
};

// Date/time formatting utilities
export const formatTime = (timeString) => {
  if (!timeString) return '';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (error) {
    return timeString;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

// Default export for backward compatibility
export default {
  mediaAPI,
  restaurantAPI,
  diningEventsAPI,
  healthAPI,
  formatFileSize,
  getFileIcon,
  validateImageFile,
  validateMediaFile,
  handleApiError,
  buildMediaUrl,
  formatTime,
  formatDate,
};