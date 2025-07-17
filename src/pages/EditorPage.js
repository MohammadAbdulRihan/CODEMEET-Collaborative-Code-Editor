

// ----------------------------

import React, { useState, useRef, useEffect } from "react";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const editorComponentRef = useRef(null);
  const location = useLocation();
  const reactNavigator = useNavigate();
  const { roomId } = useParams();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // ✅ Load saved chat from localStorage
      const savedChat = localStorage.getItem(`chat-${roomId}`);
      if (savedChat) {
        const chatWindow = document.getElementById("chatWindow");
        if (chatWindow) {
          chatWindow.value = savedChat;
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      }

      // ✅ Load saved code for this room
      const savedCode = localStorage.getItem(`savedCode-${roomId}`);
      if (savedCode) {
        codeRef.current = savedCode;
        socketRef.current.emit(ACTIONS.SYNC_CODE, {
          code: savedCode,
          socketId: socketRef.current.id,
        });
      }

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      socketRef.current.on(ACTIONS.SEND_MESSAGE, ({ message }) => {
        const chatWindow = document.getElementById("chatWindow");
        chatWindow.value += message;
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // ✅ Save to localStorage
        localStorage.setItem(`chat-${roomId}`, chatWindow.value);
      });
    };

    init();

    return () => {
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off(ACTIONS.SEND_MESSAGE);
      socketRef.current.disconnect();
    };
  }, [roomId]);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the room id");
      console.error(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  const inputClicked = () => {
    const inputArea = document.getElementById("input");
    inputArea.placeholder = "Enter your input before running code";
    inputArea.value = "";
    inputArea.disabled = false;
    document.getElementById("inputLabel").classList.add("clickedLabel");
    document.getElementById("inputLabel").classList.remove("notClickedLabel");
    document.getElementById("outputLabel").classList.add("notClickedLabel");
    document.getElementById("outputLabel").classList.remove("clickedLabel");
  };

  const outputClicked = () => {
    const inputArea = document.getElementById("input");
    inputArea.placeholder = "Your output will appear here";
    inputArea.value = "";
    inputArea.disabled = true;
    document.getElementById("outputLabel").classList.add("clickedLabel");
    document.getElementById("outputLabel").classList.remove("notClickedLabel");
    document.getElementById("inputLabel").classList.add("notClickedLabel");
    document.getElementById("inputLabel").classList.remove("clickedLabel");
  };

  const runCode = () => {
    const lang = document.getElementById("languageOptions").value;
    const input = document.getElementById("input").value;
    const code = codeRef.current;

    const languageMap = {
      '1': 'csharp',
      '4': 'java',
      '5': 'python',
      '6': 'c',
      '7': 'cpp',
      '8': 'php',
      '17': 'javascript',
      '20': 'go',
      '21': 'scala',
      '37': 'swift',
      '38': 'bash',
      '43': 'kotlin',
      '60': 'typescript'
    };

    const language = languageMap[lang] || 'javascript';

    toast.loading("Running Code....");

    axios.post('/run-code', {
      code,
      language,
      input
    })
      .then(function (response) {
        let message = response.data.output || response.data.stderr || response.data.compile_output || 'No output';
        outputClicked();
        document.getElementById("input").value = message;
        toast.dismiss();
        toast.success("Code compilation complete");
      })
      .catch(function (error) {
        toast.dismiss();
        toast.error("Code compilation unsuccessful");
        document.getElementById("input").value =
          "Something went wrong, Please check your code and input.";
      });
  };

  const sendMessage = () => {
    const inputBox = document.getElementById("inputBox");
    if (inputBox.value === "") return;

    const message = `> ${location.state.username}:
${inputBox.value}
`;
    const chatWindow = document.getElementById("chatWindow");
    chatWindow.value += message;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    inputBox.value = "";
    socketRef.current.emit(ACTIONS.SEND_MESSAGE, { roomId, message });

    localStorage.setItem(`chat-${roomId}`, chatWindow.value);
  };

  const handleInputEnter = (key) => {
    if (key.code === "Enter") {
      sendMessage();
    }
  };

  const clearSavedCode = () => {
    localStorage.removeItem(`savedCode-${roomId}`);
    codeRef.current = "";
    if (editorComponentRef.current && editorComponentRef.current.clearCode) {
      editorComponentRef.current.clearCode();
    }
    socketRef.current.emit(ACTIONS.SYNC_CODE, {
      code: "",
      socketId: socketRef.current.id,
    });
  };

  return (
    <div className="mainWrap">
      <div className="asideWrap">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/codemeet.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <label>
          Select Language:
          <select id="languageOptions" className="seLang" defaultValue="17">
            <option value="1">C#</option>
            <option value="4">Java</option>
            <option value="5">Python</option>
            <option value="6">C (gcc)</option>
            <option value="7">C++ (gcc)</option>
            <option value="8">PHP</option>
            <option value="11">Haskell</option>
            <option value="12">Ruby</option>
            <option value="13">Perl</option>
            <option value="17">Javascript</option>
            <option value="20">Golang</option>
            <option value="21">Scala</option>
            <option value="37">Swift</option>
            <option value="38">Bash</option>
            <option value="43">Kotlin</option>
            <option value="60">TypeScript</option>
          </select>
        </label>
        <button className="btn runBtn" onClick={runCode}>
          Run Code
        </button>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
        <button className="btn leaveBtn" onClick={clearSavedCode}>
          Clear Code
        </button>
      </div>

      <div className="editorWrap">
        <Editor
          ref={editorComponentRef}
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
            localStorage.setItem(`savedCode-${roomId}`, code);
          }}
        />
        <div className="IO-container">
          <label id="inputLabel" className="clickedLabel" onClick={inputClicked}>
            Input
          </label>
          <label id="outputLabel" className="notClickedLabel" onClick={outputClicked}>
            Output
          </label>
        </div>
        <textarea
          id="input"
          className="inputArea textarea-style"
          placeholder="Enter your input here"
        ></textarea>
      </div>

      <div className="chatWrap">
        <textarea
          id="chatWindow"
          className="chatArea textarea-style"
          placeholder="Chat messages will appear here"
          disabled
        ></textarea>
        <div className="sendChatWrap">
          <input
            id="inputBox"
            type="text"
            placeholder="Type your message here"
            className="inputField"
            onKeyUp={handleInputEnter}
          />
          <button className="btn sendBtn" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
export default EditorPage;
