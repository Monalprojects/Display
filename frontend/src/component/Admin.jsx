import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Monitor, Search, ToggleLeft, ToggleRight, ArrowRight, Save, X as CancelIcon, Play, Pause, SkipForward, SkipBack,
  ExternalLink, FileImage, FileVideo, FileText, Edit2, Check, AlertCircle, Loader, Maximize, Volume2, VolumeX, MapPin, 
  UtensilsCrossed, Calendar, Clock, Star, Plus, Trash2, Eye } from 'lucide-react';
import './Admin.css';
import logo from '../assets/FinalLogo.png';
import { mediaAPI, restaurantAPI, diningEventsAPI } from '../services/api';

const truncateFileName = (name, maxLength = 30) => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 3) + '...';
};

const RestaurantForm = ({ onClose, onSave, restaurant = null }) => {
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    start_time: restaurant?.start_time || '',
    end_time: restaurant?.end_time || '',
    description: restaurant?.description || '',
    cuisine: restaurant?.cuisine || '',
    rating: restaurant?.rating || 5,
    image_path: restaurant?.image_path || ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(restaurant?.image_path || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeleteMedia = async (id) => {
  if (window.confirm('Are you sure you want to delete this media file?')) {
    try {
      await mediaAPI.delete(id);
      showNotification('success', 'Media file deleted successfully!');
      fetchMediaFiles(); // Refresh the media list
    } catch (error) {
      console.error('Error deleting media file:', error);
      showNotification('error', error.message || 'Failed to delete media file');
    }
  }
};
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.start_time || !formData.end_time || !formData.cuisine) {
      alert('Please fill in all required fields');
      return;
    }

    // If editing and no new file selected, check if we have existing image
    if (restaurant && !selectedFile && !restaurant.image_path) {
      alert('Please select an image');
      return;
    }

    // If adding new restaurant, file is required
    if (!restaurant && !selectedFile) {
      alert('Please select an image');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create a copy of formData
      const dataToSend = { ...formData };
      
      // If there's a selected file, set it as image_path for upload
      if (selectedFile) {
        dataToSend.image_path = selectedFile;
      }
      
      await onSave(dataToSend);
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
    }
  };

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{restaurant ? 'Edit Restaurant' : 'Add Restaurant'}</h3>
          <button onClick={onClose} className="btn-close" disabled={isSubmitting}>
            <CancelIcon size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="restaurant-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Restaurant Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="form-input"
                placeholder="Enter restaurant name"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cuisine Type *</label>
              <input
                type="text"
                value={formData.cuisine}
                onChange={(e) => handleChange('cuisine', e.target.value)}
                className="form-input"
                placeholder="Enter cuisine type"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Opening Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Closing Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rating</label>
              <select
                value={formData.rating}
                onChange={(e) => handleChange('rating', parseInt(e.target.value))}
                className="form-input"
                disabled={isSubmitting}
              >
                <option value={1}>1 Star</option>
                <option value={2}>2 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={5}>5 Stars</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Image Upload *</label>
              <input
                type="file"
                onChange={handleImageUpload}
                className="form-input"
                accept="image/*"
                disabled={isSubmitting}
              />
              {previewUrl && (
                <img src={previewUrl} alt="Restaurant preview" className="image-preview" />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="form-textarea"
              placeholder="Enter restaurant description"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? <Loader size={16} className="spinner" /> : <Save size={16} />}
              {isSubmitting ? 'Saving...' : (restaurant ? 'Update Restaurant' : 'Add Restaurant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const DiningEventForm = ({ onClose, onSave, diningEvent = null, restaurants = [] }) => {
  const [formData, setFormData] = useState({
    eventname: diningEvent?.eventname || '',
    cuisine: diningEvent?.cuisine || '',
    start_time: diningEvent?.start_time || '',
    end_time: diningEvent?.end_time || '',
    day: diningEvent?.day || '',
    restaurant_id: diningEvent?.restaurant_id || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.eventname || !formData.cuisine || !formData.start_time || !formData.end_time || !formData.day) {
      alert('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{diningEvent ? 'Edit Dining Event' : 'Add Dining Event'}</h3>
          <button onClick={onClose} className="btn-close" disabled={isSubmitting}>
            <CancelIcon size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="dining-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input
                type="text"
                value={formData.eventname}
                onChange={(e) => handleChange('eventname', e.target.value)}
                className="form-input"
                placeholder="Enter event name"
                
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Restaurant</label>
              <select
                value={formData.restaurant_id}
                onChange={(e) => handleChange('restaurant_id', e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              >
                <option value="">Select restaurant</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cuisine Type *</label>
              <input
                type="text"
                value={formData.cuisine}
                onChange={(e) => handleChange('cuisine', e.target.value)}
                className="form-input"
                placeholder="Enter cuisine type"
                
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Day *</label>
              <select
                value={formData.day}
                onChange={(e) => handleChange('day', e.target.value)}
                className="form-input"
                
                disabled={isSubmitting}
              >
                <option value="">Select day</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="form-input"
                
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                className="form-input"
                
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? <Loader size={16} className="spinner" /> : <Save size={16} />}
              {isSubmitting ? 'Saving...' : (diningEvent ? 'Update Event' : 'Add Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const App = () => {
  const [stagedUploads, setStagedUploads] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [diningEvents, setDiningEvents] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploadSettings, setUploadSettings] = useState({
    location: '',
    restaurant: '',
    mediaType: ''
  });

  const getLocationOptions = () => {
    // Filter events based on selected restaurant
    const filteredEvents = localSettings.restaurant 
      ? diningEvents.filter(event => {
          const restaurant = restaurants.find(r => r.name === localSettings.restaurant);
          return restaurant && event.restaurant_id === restaurant.id;
        })
      : diningEvents;
    
    const eventOptions = filteredEvents.map(event => {
      const restaurant = restaurants.find(r => r.id === event.restaurant_id);
      return {
        value: event.eventname,
        label: restaurant ? `${restaurant.name} (${event.eventname})` : event.eventname,
        type: 'event',
        restaurantName: restaurant?.name || ''
      };
    });
    
    return eventOptions;
  };

  const handleRestaurantChange = (restaurantName) => {
    setLocalSettings(prev => ({ 
      ...prev, 
      restaurant: restaurantName,
      location: '' // Reset location when restaurant changes
    }));
  };

  const [localSettings, setLocalSettings] = useState({ ...uploadSettings });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showDiningForm, setShowDiningForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [editingDiningEvent, setEditingDiningEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('media');
  const fileInputRef = useRef(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  // API functions with actual backend calls
  const fetchRestaurants = async () => {
    try {
      const data = await restaurantAPI.getAll();
      setRestaurants(data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      showNotification('error', 'Failed to fetch restaurants');
    }
  };

  const fetchDiningEvents = async () => {
    try {
      const data = await diningEventsAPI.getAll();
      setDiningEvents(data);
    } catch (error) {
      console.error('Error fetching dining events:', error);
      showNotification('error', 'Failed to fetch dining events');
    }
  };

  const fetchMediaFiles = async () => {
    try {
      setIsLoadingMedia(true);
      const data = await mediaAPI.getAll();
      // Transform the data to match the expected format
      const transformedData = data.map(file => ({
        ...file,
        name: file.original_name || file.name,
        url: `http://localhost:5000${file.file_path}`,
        type: file.file_type,
      }));
      setMediaFiles(transformedData);
    } catch (error) {
      console.error('Error fetching media files:', error);
      showNotification('error', 'Failed to fetch media files');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchRestaurants();
    fetchDiningEvents();
    fetchMediaFiles();
  }, []);

  const handleSaveRestaurant = async (formData) => {
    try {
      if (editingRestaurant) {
        await restaurantAPI.update(editingRestaurant.id, formData);
        showNotification('success', 'Restaurant updated successfully!');
      } else {
        await restaurantAPI.create(formData);
        showNotification('success', 'Restaurant added successfully!');
      }
      fetchRestaurants();
      setShowRestaurantForm(false);
      setEditingRestaurant(null);
    } catch (error) {
      console.error('Error saving restaurant:', error);
      showNotification('error', error.message || 'Failed to save restaurant');
    }
  };

  const handleSaveDiningEvent = async (formData) => {
    try {
      if (editingDiningEvent) {
        await diningEventsAPI.update(editingDiningEvent.id, formData);
        showNotification('success', 'Dining event updated successfully!');
      } else {
        await diningEventsAPI.create(formData);
        showNotification('success', 'Dining event added successfully!');
      }
      fetchDiningEvents();
      setShowDiningForm(false);
      setEditingDiningEvent(null);
    } catch (error) {
      console.error('Error saving dining event:', error);
      showNotification('error', error.message || 'Failed to save dining event');
    }
  };

  const handleEditRestaurant = (restaurant) => {
    setEditingRestaurant(restaurant);
    setShowRestaurantForm(true);
  };

  const handleEditDiningEvent = (event) => {
    setEditingDiningEvent(event);
    setShowDiningForm(true);
  };

  const handleDeleteRestaurant = async (id) => {
    if (window.confirm('Are you sure you want to delete this restaurant?')) {
      try {
        await restaurantAPI.delete(id);
        showNotification('success', 'Restaurant deleted successfully!');
        fetchRestaurants();
      } catch (error) {
        console.error('Error deleting restaurant:', error);
        showNotification('error', error.message || 'Failed to delete restaurant');
      }
    }
  };

  const handleDeleteDiningEvent = async (id) => {
    if (window.confirm('Are you sure you want to delete this dining event?')) {
      try {
        await diningEventsAPI.delete(id);
        showNotification('success', 'Dining event deleted successfully!');
        fetchDiningEvents();
      } catch (error) {
        console.error('Error deleting dining event:', error);
        showNotification('error', error.message || 'Failed to delete dining event');
      }
    }
  };

  const handleDeleteMedia = async (id) => {
    if (window.confirm('Are you sure you want to delete this media file?')) {
      try {
        await mediaAPI.delete(id);
        showNotification('success', 'Media file deleted successfully!');
        fetchMediaFiles(); // Refresh the media list
      } catch (error) {
        console.error('Error deleting media file:', error);
        showNotification('error', error.message || 'Failed to delete media file');
      }
    }
  };

  const getRestaurantName = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    return restaurant ? restaurant.name : 'Unknown';
  };

  const renderStars = (rating) => {
    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            className={i < rating ? 'star-filled' : 'star-empty'}
          />
        ))}
      </div>
    );
  };

  const processFiles = async (files) => {
    if (files.length === 0) return;

    const newUploads = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      location: uploadSettings.location,
      restaurant: uploadSettings.restaurant,
      mediaType: uploadSettings.mediaType,
      uploaded: false,
      uploading: false,
      error: null,
    }));

    setStagedUploads(prev => [...prev, ...newUploads]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('upload-area-drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('upload-area-drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('upload-area-drag-over');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleSaveAll = async () => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      
      stagedUploads.forEach((upload, index) => {
        formData.append('files', upload.file);
        formData.append(`locations[${index}]`, upload.location);
        formData.append(`restaurants[${index}]`, upload.restaurant);
        formData.append(`mediaTypes[${index}]`, upload.mediaType);
      });

      await mediaAPI.upload(formData);
      showNotification('success', 'Files uploaded successfully!');
      setStagedUploads([]);
      fetchMediaFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification('error', error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const discardUploads = () => {
    stagedUploads.forEach(upload => {
      if (upload.url) {
        URL.revokeObjectURL(upload.url);
      }
    });
    setStagedUploads([]);
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    // Handle logout logic here (e.g., clearing authentication tokens, etc.)
    navigate('/login'); // Redirect to login page
  };

  return (
    <main className="main-app">
      <div className="app-containers">
        {/* Notification */}
        {notification.message && (
          <div className={`notification ${notification.type === 'error' ? 'notification-error' : 'notification-success'}`}>
            <AlertCircle size={20} />
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <header className="app-header">
          <div className="app-title">
            <img src={logo} alt='thames'/>
          </div>
          <div className="header-actions">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-upload"
              aria-label="Upload files"
              type="button"
            >
              <Upload size={20} />
              {isUploading ? 'Uploading...' : 'Upload Media'}
            </button>
            <button
              onClick={handleLogout}
              className="btn-logout"
              aria-label="Logout"
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-buttons ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => setActiveTab('restaurants')}
          >
            Restaurants
          </button>
          <button
            className={`tab-buttons ${activeTab === 'dining' ? 'active' : ''}`}
            onClick={() => setActiveTab('dining')}
          >
            Dining Events
          </button>
          <button
            className={`tab-buttons ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media Library
          </button>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          onChange={(e) => processFiles(Array.from(e.target.files))}
          className="file-input-hidden"
        />

        {/* Content based on active tab */}
        {activeTab === 'media' && (
          <>
            {/* Upload Area */}
            {stagedUploads.length === 0 && (
              <section
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="upload-area"
                aria-label="Drag and drop files or click to upload"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              >
                <Upload size={64} className="upload-area-icon" />
                <h2 className="upload-area-title">Drag &amp; Drop Files Here</h2>
                <p className="upload-area-subtitle">or click to browse files</p>
                <div className="upload-area-formats">
                  Supports: JPG, PNG, MP4, AVI, MOV, WebM, PDF
                </div>
              </section>
            )}

            {/* Upload Settings */}
            {activeTab === 'media' && (
              <section className="upload-settings">
                <div className="settings-row">
                  <div className="setting-group">
                    <label className="setting-label">Restaurant</label>
                    <select
                      value={localSettings.restaurant}
                      onChange={(e) => handleRestaurantChange(e.target.value)}
                      className="setting-select"
                    >
                      <option value="">Select restaurant</option>
                      {restaurants.map(restaurant => (
                        <option key={restaurant.id} value={restaurant.name}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label">Location (Event)</label>
                    <select
                      value={localSettings.location}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, location: e.target.value }))}
                      className="setting-select"
                      disabled={!localSettings.restaurant} // Disable if no restaurant selected
                    >
                      <option value="">Select event</option>
                      {getLocationOptions().map(option => (
                        <option key={`${option.type}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="setting-group">
                    <label className="setting-label">Media Type</label>
                    <select
                      value={localSettings.mediaType}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, mediaType: e.target.value }))}
                      className="setting-select"
                    >
                      <option value="">Select media type</option>
                      <option value="menu">Menu</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setUploadSettings({ ...localSettings });
                      // Apply settings to existing staged uploads
                      setStagedUploads(prev => prev.map(file => ({
                        ...file,
                        location: localSettings.location,
                        restaurant: localSettings.restaurant,
                        mediaType: localSettings.mediaType
                      })));
                    }}
                    className="btn-apply-settings"
                  >
                    Apply Settings
                  </button>
                </div>
              </section>
            )}

            {/* Staged Uploads */}
            {stagedUploads.length > 0 && (
              <section>
                <div className="section-header">
                  <h2>Staged Uploads ({stagedUploads.length})</h2>
                  <div className="upload-actions">
                    <button onClick={discardUploads} className="btn-cancel">
                      Discard All
                    </button>
                    <button onClick={handleSaveAll} className="btn-save" disabled={isUploading}>
                      {isUploading ? <Loader size={16} className="spinner" /> : <Save size={16} />}
                      {isUploading ? 'Uploading...' : 'Save All'}
                    </button>
                  </div>
                </div>
                <div className="upload-grid">
                  {stagedUploads.map(upload => (
                    <div key={upload.id} className="upload-item">
                      <div className="upload-preview">
                        {upload.type.startsWith('image/') ? (
                          <img src={upload.url} alt={upload.name} />
                        ) : upload.type.startsWith('video/') ? (
                          <video src={upload.url} />
                        ) : (
                          <FileText size={48} />
                        )}
                      </div>
                      <div className="upload-info">
                        <div className="upload-name">{truncateFileName(upload.name)}</div>
                        <div className="upload-size">{(upload.size / 1024 / 1024).toFixed(2)} MB</div>
                        <div className="upload-tags">
                          {upload.location && <span className="upload-tag">{upload.location}</span>}
                          {upload.restaurant && <span className="upload-tag">{upload.restaurant}</span>}
                          {upload.mediaType && <span className="upload-tag">{upload.mediaType}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Media Library */}
            <section>
              <div className="section-header">
                <h2>Media Library</h2>
                <div className="search-controls">
                  <div className="search-bar">
                    <Search size={20} />
                    <input
                      type="text"
                      placeholder="Search media files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Files</option>
                  <option value="menu">Menu</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                </div>
              </div>
              
              {isLoadingMedia ? (
                <div className="loading-state">
                  <Loader size={48} className="spinner" />
                  <p>Loading media files...</p>
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="empty-state">
                  <FileImage size={64} className="empty-state-icon" />
                  <h3>No media files</h3>
                  <p>Upload files to manage your media content</p>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Preview</th>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediaFiles
                          .filter(file => {
                            const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesFilter = filterType === 'all' || file.media_type === filterType;
                            return matchesSearch && matchesFilter;
                          })
                          .map(file => (
                          <tr key={file.id}>
                            <td>
                              <div className="media-thumbnail">
                                {file.type.startsWith('image/') ? (
                                  <img src={file.url} alt={file.name} className="thumbnail-image" />
                                ) : file.type.startsWith('video/') ? (
                                  <div className="thumbnail-video">
                                    <FileVideo size={24} />
                                  </div>
                                ) : (
                                  <div className="thumbnail-file">
                                    <FileText size={24} />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="file-name-cell">
                                <span className="file-name">{file.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="file-type-badge">
                                {file.media_type ? (
                                  file.media_type.charAt(0).toUpperCase() + file.media_type.slice(1)
                                ) : (
                                  file.type.startsWith('image/') ? 'Image' : 
                                  file.type.startsWith('video/') ? 'Video' : 
                                  file.type === 'application/pdf' ? 'PDF' : 'File'
                                )}
                              </span>
                            </td>
                            <td>
                              <span className="file-location">
                                {file.location || file.restaurant ? (
                                  <span className="location-display">
                                    {file.restaurant && file.location ? (
                                      // Show as "Restaurant Name (Event Name)"
                                      <span className="restaurant-event-name">
                                        {file.restaurant} ({file.location})
                                      </span>
                                    ) : file.restaurant ? (
                                      <span className="restaurant-name">🍽️ {file.restaurant}</span>
                                    ) : file.location ? (
                                      <span className="event-name">{file.location}</span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="no-location">-</span>
                                )}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => window.open(file.url, '_blank')}
                                  className="btn-action btn-view"
                                  title="View file"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMedia(file.id)}
                                  className="btn-action btn-delete"
                                  title="Delete file"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <section>
            <div className="section-header">
              <h2 className="section-title">Restaurant Management</h2>
              <button
                onClick={() => setShowRestaurantForm(true)}
                className="btn-restaurant"
              >
                <Plus size={16} />
                Add Restaurant
              </button>
            </div>

            {restaurants.length === 0 ? (
              <div className="empty-state">
                <UtensilsCrossed size={64} className="empty-state-icon" />
                <h3>No restaurants added yet</h3>
                <p>Add your first restaurant to get started</p>
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Restaurant Name</th>
                      <th>Cuisine</th>
                      <th>Hours</th>
                      <th>Rating</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map(restaurant => (
                      <tr key={restaurant.id}>
                        <td>
                          <div className="restaurant-name">{restaurant.name}</div>
                        </td>
                        <td>
                          <span className="cuisine-tag">{restaurant.cuisine}</span>
                        </td>
                        <td>
                          <span className="time-display">
                            {restaurant.start_time} - {restaurant.end_time}
                          </span>
                        </td>
                        <td>
                          {renderStars(restaurant.rating)}
                        </td>
                        <td>
                          <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {restaurant.description || 'No description'}
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEditRestaurant(restaurant)}
                              className="btn-action btn-edit"
                              title="Edit restaurant"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteRestaurant(restaurant.id)}
                              className="btn-action btn-delete"
                              title="Delete restaurant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Dining Events Tab */}
        {activeTab === 'dining' && (
          <section>
            <div className="section-header">
              <h2 className="section-title">Dining Events</h2>
              <button
                onClick={() => setShowDiningForm(true)}
                className="btn-dining"
              >
                <Plus size={16} />
                Add Dining Event
              </button>
            </div>

            {diningEvents.length === 0 ? (
              <div className="empty-state">
                <Calendar size={64} className="empty-state-icon" />
                <h3>No dining events scheduled</h3>
                <p>Create your first dining event to get started</p>
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Restaurant</th>
                      <th>Cuisine</th>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diningEvents.map(event => (
                      <tr key={event.id}>
                        <td>
                          <div className="event-name">{event.eventname}</div>
                        </td>
                        <td>
                          <span className="restaurant-name">
                            {event.restaurant_id ? getRestaurantName(event.restaurant_id) : 'No restaurant'}
                          </span>
                        </td>
                        <td>
                          <span className="cuisine-tag">{event.cuisine}</span>
                        </td>
                        <td>
                          <span className="day-display">{event.day}</span>
                        </td>
                        <td>
                          <span className="time-display">
                            {event.start_time} - {event.end_time}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEditDiningEvent(event)}
                              className="btn-action btn-edit"
                              title="Edit dining event"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteDiningEvent(event.id)}
                              className="btn-action btn-delete"
                              title="Delete dining event"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Restaurant Form Modal */}
        {showRestaurantForm && (
          <RestaurantForm
            onClose={() => {
              setShowRestaurantForm(false);
              setEditingRestaurant(null);
            }}
            onSave={handleSaveRestaurant}
            restaurant={editingRestaurant}
          />
        )}

        {/* Dining Event Form Modal */}
        {showDiningForm && (
          <DiningEventForm
            onClose={() => {
              setShowDiningForm(false);
              setEditingDiningEvent(null);
            }}
            onSave={handleSaveDiningEvent}
            diningEvent={editingDiningEvent}
            restaurants={restaurants}
          />
        )}
      </div>
    </main>
  );
};

export default App;