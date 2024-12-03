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
            this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 1.6, -0.5), this.scene);
            this.camera.attachControl(this.canvas, true);
            this.camera.setTarget(BABYLON.Vector3.Zero());

            console.log("Adding lighting...");
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
            light.intensity = 1.0;

            console.log("Loading model...");
            await this.loadModel("https://raw.githubusercontent.com/talkats/my-webxr/d1dc39a858f3cfc80e5bbc309f25cbdac2e47f33/Spheres.glb");
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
            const result = await BABYLON.SceneLoader.ImportMeshAsync("", url, "", this.scene);
            this.currentModel = result.meshes[0] || null;

            if (!this.currentModel) {
                throw new Error("No meshes found in the model.");
            }

            console.log("Model added to scene:", this.currentModel);
            this.currentModel.position = new BABYLON.Vector3(0, 1.6, -0.5);
        } catch (error) {
            console.error("Error loading model:", error);
        }
    }
}

export default FloatingModelViewer;
