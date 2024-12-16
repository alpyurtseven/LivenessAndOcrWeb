const faceMesh = new FaceMesh({
    locateFile: (file) => {
        console.log(file)
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});

const drawFaceTemplate = (canvasCtx, canvasElement) => {
    const width = canvasElement.width;
    const height = canvasElement.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const faceRadiusX = width * 0.2;
    const faceRadiusY = height * 0.4;

    canvasCtx.save();
    canvasCtx.strokeStyle = 'blue';
    canvasCtx.lineWidth = 2;

    canvasCtx.beginPath();
    canvasCtx.ellipse(centerX, centerY, faceRadiusX, faceRadiusY, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();

    canvasCtx.restore();
};

const isFaceInsideTemplate = (faceLandmarks, canvasElement) => {
    const width = canvasElement.width;
    const height = canvasElement.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const faceRadiusX = width * 0.2;
    const faceRadiusY = height * 0.4;
    const noseTip = faceLandmarks[1];
    const noseX = noseTip.x * width;
    const noseY = noseTip.y * height;
    const distanceFromCenter = euclidianDistance(noseX, noseY, centerX, centerY);
    const maxDistance = Math.min(faceRadiusX, faceRadiusY) * 0.5;
    const isInsideOuterFace = faceLandmarks.every(point => {
        const x = point.x * width;
        const y = point.y * height;
        const normalizedX = (x - centerX) / faceRadiusX;
        const normalizedY = (y - centerY) / faceRadiusY;
        return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
    });

    // Yüz işaretleme noktaları dış yüz şeklinin içindeyse ve yüz merkezi çok uzakta değilse
    return isInsideOuterFace && distanceFromCenter <= maxDistance;
}

const onResults = async (results) => {
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.font = '8px Verdana';
    drawFaceTemplate(canvasCtx, canvasElement);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0];
        if (tasks.length > 0) {
            const currentTask = tasks[currentTaskIndex];

            console.log('isFaceInsideTemplate', isFaceInsideTemplate(faceLandmarks, canvasElement))
            document.querySelector('.current-task').textContent = `Current Task: ${currentTask}`;
            taskPassed = false;

            switch (currentTask) {
                case 'Blinking Detection':
                    taskPassed = isBlinkingEyes(faceLandmarks);
                    break;
                case 'Turning Head to the Right':
                    taskPassed = isTurningHeadRight(faceLandmarks);
                    break;
                case 'Smiling Detection':
                    taskPassed = isSmiling(faceLandmarks);
                    break;
                case 'Looking Up':
                    taskPassed = isLookingUp(faceLandmarks);
                    break;
                case 'Opening Mouth':
                    taskPassed = isOpeningMouth(faceLandmarks);
                    break;
                case 'Raising Eyebrows':
                    taskPassed = isRaisingEyebrows(faceLandmarks);
                    break;
                case 'Turning Face to the Left':
                    taskPassed = isTurningHeadLeft(faceLandmarks);
                    break;
            }

            if (taskPassed) {
                document.querySelector('.camera-card').className = 'mud-paper mud-elevation-1 mud-card mt-5 green-border camera-card pa-4';
                tasks = tasks.slice(1);

                if (tasks.length === 0) {
                    document.querySelector('.current-task').textContent = 'All tasks passed! Liveness detected';
                    document.querySelector('.camera-card').className = 'mud-paper mud-elevation-1 mud-card mt-5 green-border camera-card pa-4';
                } else {
                    document.querySelector('.camera-card').className = 'mud-paper mud-elevation-1 mud-card mt-5 red-border camera-card pa-4';
                }
            }
        }
    }

    canvasCtx.restore();
}

const euclidianDistance = (x1, y1, x2, y2) => {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

const calculateSlope = (x1, y1, x2, y2) => {
    return (y2 - y1) / (x2 - x1);
}

const drawLines = (lines, faceLandmarks, canvasCtx, canvasElement) => {
    lines.forEach(([startIdx, endIdx], index) => {
        const start = faceLandmarks[startIdx];
        const end = faceLandmarks[endIdx];
        canvasCtx.beginPath();
        canvasCtx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
        canvasCtx.fillText(`${startIdx,endIdx}`, end.x * canvasElement.width, end.y * canvasElement.height);
        canvasCtx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);

        canvasCtx.stroke();
    });
}

const isRightEyebrowRaised = (landmarks) => {
    const irisPoints = FACEMESH_RIGHT_IRIS[1];
    const eyebrowPoint = FACEMESH_RIGHT_EYEBROW[3];
    const faceTopPoint = FACEMESH_FACE_OVAL[0];
    const irisEyebrowDistance = euclidianDistance(landmarks[irisPoints[0]].x, landmarks[irisPoints[0]].y, landmarks[eyebrowPoint[0]].x, landmarks[eyebrowPoint[0]].y);
    const faceTopEyebrowDistance = euclidianDistance(landmarks[irisPoints[0]].x, landmarks[irisPoints[0]].y, landmarks[faceTopPoint[0]].x, landmarks[faceTopPoint[0]].y);
    const threshold = 0.36;

    return (irisEyebrowDistance / faceTopEyebrowDistance) > threshold;
}

const isLeftEyebrowRaised = (landmarks) => {
    const irisPoints = FACEMESH_LEFT_IRIS[1];
    const eyebrowPoint = FACEMESH_LEFT_EYEBROW[3];
    const faceTopPoint = FACEMESH_FACE_OVAL[0];
    const irisEyebrowDistance = euclidianDistance(landmarks[irisPoints[0]].x, landmarks[irisPoints[0]].y, landmarks[eyebrowPoint[0]].x, landmarks[eyebrowPoint[0]].y);
    const faceTopEyebrowDistance = euclidianDistance(landmarks[irisPoints[0]].x, landmarks[irisPoints[0]].y, landmarks[faceTopPoint[0]].x, landmarks[faceTopPoint[0]].y);
    const threshold = 0.36;

    return (irisEyebrowDistance / faceTopEyebrowDistance) > threshold;
}

const isRightEyeBlinking = (landmarks) => {
    const topEyelidPoint = FACEMESH_RIGHT_EYE[12];
    const lowerEyelidPoint = FACEMESH_RIGHT_EYE[4];
    const eyebrowPoint = FACEMESH_RIGHT_EYEBROW[3];
    const eyeBrowTopEyelidDistance = euclidianDistance(landmarks[eyebrowPoint[0]].x, landmarks[eyebrowPoint[0]].y, landmarks[topEyelidPoint[0]].x, landmarks[topEyelidPoint[0]].y);
    const eyeBrowBottomEyelidDistance = euclidianDistance(landmarks[eyebrowPoint[0]].x, landmarks[eyebrowPoint[0]].y, landmarks[lowerEyelidPoint[0]].x, landmarks[lowerEyelidPoint[0]].y);
    const eyelidDistance = euclidianDistance(landmarks[topEyelidPoint[0]].x, landmarks[topEyelidPoint[0]].y, landmarks[lowerEyelidPoint[0]].x, landmarks[lowerEyelidPoint[0]].y);
    const eyelidThreshold = 0.015;
    const eyebrowRatioThreshold = 0.9;


    return eyelidDistance < eyelidThreshold && (eyeBrowTopEyelidDistance / eyeBrowBottomEyelidDistance) > eyebrowRatioThreshold;
}

const isLeftEyeBlinking = (landmarks) => {
    const topEyelidPoint = FACEMESH_LEFT_EYE[12];
    const lowerEyelidPoint = FACEMESH_LEFT_EYE[4];
    const eyebrowPoint = FACEMESH_LEFT_EYEBROW[3];
    const eyeBrowTopEyelidDistance = euclidianDistance(landmarks[eyebrowPoint[0]].x, landmarks[eyebrowPoint[0]].y, landmarks[topEyelidPoint[0]].x, landmarks[topEyelidPoint[0]].y);
    const eyeBrowBottomEyelidDistance = euclidianDistance(landmarks[eyebrowPoint[0]].x, landmarks[eyebrowPoint[0]].y, landmarks[lowerEyelidPoint[0]].x, landmarks[lowerEyelidPoint[0]].y);
    const eyelidDistance = euclidianDistance(landmarks[topEyelidPoint[0]].x, landmarks[topEyelidPoint[0]].y, landmarks[lowerEyelidPoint[0]].x, landmarks[lowerEyelidPoint[0]].y);
    const eyelidThreshold = 0.015;
    const eyebrowRatioThreshold = 0.9;


    return eyelidDistance < eyelidThreshold && (eyeBrowTopEyelidDistance / eyeBrowBottomEyelidDistance) > eyebrowRatioThreshold;
}

const isTurningHeadRight = (landmarks) => {
    const earTopPoint = FACEMESH_FACE_OVAL[27];
    const nosePoint = [1];

    return landmarks[nosePoint[0]].x < landmarks[earTopPoint[0]].x;
}

const isTurningHeadLeft = (landmarks) => {
    const earTopPoint = FACEMESH_FACE_OVAL[9];
    const nosePoint = [1];

    return landmarks[nosePoint[0]].x > landmarks[earTopPoint[0]].x;

}

const isSmiling = (landmarks) => {
    const leftLipCorner = FACEMESH_LIPS[1];
    const rightLipCorent = FACEMESH_LIPS[9]; // Index 1 -291
    const leftEarPoint = FACEMESH_FACE_OVAL[10];
    const smilingThreshold = 2.45;
    const leftLipDistance = euclidianDistance(landmarks[leftLipCorner[0]].x, landmarks[leftLipCorner[0]].y, landmarks[leftEarPoint[0]].x, landmarks[leftEarPoint[0]].y);
    const rightLipDistance = euclidianDistance(landmarks[rightLipCorent[1]].x, landmarks[rightLipCorent[1]].y, landmarks[leftEarPoint[0]].x, landmarks[leftEarPoint[0]].y)

    return Math.abs(leftLipDistance / rightLipDistance) > smilingThreshold;
}

const isLookingUp = (landmarks) => {
    const noseTip = landmarks[1];
    const rightEyebrowPoint = FACEMESH_RIGHT_EYEBROW[3] // Index 1 - 55
    const eyeBrowNoiseDistance = euclidianDistance(landmarks[rightEyebrowPoint[1]].x, landmarks[rightEyebrowPoint[1]].y, noseTip.x, noseTip.y)

    return (eyeBrowNoiseDistance / Math.abs(noseTip.z)) < 1;
}

const isOpeningMouth = (landmarks) => {
    const upperLip = FACEMESH_LIPS[35];
    const lowerLip = FACEMESH_LIPS[25];
    const mouthOpen = Math.abs(landmarks[upperLip[0]].y - landmarks[lowerLip[0]].y);
    return mouthOpen > 0.05;
}

const isRaisingEyebrows = (landmarks) => {
    return isRightEyebrowRaised(landmarks) && isLeftEyebrowRaised(landmarks);
}
const isBlinkingEyes = (landmarks) => {
    return isRightEyeBlinking(landmarks) && isLeftEyeBlinking(landmarks);
}

const getRandomTasks = () => {
    const allTasks = [
        'Blinking Detection',
        'Turning Head to the Right',
        'Looking Up',
        'Smiling Detection',
        'Opening Mouth',
        'Raising Eyebrows',
        'Turning Face to the Left'
    ];
    tasks = [];
    while (tasks.length < 3) {
        const randomTask = allTasks[Math.floor(Math.random() * allTasks.length)];
        if (!tasks.includes(randomTask)) {
            tasks.push(randomTask);
        }
    }
    currentTaskIndex = 0;
    console.log("Selected tasks:", tasks);
}

const startCamera = () => {
    getRandomTasks();

    const videoElement = document.getElementById('video');
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({
                image: videoElement
            });
        },
        width: 1280,
        height: 720
    });
    camera.start();
}

window.startCamera = startCamera;

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

let currentTaskIndex = 0;
let tasks = [];
let taskPassed = false;