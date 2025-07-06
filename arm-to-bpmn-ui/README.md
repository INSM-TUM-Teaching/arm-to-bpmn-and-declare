## Project Description

This project provides an intuitive tool for translating Activity Relationship Matrices (as introduced by Andree et al., SoSyM 2024) into BPMN models (Montali, Springer)and ConDec language models (Montali, Springer). 


## Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Git](https://git-scm.com/)

### Start the development servers
#### In two terminals:
1. Start the backend server:
```
node server.cjs
```

2. Start the frontend (Vite dev server):
```
npx vite
```
#### Open your browser at http://localhost:5173

### Clone and install
```
git clone https://github.com/INSM-TUM-Teaching/arm-to-bpmn-and-declare.git
cd arm-to-bpmn-ui
npm install
```

## Usage

### 1. Upload an Activity Relationship Matrix (ARM)

#### On the homepage, you'll be presented with an upload button:
1. Upload ARM Matrix: Upload a JSON file representing an Activity Relationship Matrix (Andree et al., 2024).
Example format:
```
{
  "a": { "b": ["<", "⇒"] }
}
```
Your ARM will be automatically validated. If the uploaded ARM is validated, you'll be routed to choose either BPMN or ConDec language model to translate to.

### 2. Two options for automatic translation: BPMN or ConDec language model
- Your ARM will be automatically translated and rendered as a graph according to the model you selected.

### 3. Download options
- Use the buttons at the top of the graph to export your model:
    BPMN model - BPMN xml, SVG, or png
    ConDec language model - JSON, or png


## Features

#### 1. Upload **ARM matrix** (validated and translated automatically)
#### 2. Dual graphical model options: BPMN model or ConDec language model
#### 3. Validation of ARM files according to logical and syntactic rules (e.g., temporal/existential relationships, reversibility, valid entries)
#### 4. Graphical visualization of process models with no overlapping elements
#### 5. Export options for BPMN model: Download models as structured BPMN XML , SVG, and high-quality PNG images
#### 6. Export options for ConDec language model: Download models as structured JSON and high-quality PNG images
#### 5. Interactive graph: Users can move and explore graphical elements for better clarity


## License

#### If you use this tool in academic work, please cite the following:
- Andree et al.: "A Closer Look at Activity Relationships to Improve Business Process Redesign." SoSyM 2024. https://doi.org/10.1007/s10270-024-01234-5

- Weske: "Business Process Management: Concepts, Languages, Architectures." Springer: https://link.springer.com/book/10.1007/978-3662-69518-0

- Montali: "The ConDec Language." In Declarative Process Mining, Springer, 2010. https://doi.org/10.1007/978-3-642-14538-4_3

