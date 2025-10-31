import { useRef, useCallback, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { openDB } from "idb";

const DB_NAME = "WebcamDB";
const STORE_NAME = "CapturedImages";

const ReactWebCame = () => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  const videoConstraints = {
    width: 600,
    height: 600,
    facingMode: "user",
  };

  const initDB = async () => {
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  };

  const saveToIndexedDB = async (imageData) => {
    const db = await initDB();
    await db.put(STORE_NAME, imageData, "latestImage");
    console.log("✅ Image saved to IndexedDB");
  };

  const loadFromIndexedDB = useCallback(async () => {
    const db = await initDB();
    const savedImage = await db.get(STORE_NAME, "latestImage");
    if (savedImage) {
      setCapturedImage(savedImage);
      console.log("📸 Loaded image from IndexedDB");
    }
  }, []);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      console.log("Captured image:", imageSrc);
      setCapturedImage(imageSrc);
      await saveToIndexedDB(imageSrc);
    }
  }, []);

  useEffect(() => {
    loadFromIndexedDB();
  }, [loadFromIndexedDB]);

  return (
    <div style={{ textAlign: "center" }}>
      <h1>📷 React Webcam Capture</h1>

      <Webcam
        audio={false}
        height={600}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={600}
        videoConstraints={videoConstraints}
        mirrored={false}
        minScreenshotWidth={600}
        minScreenshotHeight={600}
        imageSmoothing={true}
      />

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={capture}
          style={{
            background: "#007bff",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Capture photo
        </button>
      </div>

      {capturedImage && (
        <div style={{ marginTop: "20px" }}>
          <h2>Captured Image:</h2>
          <img
            src={capturedImage}
            alt="Captured"
            width={400}
            height={400}
            style={{ borderRadius: "10px", border: "2px solid #ccc" }}
          />
        </div>
      )}
    </div>
  );
};

export default ReactWebCame;
