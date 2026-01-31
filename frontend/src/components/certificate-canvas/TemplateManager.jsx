import React, { useState, useEffect } from 'react';
import { FaCertificate, FaAward, FaGraduationCap, FaTrophy } from 'react-icons/fa';

const TemplateManager = ({ onTemplateLoad, hideUI = false }) => {
  console.log('TemplateManager rendered with onTemplateLoad:', !!onTemplateLoad);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentDimension, setCurrentDimension] = useState('portrait');

  const templates = [
    // New Landscape Templates (moved to top for visibility)
    {
      id: 'elegant-black-gold-seminar',
      name: 'Elegant Black & Gold Seminar',
      description: 'Professional seminar certificate with gold accents',
      icon: FaAward,
      backgroundImage: '/backgrounds/templates/landscape/BlackGoldElegantSeminarCertificateLandscape (1).png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Participation',
            x: 400,
            y: 140,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Professional Seminar',
            x: 400,
            y: 190,
            fontSize: 18,
            fontFamily: 'Lora',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Participant Name',
            x: 400,
            y: 260,
            fontSize: 32,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully participated in the professional development seminar',
            x: 400,
            y: 330,
            fontSize: 16,
            fontFamily: 'Open Sans',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'seminar-title',
            type: 'text',
            content: 'Seminar Title',
            x: 400,
            y: 380,
            fontSize: 22,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#d4af37',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Participation',
            x: 600,
            y: 100,
            fontSize: 44,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Professional Seminar',
            x: 600,
            y: 160,
            fontSize: 20,
            fontFamily: 'Lora',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Participant Name',
            x: 600,
            y: 220,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully participated in the professional development seminar',
            x: 600,
            y: 290,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'seminar-title',
            type: 'text',
            content: 'Seminar Title',
            x: 600,
            y: 350,
            fontSize: 26,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#d4af37',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'navy-tech-webinar',
      name: 'Modern Tech Webinar',
      description: 'Navy and turquoise tech business certificate',
      icon: FaCertificate,
      backgroundImage: '/backgrounds/templates/landscape/NavyTurqoiseModernTechnologyBusinessWebinarCertificate.png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Webinar Certificate',
            x: 400,
            y: 130,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Technology Business Session',
            x: 400,
            y: 180,
            fontSize: 16,
            fontFamily: 'Roboto',
            color: '#0891b2',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Attendee Name',
            x: 400,
            y: 240,
            fontSize: 30,
            fontWeight: 'bold',
            fontFamily: 'Raleway',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully attended the technology business webinar',
            x: 400,
            y: 300,
            fontSize: 16,
            fontFamily: 'Open Sans',
            color: '#374151',
            textAlign: 'center'
          },
          {
            id: 'webinar-topic',
            type: 'text',
            content: 'Webinar Topic',
            x: 400,
            y: 360,
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#0891b2',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Webinar Certificate',
            x: 600,
            y: 90,
            fontSize: 42,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Technology Business Session',
            x: 600,
            y: 150,
            fontSize: 18,
            fontFamily: 'Roboto',
            color: '#0891b2',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Attendee Name',
            x: 600,
            y: 200,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Raleway',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully attended the technology business webinar',
            x: 600,
            y: 260,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#374151',
            textAlign: 'center'
          },
          {
            id: 'webinar-topic',
            type: 'text',
            content: 'Webinar Topic',
            x: 600,
            y: 320,
            fontSize: 24,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#0891b2',
            textAlign: 'center'
          }
        ]
      }
    },
    // Original templates
    {
      id: 'academic-achievement',
      name: 'Academic Achievement',
      description: 'Classic academic certificate design',
      icon: FaGraduationCap,
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Achievement',
            x: 400,
            y: 150,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#2c3e50',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'This is to certify that',
            x: 400,
            y: 220,
            fontSize: 18,
            fontFamily: 'Lora',
            color: '#34495e',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Student Name',
            x: 400,
            y: 280,
            fontSize: 32,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#2a6df4',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully completed the requirements and is awarded this certificate',
            x: 400,
            y: 350,
            fontSize: 16,
            fontFamily: 'Lora',
            color: '#34495e',
            textAlign: 'center'
          },
          {
            id: 'course',
            type: 'text',
            content: 'Course/Program Name',
            x: 400,
            y: 420,
            fontSize: 24,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#2c3e50',
            textAlign: 'center'
          },
          {
            id: 'date',
            type: 'text',
            content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            x: 200,
            y: 520,
            fontSize: 14,
            fontFamily: 'Roboto',
            color: '#34495e',
            textAlign: 'left'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Achievement',
            x: 600,
            y: 120,
            fontSize: 42,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#2c3e50',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'This is to certify that',
            x: 600,
            y: 190,
            fontSize: 20,
            fontFamily: 'Lora',
            color: '#34495e',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Student Name',
            x: 600,
            y: 250,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#2a6df4',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully completed the requirements and is awarded this certificate',
            x: 600,
            y: 320,
            fontSize: 18,
            fontFamily: 'Lora',
            color: '#34495e',
            textAlign: 'center'
          },
          {
            id: 'course',
            type: 'text',
            content: 'Course/Program Name',
            x: 600,
            y: 380,
            fontSize: 26,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#2c3e50',
            textAlign: 'center'
          },
          {
            id: 'date',
            type: 'text',
            content: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            x: 200,
            y: 450,
            fontSize: 16,
            fontFamily: 'Roboto',
            color: '#34495e',
            textAlign: 'left'
          }
        ]
      }
    },
    {
      id: 'professional-award',
      name: 'Professional Award',
      description: 'Modern professional certificate',
      icon: FaAward,
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Professional Excellence Award',
            x: 400,
            y: 140,
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#1a237e',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Presented to',
            x: 400,
            y: 200,
            fontSize: 20,
            fontFamily: 'Lato',
            color: '#424242',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Employee Name',
            x: 400,
            y: 260,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Raleway',
            color: '#e91e63',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'For outstanding performance and dedication to excellence',
            x: 400,
            y: 330,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#424242',
            textAlign: 'center'
          },
          {
            id: 'department',
            type: 'text',
            content: 'Department/Division',
            x: 400,
            y: 390,
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#1a237e',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Professional Excellence Award',
            x: 600,
            y: 110,
            fontSize: 46,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#1a237e',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Presented to',
            x: 600,
            y: 180,
            fontSize: 22,
            fontFamily: 'Lato',
            color: '#424242',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Employee Name',
            x: 600,
            y: 240,
            fontSize: 42,
            fontWeight: 'bold',
            fontFamily: 'Raleway',
            color: '#e91e63',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'For outstanding performance and dedication to excellence',
            x: 600,
            y: 310,
            fontSize: 20,
            fontFamily: 'Open Sans',
            color: '#424242',
            textAlign: 'center'
          },
          {
            id: 'department',
            type: 'text',
            content: 'Department/Division',
            x: 600,
            y: 370,
            fontSize: 24,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#1a237e',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'course-completion',
      name: 'Course Completion',
      description: 'Training course certificate',
      icon: FaCertificate,
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Completion',
            x: 400,
            y: 160,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Cormorant Garamond',
            color: '#2e7d32',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'This certifies that',
            x: 400,
            y: 220,
            fontSize: 16,
            fontFamily: 'Libre Baskerville',
            color: '#37474f',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Participant Name',
            x: 400,
            y: 280,
            fontSize: 30,
            fontWeight: 'bold',
            fontFamily: 'Dancing Script',
            color: '#d32f2f',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully completed the training program',
            x: 400,
            y: 340,
            fontSize: 16,
            fontFamily: 'Merriweather',
            color: '#37474f',
            textAlign: 'center'
          },
          {
            id: 'course',
            type: 'text',
            content: 'Course Title',
            x: 400,
            y: 400,
            fontSize: 22,
            fontWeight: 'bold',
            fontFamily: 'Oswald',
            color: '#2e7d32',
            textAlign: 'center'
          },
          {
            id: 'duration',
            type: 'text',
            content: 'Duration: 40 Hours',
            x: 400,
            y: 450,
            fontSize: 14,
            fontFamily: 'Roboto',
            color: '#546e7a',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Completion',
            x: 600,
            y: 100,
            fontSize: 44,
            fontWeight: 'bold',
            fontFamily: 'Cormorant Garamond',
            color: '#2e7d32',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'This certifies that',
            x: 600,
            y: 170,
            fontSize: 18,
            fontFamily: 'Libre Baskerville',
            color: '#37474f',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Participant Name',
            x: 600,
            y: 220,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Dancing Script',
            color: '#d32f2f',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully completed the training program',
            x: 600,
            y: 280,
            fontSize: 18,
            fontFamily: 'Merriweather',
            color: '#37474f',
            textAlign: 'center'
          },
          {
            id: 'course',
            type: 'text',
            content: 'Course Title',
            x: 600,
            y: 340,
            fontSize: 26,
            fontWeight: 'bold',
            fontFamily: 'Oswald',
            color: '#2e7d32',
            textAlign: 'center'
          },
          {
            id: 'duration',
            type: 'text',
            content: 'Duration: 40 Hours',
            x: 600,
            y: 390,
            fontSize: 16,
            fontFamily: 'Roboto',
            color: '#546e7a',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'appreciation',
      name: 'Appreciation Certificate',
      description: 'Certificate of appreciation',
      icon: FaTrophy,
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Appreciation',
            x: 400,
            y: 150,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Great Vibes',
            color: '#8e24aa',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Gratefully presented to',
            x: 400,
            y: 210,
            fontSize: 18,
            fontFamily: 'Parisienne',
            color: '#4a148c',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Honoree Name',
            x: 400,
            y: 270,
            fontSize: 34,
            fontWeight: 'bold',
            fontFamily: 'Allura',
            color: '#d32f2f',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'In recognition of outstanding service and valuable contributions',
            x: 400,
            y: 340,
            fontSize: 16,
            fontFamily: 'Lora',
            color: '#424242',
            textAlign: 'center'
          },
          {
            id: 'organization',
            type: 'text',
            content: 'Organization Name',
            x: 400,
            y: 400,
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Cinzel',
            color: '#8e24aa',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Appreciation',
            x: 600,
            y: 110,
            fontSize: 42,
            fontWeight: 'bold',
            fontFamily: 'Great Vibes',
            color: '#8e24aa',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Gratefully presented to',
            x: 600,
            y: 180,
            fontSize: 20,
            fontFamily: 'Parisienne',
            color: '#4a148c',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Honoree Name',
            x: 600,
            y: 240,
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'Allura',
            color: '#d32f2f',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'In recognition of outstanding service and valuable contributions',
            x: 600,
            y: 310,
            fontSize: 18,
            fontFamily: 'Lora',
            color: '#424242',
            textAlign: 'center'
          },
          {
            id: 'organization',
            type: 'text',
            content: 'Organization Name',
            x: 600,
            y: 370,
            fontSize: 24,
            fontWeight: '600',
            fontFamily: 'Cinzel',
            color: '#8e24aa',
            textAlign: 'center'
          }
        ]
      }
    },
    // New Landscape Templates based on uploaded designs
    {
      id: 'elegant-black-gold-seminar',
      name: 'Elegant Black & Gold Seminar',
      description: 'Professional seminar certificate with gold accents',
      icon: FaAward,
      backgroundImage: '/backgrounds/templates/landscape/BlackGoldElegantSeminarCertificateLandscape (1).png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Participation',
            x: 400,
            y: 140,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Professional Seminar',
            x: 400,
            y: 190,
            fontSize: 18,
            fontFamily: 'Lora',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Participant Name',
            x: 400,
            y: 260,
            fontSize: 32,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully participated in the professional development seminar',
            x: 400,
            y: 330,
            fontSize: 16,
            fontFamily: 'Open Sans',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'seminar-title',
            type: 'text',
            content: 'Seminar Title',
            x: 400,
            y: 380,
            fontSize: 22,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#d4af37',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate of Participation',
            x: 600,
            y: 100,
            fontSize: 44,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Professional Seminar',
            x: 600,
            y: 160,
            fontSize: 20,
            fontFamily: 'Lora',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Participant Name',
            x: 600,
            y: 220,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#d4af37',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully participated in the professional development seminar',
            x: 600,
            y: 290,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'seminar-title',
            type: 'text',
            content: 'Seminar Title',
            x: 600,
            y: 350,
            fontSize: 26,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#d4af37',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'navy-tech-webinar',
      name: 'Modern Tech Webinar',
      description: 'Navy and turquoise tech business certificate',
      icon: FaCertificate,
      backgroundImage: '/backgrounds/templates/landscape/NavyTurqoiseModernTechnologyBusinessWebinarCertificate.png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Webinar Certificate',
            x: 400,
            y: 130,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Technology Business Session',
            x: 400,
            y: 180,
            fontSize: 16,
            fontFamily: 'Roboto',
            color: '#0891b2',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Attendee Name',
            x: 400,
            y: 240,
            fontSize: 30,
            fontWeight: 'bold',
            fontFamily: 'Raleway',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully attended the technology business webinar',
            x: 400,
            y: 300,
            fontSize: 16,
            fontFamily: 'Open Sans',
            color: '#374151',
            textAlign: 'center'
          },
          {
            id: 'webinar-topic',
            type: 'text',
            content: 'Webinar Topic',
            x: 400,
            y: 360,
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#0891b2',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Webinar Certificate',
            x: 600,
            y: 90,
            fontSize: 42,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Technology Business Session',
            x: 600,
            y: 150,
            fontSize: 18,
            fontFamily: 'Roboto',
            color: '#0891b2',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Attendee Name',
            x: 600,
            y: 200,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Raleway',
            color: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has successfully attended the technology business webinar',
            x: 600,
            y: 260,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#374151',
            textAlign: 'center'
          },
          {
            id: 'webinar-topic',
            type: 'text',
            content: 'Webinar Topic',
            x: 600,
            y: 320,
            fontSize: 24,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#0891b2',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'simple-white-achievement',
      name: 'Simple White Achievement',
      description: 'Clean neumorphic design achievement certificate',
      icon: FaTrophy,
      backgroundImage: '/backgrounds/templates/landscape/SimpleWhiteNeumorphicAchievementCertificate.png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Achievement Certificate',
            x: 400,
            y: 150,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Roboto',
            color: '#2d3748',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Outstanding Performance',
            x: 400,
            y: 200,
            fontSize: 18,
            fontFamily: 'Lato',
            color: '#4a5568',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Achiever Name',
            x: 400,
            y: 270,
            fontSize: 32,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#2b6cb0',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has demonstrated exceptional achievement and excellence',
            x: 400,
            y: 330,
            fontSize: 16,
            fontFamily: 'Open Sans',
            color: '#4a5568',
            textAlign: 'center'
          },
          {
            id: 'achievement-area',
            type: 'text',
            content: 'Area of Achievement',
            x: 400,
            y: 390,
            fontSize: 22,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#2b6cb0',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Achievement Certificate',
            x: 600,
            y: 110,
            fontSize: 44,
            fontWeight: 'bold',
            fontFamily: 'Roboto',
            color: '#2d3748',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Outstanding Performance',
            x: 600,
            y: 170,
            fontSize: 20,
            fontFamily: 'Lato',
            color: '#4a5568',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Achiever Name',
            x: 600,
            y: 230,
            fontSize: 38,
            fontWeight: 'bold',
            fontFamily: 'Montserrat',
            color: '#2b6cb0',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has demonstrated exceptional achievement and excellence',
            x: 600,
            y: 290,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#4a5568',
            textAlign: 'center'
          },
          {
            id: 'achievement-area',
            type: 'text',
            content: 'Area of Achievement',
            x: 600,
            y: 350,
            fontSize: 26,
            fontWeight: '600',
            fontFamily: 'Poppins',
            color: '#2b6cb0',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'black-white-simple',
      name: 'Black & White Simple',
      description: 'Minimalist black and white certificate design',
      icon: FaCertificate,
      backgroundImage: '/backgrounds/templates/landscape/BlackandwhitesimplecertificateA4Landscape (1).png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate',
            x: 400,
            y: 160,
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#000000',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'of Excellence',
            x: 400,
            y: 210,
            fontSize: 24,
            fontFamily: 'Lora',
            color: '#000000',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Recipient Name',
            x: 400,
            y: 280,
            fontSize: 28,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#000000',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'is hereby awarded this certificate for outstanding performance',
            x: 400,
            y: 340,
            fontSize: 16,
            fontFamily: 'Libre Baskerville',
            color: '#000000',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Certificate',
            x: 600,
            y: 120,
            fontSize: 46,
            fontWeight: 'bold',
            fontFamily: 'Cinzel',
            color: '#000000',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'of Excellence',
            x: 600,
            y: 180,
            fontSize: 28,
            fontFamily: 'Lora',
            color: '#000000',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Recipient Name',
            x: 600,
            y: 240,
            fontSize: 34,
            fontWeight: 'bold',
            fontFamily: 'Playfair Display',
            color: '#000000',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'is hereby awarded this certificate for outstanding performance',
            x: 600,
            y: 300,
            fontSize: 18,
            fontFamily: 'Libre Baskerville',
            color: '#000000',
            textAlign: 'center'
          }
        ]
      }
    },
    {
      id: 'funny-award-creative',
      name: 'Creative Fun Award',
      description: 'Playful and creative award certificate design',
      icon: FaTrophy,
      backgroundImage: '/backgrounds/templates/landscape/BlackIllustrativeFunnyAwardCertificate (1).png',
      elements: {
        portrait: [
          {
            id: 'title',
            type: 'text',
            content: 'Fun Award Certificate',
            x: 400,
            y: 140,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Dancing Script',
            color: '#ff6b35',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Special Recognition',
            x: 400,
            y: 190,
            fontSize: 18,
            fontFamily: 'Pacifico',
            color: '#4ecdc4',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Winner Name',
            x: 400,
            y: 260,
            fontSize: 30,
            fontWeight: 'bold',
            fontFamily: 'Fredoka One',
            color: '#ff6b35',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has earned this fun award for creativity and enthusiasm',
            x: 400,
            y: 320,
            fontSize: 16,
            fontFamily: 'Open Sans',
            color: '#2c3e50',
            textAlign: 'center'
          },
          {
            id: 'award-category',
            type: 'text',
            content: 'Award Category',
            x: 400,
            y: 380,
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Nunito',
            color: '#4ecdc4',
            textAlign: 'center'
          }
        ],
        landscape: [
          {
            id: 'title',
            type: 'text',
            content: 'Fun Award Certificate',
            x: 600,
            y: 100,
            fontSize: 42,
            fontWeight: 'bold',
            fontFamily: 'Dancing Script',
            color: '#ff6b35',
            textAlign: 'center'
          },
          {
            id: 'subtitle',
            type: 'text',
            content: 'Special Recognition',
            x: 600,
            y: 160,
            fontSize: 20,
            fontFamily: 'Pacifico',
            color: '#4ecdc4',
            textAlign: 'center'
          },
          {
            id: 'recipient',
            type: 'text',
            content: 'Winner Name',
            x: 600,
            y: 220,
            fontSize: 36,
            fontWeight: 'bold',
            fontFamily: 'Fredoka One',
            color: '#ff6b35',
            textAlign: 'center'
          },
          {
            id: 'description',
            type: 'text',
            content: 'has earned this fun award for creativity and enthusiasm',
            x: 600,
            y: 280,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#2c3e50',
            textAlign: 'center'
          },
          {
            id: 'award-category',
            type: 'text',
            content: 'Award Category',
            x: 600,
            y: 340,
            fontSize: 24,
            fontWeight: '600',
            fontFamily: 'Nunito',
            color: '#4ecdc4',
            textAlign: 'center'
          }
        ]
      }
    }
  ];

  const loadTemplate = (template) => {
    console.log('Loading template:', template.name);
    console.log('Current dimension:', currentDimension);
    
    // Get template elements for current dimension
    const templateElements = template.elements[currentDimension] || template.elements.portrait;
    
    // Create template object with current dimension elements
    const templateToLoad = {
      ...template,
      elements: templateElements,
      orientation: currentDimension
    };
    
    setSelectedTemplate(templateToLoad);
    
    if (onTemplateLoad) {
      onTemplateLoad(templateToLoad);
    }
    
    // Also trigger global template loading for any listening systems
    const event = new CustomEvent('templateLoaded', { 
      detail: templateToLoad 
    });
    window.dispatchEvent(event);
  };

  // Listen for dimension changes
  useEffect(() => {
    const handleDimensionChange = (event) => {
      const newDimension = event.detail.orientation;
      console.log('Dimension changed to:', newDimension);
      setCurrentDimension(newDimension);
      
      // If a template is selected, reload it with new dimension
      if (selectedTemplate) {
        const originalTemplate = templates.find(t => t.id === selectedTemplate.id);
        if (originalTemplate) {
          loadTemplate(originalTemplate);
        }
      }
    };

    const handleLoadTemplateById = (event) => {
      const { templateId, dimension } = event.detail;
      console.log('Loading template by ID:', templateId, 'for dimension:', dimension);
      
      // Update current dimension first
      if (dimension && dimension !== currentDimension) {
        setCurrentDimension(dimension);
      }
      
      // Find and load the template
      const template = templates.find(t => t.id === templateId);
      if (template) {
        console.log('Template found:', template.name);
        loadTemplate(template);
      } else {
        console.error('Template not found:', templateId);
      }
    };

    window.addEventListener('dimensionChanged', handleDimensionChange);
    window.addEventListener('loadTemplateById', handleLoadTemplateById);
    
    return () => {
      window.removeEventListener('dimensionChanged', handleDimensionChange);
      window.removeEventListener('loadTemplateById', handleLoadTemplateById);
    };
  }, [selectedTemplate, templates, currentDimension]);

  console.log('Rendering', templates.length, 'templates');

  // If hideUI is true, return null (no visual component, just event listeners)
  if (hideUI) {
    return null;
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FaCertificate className="text-blue-500" />
        Certificate Templates
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Choose a template - all elements are editable, draggable, and deletable. 
        <span className="block mt-1 text-blue-600 font-medium">
          📐 Templates adapt to your selected canvas dimension above
        </span>
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        {templates.map(template => {
          const IconComponent = template.icon;
          return (
            <div 
              key={template.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedTemplate?.id === template.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => loadTemplate(template)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <IconComponent className="text-blue-500 text-xl" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 text-sm leading-tight">
                    {template.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.description}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                      {template.elements[currentDimension]?.length || template.elements.portrait?.length || 0} elements
                    </span>
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Supports both orientations
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedTemplate && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Template loaded:</strong> {selectedTemplate.name}
            <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-900 rounded text-xs">
              📐 {currentDimension.charAt(0).toUpperCase() + currentDimension.slice(1)} Layout
            </span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Double-click any element to edit text. Drag to move. Click delete button (×) to remove elements.
            <span className="block mt-1 font-medium">
              ✨ Template optimized for {currentDimension} orientation!
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
