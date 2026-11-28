# Third-party notice

The doors, windows and walls found on the plan in the Modify page (`assets/plans/ranch-2520.detections.json`)
and by the optional plan-reading service in `server/` come from the open-source YOLOv8 floor-plan model in
https://github.com/sanatladkat/floor-plan-object-detection (MIT License, Copyright (c) 2023 Sanat N Ladkat).
That project's licence text applies to the model and code taken from it.

## In-browser plan reading

Uploaded plans are read inside the visitor's browser (nothing is sent anywhere):
- `assets/models/floorplan-1024.onnx` is the YOLOv8 floor-plan model from the project above, exported to ONNX with its weights stored at half precision (converted back to full precision when loaded).
- `assets/ort/` holds ONNX Runtime Web (MIT License, Copyright (c) Microsoft Corporation), which runs the model.
