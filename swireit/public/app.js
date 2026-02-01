let ws = null;
let localStream = null;
let peerConnection = null;
let currentCallId = null;
let myClientId = null;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function connect() {
    const clientId = document.getElementById('clientId').value.trim();
    if (!clientId) {
        alert('Please enter a client ID');
        return;
    }

    myClientId = clientId;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: 'register',
            clientId: myClientId
        }));
    };

    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);

        switch (data.type) {
            case 'registered':
                updateConnectionStatus(true);
                document.getElementById('callSection').classList.remove('hidden');
                break;

            case 'incoming-call':
                handleIncomingCall(data);
                break;

            case 'call-answered':
                await handleCallAnswered(data);
                break;

            case 'ice-candidate':
                await handleIceCandidate(data);
                break;

            case 'call-ended':
                handleCallEnded();
                break;

            case 'call-failed':
                alert('Call failed: ' + data.reason);
                break;
        }
    };

    ws.onclose = () => {
        updateConnectionStatus(false);
        document.getElementById('callSection').classList.add('hidden');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('Connection error');
    };
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.textContent = `Connected as ${myClientId}`;
        statusEl.className = 'status connected';
        document.getElementById('connectBtn').disabled = true;
        document.getElementById('clientId').disabled = true;
    } else {
        statusEl.textContent = 'Disconnected';
        statusEl.className = 'status disconnected';
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('clientId').disabled = false;
    }
}

async function makeCall() {
    const targetId = document.getElementById('targetId').value.trim();
    if (!targetId) {
        alert('Please enter a target client ID');
        return;
    }

    try {
        // Get local media stream
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        document.getElementById('localAudio').srcObject = localStream;

        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    to: targetId,
                    from: myClientId
                }));
            }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            document.getElementById('remoteAudio').srcObject = event.streams[0];
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        ws.send(JSON.stringify({
            type: 'call',
            to: targetId,
            offer: offer
        }));

        updateCallStatus('Calling...');
        document.getElementById('callBtn').disabled = true;
        document.getElementById('hangupBtn').classList.remove('hidden');

    } catch (error) {
        console.error('Error making call:', error);
        alert('Failed to make call: ' + error.message);
    }
}

async function handleIncomingCall(data) {
    currentCallId = data.callId;
    document.getElementById('callerName').textContent = data.from;
    document.getElementById('incomingCallSection').classList.remove('hidden');
    
    // Store offer for when user answers
    window.incomingOffer = data.offer;
    window.incomingFrom = data.from;
}

async function answerCall() {
    try {
        // Get local media stream
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        document.getElementById('localAudio').srcObject = localStream;

        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    to: window.incomingFrom,
                    from: myClientId
                }));
            }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            document.getElementById('remoteAudio').srcObject = event.streams[0];
        };

        // Set remote description and create answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(window.incomingOffer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        ws.send(JSON.stringify({
            type: 'answer',
            callId: currentCallId,
            answer: answer
        }));

        document.getElementById('incomingCallSection').classList.add('hidden');
        updateCallStatus('In call with ' + window.incomingFrom);
        document.getElementById('hangupBtn').classList.remove('hidden');

    } catch (error) {
        console.error('Error answering call:', error);
        alert('Failed to answer call: ' + error.message);
    }
}

function rejectCall() {
    ws.send(JSON.stringify({
        type: 'hangup',
        callId: currentCallId
    }));
    document.getElementById('incomingCallSection').classList.add('hidden');
    currentCallId = null;
}

async function handleCallAnswered(data) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        currentCallId = data.callId;
        updateCallStatus('Call connected');
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

async function handleIceCandidate(data) {
    try {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
}

function hangup() {
    if (currentCallId) {
        ws.send(JSON.stringify({
            type: 'hangup',
            callId: currentCallId
        }));
    }
    handleCallEnded();
}

function handleCallEnded() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    document.getElementById('remoteAudio').srcObject = null;
    document.getElementById('localAudio').srcObject = null;
    document.getElementById('callBtn').disabled = false;
    document.getElementById('hangupBtn').classList.add('hidden');
    document.getElementById('incomingCallSection').classList.add('hidden');
    updateCallStatus('Call ended');
    
    currentCallId = null;
}

function updateCallStatus(status) {
    const statusEl = document.getElementById('callStatus');
    statusEl.textContent = status;
    statusEl.className = 'status calling';
    statusEl.classList.remove('hidden');
}

async function testAI() {
    const input = document.getElementById('aiInput').value;
    if (!input) {
        alert('Please enter a message');
        return;
    }

    try {
        const response = await fetch('/api/ai/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                transcript: input,
                context: {}
            })
        });

        const data = await response.json();
        document.getElementById('aiResponse').innerHTML = `
            <strong>Intent:</strong> ${data.intent}<br>
            <strong>Response:</strong> ${data.response}<br>
            <strong>Action:</strong> ${data.action}
        `;
    } catch (error) {
        console.error('Error testing AI:', error);
        alert('Failed to test AI');
    }
}
