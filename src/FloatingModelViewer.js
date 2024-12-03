// Import necessary Babylon.js modules from CDN
import { Engine } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/Engines/engine.js";
import { Scene } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/scene.js";
import { FreeCamera } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/Cameras/freeCamera.js";
import { Vector3 } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/Maths/math.vector.js";
import { HemisphericLight } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/Lights/hemisphericLight.js";
import { SceneLoader } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/Loading/sceneLoader.js";
import "https://cdn.jsdelivr.net/npm/@babylonjs/loaders@6.20.0/glTF/index.js"; // Import the glTF loader
import { WebXRFeatureName } from "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/XR/webXRFeaturesManager.js";
import "https://cdn.jsdelivr.net/npm/@babylonjs/core@6.20.0/XR/webXRHandTracking.js";

class FloatingModelViewer {
    constructor() {
        console.log("Initializing FloatingModelViewer...");
        this.canvas = document.getElementById("renderCanvas");
        if (!this.canvas) {
            console.error("Canvas element not found!");
            return;
        }
        console.log("Canvas element found.");

        this.engine = new Engine(this.canvas, true);
        console.log("Babylon.js Engine initialized:", this.engine);

        this.scene = new Scene(this.engine);
        console.log("Scene created:", this.scene);

        this.currentModel = null;
        this.isModelGrabbed = false;
        this.init();
    }

    async init() {
        try {
            console.log("Setting up camera...");
            this.camera = new FreeCamera("camera", new Vector3(0, 1.6, -0.5), this.scene);
            this.camera.attachControl(this.canvas, true);
            this.camera.setTarget(Vector3.Zero());

            console.log("Adding lighting...");
            const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
            light.intensity = 1.0;

            console.log("Setting up WebXR...");
            const xr = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: { sessionMode: "immersive-ar" },
                optionalFeatures: ["hand-tracking"],
            });

            console.log("Enabling hand tracking...");
            if (
                xr.baseExperience.featuresManager.enableFeature(
                    WebXRFeatureName.HAND_TRACKING,
                    "latest",
                    { xrInput: xr.input }
                )
            ) {
                this.setupHandTracking(xr);
            }

            console.log("Loading model...");
            await this.loadModel("./Spheres.glb"); // Update path as needed
            console.log("Model loaded successfully.");

            console.log("Starting render loop...");
            this.engine.runRenderLoop(() => this.scene.render());
            console.log("Render loop started.");

            window.addEventListener("resize", () => this.engine.resize());
        } catch (error) {
            console.error("Initialization failed:", error);
        }
    }

    async loadModel(url) {
        console.log(`Attempting to load model from: ${url}`);
        try {
            const result = await SceneLoader.ImportMeshAsync("", url, "", this.scene);
            console.log("Model loaded result:", result);

            this.currentModel = result.meshes[0];
            if (!this.currentModel) {
                throw new Error("No meshes found in the model.");
            }

            console.log("Model added to scene:", this.currentModel);
            this.currentModel.position = new Vector3(0, 1.6, -0.5);

            // Add rotation animation
            this.scene.registerBeforeRender(() => {
                if (!this.isModelGrabbed && this.currentModel) {
                    this.currentModel.rotate(Vector3.Up(), 0.005);
                }
            });
        } catch (error) {
            console.error("Error loading model:", error);
        }
    }

    setupHandTracking(xr) {
        const handJointScale = 0.08;
        let lastPinchDistance = 0;
        let initialModelScale = 1;

        xr.input.onControllerAddedObservable.add((controller) => {
            if (controller.inputSource.hand) {
                console.log("Hand tracking enabled.");
                controller.onHandJointsUpdatedObservable.add((joints) => {
                    const thumbTip = joints[BABYLON.WebXRHand.THUMB_TIP].position;
                    const indexTip = joints[BABYLON.WebXRHand.INDEX_TIP].position;

                    const pinchDistance = Vector3.Distance(thumbTip, indexTip);

                    if (pinchDistance < handJointScale) {
                        if (!this.isModelGrabbed) {
                            this.isModelGrabbed = true;
                            initialModelScale = this.currentModel.scaling.x;
                            lastPinchDistance = pinchDistance;
                        }

                        const palmPosition = joints[BABYLON.WebXRHand.WRIST].position;
                        this.currentModel.position = palmPosition.clone();

                        const pinchDelta = pinchDistance - lastPinchDistance;
                        const newScale = initialModelScale * (1 + pinchDelta);
                        this.currentModel.scaling = new Vector3(newScale, newScale, newScale);

                        lastPinchDistance = pinchDistance;
                    } else {
                        this.isModelGrabbed = false;
                    }
                });
            }
        });
    }
}

export default FloatingModelViewer;

window.addEventListener("DOMContentLoaded", () => {
    new FloatingModelViewer();
});
