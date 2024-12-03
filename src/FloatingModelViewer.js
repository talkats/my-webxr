import * as BABYLON from '@babylonjs/core';

class FloatingModelViewer {
    constructor() {
        console.log("Initializing FloatingModelViewer...");
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.currentModel = null;
        this.isModelGrabbed = false;
        this.init();
    }

    async init() {
        try {
            console.log("Setting up camera...");
            // Camera setup
            this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 1.6, -0.5), this.scene);
            this.camera.attachControl(this.canvas, true);
            this.camera.setTarget(BABYLON.Vector3.Zero());

            // Lighting
            console.log("Adding lighting...");
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
            light.intensity = 1.0;

            // XR setup
            console.log("Setting up XR...");
            const xr = await this.scene.createDefaultXRExperienceAsync({
                uiOptions: { sessionMode: "immersive-ar" },
                optionalFeatures: ["hand-tracking"]
            });

            console.log("XR setup complete.");
            // Enable hand tracking
            const handTrackingFeature = xr.baseExperience.featuresManager.enableFeature(
                BABYLON.WebXRFeatureName.HAND_TRACKING, 
                "latest",
                { xrInput: xr.input }
            );

            if (handTrackingFeature) {
                console.log("Hand tracking enabled.");
                this.setupHandTracking(xr);
            } else {
                console.warn("Hand tracking feature could not be enabled.");
            }

            // Load model
            console.log("Loading model...");
            await this.loadModel("https://raw.githubusercontent.com/talkats/my-webxr/d1dc39a858f3cfc80e5bbc309f25cbdac2e47f33/Spheres.glb");
            console.log("Model loaded successfully.");

            // Start render loop
            console.log("Starting render loop...");
            this.engine.runRenderLoop(() => this.scene.render());

            // Handle window resize
            window.addEventListener("resize", () => this.engine.resize());
        } catch (error) {
            console.error("Initialization failed:", error);
        }
    }

    async loadModel(url) {
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", url, "", this.scene);
            this.currentModel = result.meshes[0] || null;

            if (!this.currentModel) {
                throw new Error("No meshes found in the model.");
            }

            // Position model
            this.currentModel.position = new BABYLON.Vector3(0, 1.6, -0.5);

            // Add rotation animation
            this.scene.registerBeforeRender(() => {
                if (!this.isModelGrabbed && this.currentModel) {
                    this.currentModel.rotate(
                        BABYLON.Vector3.Up(),
                        0.005
                    );
                }
            });

            console.log("Model prepared and added to the scene.");
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
                console.log("Hand tracking controller added.");

                controller.onHandJointsUpdatedObservable.add((joints) => {
                    const thumbTip = joints[BABYLON.WebXRHand.THUMB_TIP]?.position;
                    const indexTip = joints[BABYLON.WebXRHand.INDEX_TIP]?.position;

                    if (thumbTip && indexTip) {
                        // Pinch detection
                        const pinchDistance = BABYLON.Vector3.Distance(thumbTip, indexTip);

                        if (pinchDistance < handJointScale) {
                            if (!this.isModelGrabbed) {
                                this.isModelGrabbed = true;
                                initialModelScale = this.currentModel.scaling.x;
                                lastPinchDistance = pinchDistance;
                            }

                            // Move model
                            const palmPosition = joints[BABYLON.WebXRHand.WRIST]?.position;
                            if (palmPosition) {
                                this.currentModel.position = palmPosition.clone();
                            }

                            // Scale model
                            const pinchDelta = pinchDistance - lastPinchDistance;
                            const newScale = Math.max(0.1, initialModelScale * (1 + pinchDelta));
                            this.currentModel.scaling.set(newScale, newScale, newScale);

                            lastPinchDistance = pinchDistance;
                        } else {
                            this.isModelGrabbed = false;
                        }
                    }
                });
            }
        });
    }
}

export default FloatingModelViewer;
