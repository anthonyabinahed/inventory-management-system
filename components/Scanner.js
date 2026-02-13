"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ScanLine, AlertTriangle } from "lucide-react";
import { decodeQRPayload } from "@/libs/barcode";
import { qrPayloadSchema } from "@/libs/schemas";
import { getLotWithReagent } from "@/actions/inventory";
import ScanResult from "./barcode/ScanResult";
import ScanActionForm from "./barcode/ScanActionForm";

// Dynamic import to avoid SSR issues with html5-qrcode
const ScannerCamera = dynamic(() => import("./barcode/ScannerCamera"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <span className="loading loading-spinner loading-lg" />
    </div>
  ),
});

// Scanner states
const STATES = {
  IDLE: "idle",
  SCANNING: "scanning",
  PROCESSING: "processing",
  RESULT: "result",
  ACTION: "action",
  ERROR: "error",
};

export function Scanner() {
  const [state, setState] = useState(STATES.IDLE);
  const [errorMessage, setErrorMessage] = useState("");

  // Scan result data
  const [scanData, setScanData] = useState(null); // { reagent, lot, qrData }
  const [actionMode, setActionMode] = useState(null); // "in" | "out"

  const resetScanner = useCallback(() => {
    setState(STATES.IDLE);
    setScanData(null);
    setActionMode(null);
    setErrorMessage("");
  }, []);

  const handleScan = useCallback(async (decodedText) => {
    // Decode the QR payload
    const decoded = decodeQRPayload(decodedText);
    if (!decoded.valid) {
      setState(STATES.ERROR);
      setErrorMessage(decoded.error);
      return;
    }

    // Validate with schema
    const validation = qrPayloadSchema.safeParse(decoded.data);
    if (!validation.success) {
      setState(STATES.ERROR);
      setErrorMessage(validation.error.issues[0]?.message || "Invalid QR code data");
      return;
    }

    // Look up the lot and reagent
    setState(STATES.PROCESSING);
    const qrData = validation.data;
    const result = await getLotWithReagent(qrData.reagent_id, qrData.lot_number);

    if (!result.success) {
      setState(STATES.ERROR);
      setErrorMessage(result.errorMessage || "Failed to look up inventory data");
      return;
    }

    setScanData({
      reagent: result.data.reagent,
      lot: result.data.lot,
      qrData,
    });
    setState(STATES.RESULT);
  }, []);

  const handleCameraError = useCallback((message) => {
    setState(STATES.ERROR);
    setErrorMessage(message);
  }, []);

  const handleStockIn = useCallback(() => {
    setActionMode("in");
    setState(STATES.ACTION);
  }, []);

  const handleStockOut = useCallback(() => {
    setActionMode("out");
    setState(STATES.ACTION);
  }, []);

  const handleActionSuccess = useCallback(() => {
    resetScanner();
  }, [resetScanner]);

  const handleActionCancel = useCallback(() => {
    setState(STATES.RESULT);
    setActionMode(null);
  }, []);

  return (
    <div className="max-w-md mx-auto px-2 sm:px-0">
      {/* IDLE state */}
      {state === STATES.IDLE && (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <ScanLine className="w-12 h-12 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Scan QR Code</h2>
            <p className="text-sm text-base-content/60 max-w-xs">
              Scan an inventory QR code label to quickly stock in or stock out items.
            </p>
          </div>
          <button
            className="btn btn-primary btn-lg gap-2"
            onClick={() => setState(STATES.SCANNING)}
          >
            <ScanLine className="w-5 h-5" />
            Start Scanning
          </button>
        </div>
      )}

      {/* SCANNING state */}
      {state === STATES.SCANNING && (
        <ScannerCamera
          onScan={handleScan}
          onError={handleCameraError}
          onCancel={resetScanner}
        />
      )}

      {/* PROCESSING state */}
      {state === STATES.PROCESSING && (
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p className="text-sm text-base-content/60">Looking up inventory...</p>
        </div>
      )}

      {/* RESULT state */}
      {state === STATES.RESULT && scanData && (
        <ScanResult
          reagent={scanData.reagent}
          lot={scanData.lot}
          lotNumber={scanData.qrData.lot_number}
          expiryDate={scanData.qrData.expiry_date}
          onStockIn={handleStockIn}
          onStockOut={handleStockOut}
          onScanAnother={resetScanner}
        />
      )}

      {/* ACTION state */}
      {state === STATES.ACTION && scanData && (
        <ScanActionForm
          mode={actionMode}
          reagent={scanData.reagent}
          lot={scanData.lot}
          qrData={scanData.qrData}
          onSuccess={handleActionSuccess}
          onCancel={handleActionCancel}
        />
      )}

      {/* ERROR state */}
      {state === STATES.ERROR && (
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-error">Scan Error</p>
            <p className="text-sm text-base-content/60 max-w-xs">{errorMessage}</p>
          </div>
          <button className="btn btn-primary btn-sm gap-1" onClick={resetScanner}>
            <ScanLine className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
