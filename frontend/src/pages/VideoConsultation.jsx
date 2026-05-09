import { useEffect, useState } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import "../styles/pages/Consultation.css";

const VideoConsultation = () => {
  const { roomId, appointmentId } = useParams();
  const navigate = useNavigate();

  const [seconds, setSeconds] = useState(0);
  const [participantCount, setParticipantCount] = useState(1);
  const [meetingJoined, setMeetingJoined] = useState(false);
  const [meetingApi, setMeetingApi] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    let timer;

    if (meetingJoined) {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [meetingJoined]);

  const formatTime = () => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const markConsultationLive = async () => {
    try {
      const token = localStorage.getItem("token");
      await API.put(
        `/appointments/start/${appointmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.log(error);
    }
  };

  const markConsultationEnded = async () => {
    try {
      const token = localStorage.getItem("token");
      await API.put(
        `/appointments/end/${appointmentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      console.log(error);
    }
  };

  const endConsultation = async () => {
    await markConsultationEnded();

    if (meetingApi) {
      meetingApi.executeCommand("hangup");
    }

    if (user?.role === "doctor") {
      navigate("/doctor");
    } else {
      navigate("/patient");
    }
  };

  return (
    <div className="consultation-page">
      <aside className="consultation-sidebar">
        <div className="consultation-brand">
          <h1>Healix Meet</h1>
          <p>Secure video consultation</p>
        </div>

        <div className="consultation-info">
          <strong>Session details</strong>

          <div className="info-row">
            <div className="info-label">Room ID</div>
            <div className="info-value">{roomId}</div>
          </div>

          <div className="info-row">
            <div className="info-label">Duration</div>
            <div className="info-value">{formatTime()}</div>
          </div>

          <div className="info-row">
            <div className="info-label">Participants</div>
            <div className="info-value">{participantCount}</div>
          </div>

          <div className="info-row">
            <div className="info-label">Status</div>
            <div className="info-status">
              <span className={`status-dot ${meetingJoined ? "live" : "waiting"}`} />
              <span>{meetingJoined ? "Consultation Live" : "Waiting"}</span>
            </div>
          </div>
        </div>

        {participantCount < 2 ? (
          <div className="consultation-note">
            <strong>Waiting room</strong>
            <p style={{ margin: "8px 0 0", color: "#94a3b8" }}>
              Waiting for the other participant to join this consultation room.
            </p>
          </div>
        ) : null}

        <div className="consultation-controls">
          <button className="control-btn">Mic Toggle</button>
          <button className="control-btn">Camera Toggle</button>
          <button className="control-btn">Share Screen</button>
          <button className="control-btn end" onClick={endConsultation}>
            End Consultation
          </button>
        </div>
      </aside>

      <section className="consultation-stage">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomId}
          configOverwrite={{
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          }}
          interfaceConfigOverwrite={{
            SHOW_JITSI_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          }}
          userInfo={{
            displayName: user?.role === "doctor" ? `Dr. ${user?.name}` : user?.name,
          }}
          onApiReady={(externalApi) => {
            setMeetingApi(externalApi);

            externalApi.addListener("videoConferenceJoined", async () => {
              setMeetingJoined(true);
              await markConsultationLive();
            });

            externalApi.addListener("participantJoined", () => {
              setParticipantCount((prev) => prev + 1);
            });

            externalApi.addListener("participantLeft", () => {
              setParticipantCount((prev) => Math.max(1, prev - 1));
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = "100%";
            iframeRef.style.width = "100%";
          }}
        />
      </section>
    </div>
  );
};

export default VideoConsultation;
