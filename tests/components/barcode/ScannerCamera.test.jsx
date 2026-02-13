import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Camera: (props) => <span data-testid="camera-icon" {...props} />,
  XCircle: (props) => <span data-testid="xcircle-icon" {...props} />,
}));

// Track mock scanner instance
let mockScannerInstance;
const mockStop = vi.fn().mockResolvedValue(undefined);
const mockClear = vi.fn();
const mockStart = vi.fn();

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(function Html5Qrcode() {
    mockScannerInstance = {
      start: mockStart,
      stop: mockStop,
      clear: mockClear,
    };
    Object.assign(this, mockScannerInstance);
  }),
}));

const { default: ScannerCamera } = await import('@/components/barcode/ScannerCamera');

beforeEach(() => {
  vi.clearAllMocks();
  mockStart.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe('ScannerCamera', () => {
  describe('rendering', () => {
    it('renders the scanner container div', () => {
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(document.getElementById('qr-scanner-container')).toBeTruthy();
    });

    it('shows camera instruction text', () => {
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Point camera at a QR code label')).toBeInTheDocument();
    });

    it('shows cancel button', () => {
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Cancel Scanning')).toBeInTheDocument();
    });

    it('renders camera icon', () => {
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByTestId('camera-icon')).toBeInTheDocument();
    });

    it('renders close icon in cancel button', () => {
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByTestId('xcircle-icon')).toBeInTheDocument();
    });
  });

  describe('cancel button', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel Scanning'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('scanner initialization', () => {
    it('creates Html5Qrcode instance with correct container ID', async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(Html5Qrcode).toHaveBeenCalledWith('qr-scanner-container');
    });

    it('starts scanner with environment-facing camera', () => {
      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);
      expect(mockStart).toHaveBeenCalledWith(
        { facingMode: 'environment' },
        expect.objectContaining({
          fps: 10,
          aspectRatio: 16 / 9,
        }),
        expect.any(Function), // success callback
        expect.any(Function), // error callback (ignores no-match)
      );
    });
  });

  describe('scan callback', () => {
    it('calls onScan with decoded text on successful scan', async () => {
      const onScan = vi.fn();
      // Capture the success callback passed to scanner.start()
      mockStart.mockImplementation((camera, config, onSuccess) => {
        // Simulate a QR code being decoded
        setTimeout(() => onSuccess('IMS:v1:{"r":"abc","l":"LOT-001","e":null}'), 10);
        return Promise.resolve();
      });

      render(<ScannerCamera onScan={onScan} onError={vi.fn()} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onScan).toHaveBeenCalledWith('IMS:v1:{"r":"abc","l":"LOT-001","e":null}');
      });
    });

    it('stops scanner after first successful scan', async () => {
      mockStart.mockImplementation((camera, config, onSuccess) => {
        setTimeout(() => onSuccess('decoded-text'), 10);
        return Promise.resolve();
      });

      render(<ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(mockStop).toHaveBeenCalled();
      });
    });

    it('ignores duplicate scans (only fires once)', async () => {
      const onScan = vi.fn();
      mockStart.mockImplementation((camera, config, onSuccess) => {
        setTimeout(() => {
          onSuccess('first-scan');
          onSuccess('second-scan');
          onSuccess('third-scan');
        }, 10);
        return Promise.resolve();
      });

      render(<ScannerCamera onScan={onScan} onError={vi.fn()} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onScan).toHaveBeenCalledTimes(1);
      });
      expect(onScan).toHaveBeenCalledWith('first-scan');
    });
  });

  describe('camera error handling', () => {
    it('reports permission denied error', async () => {
      const onError = vi.fn();
      mockStart.mockRejectedValue(new Error('Permission denied by user'));

      render(<ScannerCamera onScan={vi.fn()} onError={onError} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          'Camera access denied. Please allow camera access in your browser settings.'
        );
      });
    });

    it('reports NotAllowed error', async () => {
      const onError = vi.fn();
      mockStart.mockRejectedValue(new Error('NotAllowedError: could not start video'));

      render(<ScannerCamera onScan={vi.fn()} onError={onError} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          'Camera access denied. Please allow camera access in your browser settings.'
        );
      });
    });

    it('reports NotFound error when no camera exists', async () => {
      const onError = vi.fn();
      mockStart.mockRejectedValue(new Error('NotFoundError: DevicesNotFound'));

      render(<ScannerCamera onScan={vi.fn()} onError={onError} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith('No camera found on this device.');
      });
    });

    it('reports generic camera error with message', async () => {
      const onError = vi.fn();
      mockStart.mockRejectedValue(new Error('Some random camera error'));

      render(<ScannerCamera onScan={vi.fn()} onError={onError} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Camera error: Some random camera error');
      });
    });

    it('handles error without message property', async () => {
      const onError = vi.fn();
      mockStart.mockRejectedValue('string error');

      render(<ScannerCamera onScan={vi.fn()} onError={onError} onCancel={vi.fn()} />);

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Camera error: string error');
      });
    });
  });

  describe('cleanup on unmount', () => {
    it('stops scanner on unmount', () => {
      const { unmount } = render(
        <ScannerCamera onScan={vi.fn()} onError={vi.fn()} onCancel={vi.fn()} />
      );

      unmount();

      // stop() is called in cleanup
      expect(mockStop).toHaveBeenCalled();
    });

    it('does not call onScan after unmount', async () => {
      const onScan = vi.fn();
      mockStart.mockImplementation((camera, config, onSuccess) => {
        // Delay the callback so unmount happens first
        setTimeout(() => onSuccess('late-scan'), 50);
        return Promise.resolve();
      });

      const { unmount } = render(
        <ScannerCamera onScan={onScan} onError={vi.fn()} onCancel={vi.fn()} />
      );

      unmount();

      // Wait to ensure the delayed callback fires
      await new Promise((r) => setTimeout(r, 100));
      expect(onScan).not.toHaveBeenCalled();
    });

    it('does not call onError after unmount', async () => {
      const onError = vi.fn();
      mockStart.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('late error')), 50);
        });
      });

      const { unmount } = render(
        <ScannerCamera onScan={vi.fn()} onError={onError} onCancel={vi.fn()} />
      );

      unmount();

      await new Promise((r) => setTimeout(r, 100));
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
