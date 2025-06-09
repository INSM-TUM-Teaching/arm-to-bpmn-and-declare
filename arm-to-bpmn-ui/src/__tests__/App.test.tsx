import { render, screen } from '@testing-library/react';
import App from '../App';
import '@testing-library/jest-dom';

//Checks if all the expected main sections are rendered in the DOM upon loading the App.tsx component.

jest.mock('../components/BpmnViewer', () => ({
  BpmnViewer: () => <div data-testid="mock-bpmn-viewer" />
}));

test('App renders with BPMN translation and topo sort', async () => {
  render(<App />);

  // Are topo sort results displayed?
  expect(await screen.findByText(/Topological Layers/i)).toBeInTheDocument();

  // Is the BPMN XML field rendered?
  expect(await screen.findByText(/BPMN XML/i)).toBeInTheDocument();

  // Is the log area rendered?
  expect(await screen.findByText(/Log Output/i)).toBeInTheDocument();

  // Is the mock viewer component in place?
  expect(await screen.findByTestId('mock-bpmn-viewer')).toBeInTheDocument();
});
