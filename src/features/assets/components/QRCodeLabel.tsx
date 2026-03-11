import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Printer } from 'lucide-react';

interface QRCodeLabelProps {
  open: boolean;
  onClose: () => void;
  serviceTag: string;
  model: string | null;
  branchName: string | null;
}

export const QRCodeLabel: React.FC<QRCodeLabelProps> = ({
  open,
  onClose,
  serviceTag,
  model,
  branchName,
}) => {
  const labelRef = useRef<HTMLDivElement>(null);
  const dellSupportUrl = `https://www.dell.com/support/home/pt-br/product-support/servicetag/${encodeURIComponent(serviceTag)}/overview`;

  const handlePrint = () => {
    if (!labelRef.current) return;
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: 50mm 25mm; margin: 0; }
          body { margin: 0; display: flex; align-items: center; justify-content: center; font-family: 'Inter', Arial, sans-serif; }
          .label { display: flex; align-items: center; gap: 8px; padding: 4px 8px; }
          .info { font-size: 9px; line-height: 1.3; }
          .tag { font-size: 11px; font-weight: 700; }
          .sub { color: #666; font-size: 8px; }
        </style>
      </head>
      <body>
        <div class="label">
          ${labelRef.current.querySelector('svg')?.outerHTML}
          <div class="info">
            <div class="tag">${serviceTag}</div>
            ${model ? `<div class="sub">${model}</div>` : ''}
            ${branchName ? `<div class="sub">${branchName}</div>` : ''}
            <div class="sub">Tracbel Agro — TI</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Etiqueta QR Code" maxWidth="max-w-sm">
      {/* Preview da etiqueta (50x25mm → ~189x94px @96dpi) */}
      <div className="flex justify-center mb-4">
        <div
          ref={labelRef}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-2 border-dashed border-slate-300"
          style={{ width: '189px', minHeight: '94px' }}
        >
          <QRCodeSVG value={dellSupportUrl} size={64} level="M" />
          <div>
            <p className="text-xs font-bold text-slate-900">{serviceTag}</p>
            {model && <p className="text-[9px] text-slate-500">{model}</p>}
            {branchName && <p className="text-[9px] text-slate-500">{branchName}</p>}
            <p className="text-[8px] text-slate-400">Tracbel Agro — TI</p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 text-center mb-4 truncate" title={dellSupportUrl}>
        Dell Support: {serviceTag}
      </p>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        <Button onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
          Imprimir
        </Button>
      </div>
    </Dialog>
  );
};
