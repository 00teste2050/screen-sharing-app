import { CONFIG } from './config.js';
import { io } from 'socket.io-client';

const socket = io(CONFIG.SOCKET_URL, CONFIG.SOCKET_OPTIONS);
const remoteVideo = document.getElementById('remoteVideo');
let peerConnection;

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

async function initializeConnection() {
    peerConnection = new RTCPeerConnection(CONFIG.ICE_SERVERS);

    // Handle incoming streams
    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('viewer-ice', {
                candidate: event.candidate,
                roomId
            });
        }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected') {
            alert('Broadcaster disconnected');
            window.location.href = '/';
        }
    };

    socket.on('broadcaster-offer', async ({ offer }) => {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('viewer-answer', { answer, roomId });
    });

    socket.on('broadcaster-ice', async ({ candidate }) => {
        if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    socket.emit('join-room', roomId, 'viewer');
}

initializeConnection();

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (peerConnection) {
        peerConnection.close();
    }
    socket.close();
});