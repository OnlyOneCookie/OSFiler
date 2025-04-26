# OSFiler - OSINT Profiling Tool

OSFiler is an educational Open Source Intelligence (OSINT) profiling tool that helps researchers create comprehensive profiles of subjects (people, organizations, etc.) by collecting and linking various data points through a graph-based approach.

> 📋 Check out the [feature roadmap](#feature-roadmap) to see what's currently available and what's coming soon!

## Features

- **Portfolio/Main Node Creation**: Create central nodes representing subjects of investigation
- **Node System**: Add different types of nodes (usernames, emails, phone numbers, addresses, etc.)
- **Graph Visualization**: Visual representation of nodes and relationships using vis.js
- **Modular Design**: Easily extend functionality with new modules
- **Data Persistence**: Save investigations in PostgreSQL database
- **Authentication**: Secure access to your investigations

## Technology Stack

- **Frontend**: React (TypeScript)
- **Backend**: Python
- **Database**: PostgreSQL
- **Visualization**: vis.js

## Project Status

⚠️ **Development in Progress** ⚠️

This project is currently under heavily active development. Features may be incomplete or subject to change.

## Prerequisites

- Node.js (v16+)
- Python (v3.12+)
- PostgreSQL (v13+)

## Installation

### Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/OnlyOneCookie/osfiler.git
cd osfiler
```

2. **Set up the backend**

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

3. **Set up the frontend**

```bash
cd frontend
npm install
npm start
```

4. **Set up PostgreSQL**

- Install PostgreSQL from https://www.postgresql.org/download/
- Create a new database
- Update the database configuration in backend/core/config.py

## Usage

1. **Login**
   - Default development credentials: admin/admin

2. **Create Investigation**
   - Create a new investigation with a title and description
   - Add a main node representing your investigation subject

3. **Add Nodes**
   - Add various node types (email, username, phone, etc.)
   - Connect nodes to create relationships

4. **Use Modules**
   - Run the Username Search module to find accounts across platforms
   - Add discovered accounts to your investigation

5. **Visualize**
   - Use the graph view to visualize connections
   - Manipulate the graph to organize your data

## Module Development

OSFiler is designed with a modular architecture that allows for easy extension. To create your own module:

1. Create a new Python file in the `backend/modules/addons` directory with a descriptive name (e.g., `email_analyzer.py`)
2. Implement the module interface by extending the `BaseModule` class
3. The module will be automatically discovered and loaded by the ModuleRunner

For example:
```python
# backend/modules/addons/example_module.py
from backend.modules.base import BaseModule

class ExampleModule(BaseModule):
    def __init__(self):
        super().__init__()
        self.name = "example_module"
        self.description = "Example module for OSFiler"
        # ... other configuration ...
    
    def execute(self, params):
        # Implementation goes here
        return {"status": "success"}
```

Detailed module development documentation can be found in the [Module Development Guide](docs/modules.md).

## Disclaimer

OSFiler is designed strictly for educational purposes. By using this tool, you agree to take full responsibility for your actions. The creator of OSFiler will not be held liable for any unlawful activities, including but not limited to stalking, harassment, violating privacy, or engaging in any illegal actions that may result in legal consequences.

## Prohibited Usage

OSFiler must not be used for any military, offensive, or adversarial activities, including but not limited to cyber warfare, espionage, or any form of military operations. Any use of OSFiler for such purposes is strictly prohibited. Users engaging in such activities will be held fully responsible for their actions, and the tool's creator will not be liable for any legal or ethical violations resulting from such misuse.

Please ensure that you:
- Use this tool responsibly, ethically, and for educational purposes only
- Comply with all applicable laws and regulations in your jurisdiction
- Respect the privacy of others and obtain necessary authorization before using the tool
- Do not engage in or facilitate any illegal, military, or offensive activities

The creator of OSFiler does not condone its misuse in any unlawful or unethical manner, and any violation of these guidelines may result in legal actions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Feature Roadmap

### Core Features
- [x] **User Authentication**: Secure access to investigations
- [x] **Database Storage**: PostgreSQL-based persistence
- [ ] **Data Import/Export**: Share or backup investigations
- [ ] **API Endpoints**: Comprehensive REST API
- [ ] **Docker Support**: Containerized deployment
- [ ] **Multi-user Collaboration**: Team-based investigations

### Investigation Features
- [x] **Graph-based Investigations**: Create and visualize connections
- [x] **Basic Node Types**: Persons, organizations, usernames, emails, etc.
- [x] **Node Management**: Add, edit, and delete nodes
- [x] **Relationship Management**: Create connections between nodes
- [ ] **Advanced Visualization**: Additional ways to view and interact with data
- [ ] **Reporting Tools**: Generate comprehensive reports from collected data
- [ ] **Timeline View**: Chronological display of events and discoveries
- [ ] **Investigation Templates**: Reusable investigation structures

### Modules
- [x] **Module Framework**: Extensible architecture for OSINT capabilities
- [x] **Username Search**: Find accounts across platforms based on username (still needs some improvement)
- [ ] **Email Analysis**: Gather information based on email addresses
- [ ] **Domain Lookup**: Collect data about websites and domains
- [ ] **Phone Number Analysis**: Identify information linked to phone numbers
- [ ] **Social Media Scraping**: Extract data from public social profiles
- [ ] **Image Analysis**: EXIF data extraction and reverse image search
- [ ] **Geolocation Tools**: Map-based data visualization

### Module Management System
- [x] **Module Reloading**: Reload modules without application restart
- [x] **Module Configuration**: Configure individual modules via settings
- [ ] **Addon Store**: Marketplace for community modules (verified only)
- [ ] **Module Installation**: Install new modules from the store or local files
- [ ] **Update Manager**: Update modules directly from the admin interface
- [ ] **Version Control**: Track module versions and compatibility
- [ ] **Dependency Management**: Handle module dependencies automatically

## Acknowledgements & Inspiration

- **OSINT Framework**: For providing a structured approach to OSINT research
- **Sherlock Project**: For inspiration on effective username search across platforms
- **vis.js**: For the powerful graph visualization capabilities
- All the open-source libraries that made this project possible

OSFiler was created to bring a more convenient, graph-based network approach to OSINT research, making it more accessible and powerful for educational purposes and OSINT enthusiasts.