import React, { useState, useEffect } from 'react';
import './Users.css';
import { Play, Clock, MapPin, Star, Home, ChevronLeft, ChevronRight, Maximize, Pause, Volume2, House, Loader } from 'lucide-react';

// API configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    if (!response.ok) {
      const errorMessage = responseData?.error || responseData || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return responseData;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// API functions
const restaurantAPI = {
  getAll: () => apiRequest('/restaurants'),
};

const diningEventsAPI = {
  getAll: () => apiRequest('/dining-events'),
};

const mediaAPI = {
  getAll: () => apiRequest('/media'),
};

const FoodDiscoveryApp = () => {
  const [autoRotate, setAutoRotate] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [autoRotateInterval, setAutoRotateInterval] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState('landscape-primary');
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('video');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [detailsView, setDetailsView] = useState('image');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Backend data states
  const [restaurants, setRestaurants] = useState([]);
  const [diningEvents, setDiningEvents] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to get media by type - FIXED to properly use media_type from database
  const getMediaByType = (type) => {
    console.log('Filtering media by type:', type);
    console.log('Available media files:', mediaFiles);
    
    return mediaFiles.filter(media => {
      // Primary check: use media_type field from database
      if (media.media_type) {
        const mediaType = media.media_type.toLowerCase().trim();
        const requestedType = type.toLowerCase().trim();
        
        console.log(`Comparing media_type: "${mediaType}" with requested: "${requestedType}"`);
        
        // Direct match for media_type
        if (mediaType === requestedType) {
          return true;
        }
        
        // Handle menu type - check if it's pdf or menu
        if (requestedType === 'menu' && (mediaType === 'pdf' || mediaType === 'menu')) {
          return true;
        }
        
        return false;
      }
      
      // Fallback to file_type check (for backward compatibility)
      const fileType = media.file_type ? media.file_type.toLowerCase() : '';
      console.log(`Fallback to file_type: "${fileType}" for requested: "${type}"`);
      
      switch (type.toLowerCase()) {
        case 'image':
          return fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('jpg') || fileType.includes('png') || fileType.includes('gif');
        case 'video':
          return fileType.includes('video') || fileType.includes('mp4') || fileType.includes('avi') || fileType.includes('mov') || fileType.includes('webm');
        case 'menu':
          return fileType.includes('pdf') || fileType.includes('application/pdf');
        default:
          return false;
      }
    });
  };

  // Helper function to get restaurant-specific media
  const getRestaurantMedia = (restaurantName, type) => {
    const allMediaOfType = getMediaByType(type);
    
    console.log(`Getting ${type} media for ${restaurantName}:`, allMediaOfType);
    
    // Filter media based on location and event
    const filteredMedia = allMediaOfType.filter(media => {
      // If we have a selected event, filter by both location and event name
      if (selectedEvent && selectedEvent.eventName) {
        const eventMatch = media.location && 
          media.location.toLowerCase().includes(selectedEvent.eventName.toLowerCase());
        const locationMatch = media.location && 
          media.location.toLowerCase().includes(restaurantName.toLowerCase());
        
        return eventMatch || locationMatch;
      }
      
      // If no selected event, filter by restaurant name only
      if (media.location && media.location.trim() !== '') {
        return media.location.toLowerCase().includes(restaurantName.toLowerCase());
      }
      
      // If no location info, include all media of that type
      return true;
    });
    
    console.log(`Filtered ${type} media for ${restaurantName}:`, filteredMedia);
    return filteredMedia;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [restaurantsData, eventsData, mediaData] = await Promise.all([
          restaurantAPI.getAll(),
          diningEventsAPI.getAll(),
          mediaAPI.getAll()
        ]);
        
        console.log('Fetched media data:', mediaData);
        
        // Enhanced logging for media types
        console.log('Media files with types:', mediaData.map(m => ({ 
          id: m.id, 
          filename: m.filename,
          media_type: m.media_type, 
          file_type: m.file_type, 
          location: m.location,
          file_path: m.file_path
        })));
        
        // Transform restaurants data to match the expected format
        const transformedRestaurants = restaurantsData.map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          openTime: restaurant.start_time,
          closeTime: restaurant.end_time,
          cuisine: restaurant.cuisine,
          rating: restaurant.rating,
          description: restaurant.description,
          image_path: restaurant.image_path ? `http://localhost:5000${restaurant.image_path}` : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
          menuImage: restaurant.image_path ? `http://localhost:5000${restaurant.image_path}` : null,
          specialties: restaurant.cuisine ? [restaurant.cuisine] : ['Restaurant'],
          
          // Get related events for this restaurant
          events: eventsData
            .filter(event => event.restaurant_id === restaurant.id)
            .map(event => ({
              day: event.day,
              eventName: event.eventname,
              timeZone: event.cuisine,
              openTime: event.start_time,
              closeTime: event.end_time,
              hasMenu: true,
              hasVideo: true
            }))
        }));

        setRestaurants(transformedRestaurants);
        setDiningEvents(eventsData);
        setMediaFiles(mediaData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      video.volume = isMuted ? 0 : volume;
      video.muted = isMuted;
    });
  }, [volume, isMuted]);

  const handleRestaurantSelect = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentScreen('schedule');
    setCurrentMediaIndex(0);
    setDetailsView('image'); // Reset to image view
  };

  const handleEventMenuOrVideo = (event) => {
    setSelectedEvent(event);
    setCurrentScreen('details');
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen
      const element = document.documentElement; // or document.body
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
    setShowControls(!isFullscreen);
  };

  const toggleAutoRotate = () => {
    if (isAutoRotating) {
      stopAutoRotate();
    } else {
      startAutoRotate();
    }
  };

  const stopAutoRotate = () => {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
      setAutoRotateInterval(null);
    }
    setIsAutoRotating(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const startAutoRotate = () => {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
    }
    setIsAutoRotating(true);
    const interval = setInterval(() => {
      rotateScreenAuto();
    }, 3000);
    setAutoRotateInterval(interval);
  };

  useEffect(() => {
    if (isFullscreen) {
      if (screen.orientation?.lock) {
        screen.orientation.lock("landscape-primary").catch(() => {
          console.log("Orientation lock not supported");
        });
      }
    } else {
      if (screen.orientation?.unlock) {
        screen.orientation.unlock();
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
      }
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [autoRotateInterval, controlsTimeout]);

  const handleThumbnailClick = (index) => {
    setCurrentMediaIndex(index);
  };

  const rotateScreenAuto = () => {
    if (screen.orientation && screen.orientation.lock) {
      const orientations = ['landscape-primary', 'landscape-secondary', 'portrait-primary', 'portrait-secondary'];
      const currentIndex = orientations.indexOf(screen.orientation.type || 'landscape-primary');
      const nextOrientation = orientations[(currentIndex + 1) % orientations.length];
      
      screen.orientation.lock(nextOrientation).then(() => {
        setCurrentOrientation(nextOrientation);
      }).catch((err) => {
        console.log("Auto rotation failed:", err);
      });
    }
  };

  const manualRotateScreen = () => {
    if (screen.orientation && screen.orientation.lock) {
      const orientations = ['landscape-primary', 'landscape-secondary', 'portrait-primary', 'portrait-secondary'];
      const currentIndex = orientations.indexOf(screen.orientation.type || 'landscape-primary');
      const nextOrientation = orientations[(currentIndex + 1) % orientations.length];
      
      screen.orientation.lock(nextOrientation).then(() => {
        setCurrentOrientation(nextOrientation);
      }).catch((err) => {
        console.log("Manual rotation failed:", err);
        // Fallback: just toggle a CSS class for visual rotation
        setCurrentOrientation(nextOrientation);
      });
    }
  };

  const handleTouch = () => {
    if (isFullscreen) {
      setShowControls(true);
      
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setControlsTimeout(timeout);
    }
  };

  const goToHome = () => {
    setCurrentScreen('video');
    setSelectedRestaurant(null);
    setIsVideoPlaying(false);
  };

  const nextMedia = () => {
    const currentMedia = getCurrentMedia();
    if (currentMedia && currentMedia.length > 0) {
      setCurrentMediaIndex((prev) => 
        prev === currentMedia.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevMedia = () => {
    const currentMedia = getCurrentMedia();
    if (currentMedia && currentMedia.length > 0) {
      setCurrentMediaIndex((prev) => 
        prev === 0 ? currentMedia.length - 1 : prev - 1
      );
    }
  };

  const getCurrentMedia = () => {
    if (!selectedRestaurant) return [];
    
    switch (detailsView) {
      case 'image':
        return getRestaurantMedia(selectedRestaurant.name, 'image');
      case 'video':
        return getRestaurantMedia(selectedRestaurant.name, 'video');
      case 'menu':
        return getRestaurantMedia(selectedRestaurant.name, 'menu');
      default:
        return [];
    }
  };

  const toggleVideo = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  // Helper function to render media based on type
  const renderMediaContent = (mediaItem, mediaType) => {
    if (!mediaItem) return null;

    const mediaUrl = `http://localhost:5000${mediaItem.file_path}`;
    
    // Always render based on the current detailsView, not the file type
    switch (detailsView) {
      case 'image':
        return (
          <img 
            src={mediaUrl}
            alt={`${selectedRestaurant.name} ${detailsView} ${currentMediaIndex + 1}`}
            className="user-media-image"
            onError={(e) => {
              console.log('Media failed to load:', e.target.src);
              e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';
            }}
          />
        );
      
      case 'video':
        return (
          <video
            ref={(el) => {
              if (el) {
                el.volume = isMuted ? 0 : volume;
              }
            }}
            src={mediaUrl}
            className="user-video-element"
            controls={false}
            autoPlay={isPlaying}
            loop
            playsInline
            muted={isMuted}
            onError={(e) => {
              console.log('Video failed to load:', e.target.src);
            }}
          />
        );
      
      case 'menu':
        // For menu view, try to display as image first, then fallback to iframe for PDFs
        if (mediaItem.file_type && mediaItem.file_type.toLowerCase().includes('pdf')) {
          return (
            <iframe
              src={`${mediaUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
              className="user-menu-pdf"
              title={`${selectedRestaurant.name} Menu`}
              onError={(e) => {
                console.log('PDF failed to load:', e.target.src);
              }}
            />
          );
        } else {
          // Display as image
          return (
            <img 
              src={mediaUrl}
              alt={`${selectedRestaurant.name} menu ${currentMediaIndex + 1}`}
              className="user-media-image"
              onError={(e) => {
                console.log('Menu image failed to load:', e.target.src);
              }}
            />
          );
        }
      
      default:
        return null;
    }
  };

  const EnhancedMediaControls = ({ isVisible = true }) => (
    <div className={`user-enhanced-controls ${
      isFullscreen 
        ? (isVisible ? 'user-controls-visible-fullscreen' : 'user-controls-hidden-fullscreen') 
        : 'user-controls-visible-normal'
    }`}>
      <div className="user-controls-group">
        <button 
          onClick={togglePlay}
          className="user-control-btn user-hover-scale"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="user-control-icon" /> : <Play className="user-control-icon" />}
        </button>
        
        <button 
          onClick={prevMedia}
          className="user-control-btn user-hover-scale"
          title="Previous"
        >
          <ChevronLeft className="user-control-icon" />
        </button>
        
        <button 
          onClick={nextMedia}
          className="user-control-btn user-hover-scale"
          title="Next"
        >
          <ChevronRight className="user-control-icon" />
        </button>
        
        {/* Volume Control */}
        <div className="user-volume-control">
          <button 
            onClick={toggleMute}
            className="user-control-btn user-hover-scale"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="user-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            ) : (
              <Volume2 className="user-control-icon" />
            )}
          </button>
          
          {/* Volume Slider - only show in fullscreen or when not on mobile */}
          {(isFullscreen || window.innerWidth > 768) && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="user-volume-slider"
            />
          )}
        </div>
        
        <button 
          onClick={manualRotateScreen}
          className="user-control-btn user-hover-scale"
          title="Rotate Screen"
        >
          <svg className="user-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </button>
        
        <button 
          onClick={toggleAutoRotate}
          className={`user-control-btn user-hover-scale ${isAutoRotating ? 'user-control-active' : ''}`}
          title={isAutoRotating ? 'Stop Auto Rotate' : 'Start Auto Rotate'}
        >
          <svg className="user-control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
        
        <button 
          onClick={toggleFullscreen}
          className="user-control-btn user-hover-scale"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          <Maximize className="user-control-icon" />
        </button>
      </div>
    </div>
  );

  // Loading screen
  if (loading) {
    return (
      <div className="user-screen user-flex-center">
        <div className="user-loading-container">
          <Loader className="user-loading-spinner" />
          <p className="user-loading-text">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="user-screen user-flex-center">
        <div className="user-error-container">
          <h2 className="user-error-title">Error Loading Data</h2>
          <p className="user-error-message">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="user-primary-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Screen 1: Video Screen
  const VideoScreen = () => (
    <div className="user-screen user-video-bg user-flex-center user-padding">
      <div className="user-container">
        <div className="user-text-center user-margin-bottom">
          <span className="user-title user-text-white user-margin-bottom">Food Discovery</span>
          <p className="user-subtitle">Find your next favorite dining experience</p>
        </div>
        
        <button
          onClick={() => setCurrentScreen('restaurants')}
          className="user-primary-btn user-full-width user-hover-scale"
        >
          Explore Restaurants
        </button>
      </div>
    </div>
  );

  // Screen 2: Restaurant List
  const RestaurantListScreen = () => (
    <div className="user-screen user-bg-light">
      <div className="user-header user-gradient-primary user-text-white user-padding-large">
        <div className="user-text-center">
          <h1 className="user-large-title user-margin-bottom">HUNGRY?</h1>
          <p className="user-header-subtitle user-margin-small">Unwind with amazing flavors</p>
          <p className="user-header-subtitles">Discover Our Restaurants</p>
        </div>
      </div>

      <div className="user-content-container user-padding">
        {restaurants.length === 0 ? (
          <div className="user-no-data">
            <p>No restaurants available</p>
          </div>
        ) : (
          <div className="user-grid user-gap">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                onClick={() => handleRestaurantSelect(restaurant)}
                className="user-card user-hover-shadow user-cursor-pointer user-hover-scale-sm"
              >
                <div className="user-flex">
                  <div className="user-image-container">
                    <img 
                      src={restaurant.image_path}
                      alt={restaurant.name}
                      className="user-image-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';
                      }}
                    />
                  </div>
                  <div className="user-card-content">
                    <div className="user-flex-between user-margin-small">
                      <h3 className="user-card-title">{restaurant.name}</h3>
                      <div className="user-rating-badge">
                        <Star className="user-star-icon" />
                        <span className="user-rating-text">{restaurant.rating}</span>
                      </div>
                    </div>
                    
                    <p className="user-cuisine-text user-margin-small">{restaurant.cuisine}</p>
                    
                    <div className="user-time-info user-margin-small">
                      <Clock className="user-clock-icon" />
                      <span>{restaurant.openTime} - {restaurant.closeTime}</span>
                    </div>
                    <p className="user-cuisine-text user-margin-small">{restaurant.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="user-fixed-bottom-left">
          <button
            onClick={() => setCurrentScreen('video')}
            className="user-back-btn user-hover-scale"
          >
            Back
          </button>
        </div>

        <div className="user-fixed-bottom-right">
          <button 
            onClick={() => setCurrentScreen('video')}
            className="user-secondary-btn user-hover-scale"
          >
            <Home className="user-home-icon" />
            Home
          </button>
        </div>
      </div>
    </div>
  );

  // Screen 3: Event Schedule Screen
  const EventScheduleScreen = () => {
    if (!selectedRestaurant) return null;

    return (
      <div className="user-screen user-bg-white">
        <div className="user-schedule-header">
          <h1 className="user-schedule-title">{selectedRestaurant.name}</h1>
        </div>

        <div className="user-events-container">
          {selectedRestaurant.events.length === 0 ? (
            <div className="user-no-events">
              <p>No events scheduled for this restaurant</p>
            </div>
          ) : (
            <div className="user-events-list">
              {selectedRestaurant.events.map((event, index) => (
                <div key={index} className="user-event-card">
                  <div className="user-event-content" onClick={() => handleEventMenuOrVideo(event)}>
                    <div className="user-event-info">
                      <div className="user-day-badge">
                        {event.day}
                      </div>
                      <div className="user-event-details">
                        <h3 className="user-event-name">{event.eventName}</h3>
                        <p className="user-event-time">{event.timeZone}</p>
                        <p className="user-event-time">{event.openTime} to {event.closeTime}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="user-fixed-bottom-right">
          <button
            onClick={() => handleEventMenuOrVideo(selectedRestaurant.events[0] || {})}
            className="user-tap-btn user-hover-scale"
          >
            Tap Me
          </button>
        </div>

        <div className="user-fixed-bottom-left">
          <button
            onClick={() => setCurrentScreen('restaurants')}
            className="user-back-btn user-hover-scale"
          >
            Back
          </button>
        </div>
      </div>
    );
  };

  // Screen 4: Restaurant Details (Media Gallery) - UPDATED
  // Screen 4: Restaurant Details (Media Gallery)
const RestaurantDetailsScreen = () => {
  if (!selectedRestaurant) return null;

  const currentMedia = getCurrentMedia();
  const currentMediaItem = currentMedia[currentMediaIndex];

  console.log('Current media for', detailsView, ':', currentMedia);
  console.log('Current media item:', currentMediaItem);

  // Unified media rendering function
  const renderMediaContent = (mediaItem, mediaType) => {
    if (!mediaItem) return null;

    const mediaUrl = `http://localhost:5000${mediaItem.file_path}`;
    
    switch (detailsView) {
      case 'image':
        return (
          <img 
            src={mediaUrl}
            alt={`${selectedRestaurant.name} image ${currentMediaIndex + 1}`}
            className={`user-media-image ${isFullscreen ? 'user-fullscreen-media' : ''}`}
            onError={(e) => {
              console.log('Image failed to load:', e.target.src);
              e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';
            }}
          />
        );
      
      case 'video':
        return (
          <video
            ref={(el) => {
              if (el) {
                el.volume = isMuted ? 0 : volume;
              }
            }}
            src={mediaUrl}
            className={`user-video-element ${isFullscreen ? 'user-fullscreen-media' : ''}`}
            controls={false}
            autoPlay={isPlaying}
            loop
            playsInline
            muted={isMuted}
            onError={(e) => {
              console.log('Video failed to load:', e.target.src);
            }}
          />
        );
      
      case 'menu':
        if (mediaItem.file_type && mediaItem.file_type.toLowerCase().includes('pdf')) {
          return (
            <iframe
              src={`${mediaUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`}
              className={`user-menu-pdf ${isFullscreen ? 'user-fullscreen-media' : ''}`}
              title={`${selectedRestaurant.name} Menu`}
              onError={(e) => {
                console.log('PDF failed to load:', e.target.src);
              }}
            />
          );
        } else {
          return (
            <img 
              src={mediaUrl}
              alt={`${selectedRestaurant.name} menu ${currentMediaIndex + 1}`}
              className={`user-media-image ${isFullscreen ? 'user-fullscreen-media' : ''}`}
              onError={(e) => {
                console.log('Menu image failed to load:', e.target.src);
              }}
            />
          );
        }
      
      default:
        return null;
    }
  };

  return (
    <div className={`user-screen user-bg-light ${isFullscreen ? 'user-fullscreen-mode' : ''}`}>
      {/* Header - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="user-schedule-header">
          <h1 className="user-schedule-title">
            {selectedEvent ? selectedEvent.eventName : selectedRestaurant.name}
          </h1>
        </div>
      )}

      {/* Main Media Container */}
      <div className={`user-media-section ${isFullscreen ? 'user-fullscreen-active' : ''}`}>
        {currentMedia.length > 0 && currentMediaItem ? (
          <div className="user-media-container">
            {/* Touch area for fullscreen controls */}
            <div 
              className="user-touch-area"
              onTouchStart={handleTouch}
              onClick={handleTouch}
            />
            
            {/* Media Content */}
            <div className="user-media-content">
              {renderMediaContent(currentMediaItem, detailsView)}
            </div>
            
            {/* Enhanced Media Controls */}
            <EnhancedMediaControls isVisible={showControls} />
            
            {/* Media Counter */}
            <div className={`user-media-counter ${isFullscreen ? 'user-counter-fullscreen' : ''}`}>
              {currentMediaIndex + 1} / {currentMedia.length}
            </div>

            {/* Fullscreen Button for Menu */}
            {detailsView === 'menu' && !isFullscreen && (
              <button 
                onClick={toggleFullscreen} 
                className="user-fullscreen-btn"
              >
                <Maximize className="user-icon" />
              </button>
            )}
          </div>
        ) : (
          <div className="user-no-media">
            <p>No {detailsView === 'menu' ? 'menu' : detailsView + 's'} available</p>
          </div>
        )}
      </div>

      {/* Restaurant Info Section - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="user-info-section">
          <div className="user-info-card">
            <div className="user-info-header">
              <div className="user-info-badges">
                <span className="user-cuisine-badge">
                  {selectedRestaurant.cuisine}
                </span>
              </div>
              <div className="user-rating-container">
                <Star className="user-star-icon" />
                <span className="user-rating-value">{selectedRestaurant.rating}</span>
              </div>
            </div>
            
            <div className="user-timing-info">
              <Clock className="user-clock-icon" />
              <span>{selectedRestaurant.openTime} - {selectedRestaurant.closeTime}</span>
            </div>
            
            <p className="user-description">{selectedRestaurant.description}</p>

            <div>
              <h4 className="user-specialties-title">Specialties:</h4>
              <div className="user-specialties-container">
                {selectedRestaurant.specialties.map((specialty, index) => (
                  <span key={index} className="user-specialty-badge">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="user-actions-section">
          <div className="user-actions-grid">
            <button
              onClick={() => {
                setDetailsView('menu');
                setCurrentMediaIndex(0);
              }}
              className={`user-action-btn user-action-menu user-hover-scale ${
                detailsView === 'menu' ? 'user-action-active' : ''
              }`}
            >
              View Menu ({getRestaurantMedia(selectedRestaurant.name, 'menu').length})
            </button>
            <button
              onClick={() => {
                setDetailsView('image');
                setCurrentMediaIndex(0);
              }}
              className={`user-action-btn user-action-menu user-hover-scale ${
                detailsView === 'image' ? 'user-action-active' : ''
              }`}
            >
              Images ({getRestaurantMedia(selectedRestaurant.name, 'image').length})
            </button>
            <button
              onClick={() => {
                setDetailsView('video');
                setCurrentMediaIndex(0);
              }}
              className={`user-action-btn user-action-book user-hover-scale ${
                detailsView === 'video' ? 'user-action-active' : ''
              }`}
            >
              Videos ({getRestaurantMedia(selectedRestaurant.name, 'video').length})
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons - Hidden in fullscreen */}
      {!isFullscreen && (
        <>
          <div className="user-fixed-bottom-left">
            <button
              onClick={() => setCurrentScreen('schedule')}
              className="user-back-btn user-hover-scale"
            >
              Back
            </button>
          </div>

          <div className="user-fixed-bottom-right">
            <button
              onClick={goToHome}
              className="user-home-btn user-hover-scale"
            >
              <Home className="user-home-icon" />
              Home
            </button>
          </div>
        </>
      )}

      {/* Fullscreen Exit Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="user-fullscreen-exit-btn"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

  // Main render function
  return (
    <div className={`user-app ${isFullscreen ? 'user-fullscreen-app' : ''}`}>
      {currentScreen === 'video' && <VideoScreen />}
      {currentScreen === 'restaurants' && <RestaurantListScreen />}
      {currentScreen === 'schedule' && <EventScheduleScreen />}
      {currentScreen === 'details' && <RestaurantDetailsScreen />}
    </div>
  );
};

export default FoodDiscoveryApp;