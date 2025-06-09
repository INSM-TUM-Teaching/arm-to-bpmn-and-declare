import { render, screen } from '@testing-library/react';
import { BpmnViewer } from '../BpmnViewer';
import '@testing-library/jest-dom';

//Tests if the React component BpmnViewer is working correctly. 

jest.mock('bpmn-js', () => {
  return jest.fn().mockImplementation(() => ({
    importXML: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn()
  }));
});

describe('BpmnViewer', () => {
  const dummyXml = '<definitions id="sample" xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"></definitions>';

  it('renders the container div', () => {
    render(<BpmnViewer xml={dummyXml} />);
    const container = screen.getByRole('region');
    expect(container).toBeInTheDocument();
  });

  it('initializes bpmn-js with the container', () => {
    const BpmnJS = require('bpmn-js');
    render(<BpmnViewer xml={dummyXml} />);
    expect(BpmnJS).toHaveBeenCalledWith({
      container: expect.any(HTMLElement)
    });
  });

  it('calls importXML on xml prop change', async () => {
    const BpmnJS = require('bpmn-js');
    const importXML = jest.fn().mockResolvedValue(undefined);
    BpmnJS.mockImplementation(() => ({
      importXML,
      destroy: jest.fn()
    }));

    render(<BpmnViewer xml={dummyXml} />);
    expect(importXML).toHaveBeenCalledWith(dummyXml);
  });
});
