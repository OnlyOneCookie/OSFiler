# OSFiler - OSINT Profiling Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![React Version](https://img.shields.io/badge/react-18.0+-61DAFB.svg)](https://reactjs.org/)
[![PostgreSQL Version](https://img.shields.io/badge/postgresql-13+-336791.svg)](https://www.postgresql.org/)
[![FastAPI Version](https://img.shields.io/badge/fastapi-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.1%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

OSFiler is an educational Open Source Intelligence (OSINT) profiling tool that helps researchers create comprehensive profiles of subjects (people, organizations, etc.) by collecting and linking various data points through a graph-based approach.

## 🔍 What is OSINT?

Open Source Intelligence (OSINT) is the practice of collecting and analyzing information from publicly available sources. It's a crucial skill in various fields including:

- Cybersecurity research and threat intelligence
- Digital forensics and investigations
- Business intelligence and competitive analysis
- Academic research and journalism
- Law enforcement and security operations

OSFiler is designed to help researchers and investigators organize and visualize OSINT data in a structured, graph-based format, making it easier to identify patterns and connections between different pieces of information.

## ✨ Key Features

* **📊 Graph-Based Visualization**: Create and visualize connections between different data points using an intuitive graph interface
* **🔍 Comprehensive Node System**: Support for various node types including persons, organizations, usernames, emails, phone numbers, and more
* **🔄 Modular Design**: Extend functionality with custom modules for different OSINT capabilities
* **💾 Data Persistence**: Save and manage investigations in a PostgreSQL database
* **🔒 Secure Access**: Authentication system to protect your investigations
* **📱 Modern Interface**: Clean, responsive UI built with React and TypeScript

## ⚙️ Architecture

OSFiler consists of multiple components working together:

| Component | Description | Technology |
|-----------|-------------|------------|
| Frontend  | Web-based user interface | React, TypeScript |
| Backend   | API and business logic | Python, FastAPI |
| Database  | Data storage | PostgreSQL |
| Modules   | Extensible OSINT capabilities | Python |

For detailed architecture information, see the [Architecture Documentation](docs/architecture.md).

## 🛠️ Installation

OSFiler can be set up in various environments. For detailed installation instructions, see the [Setup Guide](docs/setup.md).

**Prerequisites:**
- Node.js (v16+)
- Python (v3.12+)
- PostgreSQL (v13+)

## 📚 Documentation

* [Setup Guide](docs/setup.md) - Installation and configuration
* [Module Development Guide](docs/modules.md) - Creating custom OSINT modules
* [API Documentation](docs/api.md) - API endpoints and usage
* [Architecture Documentation](docs/architecture.md) - System design and components

## ⚠️ Security & Usage Guidelines

### Legal Disclaimer

OSFiler is designed strictly for educational purposes. The creators and maintainers of OSFiler will not be held liable for any unlawful activities conducted using this tool. Users must take full responsibility for their actions and ensure compliance with all applicable laws and regulations.

### Prohibited Usage

OSFiler must not be used for:
- Military, offensive, or adversarial operations
- Cyber warfare, espionage, or intelligence gathering
- Unauthorized data collection or privacy violations
- Harassment, stalking, or intimidation
- Any activities that violate local or international laws

### Usage Guidelines

By using OSFiler, you agree to:
- Use the tool responsibly and ethically for educational purposes only
- Respect privacy and obtain necessary authorization before data collection
- Comply with all platform terms of service and legal requirements
- Not engage in any form of unauthorized access or data exfiltration

Violation of these guidelines may result in legal actions, access revocation, and reporting to authorities. You acknowledge full responsibility for your actions while using this tool.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- **OSINT Framework**: For providing a structured approach to OSINT research
- **Sherlock Project**: For inspiration on effective username search across platforms
- **vis.js**: For the powerful graph visualization capabilities
- All the open-source libraries that made this project possible

OSFiler was created to bring a more convenient, graph-based network approach to OSINT research, making it more accessible and powerful for educational purposes and OSINT enthusiasts.