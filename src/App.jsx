import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import logo from './assets/react.svg'
import * as pdfjsLib from 'pdfjs-dist';
import logo1 from './assets/FinalLogo.png';
import { Upload, Monitor, Search, ToggleLeft, ToggleRight, ArrowRight, Save, X as CancelIcon, Play, Pause, SkipForward, SkipBack,
  ExternalLink, FileImage, FileVideo, FileText, Edit2, Check, AlertCircle, Loader, Maximize, Volume2, VolumeX } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const createApiService = () => {
  const makeRequest = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token && !options.skipAuth) {
      headers.Authorization = `Bearer ${token}`;
    }
    const config = {
      ...options,
      headers,
    };
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };
  

  return {
    async healthCheck() {
      return await makeRequest('/health');
    },
    async login(username, password) {
      const data = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        skipAuth: true,
      });
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      return data;
    },
    async register(username, password) {
      return await makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        skipAuth: true,
      });
    },
    async getMediaFiles(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/media?${queryString}` : '/media';
      return await makeRequest(url);
    },
    async uploadFiles(files, settings) {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('settings', JSON.stringify(settings));
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: 'Upload failed' };
        }
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    async updateMediaFile(id, data) {
      return await makeRequest(`/media/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    async deleteMediaFile(id) {
      return await makeRequest(`/media/${id}`, {
        method: 'DELETE',
      });
    },
  };
};

const isFileInDateRange = (file) => {
  const now = new Date();
  const startDate = file.startDate ? new Date(file.startDate) : null;
  const endDate = file.endDate ? new Date(file.endDate) : null;
  
  // If no dates are set, file can be active
  if (!startDate && !endDate) {
    return true;
  }
  
  // If only start date is set, check if current time is after start
  if (startDate && !endDate) {
    return now >= startDate;
  }
  
  // If only end date is set, check if current time is before end
  if (!startDate && endDate) {
    return now <= endDate;
  }
  
  // If both dates are set, check if current time is within range
  if (startDate && endDate) {
    return now >= startDate && now <= endDate;
  }
  
  return true;
};

const getEffectiveStatus = (file) => {
  // If file is manually set to inactive, respect that
  if (file.status === 'inactive') {
    return 'inactive';
  }
  
  // If file is set to active, check date range
  if (file.status === 'active') {
    return isFileInDateRange(file) ? 'active' : 'inactive';
  }
  
  return file.status;
};

const truncateFileName = (name, maxLength = 30) => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 3) + '...';
};

const PreviewDisplay = ({ mediaFiles, isPlaying, setIsPlaying, currentIndex, setCurrentIndex, showControls = true }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [autoRotateInterval, setAutoRotateInterval] = useState(false);
  const [videoError, setVideoError] = useState(null); // New state for video errors
  const [videoSupported, setVideoSupported] = useState(true); // New state for video support
  const intervalRef = useRef(null);
  const rotationIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const containerRef = useRef(null);

  const getActiveMedia = () =>
    mediaFiles
      .filter(f => getEffectiveStatus(f) === 'active')
      .sort((a, b) => a.priority - b.priority);

  const activeMedia = getActiveMedia();
  const currentFile = activeMedia[currentIndex];

  // Function to check if video format is supported
  const checkVideoSupport = (videoElement, url) => {
    const videoTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/mov',
      'video/avi'
    ];

    // Try to determine MIME type from file extension
    const extension = url.split('.').pop().toLowerCase();
    let mimeType = '';
    
    switch (extension) {
      case 'mp4':
        mimeType = 'video/mp4';
        break;
      case 'webm':
        mimeType = 'video/webm';
        break;
      case 'ogg':
        mimeType = 'video/ogg';
        break;
      case 'mov':
        mimeType = 'video/mov';
        break;
      case 'avi':
        mimeType = 'video/avi';
        break;
      default:
        mimeType = 'video/mp4'; // Default fallback
    }

    // Check if the browser can play this type
    const canPlay = videoElement.canPlayType(mimeType);
    return canPlay !== '' && canPlay !== 'no';
  };

  useEffect(() => {
    if (isPlaying && autoRotate && activeMedia.length > 0 && currentFile) {
      let duration;
      if (currentFile.type === 'video') {
        if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
          duration = videoRef.current.duration * 1000;
        } else {
          duration = (currentFile.duration || 30) * 1000;
        }
      } else {
        duration = (currentFile.duration || 30) * 1000;
      }

      let start = Date.now();
      setProgress(0);

      const updateProgress = () => {
        const elapsed = Date.now() - start;
        const percent = Math.min((elapsed / duration) * 100, 100);
        setProgress(percent);

        if (percent < 100) {
          progressRef.current = requestAnimationFrame(updateProgress);
        }
      };

      updateProgress();

      intervalRef.current = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % activeMedia.length);
        setRotation(0);
        cancelAnimationFrame(progressRef.current);
      }, duration);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      cancelAnimationFrame(progressRef.current);
    };
  }, [isPlaying, autoRotate, currentIndex, activeMedia.length, currentFile?.id]);

  useEffect(() => {
    if (autoRotateInterval && isPlaying) {
      rotationIntervalRef.current = setInterval(() => {
        setRotation(prev => (prev + 90) % 360);
      }, 3000);
    } else {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
    }

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
    };
  }, [autoRotateInterval, isPlaying]);

  useEffect(() => {
    if (currentIndex >= activeMedia.length && activeMedia.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeMedia.length, currentIndex, setCurrentIndex]);

  useEffect(() => {
    setRotation(0);
    setVideoError(null); // Reset video error when changing slides
    setVideoSupported(true); // Reset video support when changing slides
  }, [currentIndex]);

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current && isPlaying) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 1;
      videoRef.current.play().catch(error => {
        console.error('Video play failed:', error);
        setVideoError(error.message);
      });
    }
  };

  const handleVideoError = (e) => {
    console.error('Video failed to load:', currentFile.url, e.target.error);
    const error = e.target.error;
    let errorMessage = 'Video failed to load';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported or corrupted';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported by browser';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    setVideoError(errorMessage);
    setVideoSupported(false);
  };

  const handleVideoCanPlay = () => {
    setVideoError(null);
    setVideoSupported(true);
  };

  const openExternalPreview = () => {
    const activeMedia = getActiveMedia();
    // Use sessionStorage instead of localStorage for temporary data
    sessionStorage.setItem('previewMediaFiles', JSON.stringify(activeMedia));
    sessionStorage.setItem('previewIsPlaying', JSON.stringify(isPlaying));
    sessionStorage.setItem('previewCurrentIndex', JSON.stringify(currentIndex));
    const baseUrl = window.location.origin;
    const previewUrl = `${baseUrl}?preview=true`;
    window.open(previewUrl, 'PreviewDisplay', `width=${window.screen.availWidth},height=${window.screen.availHeight},left=0,top=0`);
  };

  const handleVideoEnd = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(error => {
          console.error('Video restart failed:', error);
          setVideoError(error.message);
        });
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
      videoRef.current.volume = newMutedState ? 0 : 1;
    }
  };

  const toggleAutoRotate = () => {
    setAutoRotate(prev => !prev);
  };

  const toggleAutoRotateInterval = () => {
    setAutoRotateInterval(prev => !prev);
  };

  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  const rotate180 = () => {
    setRotation(prev => (prev + 180) % 360);
  };

  const resetRotation = () => {
    setRotation(0);
  };

  const nextSlide = () => {
    if (activeMedia.length > 0) {
      setCurrentIndex(prev => (prev + 1) % activeMedia.length);
    }
  };

  const prevSlide = () => {
    if (activeMedia.length > 0) {
      setCurrentIndex(prev => (prev - 1 + activeMedia.length) % activeMedia.length);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(prev => !prev);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current?.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current?.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
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
    if (videoRef.current && currentFile?.type === 'video') {
      if (isPlaying && videoSupported && !videoError) {
        videoRef.current.play().catch(error => {
          console.error('Video play failed:', error);
          setVideoError(error.message);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentFile?.id, videoSupported, videoError]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  if (!currentFile) {
    return (
      <div className="preview-display-no-files" ref={containerRef}>
        <Monitor size={64} className="preview-display-no-files-icon" />
        <div className="preview-display-no-files-title">No active media files</div>
        <div className="preview-display-no-files-subtitle">Upload files and set them to active to see preview</div>
        {showControls && (
          <div className="preview-display-controls">
            <button
              onClick={toggleFullscreen}
              className="btn-preview-control"
              title="Toggle Fullscreen"
            >
              <Maximize size={20} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="preview-display-container" ref={containerRef}>
      {/* Progress Bar */}
      {autoRotate && isPlaying && (
        <div className="preview-progress-bar">
          <div 
            className="preview-progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Media Content with rotation */}
      <div 
        className="preview-media-wrapper"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.5s ease-in-out'
        }}
      >
        {currentFile.type === 'image' ? (
          <img
            key={currentFile.id}
            src={currentFile.url}
            alt={currentFile.name}
            className="preview-display-media"
            onError={(e) => {
              console.error('Image failed to load:', currentFile.url);
              e.target.style.display = 'none';
            }}
          />
        ) : currentFile.type === 'pdf' ? (
          <embed
            key={currentFile.id}
            src={currentFile.url}
            type="application/pdf"
            className="preview-display-media"
            style={{ width: '100%', height: '100%' }}
            title={currentFile.name}
          />
        ) : (
          <div className="video-container">
            {videoError && (
              <div className="video-error-overlay">
                <div className="video-error-content">
                  <AlertCircle size={48} />
                  <h3>Video Error</h3>
                  <p>{videoError}</p>
                  <p className="video-error-hint">
                    Try converting to MP4 format or check if the file is corrupted
                  </p>
                </div>
              </div>
            )}
            <video
              ref={videoRef}
              key={currentFile.id}
              src={currentFile.url}
              className="preview-display-media"
              autoPlay={isPlaying}
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              onLoadedMetadata={handleVideoLoadedMetadata}
              onCanPlay={handleVideoCanPlay}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              style={{ 
                display: videoError ? 'none' : 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            >
              {/* Fallback sources for better browser compatibility */}
              <source src={currentFile.url} type="video/mp4" />
              <source src={currentFile.url} type="video/webm" />
              <source src={currentFile.url} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="preview-display-controls">
          {/* Playback Controls */}
          <div className="control-group">
            <button
              onClick={prevSlide}
              className="btn-preview-control"
              title="Previous"
              disabled={activeMedia.length <= 1}
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={togglePlayback}
              className="btn-preview-control"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={nextSlide}
              className="btn-preview-control"
              title="Next"
              disabled={activeMedia.length <= 1}
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Auto Rotate Controls */}
          <div className="control-group">
            <button
              onClick={toggleAutoRotate}
              className={`btn-preview-control ${autoRotate ? 'active' : ''}`}
              title={autoRotate ? 'Disable Auto Slide' : 'Enable Auto Slide'}
            >
              <ArrowRight size={20} className={autoRotate ? 'rotating' : ''} />
            </button>

            <button
              onClick={toggleAutoRotateInterval}
              className={`btn-preview-control ${autoRotateInterval ? 'active' : ''}`}
              title={autoRotateInterval ? 'Disable Auto Rotate' : 'Enable Auto Rotate'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.6 1.99"/>
                <path d="M16 8l4-4-4-4"/>
              </svg>
            </button>
          </div>

          {/* Manual Rotation Controls */}
          <div className="control-group">
            <button
              onClick={rotateCounterClockwise}
              className="btn-preview-control"
              title="Rotate 90° Counter-Clockwise"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9c-2.12 0-4.07-.74-5.6-1.99"/>
                <path d="M8 16l-4 4 4 4"/>
              </svg>
            </button>

            <button
              onClick={rotateClockwise}
              className="btn-preview-control"
              title="Rotate 90° Clockwise"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.12 0 4.07.74 5.6 1.99"/>
                <path d="M16 8l4-4-4-4"/>
              </svg>
            </button>

            <button
              onClick={rotate180}
              className="btn-preview-control"
              title="Rotate 180°"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v10m-5-5h10"/>
              </svg>
            </button>

            <button
              onClick={resetRotation}
              className="btn-preview-control"
              title="Reset Rotation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 16l-5 5v-5"/>
              </svg>
            </button>
          </div>

          {/* Additional Controls */}
          <div className="control-group">
            {currentFile.type === 'video' && !videoError && (
              <button
                onClick={toggleMute}
                className="btn-preview-control"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            
            <button
              onClick={toggleFullscreen}
              className="btn-preview-control"
              title="Toggle Fullscreen"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Rotation Indicator */}
      {rotation !== 0 && (
        <div className="rotation-indicator">
          {rotation}°
        </div>
      )}
    </div>
  );
};

const App = () => {
  const apiService = createApiService();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stagedUploads, setStagedUploads] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [uploadSettings, setUploadSettings] = useState({
    duration: 120,
    priority: 0,
    startDate: '',
    endDate: '',
  });
  const [localSettings, setLocalSettings] = useState({ ...uploadSettings });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});

  const [notification, setNotification] = useState({ type: '', message: '' });

  const fileInputRef = useRef(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsLoggedIn(true);
      loadMediaFiles();
    }
  }, []);

  const loadMediaFiles = async () => {
    try {
      setIsLoadingMedia(true);
      const data = await apiService.getMediaFiles();
      const convertedFiles = data.map(file => ({
        id: file.id,
        name: file.original_name,
        type: file.type,
        status: file.status,
        uploadTime: file.upload_time,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        duration: file.duration || (file.type === 'image' ? 30 : 30),
        priority: file.priority,
        startDate: file.start_date || '',
        endDate: file.end_date || '',
        url: file.url,
        views: 0,
      }));
      setMediaFiles(convertedFiles);
    } catch (error) {
      showNotification('error', 'Failed to load media files: ' + error.message);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const getActiveMedia = () =>
    mediaFiles
      .filter(f => f.status === 'active')
      .sort((a, b) => a.priority - b.priority);

  const extractVideoDuration = (file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const duration = Math.round(video.duration);
        resolve(duration > 0 ? duration : 30);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(30);
      };
    });
  };

  const renderPdfToCanvas = async (file) => {
  try {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1); // Get first page
    
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering PDF:', error);
    return null;
  }
};

  const processFiles = async (files) => {
  const prelimFiles = [];
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isVideo && !isPdf) {
      showNotification('error', `File "${file.name}" is not supported. Please upload images, videos, or PDFs only.`);
      continue;
    }

    let fileType = 'image';
    if (isVideo) fileType = 'video';
    if (isPdf) fileType = 'pdf';

    const fileObj = {
      id: Date.now() + Math.random(),
      name: file.name,
      type: fileType,
      status: 'active',
      uploadTime: new Date().toISOString(),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      duration: (isImage || isPdf) ? 30 : 0,
      priority: 0,
      startDate: '',
      endDate: '',
      url: URL.createObjectURL(file),
      views: 0,
      fileOrigin: file,
    };

    prelimFiles.push(fileObj);
  }

  setStagedUploads(prev => [...prev, ...prelimFiles]);

  // Extract video durations
  for (const fileObj of prelimFiles) {
    if (fileObj.type === 'video') {
      const duration = await extractVideoDuration(fileObj.fileOrigin);
      setStagedUploads(prev => prev.map(f => {
        if (f.id === fileObj.id) {
          return { ...f, duration };
        }
        return f;
      }));
    }
  }
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
    if (localSettings.duration < 1) {
      showNotification('error', 'Please enter a valid duration (minimum 1 second).');
      return;
    }
    if (localSettings.priority < 0 || localSettings.priority > 100) {
      showNotification('error', 'Priority must be between 0 and 100.');
      return;
    }
    if (stagedUploads.length === 0) {
      showNotification('error', 'No files to upload.');
      return;
    }
    const existingPriorities = mediaFiles.map(f => f.priority);
    if (existingPriorities.includes(localSettings.priority)) {
      showNotification('error', `Priority ${localSettings.priority} is already in use. Please choose a unique value.`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadSettings({ ...localSettings });
      const filesToUpload = stagedUploads.map(f => f.fileOrigin);
      const settings = {
        duration: localSettings.duration,
        priority: localSettings.priority,
        startDate: localSettings.startDate,
        endDate: localSettings.endDate,
      };
      await apiService.uploadFiles(filesToUpload, settings);
      stagedUploads.forEach(f => URL.revokeObjectURL(f.url));
      setStagedUploads([]);
      showNotification('success', `Successfully uploaded ${filesToUpload.length} file(s)!`);
      await loadMediaFiles();
    } catch (error) {
      showNotification('error', 'Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const discardUploads = () => {
    stagedUploads.forEach(f => URL.revokeObjectURL(f.url));
    setStagedUploads([]);
  };

  const filteredMedia = mediaFiles.filter(f => {
    const matchesSearch = f && f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' ||
      (filterType === 'active' && f.status === 'active') ||
      (filterType === 'inactive' && f.status === 'inactive') ||
      (filterType === 'image' && f.type === 'image') ||
      (filterType === 'video' && f.type === 'video') ||
      (filterType === 'pdf' && f.type === 'pdf');

    return matchesSearch && matchesFilter;
  });

  const toggleFileStatus = async (id) => {
  try {
    const file = mediaFiles.find(f => f.id === id);
    
    // Check if trying to activate a file that's outside date range
    if (file.status === 'inactive' && !isFileInDateRange(file)) {
      const now = new Date().toLocaleString();
      const startDate = file.startDate ? new Date(file.startDate).toLocaleString() : 'Not set';
      const endDate = file.endDate ? new Date(file.endDate).toLocaleString() : 'Not set';
      
      showNotification('error', `Cannot activate file: Outside scheduled time range. Current: ${now}, Start: ${startDate}, End: ${endDate}`);
      return;
    }
    
    const newStatus = file.status === 'active' ? 'inactive' : 'active';
    await apiService.updateMediaFile(id, { status: newStatus });
    
    setMediaFiles(prev => prev.map(f =>
      f.id === id ? { ...f, status: newStatus } : f
    ));
    
    showNotification('success', `File status updated to ${newStatus}`);
  } catch (error) {
    showNotification('error', 'Failed to update file status: ' + error.message);
  }
};

  const deleteFile = async (id) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }
    try {
      await apiService.deleteMediaFile(id);
      setMediaFiles(prev => prev.filter(f => f.id !== id));
      showNotification('success', 'File deleted successfully');
    } catch (error) {
      showNotification('error', 'Failed to delete file: ' + error.message);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(prev => !prev);
  };

  const nextSlide = () => {
    const activeMedia = getActiveMedia();
    if (activeMedia.length > 0) {
      setCurrentIndex(prev => (prev + 1) % activeMedia.length);
    }
  };

  const prevSlide = () => {
    const activeMedia = getActiveMedia();
    if (activeMedia.length > 0) {
      setCurrentIndex(prev => (prev - 1 + activeMedia.length) % activeMedia.length);
    }
  };

  const openExternalPreview = () => {
    const activeMedia = getActiveMedia();
    localStorage.setItem('previewMediaFiles', JSON.stringify(activeMedia));
    localStorage.setItem('previewIsPlaying', JSON.stringify(isPlaying));
    localStorage.setItem('previewCurrentIndex', JSON.stringify(currentIndex));
    const baseUrl = window.location.origin;
    const previewUrl = `${baseUrl}?preview=true`;
    window.open(previewUrl, 'PreviewDisplay', `width=${window.screen.availWidth},height=${window.screen.availHeight},left=0,top=0`);
  };

  const handleEditClick = (file) => {
    setEditRowId(file.id);
    setEditRowData({
      duration: file.duration || 30,
      priority: file.priority || 0,
      startDate: file.startDate || '',
      endDate: file.endDate || '',
      name: file.name || '',
    });
  };

  const handleCancelEdit = () => {
    setEditRowId(null);
    setEditRowData({});
  };

  const handleSaveEdit = async (id) => {
    try {
      const durationValue = Number(editRowData.duration);
      const priorityValue = Number(editRowData.priority) || 0;

      if (isNaN(durationValue) || durationValue < 1) {
        showNotification('error', 'Duration must be a valid number greater than 0');
        return;
      }
      if (priorityValue < 0 || priorityValue > 100) {
        showNotification('error', 'Priority must be between 0 and 100');
        return;
      }
      const isPriorityTaken = mediaFiles.some(f => f.id !== id && f.priority === priorityValue);
      if (isPriorityTaken) {
        showNotification('error', `Priority ${priorityValue} is already assigned to another file. Please choose a different one.`);
        return;
      }

      if (!editRowData.name || editRowData.name.trim() === '') {
        showNotification('error', 'File name cannot be empty');
        return;
      }

      const updateData = {
        duration: durationValue,
        priority: priorityValue,
        name: editRowData.name.trim(),
      };

      if (editRowData.startDate && editRowData.startDate.trim() !== '') {
        updateData.startDate = editRowData.startDate;
      }
      if (editRowData.endDate && editRowData.endDate.trim() !== '') {
        updateData.endDate = editRowData.endDate;
      }

      const response = await fetch(`${API_BASE_URL}/media/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(updateData),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: `Server error: ${response.status} - ${responseText}` };
        }
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      setMediaFiles(prevFiles => prevFiles.map(file =>
        file.id === id ? {
          ...file,
          duration: durationValue,
          priority: priorityValue,
          startDate: editRowData.startDate || '',
          endDate: editRowData.endDate || '',
          name: editRowData.name.trim(),
        } : file
      ));

      setEditRowId(null);
      setEditRowData({});
      showNotification('success', 'File updated successfully');
    } catch (error) {
      let errorMessage = 'Failed to update file';
      const msg = error.message;
      if (msg.includes('Network')) {
        errorMessage = 'Network error - please check your connection';
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        errorMessage = 'Session expired - please log in again';
        handleLogout();
        return;
      } else if (msg.includes('400')) {
        errorMessage = 'Invalid data - please check your inputs';
      } else if (msg.includes('404')) {
        errorMessage = 'File not found - it may have been deleted';
        await loadMediaFiles();
      } else if (msg.includes('500')) {
        errorMessage = 'Server error - please try again or contact support';
      } else {
        errorMessage = msg || 'Unknown error occurred';
      }
      showNotification('error', errorMessage);
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditRowData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsLoggedIn(false);
    setMediaFiles([]);
    setStagedUploads([]);
    setLoginUser('');
    setLoginPass('');
  };

  const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
  if (isPreviewMode) {
    const storedMedia = (JSON.parse(localStorage.getItem('previewMediaFiles') || '[]') || [])
      .filter(f => f.status === 'active')
      .sort((a, b) => a.priority - b.priority);
    const storedPlaying = JSON.parse(localStorage.getItem('previewIsPlaying') || 'true');
    const storedIndex = JSON.parse(localStorage.getItem('previewCurrentIndex') || '0');

    const [mediaFiles, setMediaFiles] = useState(storedMedia);
    const [isPlaying, setIsPlaying] = useState(storedPlaying);
    const [currentIndex, setCurrentIndex] = useState(storedIndex);

    return (
      <div className="preview-fullscreen">
        <PreviewDisplay
          mediaFiles={mediaFiles}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
        />
      </div>
    );
  }

  if (!isLoggedIn) {
  return (
    <main className="main-login">
      <section className="login-container">
        <div className="login-headers">
          <div className="login-brands">
            <div className="brand-boxs">
              <div className="app-titles">
                <img src={logo1} alt='Thames'/>
              </div>
            </div>
          </div>
          <h1 className="login-welcome">Welcome Back!!</h1>
          <p className="login-subtitle">Please Login to your account</p>
        </div>
        
        <div className="login-form-wrapper">
          <h2 className="login-form-title">USER LOGIN</h2>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!loginUser.trim() || !loginPass.trim()) {
              setLoginError('Please enter username and password');
              return;
            }
            try {
              setIsLoggingIn(true);
              setLoginError('');
              await apiService.login(loginUser.trim(), loginPass.trim());
              setIsLoggedIn(true);
              showNotification('success', 'Successfully logged in!');
              await loadMediaFiles();
            } catch (error) {
              setLoginError(error.message || 'Login failed. Please try again.');
            } finally {
              setIsLoggingIn(false);
            }
          }} className="login-form">
            
            <div className="form-group-with-icon">
              <div className="input-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#B8B8B8"/>
                  <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="#B8B8B8"/>
                </svg>
              </div>
              <input
                id="username"
                type="text"
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                placeholder="Username"
                required
                disabled={isLoggingIn}
                className="form-input-styled"
                autoComplete="username"
              />
            </div>

            <div className="form-group-with-icon">
              <div className="input-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13S14 13.9 14 15S13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9S15.1 4.29 15.1 6V8Z" fill="#B8B8B8"/>
                </svg>
              </div>
              <input
                id="password"
                type="password"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                placeholder="Password"
                required
                disabled={isLoggingIn}
                className="form-input-styled"
                autoComplete="current-password"
              />
            </div>

            {loginError && <p role="alert" className="form-error">{loginError}</p>}
            
            <button type="submit" disabled={isLoggingIn} className="btn-login-styled">
              {isLoggingIn ? (
                <>
                  <Loader size={24} className="loader-spin" />
                  Signing In...
                </>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

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
              <img src={logo1} alt='Thames'/>
              Digital Display Manager
            </div>
          <div className="header-actions">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`btn-upload ${isUploading ? 'btn-disabled' : ''}`}
              aria-label="Upload files"
              type="button"
            >
              <Upload size={20} />
              {isUploading ? 'Uploading...' : 'Upload Files'}
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


        {/* Main Content */}
        <div className="main-content">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => processFiles(Array.from(e.target.files))}
          className="file-input-hidden"
        />

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

        {/* Staged Files for Upload */}
        {stagedUploads.length > 0 && (
          <section className="staged-files-section">
            <div className="staged-files-header">
              <h3>Files Ready for Upload ({stagedUploads.length})</h3>
              <div className="staged-files-actions">
                <button
                  onClick={handleSaveAll}
                  disabled={isUploading}
                  className={`btn-save-all ${isUploading ? 'btn-disabled' : ''}`}
                >
                  <Save size={20} />
                  {isUploading ? 'Uploading...' : 'Save All'}
                </button>
                <button
                  onClick={discardUploads}
                  disabled={isUploading}
                  className="btn-discard"
                >
                  <CancelIcon size={20} />
                  Discard
                </button>
              </div>
            </div>

            {/* Upload Settings */}
            <div className="upload-settings">
              <div className="settings-row">
                <div className="form-group">
                  <label htmlFor="duration" className="form-label">Default Duration (seconds)</label>
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    value={localSettings.duration}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="priority" className="form-label">Priority (0-100)</label>
                  <input
                    id="priority"
                    type="number"
                    min="0"
                    max="100"
                    value={localSettings.priority}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="settings-row">
                <div className="form-group">
                  <label htmlFor="startDate" className="form-label">Start Date (optional)</label>
                  <input
                    id="startDate"
                    type="datetime-local"
                    value={localSettings.startDate}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, startDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endDate" className="form-label">End Date (optional)</label>
                  <input
                    id="endDate"
                    type="datetime-local"
                    value={localSettings.endDate}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, endDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Staged Files List */}
            <div className="staged-files-list">
              {stagedUploads.map(file => (
                <div key={file.id} className="staged-file-item">
                  <div className="staged-file-icon">
                    {file.type === 'image' ? <FileImage size={24} /> : 
                    file.type === 'video' ? <FileVideo size={24} /> : 
                    <FileText size={24} />}
                  </div>
                  <div className="staged-file-info">
                    <div className="staged-file-name">{truncateFileName(file.name)}</div>
                    <div className="staged-file-details">
                      {file.type} • {file.size} • {file.duration}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
          {/* Preview Display */}
          <section className="preview-section">
            <div className="preview-header">
              <h2>Live Previews</h2>
              <div className="preview-controls">
                <button
                  onClick={prevSlide}
                  className="btn-preview-controls"
                  title="Previous"
                >
                  <SkipBack size={20} />
                </button>
                <button
                  onClick={togglePlayback}
                  className="btn-preview-controls"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={nextSlide}
                  className="btn-preview-controls"
                  title="Next"
                >
                  <SkipForward size={20} />
                </button>
                <button
                  onClick={openExternalPreview}
                  className="btn-preview-controls"
                  title="Open in new window"
                >
                  <ExternalLink size={20} />
                </button>
              </div>
            </div>
            <PreviewDisplay
              mediaFiles={mediaFiles}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
            />
          </section>
      </div>
          {/* Media Library */}
          <section className="media-library-section">
            <div className="media-library-header">
              <h2>My Media Library</h2>
              <div className="media-library-controls">
                <div className="search-controls">
                  <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search files..."
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="pdf">PDFs</option>
                  </select>
                </div>
              </div>
            </div>

            {isLoadingMedia ? (
              <div className="loading-state">
                <Loader size={32} className="loader-spin" />
                <p>Loading media files...</p>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="empty-state">
                <FileImage size={64} className="empty-state-icon" />
                <h3>No files found</h3>
                <p>
                  {searchTerm || filterType !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Upload some files to get started'}
                </p>
              </div>
            ) : (
              <div className="media-table-container">
                <table className="media-table">
                  <thead>
                    <tr>
                      <th>Sr.</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Size</th>
                      <th>Duration</th>
                      <th>Priority</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedia.map((file, index) => (
                    <tr key={file.id} className={`media-row ${file.status}`}>
                      <td>{index + 1}</td>
                        <td className="media-name">
                          {editRowId === file.id ? (
                            <input
                              type="text"
                              value={editRowData.name || ''}
                              onChange={(e) => handleEditInputChange('name', e.target.value)}
                              className="edit-input"
                            />
                          ) : (
                            <div className="media-name-content">
                              {file.type === 'image' ? <FileImage size={16} /> : 
                              file.type === 'video' ? <FileVideo size={16} /> : 
                              <FileText size={16} />}
                              <span title={file.name}>{truncateFileName(file.name, 25)}</span>
                            </div>
                          )}
                        </td>
                        <td className="media-type">
                          <span className={`type-badge ${file.type}`}>
                            {file.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="media-status">
                          {(() => {
                            const effectiveStatus = getEffectiveStatus(file);
                            const isOutsideRange = file.status === 'active' && effectiveStatus === 'inactive';
                            
                            return (
                              <div className="status-container">
                                <span className={`status-badge ${effectiveStatus}`}>
                                  {effectiveStatus.toUpperCase()}
                                </span>
                                {isOutsideRange && (
                                  <span className="status-indicator" title="Outside scheduled time range">
                                    ⏰
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="media-size">{file.size}</td>
                        <td className="media-duration">
                          {editRowId === file.id ? (
                            <input
                              type="number"
                              min="1"
                              value={editRowData.duration || ''}
                              onChange={(e) => handleEditInputChange('duration', e.target.value)}
                              className="edit-input edit-input-small"
                            />
                          ) : (
                            `${file.duration}s`
                          )}
                        </td>
                        <td className="media-priority">
                          {editRowId === file.id ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editRowData.priority || ''}
                              onChange={(e) => handleEditInputChange('priority', e.target.value)}
                              className="edit-input edit-input-small"
                            />
                          ) : (
                            file.priority
                          )}
                        </td>
                        <td className="media-date">
                          {editRowId === file.id ? (
                            <input
                              type="datetime-local"
                              value={editRowData.startDate || ''}
                              onChange={(e) => handleEditInputChange('startDate', e.target.value)}
                              className="edit-input"
                            />
                          ) : (
                            file.startDate ? new Date(file.startDate).toLocaleDateString() : '-'
                          )}
                        </td>
                        <td className="media-date">
                          {editRowId === file.id ? (
                            <input
                              type="datetime-local"
                              value={editRowData.endDate || ''}
                              onChange={(e) => handleEditInputChange('endDate', e.target.value)}
                              className="edit-input"
                            />
                          ) : (
                            file.endDate ? new Date(file.endDate).toLocaleDateString() : '-'
                          )}
                        </td>
                        <td className="media-actions">
                          {editRowId === file.id ? (
                            <div className="edit-actions">
                              <button
                                onClick={() => handleSaveEdit(file.id)}
                                className="btn-action btn-save"
                                title="Save changes"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="btn-action btn-cancel"
                                title="Cancel editing"
                              >
                                <CancelIcon size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="row-actions">
                              <button
                                onClick={() => handleEditClick(file)}
                                className="btn-action btn-edit"
                                title="Edit file"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => toggleFileStatus(file.id)}
                                className={`btn-action ${(() => {
                                  const effectiveStatus = getEffectiveStatus(file);
                                  const isOutsideRange = file.status === 'active' && effectiveStatus === 'inactive';
                                  
                                  if (isOutsideRange) {
                                    return 'btn-scheduled';
                                  }
                                  return file.status === 'active' ? 'btn-deactivate' : 'btn-activate';
                                })()}`}
                                title={(() => {
                                  const effectiveStatus = getEffectiveStatus(file);
                                  const isOutsideRange = file.status === 'active' && effectiveStatus === 'inactive';
                                  
                                  if (isOutsideRange) {
                                    return 'Scheduled but outside time range';
                                  }
                                  return file.status === 'active' ? 'Deactivate' : 'Activate';
                                })()}
                              >
                                {(() => {
                                  const effectiveStatus = getEffectiveStatus(file);
                                  const isOutsideRange = file.status === 'active' && effectiveStatus === 'inactive';
                                  
                                  if (isOutsideRange) {
                                    return <ToggleLeft size={16} style={{color: '#ff9800'}} />;
                                  }
                                  return file.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />;
                                })()}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          
          <footer className="app-footer">
            <p>
              &copy; 2016-2025 All rights reserved | Powered by <a href='https://caymanwebtech.com/'>CWT</a>
            </p>
          </footer>

        </div>
    </main>
  );
};

export default App;