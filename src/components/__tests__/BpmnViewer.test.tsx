import { render } from '@testing-library/react';
import { BpmnViewer } from '../BpmnViewer';
import '@testing-library/jest-dom';
import BpmnJS from 'bpmn-js';

//Tests if the React component BpmnViewer is working correctly. 

jest.mock('bpmn-js', () => {
  const mockImportXML = jest.fn().mockResolvedValue(undefined);
  const mockDestroy = jest.fn();
  return jest.fn().mockImplementation(() => ({
    importXML: mockImportXML,
    destroy: mockDestroy
  }));
});


describe('BpmnViewer', () => {
  const dummyXml =
    '<definitions id="sample" xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"></definitions>';

  it('renders the container div', () => {
    const { getByRole } = render(<BpmnViewer xml={dummyXml} />);
    const container = getByRole('region');
    expect(container).toBeInTheDocument();
  });

  it('initializes bpmn-js with the container', () => {
    render(<BpmnViewer xml={dummyXml} />);
    expect(BpmnJS).toHaveBeenCalledWith({
      container: expect.any(HTMLElement)
    });
  });

  it('calls importXML with correct XML', () => {
    render(<BpmnViewer xml={dummyXml} />);
    const mockInstance = (BpmnJS as jest.Mock).mock.results[0].value;
    expect(mockInstance.importXML).toHaveBeenCalledWith(dummyXml);
  });
});