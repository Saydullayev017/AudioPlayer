// DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const tracksList = document.getElementById('tracksList');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const currentTrackTitle = document.getElementById('currentTrackTitle');
const currentTrackArtist = document.getElementById('currentTrackArtist');
const albumArt = document.querySelector('.album-art');
const trackCount = document.getElementById('trackCount');

// Player status
let playerState = {
    currentTrackIndex: -1,
    tracks: [],
    isPlaying: false,
    currentTime: 0
};

// Function to set volume
const setVolume = () => {
    audioPlayer.volume = 0.7;
};

// Function to determine audio duration
const getAudioDuration = (arrayBuffer, type) => {
    return new Promise((resolve) => {
        const audio = new Audio();
        const blob = new Blob([arrayBuffer], { type: type });
        const url = URL.createObjectURL(blob);
        
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
            URL.revokeObjectURL(url);
        });
        
        audio.addEventListener('error', () => {
            resolve(0);
            URL.revokeObjectURL(url);
        });
        
        audio.src = url;
    });
};

// IndexedDB initialization.
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AudioPlayerDB', 1);
        
        request.onerror = (event) => {
            console.error("Error IndexedDB:", event.target.error);
            reject(event.target.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Creating a storage for tracks
            if (!db.objectStoreNames.contains('tracks')) {
                const store = db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('artist', 'artist', { unique: false });
            }
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
};

// Retrieving tracks from IndexedDB
const loadTracksFromDB = async (db) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tracks'], 'readonly');
        const store = transaction.objectStore('tracks');
        const request = store.getAll();
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result || []);
        };
        
        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

// Saving a track in IndexedDB
const saveTrackToDB = async (db, track) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tracks'], 'readwrite');
        const store = transaction.objectStore('tracks');
        const request = store.add(track);
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

// Deleting a track from IndexedDB
const deleteTrackFromDB = async (db, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tracks'], 'readwrite');
        const store = transaction.objectStore('tracks');
        const request = store.delete(id);
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            resolve();
        };
        
        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

// Time formatting in minutes:seconds
const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Track time update
const updateTime = () => {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    // Updating the progress bar
    if (duration && !isNaN(duration)) {
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        
        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
    }
    
    playerState.currentTime = currentTime;
};

// Player interface update
const updatePlayerUI = () => {
    if (playerState.currentTrackIndex >= 0 && playerState.tracks.length > 0) {
        const track = playerState.tracks[playerState.currentTrackIndex];
        
        currentTrackTitle.textContent = track.title || 'Unknown track';
        currentTrackArtist.textContent = track.artist || 'Unknown artist';
        
        // Updating the track list
        renderTracksList();
    }
};

// Playback of the track
const playTrack = (index) => {
    if (index >= 0 && index < playerState.tracks.length) {
        playerState.currentTrackIndex = index;
        const track = playerState.tracks[index];
        
        // Creating a URL for playback from an ArrayBuffer
        const blob = new Blob([track.audioData], { type: track.type });
        const url = URL.createObjectURL(blob);
        
        audioPlayer.src = url;
        audioPlayer.load();
        audioPlayer.play().then(() => {
            playerState.isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            albumArt.parentElement.classList.add('playing');
            updatePlayerUI();
        }).catch(error => {
            console.error("Playback error:", error);
            alert("Playback error: " + error.message);
        });
    }
};

// Playback switching
const togglePlay = () => {
    if (playerState.isPlaying) {
        audioPlayer.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        albumArt.parentElement.classList.remove('playing');
        playerState.isPlaying = false;
    } else {
        if (playerState.currentTrackIndex === -1 && playerState.tracks.length > 0) {
            playTrack(0);
        } else if (playerState.currentTrackIndex >= 0) {
            audioPlayer.play().then(() => {
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                albumArt.parentElement.classList.add('playing');
                playerState.isPlaying = true;
            }).catch(error => {
                console.error("Play error:", error);
            });
        }
    }
};

// Switch to the next track
const nextTrack = () => {
    if (playerState.tracks.length > 0) {
        const nextIndex = (playerState.currentTrackIndex + 1) % playerState.tracks.length;
        playTrack(nextIndex);
    }
};

// Switch to the previous track
const prevTrack = () => {
    if (playerState.tracks.length > 0) {
        let prevIndex = playerState.currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = playerState.tracks.length - 1;
        }
        playTrack(prevIndex);
    }
};

// Seek through the track
const setProgress = (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    
    if (duration && !isNaN(duration)) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
};

// Display the list of tracks
const renderTracksList = () => {
    if (playerState.tracks.length === 0) {
        tracksList.innerHTML = `
            <div class="track-item empty">
                <i class="fas fa-music"></i>
                <div class="track-info-small">
                    <div class="track-title-small">No added tracks</div>
                </div>
            </div>
        `;
        trackCount.textContent = "0 tracks";
        return;
    }
    
    tracksList.innerHTML = '';
    playerState.tracks.forEach((track, index) => {
        const duration = track.duration ? formatTime(track.duration) : '0:00';
        const isActive = index === playerState.currentTrackIndex;
        
        const trackElement = document.createElement('div');
        trackElement.className = `track-item ${isActive ? 'active' : ''}`;
        trackElement.innerHTML = `
            <i class="fas fa-music"></i>
            <div class="track-info-small">
                <div class="track-title-small">${track.title || 'Unknown track'}</div>
                <div class="track-artist-small">${track.artist || 'Unknown artist'}</div>
            </div>
            <div class="track-duration">${duration}</div>
        `;
        
        trackElement.addEventListener('click', () => {
            playTrack(index);
        });
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm("Remove this track?")) {
                if (playerState.currentTrackIndex === index) {
                    audioPlayer.pause();
                    playerState.isPlaying = false;
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                    playerState.currentTrackIndex = -1;
                    currentTrackTitle.textContent = 'Select track';
                    currentTrackArtist.textContent = '—';
                }
                
                try {
                    await deleteTrackFromDB(db, track.id);
                    playerState.tracks = playerState.tracks.filter(t => t.id !== track.id);
                    renderTracksList();
                    trackCount.textContent = `${playerState.tracks.length} tracks`;
                } catch (error) {
                    console.error("Error deleting track:", error);
                    alert("Failed to delete track");
                }
            }
        });
        
        trackElement.appendChild(deleteBtn);
        tracksList.appendChild(trackElement);
    });
    
    trackCount.textContent = `${playerState.tracks.length} tracks`;
};

// File upload
const handleFileUpload = async (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            // Get file data
            const arrayBuffer = e.target.result;
            
            // Determine track duration
            const duration = await getAudioDuration(arrayBuffer, file.type);
            
            // Create a track object
            const track = {
                title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                artist: "Unknown artist",
                type: file.type,
                audioData: arrayBuffer,
                duration: duration,
                added: new Date()
            };
            
            // Save to the database
            const id = await saveTrackToDB(db, track);
            track.id = id;
            
            // Add to the tracks list
            playerState.tracks.push(track);
            
            // Update the interface
            renderTracksList();
            
            // If this is the first track, play it
            if (playerState.tracks.length === 1 && playerState.currentTrackIndex === -1) {
                playTrack(0);
            }
            
            alert(`Track "${track.title}" successfully added!`);
        } catch (error) {
            console.error("File processing error:", error);
            alert("Could not process the file: " + error.message);
        }
    };
    
    reader.onerror = (error) => {
        console.error("File reading error:", error);
        alert("Error reading file");
    };
    
    reader.readAsArrayBuffer(file);
};

// Application initialization
let db;
const initApp = async () => {
    try {
        // Initialize the database
        db = await initDB();
        
        // Load tracks from the database
        playerState.tracks = await loadTracksFromDB(db);
        
        // Display the list of tracks
        renderTracksList();
        
        // Set up event handlers
        playBtn.addEventListener('click', togglePlay);
        prevBtn.addEventListener('click', prevTrack);
        nextBtn.addEventListener('click', nextTrack);
        
        audioPlayer.addEventListener('timeupdate', updateTime);
        audioPlayer.addEventListener('ended', nextTrack);
        
        progressContainer.addEventListener('click', setProgress);
        
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
                fileInput.value = ''; // Reset the value
            }
        });
        
        // Set initial volume
        setVolume();
        
        console.log("Application initialized successfully");
    } catch (error) {
        console.error("Application initialization error:", error);
        alert("An error occurred during application initialization: " + error.message);
    }
};

// Launch the application
document.addEventListener('DOMContentLoaded', initApp);