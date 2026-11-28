"""Plan-reading service for the Modify page.

POST /detect  (multipart form, field "image")  ->  {"image": {"w":..,"h":..}, "detections": [{"cls","conf","box":[x0,y0,x1,y1]}]}

Uses the open-source YOLOv8 floor-plan model from https://github.com/sanatladkat/floor-plan-object-detection
(MIT licence). Download its best.pt and point MODEL_PATH at it (default: ./best.pt).
Run:  pip install -r requirements.txt && python detect_api.py     (or: gunicorn -b 0.0.0.0:$PORT detect_api:app)
Then set window.UBC_DETECT_URL in index.html to  https://<your-host>/detect
"""
import io
import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO

MODEL_PATH = os.environ.get('MODEL_PATH', 'best.pt')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')          # set to your site's address in production
MAX_PIXELS = 40_000_000                                           # refuse absurdly large uploads
MIN_CONF = {'Door': .5, 'Sliding Door': .5, 'Window': .5, 'Wall': .3, 'Column': .4,
            'Stair Case': .4, 'Railing': .4, 'Curtain Wall': .4}  # 'Dimension' boxes are noisy, so they are left out

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024               # 20 MB
CORS(app, origins=ALLOWED_ORIGINS)
model = YOLO(MODEL_PATH)


@app.get('/health')
def health():
    return jsonify(ok=True, classes=list(model.names.values()))


@app.post('/detect')
def detect():
    f = request.files.get('image')
    if not f:
        return jsonify(error='send the plan as form field "image"'), 400
    try:
        im = Image.open(io.BytesIO(f.read())).convert('RGB')
    except Exception:
        return jsonify(error='that file is not a readable image'), 400
    if im.size[0] * im.size[1] > MAX_PIXELS:
        return jsonify(error='image is too large'), 413
    res = model.predict(im, conf=0.25, imgsz=1280, verbose=False)[0]
    out = []
    for b in res.boxes:
        name = model.names[int(b.cls)]
        conf = float(b.conf)
        if name in MIN_CONF and conf >= MIN_CONF[name]:
            out.append({'cls': name, 'conf': round(conf, 3), 'box': [round(float(v)) for v in b.xyxy[0].tolist()]})
    return jsonify(image={'w': im.size[0], 'h': im.size[1]}, detections=out)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
