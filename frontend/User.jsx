import React, { useState, useEffect } from 'react';
import { Play, Clock, MapPin, Star, Home, ChevronLeft, ChevronRight, Maximize, Pause, Volume2, House, RotateCcw, RotateCw, Settings } from 'lucide-react';

const FoodDiscoveryApp = () => {
  const [currentOrientation, setCurrentOrientation] = useState('landscape-primary');
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('video');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [detailsView, setDetailsView] = useState('media');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [autoRotateInterval, setAutoRotateInterval] = useState(null);

  // Mock menu images
  const Menu = 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&h=800&fit=crop';
  const Menus = 'https://images.unsplash.com/photo-1586999768024-b91f5b25b28e?w=600&h=800&fit=crop';

  // Mock data for restaurants with actual image URLs
  const restaurants = [
    {
      id: 1,
      name: 'Theme Night',
      openTime: '6:00 PM',
      closeTime: '11:30 PM',
      menuImage: Menu,
      cuisine: 'Mediterranean Food',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      description: 'Experience themed dining with live entertainment and vibrant atmosphere',
      specialties: ['Live Music', 'Theme Parties', 'Continental'],
      media: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&h=400&fit=crop'
      ],
      events: [
        {
          day: 'Thursday',
          eventName: 'SOUQ NIGHT',
          timeZone: 'MIDDLE EASTERN',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Friday',
          eventName: 'ROCKIN RAMEN',
          timeZone: 'FRESHLY MADE RAMEN',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Saturday',
          eventName: 'ZANAUTZ',
          timeZone: 'SPANISH TAPAS',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Sunday',
          eventName: 'WONDERLUST BRUNLY',
          timeZone: 'GLOBAL CULINARY ADVENTURE',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        }
      ]
    },
    {
      id: 2,
      name: 'ANCHOR & DEN',
      openTime: '4:00 PM',
      closeTime: '10:00 PM',
      menuImage: Menus,
      cuisine: 'Mediterranean Food',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
      description: 'Authentic Indian flavors with modern presentation and traditional recipes',
      specialties: ['North Indian', 'South Indian', 'Street Food'],
      media: [
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1574484284002-952d92456975?w=600&h=400&fit=crop'
      ],
      events: [
        {
          day: 'Thursday',
          eventName: 'SOUQ NIGHT',
          timeZone: 'MIDDLE EASTERN',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Friday',
          eventName: 'ROCKIN RAMEN',
          timeZone: 'FRESHLY MADE RAMEN',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Saturday',
          eventName: 'ZANAUTZ',
          timeZone: 'SPANISH TAPAS',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Saturday',
          eventName: 'MAD TEA PARTY',
          timeZone: 'SPANISH TAPAS',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Sunday',
          eventName: 'WONDERLUST BRUNLY',
          timeZone: 'GLOBAL CULINARY ADVENTURE',
          openTime: '6:00 PM',
          closeTime: '11:30 PM',
          hasMenu: true,
          hasVideo: true
        }
      ]
    },
    {
      id: 3,
      name: 'Veranda',
      openTime: '12:00 PM',
      closeTime: '11:00 PM',
      cuisine: 'Sea Food',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      description: 'Elegant dining with garden views and sophisticated ambiance',
      specialties: ['Continental', 'Mediterranean', 'Fine Dining'],
      media: [
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1515669097368-22e68427d265?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=400&fit=crop'
      ],
      events: [
        {
          day: 'Wednesday',
          eventName: 'LOBSTER NIGHT',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Friday',
          eventName: 'ASODO NIGHT',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Sunday',
          eventName: 'SIMPLY FISH',
          hasMenu: true,
          hasVideo: true
        }
      ]
    },
    {
      id: 4,
      name: 'ASCIA Food',
      openTime: '10:00 AM',
      closeTime: '9:30 PM',
      cuisine: 'Asian Food',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&h=400&fit=crop',
      description: 'Pan-Asian cuisine with authentic flavors from across the continent',
      specialties: ['Chinese', 'Thai', 'Japanese'],
      media: [
        'https://images.unsplash.com/photo-1552566067-b4581a0c52b8?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&h=400&fit=crop'
      ],
      events: [
        {
          day: 'Wednesday',
          eventName: 'LOBSTER NIGHT',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Friday',
          eventName: 'ASODO NIGHT',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Sunday',
          eventName: 'SIMPLY FISH',
          hasMenu: true,
          hasVideo: true
        }
      ]
    },
    {
      id: 5,
      name: 'Vista Bar',
      openTime: '5:00 PM',
      closeTime: '1:00 AM',
      cuisine: 'Snacks & Drinks',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop',
      description: 'Rooftop bar with panoramic city views and craft cocktails',
      specialties: ['Cocktails', 'Grills', 'Appetizers'],
      media: [
        'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=400&fit=crop'
      ],
      events: [
        {
          day: 'Wednesday',
          eventName: 'LOBSTER NIGHT',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Friday',
          eventName: 'ASODO NIGHT',
          hasMenu: true,
          hasVideo: true
        },
        {
          day: 'Sunday',
          eventName: 'SIMPLY FISH',
          hasMenu: true,
          hasVideo: true
        }
      ]
    }
  ];

  // Auto rotate function
  const startAutoRotate = () => {
    if (autoRotateInterval) return;
    
    const interval = setInterval(() => {
      rotateScreen();
    }, 3000); // Rotate every 3 seconds
    
    setAutoRotateInterval(interval);
  };

  const stopAutoRotate = () => {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
      setAutoRotateInterval(null);
    }
  };

  const toggleAutoRotate = () => {
    setAutoRotate(!autoRotate);
    if (!autoRotate) {
      startAutoRotate();
    } else {
      stopAutoRotate();
    }
  };

  const rotateScreen = () => {
    if (screen.orientation?.lock) {
      const orientations = ['landscape-primary', 'landscape-secondary', 'portrait-primary', 'portrait-secondary'];
      const currentIndex = orientations.indexOf(currentOrientation);
      const nextOrientation = orientations[(currentIndex + 1) % orientations.length];
      
      screen.orientation.lock(nextOrientation).then(() => {
        setCurrentOrientation(nextOrientation);
      }).catch(() => {
        console.log("Manual rotation failed");
      });
    }
  };

  const rotateCounterClockwise = () => {
    if (screen.orientation?.lock) {
      const orientations = ['landscape-primary', 'landscape-secondary', 'portrait-primary', 'portrait-secondary'];
      const currentIndex = orientations.indexOf(currentOrientation);
      const prevOrientation = orientations[(currentIndex - 1 + orientations.length) % orientations.length];
      
      screen.orientation.lock(prevOrientation).then(() => {
        setCurrentOrientation(prevOrientation);
      }).catch(() => {
        console.log("Manual rotation failed");
      });
    }
  };

  const handleRestaurantSelect = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentScreen('schedule');
    setCurrentMediaIndex(0);
  };

  const handleEventMenuOrVideo = (event) => {
    setSelectedEvent(event);
    setCurrentScreen('details');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setShowControls(true);
      // Auto-hide controls after 3 seconds in fullscreen
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    } else {
      setShowControls(true);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
        setControlsTimeout(null);
      }
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTouch = (e) => {
    e.stopPropagation();
    
    if (isFullscreen) {
      setShowControls(true);
      
      // Clear existing timeout
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      
      // Set new timeout to hide controls
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      
      setControlsTimeout(timeout);
    }
  };

  useEffect(() => {
    if (isFullscreen) {
      // Lock to landscape when fullscreen
      if (screen.orientation?.lock) {
        screen.orientation.lock("landscape-primary").catch(() => {
          console.log("Orientation lock not supported");
        });
      }
    } else {
      // Unlock orientation when exiting fullscreen
      if (screen.orientation?.unlock) {
        screen.orientation.unlock();
      }
    }
  }, [isFullscreen]);

  // Clean up intervals on component unmount
  useEffect(() => {
    return () => {
      if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
      }
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, []);

  const handleThumbnailClick = (index) => {
    setCurrentMediaIndex(index);
  };

  const goToHome = () => {
    setCurrentScreen('video');
    setSelectedRestaurant(null);
    setIsVideoPlaying(false);
    stopAutoRotate();
    setAutoRotate(false);
  };

  const nextMedia = () => {
    if (selectedRestaurant) {
      setCurrentMediaIndex((prev) => 
        prev === selectedRestaurant.media.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevMedia = () => {
    if (selectedRestaurant) {
      setCurrentMediaIndex((prev) => 
        prev === 0 ? selectedRestaurant.media.length - 1 : prev - 1
      );
    }
  };

  const toggleVideo = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  // Screen 1: Video Screen
  const VideoScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Food Discovery</h1>
          <p className="text-white/90 text-lg">Find your next favorite dining experience</p>
        </div>
        
        <button
          onClick={() => setCurrentScreen('restaurants')}
          className="w-full bg-white text-orange-600 py-4 px-8 rounded-xl font-semibold text-lg hover:bg-orange-50 transform transition-all duration-200 hover:scale-105 shadow-lg"
        >
          Explore Restaurants
        </button>
      </div>
    </div>
  );

  // Screen 2: Restaurant List
  const RestaurantListScreen = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">HUNGRY?</h1>
          <p className="text-white/90 mb-1">Unwind with amazing flavors</p>
          <p className="text-white/80">Discover Our Restaurants</p>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => handleRestaurantSelect(restaurant)}
              className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex space-x-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                  <img 
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">{restaurant.name}</h3>
                    <div className="flex items-center bg-orange-100 px-2 py-1 rounded-full">
                      <Star className="w-4 h-4 text-orange-500 fill-current" />
                      <span className="text-sm text-orange-600 ml-1">{restaurant.rating}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2">{restaurant.cuisine}</p>
                  
                  <div className="flex items-center text-gray-500 text-sm mb-3">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{restaurant.openTime} - {restaurant.closeTime}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {restaurant.specialties.slice(0, 2).map((specialty, index) => (
                      <span key={index} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="fixed bottom-6 left-6">
          <button
            onClick={() => setCurrentScreen('video')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transform transition-all duration-200 hover:scale-105"
          >
            Back
          </button>
        </div>

        <div className="fixed bottom-6 right-6">
          <button 
            onClick={() => setCurrentScreen('video')}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transform transition-all duration-200 hover:scale-105 flex items-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Screen 3: Event Schedule Screen
  const EventScheduleScreen = () => {
    if (!selectedRestaurant) return null;

    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-8">
          <h1 className="text-2xl font-bold text-center">{selectedRestaurant.name}</h1>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {selectedRestaurant.events.map((event, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="cursor-pointer" onClick={() => handleEventMenuOrVideo(event)}>
                  <div className="flex items-center space-x-4">
                    <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
                      {event.day}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{event.eventName}</h3>
                      <p className="text-gray-600 text-sm">{event.timeZone}</p>
                      <p className="text-gray-500 text-sm">{event.openTime} to {event.closeTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => handleEventMenuOrVideo(selectedRestaurant.events[0])}
            className="bg-orange-500 text-white px-8 py-4 rounded-full hover:bg-orange-600 transform transition-all duration-200 hover:scale-105 font-semibold"
          >
            Tap Me
          </button>
        </div>

        <div className="fixed bottom-6 left-6">
          <button
            onClick={() => setCurrentScreen('restaurants')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transform transition-all duration-200 hover:scale-105"
          >
            Back
          </button>
        </div>
      </div>
    );
  };

  // Screen 4: Restaurant Details (Media Gallery)
  const RestaurantDetailsScreen = () => {
    if (!selectedRestaurant) return null;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
          <h1 className="text-xl font-bold text-center">
            {selectedEvent ? selectedEvent.eventName : selectedRestaurant.name}
          </h1>
        </div>

        {/* Media Gallery */}
        <div className="p-4">
          {detailsView === 'video' && (
            <div className="mb-6">
              <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'bg-black rounded-lg overflow-hidden'}`}>
                <div 
                  className="relative w-full h-full"
                  onTouchStart={handleTouch}
                  onClick={handleTouch}
                >
                  <img 
                    src={selectedRestaurant.media[currentMediaIndex]}
                    alt={`${selectedRestaurant.name} view ${currentMediaIndex + 1}`}
                    className={`w-full object-cover ${isFullscreen ? 'h-full' : 'h-64'}`}
                  />
                  
                  {/* Navigation buttons */}
                  <button onClick={prevMedia} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={nextMedia} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Media counter */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentMediaIndex + 1} / {selectedRestaurant.media.length}
                  </div>
                </div>
                
                {/* Controls */}
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
                  isFullscreen ? (showControls ? 'opacity-100' : 'opacity-0') : 'opacity-100'
                }`}>
                  <div className="flex items-center space-x-4 bg-black/70 rounded-full px-6 py-3">
                    <button 
                      onClick={togglePlay}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <Maximize className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={rotateCounterClockwise}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={rotateScreen}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <RotateCw className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={toggleAutoRotate}
                      className={`transition-colors ${autoRotate ? 'text-orange-400' : 'text-white hover:text-orange-400'}`}
                    >
                      <Settings className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                {selectedRestaurant.media.map((mediaUrl, index) => (
                  <div 
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      index === currentMediaIndex ? 'border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={mediaUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {detailsView === 'menu' && selectedRestaurant.menuImage && (
            <div className="mb-6">
              <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'bg-white rounded-lg overflow-hidden'}`}>
                <div 
                  className="relative w-full h-full"
                  onTouchStart={handleTouch}
                  onClick={handleTouch}
                >
                  <img
                    src={selectedRestaurant.menuImage}
                    alt={`${selectedRestaurant.name} Menu`}
                    className={`w-full object-contain ${isFullscreen ? 'h-full' : 'h-96'}`}
                  />
                </div>
                
                {/* Menu Controls */}
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
                  isFullscreen ? (showControls ? 'opacity-100' : 'opacity-0') : 'opacity-100'
                }`}>
                  <div className="flex items-center space-x-4 bg-black/70 rounded-full px-6 py-3">
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <Maximize className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={rotateCounterClockwise}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={rotateScreen}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <RotateCw className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={toggleAutoRotate}
                      className={`transition-colors ${autoRotate ? 'text-orange-400' : 'text-white hover:text-orange-400'}`}
                    >
                      <Settings className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detailsView === 'media' && (
            <div className="mb-6">
              <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'bg-black rounded-lg overflow-hidden'}`}>
                <div 
                  className="relative w-full h-full"
                  onTouchStart={handleTouch}
                  onClick={handleTouch}
                >
                  <img 
                    src={selectedRestaurant.media[currentMediaIndex]}
                    alt={`${selectedRestaurant.name} view ${currentMediaIndex + 1}`}
                    className={`w-full object-cover ${isFullscreen ? 'h-full' : 'h-64'}`}
                  />
                  
                  {/* Navigation buttons */}
                  <button onClick={prevMedia} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={nextMedia} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Media counter */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentMediaIndex + 1} / {selectedRestaurant.media.length}
                  </div>
                </div>
                
                {/* Controls */}
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
                  isFullscreen ? (showControls ? 'opacity-100' : 'opacity-0') : 'opacity-100'
                }`}>
                  <div className="flex items-center space-x-4 bg-black/70 rounded-full px-6 py-3">
                    <button 
                      onClick={togglePlay}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    
                    <button 
                      onClick={toggleFullscreen}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <Maximize className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={rotateCounterClockwise}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={rotateScreen}
                      className="text-white hover:text-orange-400 transition-colors"
                    >
                      <RotateCw className="w-6 h-6" />
                    </button>
                    
                    <button 
                      onClick={toggleAutoRotate}
                      className={`transition-colors ${autoRotate ? 'text-orange-400' : 'text-white hover:text-orange-400'}`}
                    >
                      <Settings className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                {selectedRestaurant.media.map((mediaUrl, index) => (
                  <div 
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      index === currentMediaIndex ? 'border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={mediaUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Toggle Buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setDetailsView('media')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                detailsView === 'media' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Media
            </button>
            <button
              onClick={() => setDetailsView('video')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                detailsView === 'video' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Video
            </button>
            {selectedRestaurant.menuImage && (
              <button
                onClick={() => setDetailsView('menu')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  detailsView === 'menu' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Menu
              </button>
            )}
          </div>

          {/* Restaurant Info */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{selectedRestaurant.name}</h2>
            <p className="text-gray-600 mb-4">{selectedRestaurant.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>{selectedRestaurant.openTime} - {selectedRestaurant.closeTime}</span>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 text-orange-500" />
                <span>{selectedRestaurant.rating}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedRestaurant.specialties.map((specialty, index) => (
                <span key={index} className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="fixed bottom-6 left-6">
          <button
            onClick={() => setCurrentScreen('schedule')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transform transition-all duration-200 hover:scale-105"
          >
            Back
          </button>
        </div>

        <div className="fixed bottom-6 right-6">
          <button
            onClick={goToHome}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transform transition-all duration-200 hover:scale-105 flex items-center space-x-2"
          >
            <House className="w-5 h-5" />
            <span>Home</span>
          </button>
        </div>
      </div>
    );
  };

  // Main render function
  const renderScreen = () => {
    switch (currentScreen) {
      case 'video':
        return <VideoScreen />;
      case 'restaurants':
        return <RestaurantListScreen />;
      case 'schedule':
        return <EventScheduleScreen />;
      case 'details':
        return <RestaurantDetailsScreen />;
      default:
        return <VideoScreen />;
    }
  };

  return (
    <div className="font-sans">
      {renderScreen()}
    </div>
  );
};

export default FoodDiscoveryApp;