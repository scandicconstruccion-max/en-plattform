import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, ArrowRight, Type, Undo, Save, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function ImageEditor({ imageUrl, onSave, onCancel, open }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('draw'); // draw, arrow, text
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);

  useEffect(() => {
    if (!open || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to match image while maintaining aspect ratio
      const maxWidth = Math.min(window.innerWidth - 100, 800);
      const maxHeight = Math.min(window.innerHeight - 300, 600);
      
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      saveToHistory();
    };
    
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
  }, [open, imageUrl]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    const newHistory = history.slice(0, currentStep + 1);
    newHistory.push(canvas.toDataURL());
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);
  };

  const undo = () => {
    if (currentStep > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      
      img.src = history[currentStep - 1];
      setCurrentStep(currentStep - 1);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    if (tool === 'text') {
      setTextPosition({ x, y });
      return;
    }

    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
  };

  const draw = (e) => {
    if (!isDrawing || tool === 'text') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    const ctx = canvas.getContext('2d');
    
    if (tool === 'draw') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.changedTouches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.changedTouches?.[0]?.clientY) - rect.top;

    if (tool === 'arrow') {
      const ctx = canvas.getContext('2d');
      const startX = ctx.currentX || x - 50;
      const startY = ctx.currentY || y - 50;
      
      drawArrow(ctx, startX, startY, x, y);
    }

    setIsDrawing(false);
    saveToHistory();
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 20;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const addText = () => {
    if (!textInput || !textPosition) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.font = '20px Arial';
    ctx.fillStyle = color;
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    setTextInput('');
    setTextPosition(null);
    saveToHistory();
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      onSave(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Rediger bilde</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          {/* Tools */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={tool === 'draw' ? 'default' : 'outline'}
              onClick={() => setTool('draw')}
              className="gap-2">
              <Pencil className="h-4 w-4" />
              Tegn
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tool === 'arrow' ? 'default' : 'outline'}
              onClick={() => setTool('arrow')}
              className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Pil
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tool === 'text' ? 'default' : 'outline'}
              onClick={() => setTool('text')}
              className="gap-2">
              <Type className="h-4 w-4" />
              Tekst
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={undo}
              disabled={currentStep <= 0}
              className="gap-2">
              <Undo className="h-4 w-4" />
              Angre
            </Button>
          </div>

          {/* Color and Size */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label>Farge:</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 rounded border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Tykkelse:</Label>
              <input
                type="range"
                min="1"
                max="10"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm">{lineWidth}px</span>
            </div>
          </div>

          {/* Text Input */}
          {textPosition && (
            <div className="flex gap-2">
              <Input
                placeholder="Skriv inn tekst..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addText()}
              />
              <Button onClick={addText}>Legg til</Button>
            </div>
          )}

          {/* Canvas */}
          <div className="border rounded-lg overflow-auto bg-slate-50 flex justify-center p-4">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="border border-slate-200 rounded cursor-crosshair touch-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Avbryt
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Lagre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}