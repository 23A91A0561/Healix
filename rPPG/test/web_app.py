from flask import Flask, render_template, Response
import cv2
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
from collections import deque
import time

app = Flask(__name__)

# CONFIG
BUFFER_SIZE = 300
FPS = 30
HR_LOW = 0.8
HR_HIGH = 3.0
RR_LOW = 0.1
RR_HIGH = 0.5
MEASUREMENT_DURATION = 15  # seconds

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

def gen_frames():
    green_signal = deque(maxlen=BUFFER_SIZE)
    measurement_complete = False
    final_bpm = 0
    final_rr = 0
    final_sbp = 0
    final_dbp = 0
    stress_level = "Normal"
    measurement_start = None

    cap = cv2.VideoCapture(0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        frame_height, frame_width = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            measurement_start = None
            cv2.putText(frame, "Face Not Found", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
        else:
            (x, y, w, h) = faces[0]
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            screen_center_x = frame_width // 2
            screen_center_y = frame_height // 2
            tolerance_x = 80
            tolerance_y = 80

            centered = (
                abs(face_center_x - screen_center_x) < tolerance_x
                and
                abs(face_center_y - screen_center_y) < tolerance_y
            )

            cv2.circle(frame, (screen_center_x, screen_center_y), 5, (255, 0, 0), -1)
            color = (0, 255, 0) if centered else (0, 255, 255)
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

            if not centered:
                measurement_start = None
                cv2.putText(frame, "Please Center Your Face", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 3)
            else:
                roi = frame[y:y+h//5, x:x+w]
                cv2.rectangle(frame, (x, y), (x+w, y+h//5), (255, 0, 0), 2)

                green_mean = np.mean(roi[:, :, 1])
                green_signal.append(green_mean)

                if len(green_signal) < 150:
                    cv2.putText(frame, "Collecting Signal...", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 3)
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

                            cv2.putText(frame, f'Heart Rate: {bpm} BPM', (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                            cv2.putText(frame, f'Respiratory Rate: {rr} breaths/min', (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 3)
                            cv2.putText(frame, f'Measuring... {remaining}s', (20, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 3)

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
                        except:
                            cv2.putText(frame, "Calculating...", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 3)
                    else:
                        cv2.putText(frame, f'Final Heart Rate: {final_bpm} BPM', (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 3)
                        cv2.putText(frame, f'Final Respiratory Rate: {final_rr} breaths/min', (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 3)
                        cv2.putText(frame, f'Estimated BP: {final_sbp}/{final_dbp} mmHg', (20, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
                        cv2.putText(frame, f'Stress Level: {stress_level}', (20, 200), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 165, 255), 3)
                        cv2.putText(frame, "Pre-Consultation Completed", (20, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 3)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    response = Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
