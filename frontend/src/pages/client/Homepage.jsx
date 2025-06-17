import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import ClientLayout from '../../components/client/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';

function Homepage() {
  const { isAuthenticated } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heroImage, setHeroImage] = useState('/home/ksv1.png');
  const [festImages, setFestImages] = useState([]);

  // Add CSS to prevent horizontal scroll without affecting layout
  useEffect(() => {
    // Add global CSS to prevent horizontal overflow
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow-x: hidden;
        max-width: 100%;
      }
      * {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Cleanup
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    fetchUpcomingEvents();
    fetchFestImages();
    // Using static local image, no need for dynamic loading
  }, []);

  const fetchFestImages = async () => {
    // College fest and event topics
    const festTopics = [
      'college fest celebration',
      'university cultural event',
      'campus music festival',
      'college dance competition',
      'university sports day',
      'campus tech fest',
      'college graduation ceremony',
      'university conference',
      'campus outdoor event',
      'college student activities'
    ];

    try {
      // Using a fallback approach since we don't have Unsplash API key
      const fallbackImages = [
        'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // College fest
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Music festival
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Dance event
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Tech conference
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', // Campus building
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'  // Graduation
      ];
      
      setFestImages(fallbackImages);
    } catch (error) {
      console.error('Error fetching fest images:', error);
      // Set default images if API fails
      setFestImages([
        'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
      ]);
    }
  };
  const fetchUpcomingEvents = async () => {
    try {
      setIsLoading(true);
      const response = await clientAPI.getEvents();
      if (response.data.success) {
        const events = response.data.events || [];
        const upcoming = events.filter(event => event.status === 'upcoming').slice(0, 3);
        setUpcomingEvents(upcoming);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      fullDate: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getEventStatusBadge = (event) => {
    if (event.status === 'upcoming' && event.sub_status === 'registration_open') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <span className="w-2 h-2 bg-blue-400 rounded-full mr-1.5 animate-pulse"></span>
          Registration Open
        </span>
      );
    }
    if (event.status === 'ongoing') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>
          Live
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Upcoming
      </span>
    );
  };  return (
    <ClientLayout noPadding={true}>
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-sky-50 to-purple-50 overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-screen flex items-center">
          {/* Background Image with Fallback */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-teal-600 via-sky-700 to-purple-800 transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: heroImage ? `url(${heroImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: heroImage ? 'brightness(0.4) contrast(1.1)' : 'none'
            }}
          ></div>
          
          {/* Overlay */}
          <div className="absolute inset-0  bg-gradient-to-br from-teal-900/60 via-sky-800/50 to-purple-900/60"></div>
          
          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
            <div className="max-w-4xl mx-auto">
              {/* Main Heading */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 drop-shadow-2xl">
                Campus<span className="bg-gradient-to-r from-teal-300 to-purple-300 bg-clip-text text-transparent">Connect</span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-gray-100 mb-12 leading-relaxed drop-shadow-lg">
                Your comprehensive platform for campus events, professional development, and academic excellence
              </p>              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link
                  to="/client/events?filter=upcoming"
                  className="group relative bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-3 shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 backdrop-blur-sm"
                >
                  <i className="fas fa-calendar-alt text-lg group-hover:scale-110 transition-transform"></i>
                  <span className="text-lg">Explore Events</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-purple-500/20 rounded-xl blur-lg"></div>
                </Link>

                {!isAuthenticated && (
                  <Link
                    to="/client/register"
                    className="group bg-white/20 hover:bg-white/30 text-white hover:text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-3 shadow-2xl border border-white/30 hover:shadow-xl backdrop-blur-sm hover:scale-105"
                  >
                    <i className="fas fa-user-plus text-lg group-hover:scale-110 transition-transform"></i>
                    <span className="text-lg">Join Now</span>
                  </Link>
                )}
              </div>

              {/* University Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-calendar-check text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Smart Events</div>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-certificate text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Certificates</div>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-users text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Community</div>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-chart-line text-2xl text-white"></i>                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Analytics</div>
                </div>
              </div>
            </div>
          </div>        </section>

        {/* Upcoming Events Section */}
        <section className="py-24 bg-teal-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-16">
              <div className="mb-8 lg:mb-0">
                <h2 className="text-4xl font-bold text-slate-800 mb-4">Upcoming Events</h2>
                <p className="text-xl text-slate-600">Discover opportunities to learn, grow, and connect</p>
              </div>
              <Link
                to="/client/events?filter=upcoming"
                className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white font-semibold rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all duration-200"
              >
                <span>View All Events</span>
                <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => {
                    const eventDate = formatEventDate(event.start_datetime);
                    return (
                      <article key={event.event_id} className="group bg-gradient-to-br from-sky-50 to-teal-50 rounded-2xl border border-sky-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                        {/* Event Header */}
                        <div className="p-6 pb-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center text-xs font-bold text-slate-700 border border-sky-200">
                                <div className="text-lg">{eventDate.day}</div>
                                <div className="text-xs uppercase">{eventDate.month}</div>
                              </div>
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {event.event_name}
                              </h3>
                              {getEventStatusBadge(event)}
                            </div>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="px-6 pb-6">
                          <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-center text-sm text-slate-500">
                              <i className="fas fa-clock w-4 text-center mr-3 text-blue-500"></i>
                              <span>{eventDate.fullDate} at {eventDate.time}</span>
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                              <i className="fas fa-map-marker-alt w-4 text-center mr-3 text-red-500"></i>
                              <span>{event.venue}</span>
                            </div>
                            <div className="flex items-center text-sm text-slate-500">
                              <i className="fas fa-tag w-4 text-center mr-3 text-purple-500"></i>
                              <span className="capitalize">{event.category}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            {event.user_registered ? (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ✓ Registered
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                Registration Open
                              </span>
                            )}

                            <Link
                              to={`/client/events/${event.event_id}`}
                              className="inline-flex items-center px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors border border-slate-200"
                            >
                              View Details
                              <i className="fas fa-arrow-right ml-2 text-xs"></i>
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="col-span-full">
                    <div className="text-center py-16 bg-gradient-to-br from-sky-50 to-purple-50 rounded-2xl border border-sky-200">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-calendar-alt text-2xl text-slate-400"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Upcoming Events</h3>
                      <p className="text-slate-500 mb-6">Check back soon for new events and opportunities!</p>
                      <Link
                        to="/client/events"
                        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Browse All Events
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>        {/* Call to Action Section */}
        <section className="py-24 relative overflow-hidden">
          {/* Dynamic Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{
              backgroundImage: festImages.length > 0 
                ? `url(${festImages[Math.floor(Math.random() * festImages.length)]})` 
                : 'linear-gradient(135deg, #0f766e 0%, #0c4a6e 50%, #7c3aed 100%)',
              filter: 'brightness(0.3) contrast(1.1)'
            }}
          ></div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/80 via-sky-900/70 to-purple-900/80"></div>
          
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM36 0V4h-2V0h-4v2h4v4h2V2h4V0h-4zM0 34v-4H2v4h4v2H2v4H0v-4H2v-2H0zM0 2V0h2v4h4v2H2v4H0V2h2V0H0z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
          }}></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 drop-shadow-2xl">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-100 mb-10 max-w-3xl mx-auto drop-shadow-lg">
                Join thousands of students who are already making the most of their campus experience with CampusConnect
              </p>

              {!isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    to="/client/register"
                    className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-lg font-semibold rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all duration-200 hover:scale-105 shadow-2xl backdrop-blur-sm"
                  >
                    <i className="fas fa-user-plus mr-3 group-hover:scale-110 transition-transform"></i>
                    Create Account
                  </Link>
                  <Link
                    to="/auth/login"
                    className="group inline-flex items-center px-8 py-4 bg-white/20 text-white text-lg font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30 backdrop-blur-sm hover:scale-105 shadow-xl"
                  >
                    <i className="fas fa-sign-in-alt mr-3 group-hover:scale-110 transition-transform"></i>
                    Sign In
                  </Link>
                </div>
              ) : (
                <Link
                  to="/client/dashboard"
                  className="group inline-flex items-center px-8 py-4 bg-white/20 text-white text-lg font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105 shadow-2xl backdrop-blur-sm border border-white/30"
                >
                  <i className="fas fa-tachometer-alt mr-3 group-hover:scale-110 transition-transform"></i>
                  Go to Dashboard
                </Link>
              )}
            </div>            {/* College Event Highlights */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                  <i className="fas fa-music text-2xl text-white"></i>
                </div>
                <div className="text-sm font-semibold text-white drop-shadow-lg">Cultural Fests</div>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                  <i className="fas fa-laptop-code text-2xl text-white"></i>
                </div>
                <div className="text-sm font-semibold text-white drop-shadow-lg">Tech Events</div>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                  <i className="fas fa-running text-2xl text-white"></i>
                </div>
                <div className="text-sm font-semibold text-white drop-shadow-lg">Sports Events</div>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                  <i className="fas fa-graduation-cap text-2xl text-white"></i>
                </div>
                <div className="text-sm font-semibold text-white drop-shadow-lg">Academic Events</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-r from-teal-50 to-sky-50 no-border-t border-teal-200 mt-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Company Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center mb-6">
                  {/* Logo above typography */}
                  <div className="mb-6">
                  </div>
                  <img
                    src="/logo/ksv.png"
                    alt="KSV Logo"
                    className="h-10 w-10 object-contain"
                  />
                  <h3 className="text-4xl font-bold text-slate-800 align-center ml-2">
                    Campus<span className="text-3xl italic bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent">Connect</span>
                  </h3>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed max-w-md">
                  Empowering students through seamless event management, meaningful campus experiences, and professional development opportunities.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center hover:bg-teal-200 hover:text-teal-700 transition-colors">
                    <i className="fab fa-facebook text-sm"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center hover:bg-sky-200 hover:text-sky-700 transition-colors">
                    <i className="fab fa-twitter text-sm"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center hover:bg-purple-200 hover:text-purple-700 transition-colors">
                    <i className="fab fa-instagram text-sm"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 hover:text-emerald-700 transition-colors">
                    <i className="fab fa-linkedin text-sm"></i>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-6">Quick Links</h4>
                <ul className="space-y-3">
                  <li><Link to="/client/events" className="text-slate-600 hover:text-teal-600 transition-colors">All Events</Link></li>
                  <li><Link to="/client/events?filter=upcoming" className="text-slate-600 hover:text-teal-600 transition-colors">Upcoming Events</Link></li>
                  {isAuthenticated ? (
                    <li><Link to="/client/dashboard" className="text-slate-600 hover:text-teal-600 transition-colors">Dashboard</Link></li>
                  ) : (
                    <>
                      <li><Link to="/client/register" className="text-slate-600 hover:text-teal-600 transition-colors">Register</Link></li>
                      <li><Link to="/auth/login" className="text-slate-600 hover:text-teal-600 transition-colors">Login</Link></li>
                    </>
                  )}
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-6">Contact Us</h4>
                <ul className="space-y-3">
                  <li className="flex items-center text-slate-600">
                    <i className="fas fa-envelope w-4 text-center mr-3 text-teal-500"></i>
                    <span>contact@campusconnect.edu</span>
                  </li>
                  <li className="flex items-center text-slate-600">
                    <i className="fas fa-phone w-4 text-center mr-3 text-teal-500"></i>
                    <span>+91 9876543210</span>
                  </li>
                  <li className="flex items-center text-slate-600">
                    <i className="fas fa-map-marker-alt w-4 text-center mr-3 text-teal-500"></i>
                    <span>Campus University</span>
                  </li>
                </ul>
              </div>
            </div>
            {/* Bottom Bar */}
            <div className="pt-8 border-t border-teal-200">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center">
                  <p className="text-slate-600 text-sm">
                    © 2025 CampusConnect. All rights reserved.
                  </p>
                </div>
                <div className="flex space-x-6 mt-2 md:mt-0">
                  <Link to="#" className="text-slate-600 hover:text-teal-600 text-sm transition-colors">Privacy Policy</Link>
                  <Link to="#" className="text-slate-600 hover:text-teal-600 text-sm transition-colors">Terms of Service</Link>
                  <Link to="#" className="text-slate-600 hover:text-teal-600 text-sm transition-colors">Support</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>      </div>
      
      {/* Full Width Floor Typography */}
      <div className="w-screen bg-gradient-to-r from-teal-50 to-sky-50 m-0 p-0 overflow-hidden">
        <div className="w-full text-center m-0 p-0">
          <h2 className="font-pacifico-brand text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem] 2xl:text-[14rem] leading-none m-0 p-0 w-full font-black">
            <span className="text-slate-800 font-black" style={{
              textShadow: '3px 3px 6px rgba(0,0,0,0.3)'
            }}>CAMPUS</span>
            <span className="text-9xl  bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent font-black" style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>CONNECT</span>
          </h2>
        </div>
      </div>
    </ClientLayout>
  );
}

export default Homepage;
