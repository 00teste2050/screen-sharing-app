import { io } from 'socket.io-client';

const socket = io('https://screen-sharing-app.onrender.com');
const shareScreenBtn = document.getElementById('shareScreen');

shareScreenBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        // Generate a unique room ID
        const roomId = Math.random().toString(36).substring(2, 15);
        
        // Redirect to broadcaster page with room ID
        window.location.href = `/broadcast.html?room=${roomId}`;
        
    } catch (err) {
        console.error('Error accessing screen:', err);
    }
});

