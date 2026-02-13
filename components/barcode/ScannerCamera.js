"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, XCircle } from "lucide-react";

const SCANNER_CONFIG = {
  fps: 10,
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    const w = Math.floor(viewfinderWidth * 0.8);
    const h = Math.floor(viewfinderHeight * 0.7);
    return { width: Math.max(w, 50), height: Math.max(h, 50) };
  },
  aspectRatio: 16 / 9,
};

export default function ScannerCamera({ onScan, onError, onCancel }) {
  // Use refs for callbacks so the effect can stay mount-only
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const tracksRef = useRef([]);
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let mounted = true;
    let hasScanned = false;

    const scanner = new Html5Qrcode("qr-scanner-container");

    scanner
      .start(
        { facingMode: "environment" },
        SCANNER_CONFIG,
        (decodedText) => {
          if (!mounted || hasScanned) return;
          hasScanned = true;
          scanner.stop().catch(() => {});
          onScanRef.current(decodedText);
        },
        () => {} // Ignore scan failures (no QR in frame)
      )
      .then(() => {
        // Capture media tracks so cleanup can stop them even after DOM removal
        const video = document.querySelector("#qr-scanner-container video");
        if (video?.srcObject) {
          tracksRef.current = video.srcObject.getTracks();
        }
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err?.message || String(err);
        if (message.includes("Permission") || message.includes("NotAllowed")) {
          onErrorRef.current("Camera access denied. Please allow camera access in your browser settings.");
        } else if (message.includes("NotFound") || message.includes("DevicesNotFound")) {
          onErrorRef.current("No camera found on this device.");
        } else {
          onErrorRef.current(`Camera error: ${message}`);
        }
      });

    return () => {
      mounted = false;
      // Directly stop media tracks — this works even after DOM removal
      tracksRef.current.forEach((track) => track.stop());
      tracksRef.current = [];
      // Also try html5-qrcode's stop for clean internal state
      try {
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner.clear(); } catch {}
        });
      } catch {
        try { scanner.clear(); } catch {}
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Camera viewfinder */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        <div
          id="qr-scanner-container"
          className="w-full [&_canvas]:!hidden"
        />
      </div>

      {/* Instructions */}
      <div className="flex items-center justify-center gap-2 text-sm text-base-content/60">
        <Camera className="w-4 h-4" />
        <span>Point camera at a QR code label</span>
      </div>

      {/* Cancel button */}
      <button className="btn btn-ghost btn-sm w-full gap-1" onClick={onCancel}>
        <XCircle className="w-4 h-4" />
        Cancel Scanning
      </button>
    </div>
  );
}
