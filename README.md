## Project Description

This project provides an intuitive tool for translating Activity Relationship Matrices (as introduced by Andree et al., SoSyM 2024) into BPMN models (Montali, Springer)and ConDec language models (Montali, Springer). 


## Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or later)
- [Git](https://git-scm.com/)

### Clone and install
```
git clone https://github.com/INSM-TUM-Teaching/arm-to-bpmn-and-declare.git
cd arm-to-bpmn-and-declare
```

### Install Dependencies
```
npm run setup
```
or manually:
```
npm install --legacy-peer-deps
```

### Dependency Issues
If you encounter errors like the following during the installation or startup:

- **"Error: Cannot find module 'cors'"**  
  Run the following command to install the missing module:
```
npm install cors --legacy-peer-deps
```
- **"Error: Cannot find module 'express'"**  
  Run the following command to install the missing module:
```
npm install express --legacy-peer-deps
```
- **"Error: Cannot find module 'cookie'"** or **"Failed to resolve entry for package 'cookie'"**  
  Run the following command to install the missing module:
```
npm install cookie --legacy-peer-deps
```

**Important Note**: Due to peer dependency conflicts in this project, it's recommended to use the `--legacy-peer-deps` flag for all npm install commands:
```
npm install <module-name> --legacy-peer-deps
```

### Clear Cache (if needed)
If you encounter build issues with Vite, try clearing the cache:
```bash
# On Unix/Mac
rm -rf node_modules/.vite

# On Windows (PowerShell)
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

### Start the development servers
#### Method 1: Using npm scripts (Recommended)

**Terminal 1 - Backend Server:**
```
cd arm-to-bpmn-and-declare
npm run start:backend
```

**Terminal 2 - Frontend Server:**
```
cd arm-to-bpmn-and-declare
npm run start:frontend
```

#### Method 2: Direct commands

**Terminal 1 - Backend Server:**
```
cd arm-to-bpmn-and-declare
node server.cjs
```
The backend server will run at http://localhost:5174

**Terminal 2 - Frontend Server:**
```
cd arm-to-bpmn-and-declare
npm run dev
```
The frontend server will run at http://localhost:5173 (or http://localhost:5174 if 5173 is occupied)

#### Open your browser at the displayed URL (typically http://localhost:5173 or http://localhost:5174)

## Troubleshooting

### Common Issues and Solutions

#### 1. Port Conflicts
If you encounter port conflicts, Vite will automatically try alternative ports. Check the terminal output for the actual URL.

#### 2. Module Resolution Errors
If you see errors like "Cannot find module", ensure you have installed all dependencies:
```
npm install --legacy-peer-deps
```

#### 3. Vite Build Errors
Clear the Vite cache and restart:
```bash
# Unix/Mac
rm -rf node_modules/.vite
npm run dev

# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
npm run dev
```

#### 4. Permission Errors
On Windows, run PowerShell as Administrator if you encounter permission errors.

#### 5. Node.js Version Issues
Ensure you're using Node.js v18 or later:
```
node --version
```

## Usage

### Translate ARM into New Model
#### 1. Upload an Activity Relationship Matrix (ARM)

##### On the homepage, you'll be presented with an upload button:
1. Upload ARM Matrix: Upload a JSON file representing an Activity Relationship Matrix (Andree et al., 2024).
Example format:
```
{
  "a": { "b": ["<", "⇒"] }
}
```
Your ARM will be automatically validated. If the uploaded ARM is validated, you'll be routed to choose either BPMN or ConDec language model to translate to.

#### 2. Two options for automatic translation: BPMN or ConDec language model
- Your ARM will be automatically translated and rendered as a graph according to the model you selected.

#### 3. Download options
- Use the buttons at the top of the graph to export your model:
    BPMN model - BPMN xml, SVG, or png
    ConDec language model - JSON, or png

### Upload and Visualize Existing BPMN/ Declare Model
#### 1. Two options for model visualization: BPMN or ConDec language model
- Your model will be automatically rendered as a graph using the syntax of the target process model you select.

#### 2. Download options
- Use the buttons at the top of the graph to export your model:
    BPMN model - BPMN xml, SVG, or png
    ConDec language model - JSON, or png


## Features

#### 1. Upload **ARM matrix** (validated and translated automatically)
#### 2. Dual graphical model options: BPMN model or ConDec language model
#### 3. Validation of ARM files according to logical and syntactic rules (e.g., temporal/existential relationships, reversibility, valid entries)
#### 4. Graphical visualization of process models with no overlapping elements
#### 5. Interactive graph: Users can move and explore graphical elements for better clarity
#### 6. Export options for BPMN model: Download models as structured BPMN XML , SVG, and high-quality PNG images
#### 7. Log Analysis Outputs in BPMN: Provides detailed log analysis outputs in the BPMN part to help users better understand the translation results before visualization. 
#### 8. Export options for ConDec language model: Download models as structured JSON and high-quality PNG images
#### 9. Constraints Translation Results in Declare: Displays the constraints translation results in the Declare part, offering users clear insight into how ARM relations are translated into Declare constraints before visualizing the model.
#### 10. Edit Activities/Constraints in Declare Model: Users can interactively add, delete, and modify activities and constraints within the Declare model.

## License

#### If you use this tool in academic work, please cite the following:
- Andree et al.: "A Closer Look at Activity Relationships to Improve Business Process Redesign." SoSyM 2024. https://doi.org/10.1007/s10270-024-01234-5

- Weske: "Business Process Management: Concepts, Languages, Architectures." Springer: https://link.springer.com/book/10.1007/978-3662-69518-0

- Montali: "The ConDec Language." In Declarative Process Mining, Springer, 2010. https://doi.org/10.1007/978-3-642-14538-4_3

