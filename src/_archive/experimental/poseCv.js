const JOINT_POINTS = {
  shoulder: { left: 11, right: 12 },
  elbow: { left: 13, right: 14 },
  wrist: { left: 15, right: 16 },
  hip: { left: 23, right: 24 },
  knee: { left: 25, right: 26 },
  ankle: { left: 27, right: 28 },
  heel: { left: 29, right: 30 },
  foot_index: { left: 31, right: 32 },
};

const POSE_NAME_TO_ID = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

const toDeg = (radians) => (radians * 180) / Math.PI;

function angleAt(a, b, c) {
  if (!a || !b || !c) return null;
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag1 = Math.hypot(abx, aby);
  const mag2 = Math.hypot(cbx, cby);
  if (!mag1 || !mag2) return null;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return toDeg(Math.acos(cos));
}

function getPoint(landmarks, id) {
  if (!Array.isArray(landmarks)) return null;
  return landmarks[id] || null;
}

function getSidePoint(landmarks, jointName, side) {
  const ids = JOINT_POINTS[jointName];
  if (!ids) return null;
  return getPoint(landmarks, ids[side]);
}

function average(points) {
  const valid = points.filter(Boolean);
  if (valid.length === 0) return null;
  return {
    x: valid.reduce((s, p) => s + p.x, 0) / valid.length,
    y: valid.reduce((s, p) => s + p.y, 0) / valid.length,
    score: valid.reduce((s, p) => s + (p.score || 0), 0) / valid.length,
  };
}

function getJointCenter(landmarks, jointName) {
  const left = getSidePoint(landmarks, jointName, 'left');
  const right = getSidePoint(landmarks, jointName, 'right');
  return average([left, right]);
}

function getKneeAngle(landmarks) {
  const left = angleAt(
    getSidePoint(landmarks, 'hip', 'left'),
    getSidePoint(landmarks, 'knee', 'left'),
    getSidePoint(landmarks, 'ankle', 'left')
  );
  const right = angleAt(
    getSidePoint(landmarks, 'hip', 'right'),
    getSidePoint(landmarks, 'knee', 'right'),
    getSidePoint(landmarks, 'ankle', 'right')
  );
  return averageNumber([left, right]);
}

function getHipAngle(landmarks) {
  const left = angleAt(
    getSidePoint(landmarks, 'shoulder', 'left'),
    getSidePoint(landmarks, 'hip', 'left'),
    getSidePoint(landmarks, 'knee', 'left')
  );
  const right = angleAt(
    getSidePoint(landmarks, 'shoulder', 'right'),
    getSidePoint(landmarks, 'hip', 'right'),
    getSidePoint(landmarks, 'knee', 'right')
  );
  return averageNumber([left, right]);
}

function getShoulderAngle(landmarks) {
  const left = angleAt(
    getSidePoint(landmarks, 'hip', 'left'),
    getSidePoint(landmarks, 'shoulder', 'left'),
    getSidePoint(landmarks, 'elbow', 'left')
  );
  const right = angleAt(
    getSidePoint(landmarks, 'hip', 'right'),
    getSidePoint(landmarks, 'shoulder', 'right'),
    getSidePoint(landmarks, 'elbow', 'right')
  );
  return averageNumber([left, right]);
}

function getElbowAngle(landmarks) {
  const left = angleAt(
    getSidePoint(landmarks, 'shoulder', 'left'),
    getSidePoint(landmarks, 'elbow', 'left'),
    getSidePoint(landmarks, 'wrist', 'left')
  );
  const right = angleAt(
    getSidePoint(landmarks, 'shoulder', 'right'),
    getSidePoint(landmarks, 'elbow', 'right'),
    getSidePoint(landmarks, 'wrist', 'right')
  );
  return averageNumber([left, right]);
}

function getAnkleAngle(landmarks) {
  const left = angleAt(
    getSidePoint(landmarks, 'knee', 'left'),
    getSidePoint(landmarks, 'ankle', 'left'),
    getSidePoint(landmarks, 'foot_index', 'left')
  );
  const right = angleAt(
    getSidePoint(landmarks, 'knee', 'right'),
    getSidePoint(landmarks, 'ankle', 'right'),
    getSidePoint(landmarks, 'foot_index', 'right')
  );
  return averageNumber([left, right]);
}

function getTorsoDeviation(landmarks) {
  const shoulder = getJointCenter(landmarks, 'shoulder');
  const hip = getJointCenter(landmarks, 'hip');
  if (!shoulder || !hip) return null;
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  const deviation = toDeg(Math.atan2(Math.abs(dx), Math.abs(dy)));
  return deviation;
}

function averageNumber(arr) {
  const v = arr.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (v.length === 0) return null;
  return v.reduce((s, n) => s + n, 0) / v.length;
}

function metricForRule(landmarks, rule) {
  const jointA = String(rule.joint_a || '').toLowerCase();
  const jointB = String(rule.joint_b || '').toLowerCase();
  const key = `${jointA}-${jointB}`;

  if (key === 'hip-knee') return getKneeAngle(landmarks);
  if (key === 'shoulder-hip') return getHipAngle(landmarks);
  if (key === 'knee-ankle') return getAnkleAngle(landmarks);
  if (key === 'elbow-shoulder') return getShoulderAngle(landmarks);
  if (key === 'shoulder-elbow') return getElbowAngle(landmarks);
  if (key === 'hip-ankle') return getTorsoDeviation(landmarks);

  if (
    ['back_alignment', 'torso_alignment', 'spine_neutrality', 'trunk_stability', 'posture_control', 'lumbar_control'].includes(
      String(rule.rule || '').toLowerCase()
    )
  ) {
    return getTorsoDeviation(landmarks);
  }
  return null;
}

function evaluateRule(landmarks, rule) {
  const metric = metricForRule(landmarks, rule);
  if (metric == null) {
    return { ok: true, metric: null, reason: 'insufficient_landmarks' };
  }

  if (typeof rule.threshold_angle === 'number') {
    const cmp = String(rule.comparison || 'less_than').toLowerCase();
    if (cmp === 'less_than') return { ok: metric < rule.threshold_angle, metric };
    if (cmp === 'greater_than') return { ok: metric > rule.threshold_angle, metric };
    return { ok: true, metric };
  }

  if (typeof rule.max_deviation_degrees === 'number') {
    return { ok: metric <= rule.max_deviation_degrees, metric };
  }
  return { ok: true, metric };
}

function toLandmarkArrayFromPoseDetector(keypoints = []) {
  const landmarks = Array.from({ length: 33 }, () => null);
  keypoints.forEach((kp) => {
    const id = POSE_NAME_TO_ID[kp.name];
    if (typeof id === 'number') {
      landmarks[id] = { x: kp.x, y: kp.y, z: kp.z || 0, score: kp.score || 0 };
    }
  });
  return landmarks;
}

export {
  evaluateRule,
  toLandmarkArrayFromPoseDetector,
  getKneeAngle,
  getHipAngle,
  getTorsoDeviation,
};
