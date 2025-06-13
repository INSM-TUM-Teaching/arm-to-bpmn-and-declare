import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import '@testing-library/jest-dom';

//This test class is an integration test for the main App component. 
// It verifies that the overall application UI loads correctly and behaves as expected when interacting with it, specifically, when the “Generate & View BPMN” button is clicked.

test('App renders main sections and updates on button click', async () => {
  render(<App />);

  // Are there navbars and headings?
  expect(screen.getByText(/Welcome to ARM to BPMN Translator/i)).toBeInTheDocument();

  // Is there a button and is it clickable?
  const button = screen.getByRole('button', { name: /Generate & View BPMN/i });
  expect(button).toBeInTheDocument();

  // Are the output sections rendered at startup?
  expect(screen.getByText(/Logic Analysis Output/i)).toBeInTheDocument();
  expect(screen.getByText(/BPMN Viewer/i)).toBeInTheDocument();
  expect(screen.getByText(/BPMN XML Output \(Debug\)/i)).toBeInTheDocument();

  // Is the BPMN Viewer div available (container linked with ref)?
  const viewerDiv = screen.getByRole('region', { name: /BPMN Viewer/i }) || screen.getByText(/BPMN Viewer/i).nextSibling;
  expect(viewerDiv).toBeInTheDocument();

  // Initially the temporalChains list is empty
  expect(screen.queryByText(/→/)).not.toBeInTheDocument();

  // When you click the button, does the logic work and the state is updated?
  fireEvent.click(button);

  await waitFor(() => {
    // any chain in the temporalChains list should appear
    expect(screen.getByText(/→/)).toBeInTheDocument();
  });

  expect(screen.getByText(/Exclusive Relations/i)).toBeInTheDocument();
  expect(screen.getByText(/Parallel Relations/i)).toBeInTheDocument();
  expect(screen.getByText(/Optional Dependencies/i)).toBeInTheDocument();
  expect(screen.getByText(/Topological Order/i)).toBeInTheDocument();

  // Is the BPMN XML textarea updated?
  const textarea = screen.getByRole('textbox');
  expect(textarea).toBeInTheDocument();
  expect((textarea as HTMLTextAreaElement).value.length).toBeGreaterThan(0);
});
