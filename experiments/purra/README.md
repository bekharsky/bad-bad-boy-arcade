# Purra head studies

Two prototypes share one body and running cycle. The sculpt uses measured landmarks from frontal, quarter and profile photos to fit a solid head. The collage switches among five photo views and animates the lower lip and chin as a separate cutout. The rear view uses a still from video footage.

Generate the inline preview fragment with `node experiments/purra/build-preview.mjs /path/to/purra-head-studies.html`. The fragment embeds the photographs and imports the same version of Three.js as the game.

Photo authors, source links and licences appear under «Фотографии» in [the preview template](preview.fragment.html). The reference photographs are cropped. The collage clips them into separate head pieces in the renderer. The face mesh uses [canonical MediaPipe topology](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj) from the MediaPipe Authors under [Apache 2.0](LICENSE.mediapipe).

To refit the sculpt, run `prepare-shape.py` with NumPy and SciPy, the canonical OBJ and a JSON file containing the `front-alt-inspect`, `quarter-inspect` and `side-right-inspect` MediaPipe observations. Each observation has `size` in pixels and `landmarks` as normalized XYZ triples.
