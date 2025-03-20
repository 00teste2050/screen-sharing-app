import { CONFIG } from './config.js';
import { io } from 'socket.io-client';

const socket = io(CONFIG.SOCKET_URL);
const localVideo = document.getElementById('localVideo');
const shareLink = document.getElementById('shareLink');
const copyLinkBtn = document.getElementById('copyLink');
let peerConnections = new Map(); // Store all peer connections

// Get room ID from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

const viewerLink = `${window.location.origin}/viewer.html?room=${roomId}`;
shareLink.value = viewerLink;

copyLinkBtn.addEventListener('click', () => {
    shareLink.select();
    navigator.clipboard.writeText(shareLink.value);
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => copyLinkBtn.textContent = 'Copy Link', 2000);
});

async function startBroadcast() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        localVideo.srcObject = stream;

        // Handle stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            alert('Screen sharing has ended');
            window.location.href = '/';
        });

        // Listen for new viewers
        socket.on('viewer-joined', async viewerId => {
            const peerConnection = new RTCPeerConnection(CONFIG.ICE_SERVERS);
            peerConnections.set(viewerId, peerConnection);

            // Add local stream
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            // Handle ICE candidates
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit('broadcaster-ice', {
                        candidate: event.candidate,
                        viewerId
                    });
                }
            };

            // Create and send offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('broadcaster-offer', {
                offer,
                viewerId
            });
        });

        // Handle ICE candidates from viewers
        socket.on('viewer-ice', async ({ candidate, viewerId }) => {
            const peerConnection = peerConnections.get(viewerId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        // Handle viewer answers
        socket.on('viewer-answer', async ({ answer, viewerId }) => {
            const peerConnection = peerConnections.get(viewerId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(answer);
            }
        });

        // Handle viewer disconnect
        socket.on('viewer-disconnected', viewerId => {
            const peerConnection = peerConnections.get(viewerId);
            if (peerConnection) {
                peerConnection.close();
                peerConnections.delete(viewerId);
            }
        });

        socket.emit('join-room', roomId, 'broadcaster');
        
    } catch (err) {
        console.error('Error starting broadcast:', err);
        alert('Failed to access screen sharing. Please ensure you have granted the necessary permissions.');
        window.location.href = '/';
    }
}

startBroadcast();