var App = {};

var container = document.getElementById('container');
var currentAlbumCover = document.getElementById('album-current');
var newAlbumCover = document.getElementById('album-new');
var artistsElement = document.getElementById('artists');
var songName = document.getElementById('name');

function timeoutPromise(dur) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, dur);
    });
}

function makeSongName(item) {
    return `${item.artists.map(a => a.name).join(', ')} - ${item.name}`;
}

App.currentSong = '';
App.currentCover = '';
App.open = false;
App.firstAlbumLoad = true;
App.scrollingSong = false;
App.scrollingArtists = false;

// 配置 - 可以修改代理服务器地址
const MPRIS_API = 'http://localhost:3001/api/playing';

App.checkSong = function() {
    fetch(MPRIS_API)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP error ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            setTimeout(function() {
                App.checkSong();
            }, 3000);
            
            if (!data.success || !data.data.playing || !data.data.song) {
                if (App.open) {
                    App.close();
                }
                return;
            }
            
            const song = data.data.song;
            
            const songData = {
                songName: makeSongName(song),
                artists: song.artists,
                title: song.name,
                albumCover: song.albumCover,
            };
            
            if (!App.open) {
                App.openElement();
                setTimeout(function() {
                    App.startUpdate(songData);
                }, 1200);
                return;
            }
            
            App.startUpdate(songData);
        })
        .catch(function(err) {
            console.error('Error fetching now playing:', err);
            if (App.open) {
                App.close();
            }
            setTimeout(function() {
                App.checkSong();
            }, 5000);
        });
};

App.close = function() {
    App.open = false;
    App.firstAlbumLoad = true;
    App.currentCover = '';
    App.currentSong = '';
    songName.classList.add('drop');
    setTimeout(function() {
        artistsElement.classList.add('drop');
    }, 350);
    setTimeout(function() {
        songName.innerHTML = '';
        artistsElement.innerHTML = '';
        songName.className = '';
        artistsElement.className = '';
        App.scrollingSong = false;
        container.classList.remove('active');
    }, 800);
    setTimeout(function() {
        container.classList.remove('raise');
    }, 1350);
    setTimeout(function() {
        currentAlbumCover.src = '';
        currentAlbumCover.classList.remove('active');
        newAlbumCover.src = '';
        newAlbumCover.classList.remove('active');
    }, 1800);
};

App.startUpdate = function(data) {
    if (App.currentSong !== data.songName) {
        App.currentSong = data.songName;
        App.updateSongName(data.artists, data.title);
    }
    if (App.currentCover !== data.albumCover) {
        App.currentCover = data.albumCover;
        App.updateCover(data.albumCover);
    }
};

App.openElement = function() {
    App.open = true;
    container.classList.add('raise');
    setTimeout(function() {
        container.classList.add('active');
    }, 550);
};

App.updateSongName = function(artists = [], name) {
    const maxWidth = container.offsetWidth - 80;
    artistsElement.classList.remove('active');
    setTimeout(function() {
        songName.classList.remove('active');
    }, 200);
    setTimeout(function() {
        artistsElement.textContent = artists.map(function(artist) {
            return artist.name;
        }).join(', ');
        artistsElement.classList.add('active');

        void artistsElement.offsetWidth;

        if (artistsElement.offsetWidth > maxWidth) {
            if (!App.scrollingArtists) {
                App.scrollingArtists = true;
                artistsElement.classList.add('scrolling');
            }
        } else {
            if (App.scrollingArtists) {
                App.scrollingArtists = false;
                artistsElement.classList.remove('scrolling');
            }
        }
    }, 550);
    setTimeout(function() {
        songName.textContent = name;
        
        void songName.offsetWidth;

        if (songName.offsetWidth > maxWidth) {
            if (!App.scrollingSong) {
                App.scrollingSong = true;
                songName.classList.add('scrolling');
            }
        } else {
            if (App.scrollingSong) {
                App.scrollingSong = false;
                songName.classList.remove('scrolling');
            }
        }

        songName.classList.add('active');
    }, 750);
};

App.updateCover = function(cover) {
    if (!cover) {
        return;
    }
    
    newAlbumCover.onerror = function() {
        newAlbumCover.classList.remove('active');
        newAlbumCover.src = '';
        if (App.firstAlbumLoad) {
            App.firstAlbumLoad = false;
        }
    };
    
    newAlbumCover.onload = function() {
        newAlbumCover.className += ' active';
        if (App.firstAlbumLoad) {
            currentAlbumCover.classList.add('active');
            App.firstAlbumLoad = false;
        }
        setTimeout(function() {
            currentAlbumCover.src = cover;
            newAlbumCover.classList.remove('active');
            newAlbumCover.src = '';
        }, 450);
    };
    
    newAlbumCover.src = cover;
};

App.checkSong();