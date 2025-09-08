import React, { useEffect, useRef, useState } from "react"; // Core React primitives
import io from "socket.io-client";
import { Badge, IconButton, TextField, Tooltip, Button, AppBar, Toolbar, Typography, Paper } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import GroupsIcon from "@mui/icons-material/Groups";
import { SOCKET_BASE } from "../environment";

const server_url = SOCKET_BASE; // Base signalling / API server (see environment.js)

// Global (module‑scoped) map of socketId -> RTCPeerConnection
// NOTE: Not stored in React state to avoid re-renders on each connection mutation.
var connections = {};

// Basic STUN configuration (no TURN). TURN required for strict NAT / firewall.
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  // ---------------------------------------------------------------------------
  // Refs (mutable objects surviving re-renders without causing updates)
  // ---------------------------------------------------------------------------
  var socketRef = useRef();
  let socketIdRef = useRef();
  let localVideoref = useRef();
  const videoRef = useRef([]); // Mirror of remote video state for quick lookup
  // ---------------------------------------------------------------------------
  // Media Capability / Toggle State
  // ---------------------------------------------------------------------------
  let [videoAvailable, setVideoAvailable] = useState(true);   // Device capability flags
  let [audioAvailable, setAudioAvailable] = useState(true);
  let [video, setVideo] = useState([]); // UI toggle for camera (inconsistent initial type: becomes boolean)
  let [audio, setAudio] = useState();
  let [screen, setScreen] = useState();
  let [showModal, setModal] = useState(true);
  let [screenAvailable, setScreenAvailable] = useState();
  // ---------------------------------------------------------------------------
  // Chat State
  // ---------------------------------------------------------------------------
  let [messages, setMessages] = useState([]);
  let [message, setMessage] = useState("");
  let [newMessages, setNewMessages] = useState(0);
  // ---------------------------------------------------------------------------
  // Identity / UI Flags
  // ---------------------------------------------------------------------------
  let [askForUsername, setAskForUsername] = useState(true);
  let [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(true);
  let [videos, setVideos] = useState([]); // Remote participant streams (array of {socketId, stream,...})
  // derived helpers (after videos declared)
  const participantCount = videos.length + 1; // Include local user (not stored in videos[])

  const meetingId = React.useMemo(() => {
    // basic derivation from URL (could be improved if backend provides real ID)
    try {
      const url = new URL(window.location.href);
      return url.pathname.replace(/\/*$/, "").split("/").filter(Boolean).slice(-1)[0] || "meeting";
    } catch (e) {
      return "meeting";
    }
  }, []);
  

  // TODO
  // if(isChrome() === false) {

  // }

  // On mount: obtain user media permissions (camera/mic + screen capability)
  useEffect(() => {
    getPermissions();
  }, []);

  let getDislayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDislayMediaSuccess)
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    }
  };

  /**
   * Requests camera & microphone permissions. Also sets up initial local stream
   * if at least one medium (audio/video) is available. Screen sharing capability
   * is probed via presence of getDisplayMedia.
   */
  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoPermission) {
        setVideoAvailable(true);
        console.log("Video permission granted");
      } else {
        setVideoAvailable(false);
        console.log("Video permission denied");
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        console.log("Audio permission granted");
      } else {
        setAudioAvailable(false);
        console.log("Audio permission denied");
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });
        if (userMediaStream) {
          window.localStream = userMediaStream;
          if (localVideoref.current) {
            localVideoref.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
      console.log("SET STATE HAS ", video, audio);
    }
  }, [video, audio]);
  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  /**
   * Handler invoked once getUserMedia resolves. Attaches new stream to local
   * video element and renegotiates with all current peers by creating offers.
   */
  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        console.log(description);
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoref.current.srcObject = window.localStream;

          for (let id in connections) {
            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        })
    );
  };

  /**
   * Acquire / refresh user media based on current toggle state. When toggles
   * are off, previous tracks are stopped to release device.
   */
  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      try {
        let tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  /**
   * Screen share success callback. Replaces local stream with screen stream
   * and renegotiates with peers. On screen track end, reverts to camera.
   */
  let getDislayMediaSuccess = (stream) => {
    console.log("HERE");
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoref.current.srcObject = window.localStream;

          getUserMedia();
        })
    );
  };

  /**
   * Process signalling payload (SDP or ICE). Creates answer for offer types,
   * sets remote description, or adds ICE candidate.
   */
  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  /**
   * Initialize Socket.IO connection & register core signalling + chat events.
   * Joins room keyed by full URL (window.location.href).
   */
  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );
          // Wait for their ice candidate
          connections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          // Wait for their video stream
          connections[socketListId].onaddstream = (event) => {
            console.log("BEFORE:", videoRef.current);
            console.log("FINDING ID: ", socketListId);

            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              console.log("FOUND EXISTING");

              // Update the stream of the existing video
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              // Create a new video
              console.log("CREATING NEW");
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoplay: true,
                playsinline: true,
              };

              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          // Add the local video stream
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

  // Utility: produces a disabled (silent) audio track used when user mutes or
  // stream ends to keep peer connections stable.
  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };
  // Utility: produces a disabled (black) video track for placeholder streams.
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  // Toggle camera (does not instantly renegotiate until getUserMedia is called)
  let handleVideo = () => {
    setVideo(!video);
    // getUserMedia();
  };
  // Toggle microphone
  let handleAudio = () => {
    setAudio(!audio);
    // getUserMedia();
  };

  // When 'screen' flag changes, attempt to start/stop screen capture
  useEffect(() => {
    if (screen !== undefined) {
      getDislayMedia();
    }
  }, [screen]);
  // Toggle screen share flag
  let handleScreen = () => {
    setScreen(!screen);
  };

  // End call: stop local tracks and navigate home
  let handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
  };

  // Show chat panel & reset unread count
  let openChat = () => {
    setModal(true);
    setShowChat(true);
    setNewMessages(0);
  };
  // Hide chat panel
  let closeChat = () => {
    setModal(false);
    setShowChat(false);
  };
  // Input handler (kept for potential validation)
  let handleMessage = (e) => { setMessage(e.target.value); };

  /** Append chat message to local list & increment unread if remote sender */
  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  // Emit chat message to signalling server
  let sendMessage = () => {
    console.log(socketRef.current);
    socketRef.current.emit("chat-message", message, username);
    setMessage("");

    // this.setState({ message: "", sender: username })
  };

  // Transition from lobby to active call
  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  // dynamic grid style for videos (excluding local preview which is picture-in-picture style)
  // Calculate optimal grid (attempt to keep near 16:9 tiles, no scroll) using container ratio assumption
  // Responsive video grid: compute column count minimizing wasted space
  const gridTemplateColumns = React.useMemo(() => {
    const n = participantCount;
    if (n <= 1) return '1fr';
    // Find best (cols, rows) minimizing empty space
    let best = { cols: 1, rows: n, score: Infinity };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      // approximate container aspect ratio (width/height) ignoring small paddings
      const containerRatio = 16 / 9; // assume widescreen
      // tile ratio if we use these cols/rows
      const tileRatio = (containerRatio * rows) / cols; // >1 means wider than high
      const ratioPenalty = Math.abs(tileRatio - (16 / 9));
      const emptyCells = cols * rows - n;
      const score = ratioPenalty * 100 + emptyCells * 10 + rows + cols * 0.1;
      if (score < best.score) best = { cols, rows, score };
    }
    return `repeat(${best.cols}, 1fr)`;
  }, [participantCount]);

  return (
    <div className={styles.pageWrapper}>
      {askForUsername === true ? (
        <div className={styles.lobbyWrapper}>
          <Paper elevation={6} className={styles.lobbyCard}>
            <Typography variant="h5" gutterBottom>Join Meeting</Typography>
            <TextField
              fullWidth
              id="username-field"
              label="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="outlined"
              size="small"
              className={styles.lobbyInput}
            />
            <Button fullWidth disabled={!username.trim()} variant="contained" onClick={connect}>
              Enter
            </Button>
            <div className={styles.lobbyPreview}>
              <video ref={localVideoref} autoPlay muted playsInline className={styles.previewVideo}></video>
            </div>
          </Paper>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          <AppBar position="absolute" color="transparent" elevation={0} className={styles.topBar}>
            <Toolbar className={styles.toolbar}>
              <div className={styles.meetingInfo}>
                <GroupsIcon fontSize="small" />
                <Typography variant="subtitle1" className={styles.meetingTitle}>{meetingId}</Typography>
                <span className={styles.participantCount}>{participantCount} participant{participantCount>1?"s":""}</span>
              </div>
              <div className={styles.topRightActions}>
                <Tooltip title={showChat ? "Close chat" : "Open chat"} arrow>
                  <IconButton size="small" onClick={() => {
                    if(showChat){ closeChat(); } else { openChat(); }
                  }} className={styles.chatToggleBtn}>
                    {showChat ? <CloseIcon /> : <ChatIcon />}
                  </IconButton>
                </Tooltip>
              </div>
            </Toolbar>
          </AppBar>

          {showChat && (
            <div className={styles.chatRoom}>
              <div className={styles.chatHeader}>
                <Typography variant="subtitle1">Chat</Typography>
                <IconButton size="small" onClick={closeChat}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
              <div className={styles.chatMessages}>
                {messages.length !== 0 ? (
                  messages.map((item, index) => (
                    <div className={styles.chatMessage} key={index}>
                      <p className={styles.chatSender}>{item.sender || "Anonymous"}</p>
                      <p className={styles.chatText}>{item.data}</p>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyState}>No messages yet</p>
                )}
              </div>
              <div className={styles.chatInputRow}>
                <TextField
                  fullWidth
                  size="small"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => { if(e.key === 'Enter' && message.trim()){ sendMessage(); } }}
                />
                <Button disabled={!message.trim()} onClick={sendMessage} variant="contained" size="small" className={styles.sendBtn}>Send</Button>
              </div>
            </div>
          )}

          <div className={styles.conferenceView} style={{ gridTemplateColumns }}>
            {videos.map((v) => (
              <div key={v.socketId} className={styles.videoTile}>
                <video
                  data-socket={v.socketId}
                  ref={(ref) => {
                    if (ref && v.stream) {
                      ref.srcObject = v.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className={styles.remoteVideo}
                />
                <div className={styles.nameTag}>{v.socketId.slice(0,6)}</div>
              </div>
            ))}
          </div>

          <div className={styles.localPreviewWrapper}>
            <div className={styles.videoTileLocal}>
              <video
                className={styles.meetUserVideo}
                ref={localVideoref}
                autoPlay
                muted
                playsInline
              />
              <div className={styles.nameTagLocal}>{username || 'You'}</div>
            </div>
          </div>

          <div className={styles.buttonContainers}>
            <div className={styles.controlsBar}>
              <Tooltip title={video ? "Turn camera off" : "Turn camera on"} arrow>
                <IconButton onClick={handleVideo} className={styles.controlBtn} color={video?"primary":"default"}>
                  {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={audio ? "Mute microphone" : "Unmute microphone"} arrow>
                <IconButton onClick={handleAudio} className={styles.controlBtn} color={audio?"primary":"default"}>
                  {audio === true ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
              </Tooltip>
              {screenAvailable === true && (
                <Tooltip title={screen ? "Stop sharing" : "Share screen"} arrow>
                  <IconButton onClick={handleScreen} className={styles.controlBtn} color={screen?"primary":"default"}>
                    {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Chat" arrow>
                <Badge badgeContent={newMessages} color="error" overlap="circular">
                  <IconButton onClick={() => { showChat ? closeChat() : openChat(); }} className={styles.controlBtn}>
                    <ChatIcon />
                  </IconButton>
                </Badge>
              </Tooltip>
              <Tooltip title="Leave call" arrow>
                <IconButton onClick={handleEndCall} className={styles.endCallBtn}>
                  <CallEndIcon />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
