"""Fit the study head from a set of MediaPipe landmarks and canonical topology."""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation


def measured_points(frame):
    width, height = frame['size']
    return np.asarray(frame['landmarks']) * np.array([width, -height, -width])


def fit_depth(points, frame, yaw, indices):
    """Solve the camera pose and measure the depth residual from a second view."""
    origin = np.array([0, 2.75, 0])
    model = points[indices] - origin
    image = measured_points(frame)[indices, :2]
    image_center = image.mean(axis=0)
    image -= image_center
    scale = np.linalg.norm(image) / np.linalg.norm(model[:, :2] - model[:, :2].mean(axis=0))

    def projection(parameters):
        return np.exp(parameters[3]) * Rotation.from_rotvec(parameters[:3]).as_matrix()[:2]

    def residual(parameters):
        return (model @ projection(parameters).T + parameters[4:6] - image).ravel()

    result = least_squares(residual, [0, np.deg2rad(yaw), 0, np.log(scale), 0, 0], loss='soft_l1', f_scale=3)
    camera = projection(result.x)
    depth_axis = camera[:, 2]
    if np.linalg.norm(depth_axis) < .15 * np.exp(result.x[3]):
        return np.zeros(len(points))
    offsets = -residual(result.x).reshape(-1, 2) @ depth_axis / (depth_axis @ depth_axis)
    # Soften detector noise and carry visible profile measurements around the jaw.
    offsets = np.clip(offsets, -.06, .06)
    plane = points[:, :2].copy()
    plane[:, 0] = np.abs(plane[:, 0])
    delta = (plane[:, None, :] - plane[indices]) / np.array([.09, .068])
    weights = np.exp(-np.sum(delta**2, axis=2))
    return weights @ offsets / np.maximum(1, weights.sum(axis=1))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('landmarks', type=Path, help='JSON with frontal, quarter and profile observations')
    parser.add_argument('topology', type=Path, help='MediaPipe canonical_face_model.obj')
    parser.add_argument('--output', type=Path, default=Path(__file__).with_name('head-data.js'))
    args = parser.parse_args()
    references = json.loads(args.landmarks.read_text())
    points = measured_points(references['front-alt-inspect'])
    x_axis = points[263] - points[33]
    x_axis /= np.linalg.norm(x_axis)
    y_axis = points[10] - points[152]
    y_axis -= x_axis * np.dot(x_axis, y_axis)
    y_axis /= np.linalg.norm(y_axis)
    z_axis = np.cross(x_axis, y_axis)
    origin = (points[234] + points[454]) / 2
    face = (points - origin) @ np.array([x_axis, y_axis, z_axis]).T
    face *= .79 / (face[10, 1] - face[152, 1])
    face[:, 1] += 2.30 - face[152, 1]
    face[:, 2] -= .145
    profile_indices = [33, 133, 145, 158, 168, 6, 197, 195, 5, 4, 1, 2, 98, 97, 61, 40, 0, 13, 14, 17, 152, 199, 175, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 50, 101, 117, 118, 123, 205]
    quarter_indices = profile_indices + [263, 362, 374, 386, 291, 327, 454, 323, 361]
    profile = fit_depth(face, references['side-right-inspect'], 66, profile_indices)
    quarter = fit_depth(face, references['quarter-inspect'], 22, quarter_indices)
    face[:, 2] += .46 * profile + .18 * quarter
    # Match the observed facial breadth and soften the transition into the scalp.
    face[:, 0] *= .93
    face[:, 2] *= .88
    face[:, 1] += .065 * np.clip((face[:, 1] - 2.95) / .14, 0, 1)**1.5
    face[:, 1] -= .027 * np.exp(-((face[:, 1] - 2.84) / .10)**2)
    for contour in [[33, 160, 159, 158, 133, 153, 145, 144], [362, 385, 386, 387, 263, 373, 374, 380]]:
        center_y = face[contour, 1].mean()
        face[contour, 1] = center_y + (face[contour, 1] - center_y) * 1.12
    triangles = [[int(vertex.split('/')[0]) - 1 for vertex in line.split()[1:]]
                 for line in args.topology.read_text().splitlines() if line.startswith('f ')]
    data = {'landmarks': np.round(face, 6).tolist(), 'triangles': triangles}
    args.output.write_text('// Measured geometry. Canonical topology from MediaPipe, Apache-2.0.\n'
                           'export const PURRA_SHAPE = ' + json.dumps(data, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
