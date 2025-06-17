# 🎓 CampusConnect - University Event Management Platform

A comprehensive web platform for managing campus events, student registrations, and digital certificate distribution.

## 📋 Overview

CampusConnect is a modern, full-stack web application designed to streamline campus event management for universities and colleges. It provides students with an intuitive platform to discover, register for, and participate in campus activities while offering administrators powerful tools for event management and analytics.

## ✨ Features

### For Students
- 🔍 **Event Discovery**: Browse and search campus events by category, date, and type
- 📝 **Easy Registration**: One-click event registration with real-time availability
- 🏆 **Digital Certificates**: Automatic certificate generation and download
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- 🔔 **Smart Notifications**: Get notified about new events and deadlines
- 👥 **Team Registration**: Support for both individual and team-based events

### For Administrators
- 📊 **Event Management**: Create, edit, and manage events with detailed configurations
- 👨‍💼 **User Management**: Comprehensive student and admin user management
- 📈 **Analytics Dashboard**: Real-time insights and event statistics
- 🎨 **Certificate Templates**: Customizable certificate templates
- 📧 **Email Automation**: Automated email notifications and reminders
- 🔐 **Role-based Access**: Secure admin and super admin roles

## 🛠️ Technology Stack

### Frontend
- **React.js** - Modern JavaScript library for building user interfaces
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **React Router** - Declarative routing for React applications
- **Axios** - Promise-based HTTP client for API communication
- **Font Awesome** - Icon library for beautiful UI elements

### Backend
- **Python Flask** - Lightweight and flexible web framework
- **SQLAlchemy** - Object-relational mapping library
- **Flask-CORS** - Cross-origin resource sharing support
- **Werkzeug** - WSGI utility library for Python
- **Jinja2** - Template engine for Python

### Database
- **SQLite** - Lightweight, serverless database (development)
- **PostgreSQL** - Production-ready relational database (production)

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/CampusConnect.git
   cd CampusConnect
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
CampusConnect/
├── backend/                 # Flask backend application
│   ├── main.py             # Application entry point
│   ├── config/             # Configuration files
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── templates/          # Email and certificate templates
│   ├── static/             # Static files (CSS, JS, images)
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React frontend application
│   ├── public/             # Public assets
│   ├── src/                # Source code
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── api/            # API communication
│   │   └── utils/          # Utility functions
│   ├── package.json        # Node.js dependencies
│   └── tailwind.config.js  # Tailwind CSS configuration
│
├── README.md               # Project documentation
├── .gitignore              # Git ignore rules
└── LICENSE                 # License information
```

## 🎯 Key Features Showcase

### Beautiful User Interface
- Modern, responsive design with Tailwind CSS
- Dynamic background images from Unsplash
- Glass morphism effects and smooth animations
- Mobile-first approach for all screen sizes

### Event Management
- Multiple event types (cultural, technical, sports, academic)
- Individual and team registration modes
- Real-time availability tracking
- Automated certificate generation

### Admin Dashboard
- Comprehensive event analytics
- User management with role-based access
- Certificate template customization
- Email automation and notifications

## 🔧 Configuration

### Environment Variables

Create `.env` files in both backend and frontend directories:

**Backend (.env)**
```
FLASK_ENV=development
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///campus_connect.db
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Frontend (.env)**
```
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_UNSPLASH_ACCESS_KEY=your-unsplash-key
```

## 📚 API Documentation

The backend provides RESTful APIs for:
- User authentication and management
- Event CRUD operations
- Registration management
- Certificate generation
- Admin operations

API endpoints are documented and can be tested using tools like Postman or curl.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project Lead**: [Your Name]
- **Frontend Developer**: [Developer Name]
- **Backend Developer**: [Developer Name]
- **UI/UX Designer**: [Designer Name]

## 📞 Support

For support and questions:
- 📧 Email: support@campusconnect.edu
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/CampusConnect/issues)
- 📖 Documentation: [Wiki](https://github.com/your-username/CampusConnect/wiki)

## 🎉 Acknowledgments

- [React.js](https://reactjs.org/) - For the amazing frontend framework
- [Flask](https://flask.palletsprojects.com/) - For the lightweight backend framework
- [Tailwind CSS](https://tailwindcss.com/) - For the beautiful utility-first CSS
- [Unsplash](https://unsplash.com/) - For the stunning background images
- [Font Awesome](https://fontawesome.com/) - For the comprehensive icon library

---

<div align="center">
  <strong>🎓 Making campus life better, one event at a time! 🎓</strong>
</div>
