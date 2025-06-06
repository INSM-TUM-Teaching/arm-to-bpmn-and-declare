import React, { useEffect, useRef } from 'react';
import BpmnJS from 'bpmn-js';

interface BpmnViewerProps {
  xml: string;
}

export const BpmnViewer: React.FC<BpmnViewerProps> = ({ xml }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewer = new BpmnJS({
      container: containerRef.current!
    });

    viewer.importXML(xml).catch((err) => {
      console.error('Failed to render BPMN diagram', err);
    });

    return () => viewer.destroy();
  }, [xml]);

  return (
    <div className="mt-6 border border-orange-400 rounded" ref={containerRef} style={{ height: '500px' }} />
  );
};
