"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const config = {
    video: { width: 640, height: 480, fps: 30 },
};
const landmarkColors = {
    thumb: "red",
    index: "blue",
    middle: "yellow",
    ring: "green",
    pinky: "pink",
    wrist: "white",
};
const gestureStrings = {
    scissors: "✌🏻",
    rock: "👊",
    paper: "🖐",
};
function createDetector() {
    return __awaiter(this, void 0, void 0, function* () {
        // Replace 'any' with the proper return type if known
        return window.handPoseDetection.createDetector(window.handPoseDetection.SupportedModels.MediaPipeHands, {
            runtime: "mediapipe",
            modelType: "full",
            maxHands: 1,
            solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915`,
        });
    });
}
function main() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const video = document.querySelector("#pose-video");
        const canvas = document.querySelector("#pose-canvas");
        const ctx = canvas === null || canvas === void 0 ? void 0 : canvas.getContext("2d");
        const resultLayer = {
            right: document.querySelector("#pose-result-right"),
            left: document.querySelector("#pose-result-left"),
        };
        const Finger = fp.Finger;
        const GestureDescription = fp.GestureDescription;
        const FingerCurl = fp.FingerCurl;
        const RockGesture = new GestureDescription("rock"); // ✊️
        const PaperGesture = new GestureDescription("paper"); // 🖐
        const ScissorsGesture = new GestureDescription("scissors"); // ✌️
        // Rock
        // -----------------------------------------------------------------------------
        // thumb: half curled
        // accept no curl with a bit lower confidence
        RockGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
        RockGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.5);
        // all other fingers: curled
        for (let finger of [Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
            RockGesture.addCurl(finger, FingerCurl.FullCurl, 1.0);
            RockGesture.addCurl(finger, FingerCurl.HalfCurl, 0.9);
        }
        // Paper
        // -----------------------------------------------------------------------------
        // no finger should be curled
        for (let finger of Finger.all) {
            PaperGesture.addCurl(finger, FingerCurl.NoCurl, 1.0);
        }
        // Scissors
        //------------------------------------------------------------------------------
        // index and middle finger: stretched out
        ScissorsGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
        ScissorsGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
        // ring: curled
        ScissorsGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
        ScissorsGesture.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.9);
        // pinky: curled
        ScissorsGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
        ScissorsGesture.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.9);
        const knownGestures = [RockGesture, PaperGesture, ScissorsGesture]; // Replace 'any' with the proper type if known
        const GE = new fp.GestureEstimator(knownGestures);
        const detector = yield createDetector();
        console.log("mediaPose model loaded");
        let isPlaying = false;
        (_a = document.getElementById("play-button")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
            var _a;
            isPlaying = false;
            (_a = document.getElementById("result-container")) === null || _a === void 0 ? void 0 : _a.classList.add("hide");
        });
        const estimateHands = () => __awaiter(this, void 0, void 0, function* () {
            var _b;
            if (ctx && video) {
                ctx.clearRect(0, 0, config.video.width, config.video.height);
                // resultLayer.right!.innerText = "";
                // resultLayer.left!.innerText = "";
                const hands = yield detector.estimateHands(video, {
                    flipHorizontal: true,
                });
                for (const hand of hands) {
                    for (const keypoint of hand.keypoints) {
                        const name = keypoint.name.split("_")[0].toString().toLowerCase();
                        const color = landmarkColors[name];
                        drawPoint(ctx, keypoint.x, keypoint.y, 3, color);
                    }
                    const est = GE.estimate(hand.keypoints3D, 9);
                    if (est.gestures.length > 0 && !isPlaying) {
                        isPlaying = true;
                        let result = est.gestures.reduce((p, c) => {
                            // Replace 'any' with the proper type if known
                            return p.score > c.score ? p : c;
                        });
                        const chosenHand = hand.handedness.toLowerCase();
                        const computerGesture = ComputerPlayGesture();
                        const playerGesture = result.name;
                        const resultText = PlayRound(playerGesture, computerGesture);
                        const resultContainer = document.getElementById("pose-result-hand");
                        if (resultContainer) {
                            resultContainer.innerHTML = `Player: ${playerGesture} <br/>vs<br/> Computer: ${computerGesture}<br/><span class="result-text">${resultText}</span>`;
                        }
                        (_b = document.getElementById("result-container")) === null || _b === void 0 ? void 0 : _b.classList.remove("hide");
                    }
                }
            }
            setTimeout(() => {
                estimateHands();
            }, 1000 / config.video.fps);
        });
        estimateHands();
        console.log("Starting predictions");
    });
}
const ComputerPlayGesture = () => {
    const gestures = Object.keys(gestureStrings);
    const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
    return randomGesture;
};
const PlayRound = (playerGesture, computerGesture) => {
    const playerWins = {
        rock: "scissors",
        paper: "rock",
        scissors: "paper",
    };
    if (playerGesture === computerGesture) {
        return "It's a tie!";
    }
    if (playerWins[playerGesture] === computerGesture) {
        return "You win!";
    }
    return "Computer wins!";
};
function initCamera(width, height, fps) {
    return __awaiter(this, void 0, void 0, function* () {
        const constraints = {
            audio: false,
            video: {
                facingMode: "user",
                width: width,
                height: height,
                frameRate: { max: fps },
            },
        };
        const video = document.querySelector("#pose-video");
        if (video) {
            video.width = width;
            video.height = height;
            const stream = yield navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    resolve(video);
                };
            });
        }
    });
}
function drawPoint(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}
window.addEventListener("DOMContentLoaded", () => {
    initCamera(config.video.width, config.video.height, config.video.fps).then((video) => {
        video === null || video === void 0 ? void 0 : video.play();
        video === null || video === void 0 ? void 0 : video.addEventListener("loadeddata", (event) => {
            console.log("Camera is ready");
            main();
        });
    });
    const canvas = document.querySelector("#pose-canvas");
    if (canvas) {
        canvas.width = config.video.width;
        canvas.height = config.video.height;
        console.log("Canvas initialized");
    }
});
