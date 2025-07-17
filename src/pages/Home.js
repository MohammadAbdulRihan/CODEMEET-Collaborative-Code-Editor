/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState } from "react";
import { v4 as uuidV4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const [username, setUsername] = useState("");

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success("Created a new room");
    };

    const joinRoom = () => {
        if (!username || !roomId) {
            toast.error("ROOM ID & username are required");
            return;
        }
        //Redirect
        
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === "Enter") {
            joinRoom();
        }
    };

    return (
        <div className="home-heroWrapper">
            <header className="home-header">
                {/* <div >
            <h1 className="home-heroTitle">Welcome to CodeMeet</h1>
            <p>A real-time collaborative coding platform for teams</p>

        </div> */}
                <div class="hero-section"><div class="hero-content"><h1>Welcome to CodeMeet</h1><h2>A real-time collaborative coding platform for teams</h2></div></div>
            </header>
            <h2 className="home-heroSubtitle">A real-time collaborative coding platform providing ...</h2>
            <div className="home-heroSection">
                <div className="home-heroText">

          <div className="home-heroFeatures">
            <div className="home-heroFeature">
              <strong>Effortless Teamwork:</strong>
              <span>Bring your team together in one place to brainstorm, solve problems, and build projects collaboratively—no more sending code back and forth.</span>
            </div>
            <div className="home-heroFeature">
              <strong>Instant Feedback:</strong>
              <span>See suggestions, comments, and code changes from others in real time, making learning and improvement fast and interactive.</span>
            </div>
            <div className="home-heroFeature">
              <strong>Remote-Ready:</strong>
              <span>Work, teach, or interview from anywhere in the world with a seamless, cloud-based coding environment.</span>
            </div>
          </div>
                </div>
                <div className="home-joinCard">
                    <h3 className="home-joinTitle">Start Coding Together</h3>
                    <div className="home-inputGroup">
                        <input                                              
                            type="text"
                            className="home-inputBox"
                            placeholder="ROOM ID"
                            onChange={(e) => setRoomId(e.target.value)}
                            value={roomId}
                            onKeyUp={handleInputEnter}
                        />
                        <input
                            type="text"
                            className="home-inputBox"
                            placeholder="USERNAME"
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            onKeyUp={handleInputEnter}
                        />
                        <button className="home-btn home-joinBtn" onClick={joinRoom}>
                            Join
                        </button>
                        <span className="home-createInfo">
                            If you don't have a room?&nbsp;
                            <a onClick={createNewRoom} href="" className="home-createNewBtn">
                                Create room
                            </a>
                        </span>
                    </div>
                </div>
            </div>
            {/* Features Section: Two rows of 3 cards each */}
            <div className="home-featuresRow">
                {/* Row 1 */}
                <div className="home-featureCard">
                    <div className="home-featureIcon" style={{ marginBottom: '1.2rem' }}>
                        <span role="img" aria-label="Live Coding" style={{ fontSize: '2.5rem', color: '#6366f1', filter: 'drop-shadow(0 0 8px #6366f1aa)' }}>
                            &#60;/&#62;
                        </span>
                    </div>
                    <h4>Live Coding</h4>
                    <p>Code together in real-time with syntax highlighting</p>
                </div>
                <div className="home-featureCard">
                    <div className="home-featureIcon" style={{ marginBottom: '1.2rem' }}>
                        <span role="img" aria-label="Team Collaboration" style={{ fontSize: '2.5rem', color: '#6366f1', filter: 'drop-shadow(0 0 8px #6366f1aa)' }}>
                            &#128101;
                        </span>
                    </div>
                    <h4>Team Collaboration</h4>
                    <p>Work seamlessly with your team members</p>
                </div>
                <div className="home-featureCard">
                    <div className="home-featureIcon" style={{ marginBottom: '1.2rem' }}>
                        <span role="img" aria-label="Multiple Languages" style={{ fontSize: '2.5rem', color: '#6366f1', filter: 'drop-shadow(0 0 8px #6366f1aa)' }}>
                            &#128187;
                        </span>
                    </div>
                    <h4>Multiple Languages</h4>
                    <p>Support for various programming languages</p>
                </div>
            </div>
            <div className="home-featuresRow">
                {/* Row 2 */}
                <div className="home-featureCard">
                    <div className="home-featureIcon" style={{ marginBottom: '1.2rem' }}>
                        <span role="img" aria-label="Instant Execution" style={{ fontSize: '2.5rem', color: '#6366f1', filter: 'drop-shadow(0 0 8px #6366f1aa)' }}>
                            &#9889;
                        </span>
                    </div>
                    <h4>Instant Code Execution</h4>
                    <p>Run your code and see results instantly</p>
                </div>
                <div className="home-featureCard">
                    <div className="home-featureIcon" style={{ marginBottom: '1.2rem' }}>
                        <span role="img" aria-label="Secure" style={{ fontSize: '2.5rem', color: '#6366f1', filter: 'drop-shadow(0 0 8px #6366f1aa)' }}>
                            &#128274;
                        </span>
                    </div>
                    <h4>Secure & Private</h4>
                    <p>Unique room IDs and encrypted connections</p>
                </div>
                <div className="home-featureCard">
                    <div className="home-featureIcon" style={{ marginBottom: '1.2rem' }}>
                        <span role="img" aria-label="Built-in Chat" style={{ fontSize: '2.5rem', color: '#6366f1', filter: 'drop-shadow(0 0 8px #6366f1aa)' }}>
                            &#128172;
                        </span>
                    </div>
                    <h4>Built-in Chat</h4>
                    <p>Communicate with your team in real time without leaving the editor</p>
                </div>
            </div>
        </div>
    );
}

export default Home;
