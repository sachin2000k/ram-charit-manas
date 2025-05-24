import { useState, useEffect } from 'react';
import { Room, createLocalAudioTrack, Track } from 'livekit-client';

function App() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (track, publication, participant) => {
      console.log(`Track subscribed: ${track.kind}`);

      if (track.kind === Track.Kind.Audio) {
        setIsSpeaking(true);

        const audioElement = track.attach();
        document.body.appendChild(audioElement);

        audioElement.onended = () => {
          setIsSpeaking(false);
          audioElement.remove();
        };
      }
    };

    const handleTrackUnsubscribed = (track) => {
      console.log(`Track unsubscribed: ${track.kind}`);

      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((element) => element.remove());
        setIsSpeaking(false);
      }
    };

    const handleDataReceived = (payload, participant) => {
      const message = new TextDecoder().decode(payload);
      console.log(`Data message received from ${participant.identity}: ${message}`);

      setChatMessages(prev => [...prev, { sender: participant.identity, text: message }]);
    };

    const handleDisconnected = () => {
      console.log('Disconnected from room');
      setConnected(false);
      setRoom(null);
      setChatMessages([]);
    };

    room.on('trackSubscribed', handleTrackSubscribed);
    room.on('trackUnsubscribed', handleTrackUnsubscribed);
    room.on('dataReceived', handleDataReceived);
    room.on('disconnected', handleDisconnected);

    return () => {
      room.off('trackSubscribed', handleTrackSubscribed);
      room.off('trackUnsubscribed', handleTrackUnsubscribed);
      room.off('dataReceived', handleDataReceived);
      room.off('disconnected', handleDisconnected);
    };
  }, [room]);

  const connectToRoom = async () => {
    try {
      const server_url = process.env.REACT_APP_TOKEN_SERVER_URL;
      const userId = `user-${Math.random().toString(36).substring(2, 8)}`;
      const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;
      const fullUrl = `${server_url}?room=${roomId}&user=${userId}`;

      console.log("Connecting via:", fullUrl);

      const resp = await fetch(fullUrl);
      const data = await resp.json();
      const token = data.token;

      const newRoom = new Room();
      await newRoom.connect(process.env.REACT_APP_LIVEKIT_WS_URL, token);

      const micTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(micTrack);

      setRoom(newRoom);
      setConnected(true);

      console.log('Connected and microphone publishing.');
    } catch (err) {
      console.error('Error connecting to Agent:', err);
    }
  };

  const disconnectFromRoom = async () => {
    if (room) {
      await room.disconnect();
      console.log('Disconnected manually.');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '5%' }}>
      <h1>Voice AI Agent Interaction</h1>

      {!connected ? (
        <button onClick={connectToRoom} style={{ padding: '10px 20px', fontSize: '18px' }}>
          Start Call
        </button>
      ) : (
        <button onClick={disconnectFromRoom} style={{ padding: '10px 20px', fontSize: '18px' }}>
          End Call
        </button>
      )}

      {connected && (
        <>
          {isSpeaking && (
            <div style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '20px', color: 'green' }}>
              🔊 Agent is speaking...
            </div>
          )}

          <div style={{
            marginTop: '40px',
            border: '1px solid gray',
            borderRadius: '8px',
            width: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '20px',
            textAlign: 'left'
          }}>
            <h3>Chat</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '10px' }}>
                  <b>{msg.sender}:</b> {msg.text}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
