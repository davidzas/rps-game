interface VideoConfig {
  width: number;
  height: number;
  fps: number;
}

interface LandmarkColors {
  thumb: string;
  index: string;
  middle: string;
  ring: string;
  pinky: string;
  wrist: string;
}

interface GestureStrings {
  scissors: string;
  rock: string;
  paper: string;
}

interface ResultLayer {
  right: HTMLElement | null;
  left: HTMLElement | null;
}

const config: { video: VideoConfig } = {
  video: { width: 640, height: 480, fps: 30 },
};

const landmarkColors: LandmarkColors = {
  thumb: "red",
  index: "blue",
  middle: "yellow",
  ring: "green",
  pinky: "pink",
  wrist: "white",
};

const gestureStrings: GestureStrings = {
  scissors: "✌🏻",
  rock: "👊",
  paper: "🖐",
};

interface Window {
  handPoseDetection: any; // Replace 'any' with the proper type if known
}

declare const fp: any; // Replace 'any' with the proper type if known

async function createDetector(): Promise<any> {
  // Replace 'any' with the proper return type if known
  return window.handPoseDetection.createDetector(window.handPoseDetection.SupportedModels.MediaPipeHands, {
    runtime: "mediapipe",
    modelType: "full",
    maxHands: 2,
    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915`,
  });
}

async function main(): Promise<void> {
  const video = document.querySelector<HTMLVideoElement>("#pose-video");
  const canvas = document.querySelector<HTMLCanvasElement>("#pose-canvas");
  const ctx = canvas?.getContext("2d");

  const resultLayer: ResultLayer = {
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

  const knownGestures: any[] = [RockGesture, PaperGesture, ScissorsGesture]; // Replace 'any' with the proper type if known
  const GE = new fp.GestureEstimator(knownGestures);

  const detector = await createDetector();
  console.log("mediaPose model loaded");

  let isPlaying = false;
  document.getElementById("play-button")?.addEventListener("click", () => {
    isPlaying = false;

    document.getElementById("result-container")?.classList.add("hide");
  });
  const estimateHands = async () => {
    if (ctx && video) {
      ctx.clearRect(0, 0, config.video.width, config.video.height);
      // resultLayer.right!.innerText = "";
      // resultLayer.left!.innerText = "";

      const hands = await detector.estimateHands(video, {
        flipHorizontal: true,
      });

      for (const hand of hands) {
        for (const keypoint of hand.keypoints) {
          const name = keypoint.name.split("_")[0].toString().toLowerCase();
          const color = landmarkColors[name as keyof LandmarkColors];
          drawPoint(ctx, keypoint.x, keypoint.y, 3, color);
        }

        const est = GE.estimate(hand.keypoints3D, 9);
        if (est.gestures.length > 0 && !isPlaying) {
          isPlaying = true;
          let result = est.gestures.reduce((p: any, c: any) => {
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
          document.getElementById("result-container")?.classList.remove("hide");
        }
      }
    }

    setTimeout(() => {
      estimateHands();
    }, 1000 / config.video.fps);
  };

  estimateHands();
  console.log("Starting predictions");
}

const ComputerPlayGesture = () => {
  const gestures = Object.keys(gestureStrings);
  const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
  return randomGesture;
};

const PlayRound = (playerGesture: string, computerGesture: string) => {
  const playerWins: { [key: string]: string } = {
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

async function initCamera(width: number, height: number, fps: number): Promise<HTMLVideoElement | void> {
  const constraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: width,
      height: height,
      frameRate: { max: fps },
    },
  };

  const video = document.querySelector<HTMLVideoElement>("#pose-video");
  if (video) {
    video.width = width;
    video.height = height;

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  }
}

function drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function updateDebugInfo(data: any, hand: string): void {
  // Replace 'any' with the proper type if known
  const summaryTable = `#summary-${hand}`;
  for (let fingerIdx in data) {
    document.querySelector(`${summaryTable} span#curl-${fingerIdx}`)!.innerHTML = data[fingerIdx][1];
    document.querySelector(`${summaryTable} span#dir-${fingerIdx}`)!.innerHTML = data[fingerIdx][2];
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initCamera(config.video.width, config.video.height, config.video.fps).then((video) => {
    video?.play();
    video?.addEventListener("loadeddata", (event) => {
      console.log("Camera is ready");
      main();
    });
  });

  const canvas = document.querySelector<HTMLCanvasElement>("#pose-canvas");
  if (canvas) {
    canvas.width = config.video.width;
    canvas.height = config.video.height;
    console.log("Canvas initialized");
  }
});
