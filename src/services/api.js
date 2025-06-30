// FIXED apiService.js
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Media file methods
  async getMediaFiles() {
    return this.request('/media');
  }

  // FIXED: Upload method with better error handling and debugging
  async uploadMediaFiles(files, settings) {
    const formData = new FormData();
    
    // Validate files
    if (!files || files.length === 0) {
      throw new Error('No files selected for upload');
    }

    // Append files with validation
    Array.from(files).forEach((file, index) => {
      if (!file || !file.name) {
        throw new Error(`Invalid file at index ${index}`);
      }
      console.log(`Adding file ${index + 1}:`, file.name, file.type, file.size);
      formData.append('files', file);
    });

    // Append settings as individual fields instead of JSON string
    if (settings) {
      Object.keys(settings).forEach(key => {
        if (settings[key] !== null && settings[key] !== undefined && settings[key] !== '') {
          console.log(`Adding setting: ${key} = ${settings[key]}`);
          formData.append(key, settings[key]);
        }
      });
    }

    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    try {
      const response = await fetch(`${this.baseURL}/media/upload`, {
        method: 'POST',
        // Don't set Content-Type header - let browser set it with boundary
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async updateMediaFile(id, data) {
    return this.request(`/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMediaFile(id) {
    return this.request(`/media/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleMediaFileStatus(id) {
    return this.request(`/media/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;