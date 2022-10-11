/* eslint-disable */
import { useEffect, useRef } from "react";
import ReactPlayer from 'react-player';
import io from 'socket.io-client';
import './MainPanel.style.css';

const SOCKET_SERVER_URL = 'http://localhost:9000'

const MainPanel = () => {
	const socketRef = useRef();
    const remoteVideoRef = useRef(null);
    const peerConnectionsRef = useRef([]);

    const config = {
        iceServers: [
            { 
                "urls": "stun:stun.l.google.com:19302",
            }
        ]
    };

    const getLocalMedia = () => {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
        }).then(gotStream).catch(function(e) {
            alert('getUserMedia() error ' + e.name);
        });
    };

    const gotStream = (stream) => {
        console.log('local stream');
        remoteVideoRef.current.srcObject = stream;
        socketRef.current.emit("broadcaster"); // set the broadcaster
    }

    useEffect(() => {
        socketRef.current = io.connect(SOCKET_SERVER_URL, { transports: ["websocket"] });

        getLocalMedia();

        socketRef.current.on("watcher", id => {
            const peerConnection = new RTCPeerConnection(config);
            peerConnectionsRef.current[id] = peerConnection;
          
            let stream = remoteVideoRef.current.srcObject;
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream)); // add each track of the stream to peerConnection
            
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socketRef.current.emit("candidate", id, event.candidate);
                }
            };
          
            peerConnection
                .createOffer()
                .then(sdp => peerConnection.setLocalDescription(sdp))
                .then(() => {
                    socketRef.current.emit("offer", id, peerConnection.localDescription);
                });
        });
        
        socketRef.current.on("answer", (id, description) => {
            peerConnectionsRef.current[id].setRemoteDescription(description);
        });
          
        socketRef.current.on("candidate", (id, candidate) => {
            peerConnectionsRef.current[id].addIceCandidate(new RTCIceCandidate(candidate));
        });
          
        socketRef.current.on("disconnectPeer", id => {
            peerConnectionsRef.current[id].close();
            delete peerConnectionsRef.current[id];
        });

    }, []);

	let url = 'https://www.youtube.com/watch?v=xiSoqCtVd4A';
	return (
		<>
			<div className='main-page'>			
				<ReactPlayer url={url} playing={true} width='100vw' height='100vh' style={{'background-color' : 'black'}}/>
			</div>
			<div style={{'display':'none'}}>
				<video
					style={{
						width: 480,
						height: 360,
						margin: 'auto',
					}}
					id='remotevideo'
					ref={ remoteVideoRef }
					autoPlay>
				</video>
			</div>
			
		</>
	);
};

export default MainPanel;