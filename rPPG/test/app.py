from flask import Flask, render_template, Response, jsonify
import cv2
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
from collections import deque
import time
import threading

app = Flask(__name__)

# CONFIG
BUFFER_SIZE = 300
FPS = 30
HR_LOW = 0.8
HR_HIGH = 3.0
RR_LOW = 0.1
RR_HIGH = 0.5
MEASUREMENT_DURATION = 15  # seconds

vitals_state = {
    "status": "Face Not Found",
    "bpm": 0,
    "rr": 0,
    "sbp": 0,
    "dbp": 0,
    "stress_level": "-",
    "remaining_seconds": MEASUREMENT_DURATION,
    "measurement_complete": False
}

# FACE DETECTOR
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

def bandpass_filter(signal, low, high, fs, order=3):
    nyquist = 0.5 * fs
    low = low / nyquist
    high = high / nyquist
    b, a = butter(order, [low, high], btype='band')
    return filtfilt(b, a, signal)

def calculate_bpm(signal, fs):
    filtered = bandpass_filter(signal, HR_LOW, HR_HIGH, fs)
    peaks, _ = find_peaks(filtered, distance=fs/2)
    duration = len(signal) / fs
    if duration == 0:
        return 0
    bpm = (len(peaks) / duration) * 60
    return int(bpm)

def calculate_rr(signal, fs):
    filtered = bandpass_filter(signal, RR_LOW, RR_HIGH, fs)
    peaks, _ = find_peaks(filtered, distance=fs*2)
    duration = len(signal) / fs
    if duration == 0:
        return 0
    rr = (len(peaks) / duration) * 60
    return int(rr)
stop_camera_flag = False
camera_lock = threading.Lock()

def set_vitals(**updates):
    vitals_state.update(updates)

def draw_status(frame, status, color=(0, 255, 255)):
    cv2.putText(frame, status, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.85, color, 2)

def blank_frame(message):
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    draw_status(frame, message, (0, 0, 255))
    ret, buffer = cv2.imencode('.jpg', frame)
    if not ret:
        return b''
    return buffer.tobytes()

def gen_frames():
    global vitals_state, stop_camera_flag
    
    # If another stream is running, ask it to stop and wait
    if camera_lock.locked():
        stop_camera_flag = True
        while camera_lock.locked():
            time.sleep(0.1)
            
    stop_camera_flag = False
    
    set_vitals(
        status="Initializing camera...",
        bpm=0,
        rr=0,
        sbp=0,
        dbp=0,
        stress_level="-",
        remaining_seconds=MEASUREMENT_DURATION,
        measurement_complete=False,
    )

    green_signal = deque(maxlen=BUFFER_SIZE)
    measurement_complete = False
    final_bpm = 0
    final_rr = 0
    final_sbp = 0
    final_dbp = 0
    stress_level = "-"
    measurement_start = None

    def open_capture(device=0):
        backends = []
        try:
            backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_FFMPEG]
        except Exception:
            backends = []

        for backend in backends:
            try:
                cap = cv2.VideoCapture(device, backend)
                if cap.isOpened():
                    return cap
                cap.release()
            except Exception:
                pass
        return cv2.VideoCapture(device)

    camera_lock.acquire()

    cap = open_capture(0)
    if not cap or not cap.isOpened():
        set_vitals(status="Camera not available")
        camera_lock.release()
        frame_bytes = blank_frame("Camera not available")
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, FPS)

    try:
        while not stop_camera_flag:
            ret, frame = cap.read()
            if not ret:
                set_vitals(status="Unable to read camera frame")
                break

            frame = cv2.flip(frame, 1)
            frame_height, frame_width = frame.shape[:2]
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)

            if measurement_complete:
                draw_status(frame, f'Final Heart Rate: {final_bpm} BPM', (0, 255, 0))
                cv2.putText(frame, f'Respiratory Rate: {final_rr} breaths/min', (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 128, 0), 2)
                cv2.putText(frame, f'Estimated BP: {final_sbp}/{final_dbp} mmHg', (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
                cv2.putText(frame, f'Stress Level: {stress_level}', (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 165, 255), 2)
            elif len(faces) == 0:
                measurement_start = None
                set_vitals(status="Face Not Found", remaining_seconds=MEASUREMENT_DURATION)
                draw_status(frame, "Face Not Found", (0, 0, 255))
            else:
                (x, y, w, h) = faces[0]
                face_center_x = x + w // 2
                face_center_y = y + h // 2
                screen_center_x = frame_width // 2
                screen_center_y = frame_height // 2
                centered = abs(face_center_x - screen_center_x) < 100 and abs(face_center_y - screen_center_y) < 100
                color = (0, 255, 0) if centered else (0, 255, 255)
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.circle(frame, (screen_center_x, screen_center_y), 5, (255, 0, 0), -1)

                if not centered:
                    measurement_start = None
                    set_vitals(status="Please center your face", remaining_seconds=MEASUREMENT_DURATION)
                    draw_status(frame, "Please center your face", (0, 255, 255))
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if not ret:
                        continue
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                    continue

                roi = frame[y:y+h//5, x:x+w]
                cv2.rectangle(frame, (x, y), (x + w, y + h // 5), (255, 0, 0), 2)

                green_mean = np.mean(roi[:, :, 1])
                green_signal.append(green_mean)

                if len(green_signal) < 150:
                    set_vitals(status="Collecting Signal...")
                    draw_status(frame, f"Collecting Signal... {len(green_signal)}/150", (255, 255, 0))
                else:
                    signal = np.array(green_signal)
                    signal = signal - np.mean(signal)

                    if not measurement_complete:
                        if measurement_start is None:
                            measurement_start = time.time()
                        elapsed = time.time() - measurement_start
                        remaining = max(0, int(MEASUREMENT_DURATION - elapsed))

                        try:
                            bpm = calculate_bpm(signal, FPS)
                            rr = calculate_rr(signal, FPS)

                            set_vitals(
                                status="Measuring...",
                                bpm=bpm,
                                rr=rr,
                                remaining_seconds=remaining,
                            )
                            draw_status(frame, f'Heart Rate: {bpm} BPM', (0, 255, 0))
                            cv2.putText(frame, f'Respiratory Rate: {rr} breaths/min', (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 128, 0), 2)
                            cv2.putText(frame, f'Measuring... {remaining}s', (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 255), 2)

                            if elapsed >= MEASUREMENT_DURATION:
                                final_bpm = bpm
                                final_rr = rr
                                final_sbp = int(110 + 0.5 * (bpm - 70))
                                final_dbp = int(70 + 0.2 * (bpm - 70))
                                if bpm < 75:
                                    stress_level = "Low"
                                elif bpm < 95:
                                    stress_level = "Normal"
                                else:
                                    stress_level = "High"
                                measurement_complete = True
                                
                                set_vitals(
                                    measurement_complete=True,
                                    bpm=final_bpm,
                                    rr=final_rr,
                                    sbp=final_sbp,
                                    dbp=final_dbp,
                                    stress_level=stress_level,
                                    status="Pre-Consultation Completed",
                                )
                                
                        except Exception as exc:
                            set_vitals(status="Calculating...")
                            draw_status(frame, "Calculating...", (255, 255, 0))
                            print(f"Vitals calculation failed: {exc}")

            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    finally:
        cap.release()
        camera_lock.release()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/vitals_data')
def get_vitals_data():
    response = jsonify(vitals_state)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/stop_camera')
def stop_camera():
    global stop_camera_flag
    stop_camera_flag = True
    response = jsonify({"status": "stopped"})
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/video_feed')
def video_feed():
    response = Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True, use_reloader=False)
