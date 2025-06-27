## Project Description

This project provides an intuitive tool for translating Activity Relationship Matrices (as introduced by Andree et al., SoSyM 2024) into ConDec language models (Montali, Springer). Existing ConDec modeling tools often lack usability and modeling efficiency, so our solution aims to bridge this gap by enabling seamless, visual, and user-friendly process modeling.


## Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Git](https://git-scm.com/)

### Start the development servers
#### In two terminals:
1. Start the backend server:
```
node server.js
```

2. Start the frontend (Vite dev server):
```
npx vite
```
#### Open your browser at http://localhost:5173

### Clone and install
```
git clone https://github.com/INSM-TUM-Teaching/arm-to-bpmn-and-declare.git
cd arm-to-bpmn-and-declare
npm install
```

## Usage

### 1. Upload an Activity Relationship Matrix (ARM)
- On the homepage, click the upload box and select a JSON file formatted as an ARM (Andree et al., 2024).
- Example format:
```
{
  "a": { "b": ["<", "⇒"] }
}
```

### 2. Automatic translation
- Upon upload, your ARM will be automatically validated and translated into Declare constraints using predefined mapping logic.

### 3. Model saving
- The translated Declare model is automatically saved as a file named declareModel.json in:
```
/public/declareModels/temp/declareModel.json
```

### 4. Visualization
- Once translated, the tool renders the Declare process model as an interactive graph using Cytoscape.js.
- Graphical rules follow the ConDec visual notation (Montali, 2010).

### 5. Download options
- Use the buttons at the top of the graph to export your model:
    JSON – Save the Declare model definition
    PNG – Save the visualized process graph


## Features

##### 1. Automatic translation from ARM to ConDec constraints
##### 2. Graphical visualization of process models with no overlapping elements
##### 3. Export options: Download models as structured JSON and high-quality PNG images
##### 4. Interactive graph: Users can move and explore graphical elements for better clarity


## License

#### If you use this tool in academic work, please cite the following:
- Andree et al.: "A Closer Look at Activity Relationships to Improve Business Process Redesign." SoSyM 2024. https://doi.org/10.1007/s10270-024-01234-5

- Montali: "The ConDec Language." In Declarative Process Mining, Springer, 2010. https://doi.org/10.1007/978-3-642-14538-4_3

