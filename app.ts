import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, SceneLoader, AbstractMesh, WebXRSessionManager, WebXRFeaturesManager, WebXRFeatureName, WebXRDefaultExperience, WebXRHandTracking } from "@babylonjs/core";
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

  // Simple gesture logic (very basic placeholder)
  // On each frame, if hands are present, detect pinch distance to scale
  scene.onBeforeRenderObservable.add(() => {
    if (!importedMesh) return;

    const leftHand = handTracking.getHandById("left");
    const rightHand = handTracking.getHandById("right");

    if (leftHand && rightHand) {
      const leftIndexTip = leftHand.getJointMesh("index-finger-tip");
      const rightIndexTip = rightHand.getJointMesh("index-finger-tip");

      if (leftIndexTip && rightIndexTip) {
        // Measure distance between two index fingertips
        const distance = Vector3.Distance(leftIndexTip.position, rightIndexTip.position);

        // Use distance to scale the mesh
        // Closer fingers = smaller scale, farther = bigger scale
        importedMesh.scaling = new Vector3(distance, distance, distance);
      }
    }

    // For move and rotate, you might track a single hand’s palm position and rotation.
    // E.g., if we have left hand only, move the mesh with the palm:
    if (leftHand && !rightHand) {
      const palm = leftHand.getJointMesh("wrist");
      if (palm && importedMesh) {
        importedMesh.position = palm.position.clone();
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
