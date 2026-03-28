#!/usr/bin/env node

const dbus = require('dbus-next');
const express = require('express');
const cors = require('cors');

// 解析命令行参数，检查是否启用 debug 模式
const DEBUG = process.argv.includes('--debug') || process.argv.includes('-d');

function debugLog(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

const app = express();
app.use(cors());
app.use(express.json());

let bus = null;

async function initDBus() {
    try {
        bus = dbus.sessionBus();
        if (DEBUG) console.log('✓ Connected to D-Bus session bus');
        return true;
    } catch (err) {
        console.error('✗ Failed to connect to D-Bus:', err.message);
        return false;
    }
}

async function getAllPlayers() {
    try {
        if (!bus) {
            await initDBus();
        }
        const proxyObj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
        const dbusInterface = proxyObj.getInterface('org.freedesktop.DBus');
        const names = await dbusInterface.ListNames();
        
        const players = names.filter(name => name.startsWith('org.mpris.MediaPlayer2.'));
        debugLog('Found MPRIS players:', players);
        return players;
    } catch (err) {
        console.error('Error getting players:', err);
        return [];
    }
}

async function getPlayerMetadata(playerName) {
    try {
        const obj = await bus.getProxyObject(playerName, '/org/mpris/MediaPlayer2');
        
        let propertiesInterface;
        try {
            propertiesInterface = obj.getInterface('org.freedesktop.DBus.Properties');
        } catch (err) {
            return { playing: false, song: null, player: playerName };
        }
        
        // 获取 Metadata
        let metadata = null;
        try {
            const metadataVariant = await propertiesInterface.Get('org.mpris.MediaPlayer2.Player', 'Metadata');
            metadata = metadataVariant.value;
        } catch (err) {
            return { playing: false, song: null, player: playerName };
        }
        
        // 获取 PlaybackStatus
        let playbackStatus = null;
        try {
            const statusVariant = await propertiesInterface.Get('org.mpris.MediaPlayer2.Player', 'PlaybackStatus');
            playbackStatus = statusVariant.value;
        } catch (err) {
            return { playing: false, song: null, player: playerName };
        }
        
        // 检查是否正在播放
        if (playbackStatus === 'Playing' && metadata && metadata['xesam:title']) {
            // 提取歌曲名
            let songTitle = metadata['xesam:title'];
            if (songTitle && typeof songTitle === 'object' && songTitle.value !== undefined) {
                songTitle = songTitle.value;
            } else if (songTitle && typeof songTitle === 'object' && songTitle._value !== undefined) {
                songTitle = songTitle._value;
            }
            
            // 提取艺术家
            let artists = [];
            if (metadata['xesam:artist']) {
                let artistData = metadata['xesam:artist'];
                if (artistData && typeof artistData === 'object' && artistData.value !== undefined) {
                    artistData = artistData.value;
                } else if (artistData && typeof artistData === 'object' && artistData._value !== undefined) {
                    artistData = artistData._value;
                }
                
                if (Array.isArray(artistData)) {
                    artists = artistData.map(a => {
                        if (typeof a === 'object' && a.value !== undefined) return a.value;
                        if (typeof a === 'object' && a._value !== undefined) return a._value;
                        return String(a);
                    });
                } else if (typeof artistData === 'string') {
                    artists = [artistData];
                } else {
                    artists = [String(artistData)];
                }
            }
            
            // 提取专辑封面
            let albumCover = '';
            if (metadata['mpris:artUrl']) {
                let coverData = metadata['mpris:artUrl'];
                if (coverData && typeof coverData === 'object' && coverData.value !== undefined) {
                    albumCover = coverData.value;
                } else if (coverData && typeof coverData === 'object' && coverData._value !== undefined) {
                    albumCover = coverData._value;
                } else {
                    albumCover = String(coverData);
                }
                
                if (albumCover && typeof albumCover === 'string') {
                    if (albumCover.includes('?param=')) {
                        albumCover = albumCover.split('?')[0];
                    }
                }
            }
            
            // 提取专辑名
            let album = '';
            if (metadata['xesam:album']) {
                let albumData = metadata['xesam:album'];
                if (albumData && typeof albumData === 'object' && albumData.value !== undefined) {
                    album = albumData.value;
                } else if (albumData && typeof albumData === 'object' && albumData._value !== undefined) {
                    album = albumData._value;
                } else {
                    album = String(albumData);
                }
            }
            
            debugLog(`Now playing: ${songTitle} - ${artists.join(', ')}`);
            
            return {
                playing: true,
                player: playerName,
                song: {
                    name: songTitle,
                    artists: artists.map(name => ({ name: name })),
                    album: album,
                    albumCover: albumCover,
                }
            };
        }
        
        return { playing: false, song: null, player: playerName };
    } catch (err) {
        return { playing: false, song: null, player: playerName };
    }
}

async function getActivePlayerStatus() {
    try {
        const players = await getAllPlayers();
        
        if (players.length === 0) {
            return { playing: false, song: null };
        }
        
        for (const player of players) {
            const status = await getPlayerMetadata(player);
            if (status.playing) {
                return status;
            }
        }
        
        return { playing: false, song: null };
    } catch (err) {
        console.error('Error getting active player status:', err);
        return { playing: false, song: null };
    }
}

// API 端点
app.get('/api/playing', async (req, res) => {
    try {
        const status = await getActivePlayerStatus();
        res.json({
            success: true,
            data: {
                playing: status.playing,
                song: status.song
            }
        });
    } catch (err) {
        console.error('API error:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

app.get('/api/players', async (req, res) => {
    try {
        const players = await getAllPlayers();
        res.json({
            success: true,
            players: players
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'MPRIS proxy is running',
        dbus_connected: bus !== null 
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log(`\n=================================`);
    console.log(`MPRIS Proxy Server`);
    console.log(`=================================`);
    console.log(`✓ Server running at http://localhost:${PORT}`);
    console.log(`✓ API endpoint: http://localhost:${PORT}/api/playing`);
    console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
    console.log(`=================================`);
    console.log(`\n💡 Tip: Run with --debug for verbose logging\n`);
    
    await initDBus();
    
    setTimeout(async () => {
        const players = await getAllPlayers();
        if (players.length > 0 && DEBUG) {
            console.log('📻 Available MPRIS players:');
            players.forEach(p => console.log(`   - ${p}`));
        }
    }, 1000);
});