'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Barcode field with hands-free capture from a USB/Bluetooth reader. Lifted from
// the super-admin medicines form so stock scans barcodes the same way instead of
// only accepting typed input. A hardware scanner types its burst then sends
// Enter; while "scanning", keystrokes are captured on the window so the reader
// works even without the input focused.
export function BarcodeScanField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const bufferRef = useRef('');
  const lastKeyRef = useRef(0);

  useEffect(() => {
    if (!scanning) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Cancel the scan only — don't let Esc bubble up and close the dialog.
        event.preventDefault();
        event.stopPropagation();
        bufferRef.current = '';
        setScanning(false);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        setScanning(false);
        if (code) onChange(code);
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        const now = Date.now();
        // A long pause means a human is typing — reset so it never registers.
        if (now - lastKeyRef.current > 120) bufferRef.current = '';
        lastKeyRef.current = now;
        bufferRef.current += event.key;
      }
    }

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [scanning, onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            // A hardware scanner ends its burst with Enter; swallow it so a scan
            // into the focused field can't accidentally submit the whole form.
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            placeholder={
              scanning
                ? 'Listening for scanner… press Esc to cancel'
                : 'Scan or type a barcode'
            }
            disabled={scanning}
            inputMode="numeric"
            autoComplete="off"
            className={cn(
              'h-12 pl-9 font-mono',
              scanning && 'border-success ring-[3px] ring-success/20',
            )}
          />
        </div>
        {value && !scanning ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12"
            onClick={() => onChange('')}
          >
            Clear
          </Button>
        ) : null}
        <Button
          type="button"
          variant={scanning ? 'secondary' : 'outline'}
          size="lg"
          className="h-12"
          onClick={() => {
            // Discard any partially buffered burst on every toggle so a
            // restarted scan can't prepend stale keys (Cancel doesn't otherwise
            // clear it, and the 120ms guard won't reset a fast next key).
            bufferRef.current = '';
            lastKeyRef.current = 0;
            setScanning((current) => !current);
          }}
        >
          <ScanLine className="h-4 w-4" />
          {scanning ? 'Cancel' : value ? 'Rescan' : 'Scan'}
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Type the barcode, or press Scan to capture it hands-free from a USB or
        Bluetooth reader.
      </p>
    </div>
  );
}
