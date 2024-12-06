import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, SceneLoader, AbstractMesh, WebXRDefaultExperience, WebXRFeatureName, WebXRHandTracking } from "@babylonjs/core";
import "@babylonjs/loaders";
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";

async function createScene(engine: Engine): Promise<Scene> {
  const scene = new Scene(engine);

  // Camera and light setup
  const camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 4, 2, Vector3.Zero(), scene);
  camera.position = new Vector3(0, 1, -2);
  camera.attachControl(engine.getRenderingCanvas(), true);
  new HemisphericLight("Light", new Vector3(0, 1, 0), scene);

  // Load a 3D mesh (replace URL with your model)
  let importedMesh: AbstractMesh|undefined;
  const result = await SceneLoader.ImportMeshAsync("", "https://assets.babylonjs.com/meshes/", "valleyvillage.glb", scene);
  if (result.meshes.length > 0) {
    importedMesh = result.meshes[0];
    importedMesh.scaling.scaleInPlace(0.1);
    importedMesh.position = new Vector3(0, 0, 0);
  }

  // Create WebXR Experience (AR)
  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    uiOptions: {
      sessionMode: "immersive-ar",
      referenceSpaceType: "local"
    },
    optionalFeatures: true
  });

  // Enable Hand Tracking
  const fm = xr.baseExperience.featuresManager;
  const handTracking = fm.enableFeature(WebXRFeatureName.HAND_TRACKING, "stable", {
    xrInput: xr.input,
    jointMeshes: {
      enablePhysics: false
    }
  }) as WebXRHandTracking;

  // Variables to store references to the left and right hands
  let leftHand: any;   // Replace 'any' with 'WebXRHand' if typed imports are available
  let rightHand: any;

  // Track when hands are added
  xr.input.onControllerAddedObservable.add((xrInputSource) => {
    if (xrInputSource.inputSource.hand) {
      const hand = xrInputSource.motionController;
      if (xrInputSource.inputSource.handedness === 'left') {
        leftHand = hand;
      } else if (xrInputSource.inputSource.handedness === 'right') {
        rightHand = hand;
      }
    }
  });

  // Track when hands are removed
  xr.input.onControllerRemovedObservable.add((xrInputSource) => {
    if (xrInputSource.inputSource.hand) {
      if (xrInputSource.inputSource.handedness === 'left') {
        leftHand = undefined;
      } else if (xrInputSource.inputSource.handedness === 'right') {
        rightHand = undefined;
      }
    }
  });

  // Scene loop to handle gestures
  scene.onBeforeRenderObservable.add(() => {
    if (!importedMesh) return;

    if (leftHand && rightHand) {
      const leftIndexTip = leftHand.getJointMesh("index-finger-tip");
      const rightIndexTip = rightHand.getJointMesh("index-finger-tip");

      if (leftIndexTip && rightIndexTip) {
        // Measure distance between two index fingertips
        const distance = Vector3.Distance(leftIndexTip.position, rightIndexTip.position);
        // Scale the mesh based on fingertip distance
        importedMesh.scaling = new Vector3(distance, distance, distance);
      }
    }

    // If only one hand (left) is present, move the mesh with the palm
    if (leftHand && !rightHand) {
      const palm = leftHand.getJointMesh("wrist");
      if (palm) {
        importedMesh.position.copyFrom(palm.position);
      }
    }
  });

  return scene;
}

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  const scene = await createScene(engine);

  engine.runRenderLoop(() => {
    scene.render();
  });

  window.addEventListener("resize", () => {
    engine.resize();
  });
});
