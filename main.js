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