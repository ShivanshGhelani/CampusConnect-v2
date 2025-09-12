import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EventCard from '../../components/client/EventCard';

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
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[400px] md:min-h-screen">
        {/* Hero Content Container */}
        <div className="relative min-h-[400px] md:min-h-screen flex items-center">
          {/* Background Image - Desktop */}
          <div 
            className="hidden md:block absolute inset-0 bg-gradient-to-br from-teal-600 via-sky-700 to-purple-800 transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: heroImage ? `url(${heroImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              filter: heroImage ? 'brightness(0.4) contrast(1.1)' : 'none'
            }}
          ></div>
          
          {/* Background Image - Mobile (Perfect fit for mobile) */}
          <div 
            className="md:hidden w-full h-[400px] absolute inset-0 bg-gradient-to-br from-teal-600 via-sky-700 to-purple-800"
            style={{
              backgroundImage: heroImage ? `url(${heroImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              filter: heroImage ? 'brightness(0.4) contrast(1.2)' : 'none'
            }}
          ></div>        
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-900/60 via-sky-800/50 to-purple-900/60"></div>

          {/* Mobile Content - ON the image */}
          <div className="md:hidden relative z-10 max-w-4xl mx-auto px-4 text-center w-full pt-20">
            <div className="max-w-4xl mx-auto">
              {/* Main Heading - Mobile Only */}
              <h1 className="text-5xl xs:text-4xl font-bold tracking-tight text-white mb-4 drop-shadow-2xl leading-tight">
                Campus<span className="bg-gradient-to-r from-teal-300 to-purple-300 bg-clip-text text-transparent">Connect</span>
              </h1>

              {/* Subtitle - Mobile Only */}
              <p className="text-lg leading-relaxed text-gray-100 drop-shadow-lg px-2">
                🎓 Your ultimate campus companion - Discover events, earn certificates, and connect with your college community like never before!
              </p>
            </div>
          </div>

          {/* Desktop Content Only */}
          <div className="hidden md:block relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full pt-26">
            <div className="max-w-4xl mx-auto">
              {/* Main Heading - Desktop Only */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-8 drop-shadow-2xl">
                Campus<span className="bg-gradient-to-r from-teal-300 to-purple-300 bg-clip-text text-transparent">Connect</span>
              </h1>

              {/* Subtitle - Desktop Only */}
              <p className="max-w-3xl mx-auto text-xl md:text-2xl text-gray-100 mb-12 leading-relaxed drop-shadow-lg">
                🎓 Your ultimate campus companion - Discover events, earn certificates, and connect with your college community like never before!
              </p>

              {/* CTA Buttons - Desktop Only */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link
                  to="/client/events?filter=upcoming"
                  className="group relative bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-3 shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 backdrop-blur-sm"
                >
                  <i className="fas fa-rocket text-lg group-hover:scale-110 transition-transform"></i>
                  <span className="text-lg">Discover Amazing Events</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-purple-500/20 rounded-xl blur-lg"></div>
                </Link>

                {!isAuthenticated && (
                  <Link
                    to="/client/login?tab=student"
                    className="group bg-white/20 hover:bg-white/30 text-white hover:text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-3 shadow-2xl border border-white/30 hover:shadow-xl backdrop-blur-sm hover:scale-105"
                  >
                    <i className="fas fa-star text-lg group-hover:scale-110 transition-transform"></i>
                    <span className="text-lg">Join the Community</span>
                  </Link>
                )}
              </div>

              {/* University Features - Desktop Only */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-fire text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Trending Events</div>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-award text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Earn Certificates</div>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-heart text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Make Friends</div>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                    <i className="fas fa-trophy text-2xl text-white"></i>
                  </div>
                  <div className="text-sm font-semibold text-white drop-shadow-lg">Level Up Skills</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-24 bg-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-16">
            <div className="mb-8 lg:mb-0">
              <h2 className="text-4xl font-bold text-slate-800 mb-4">🔥 What's Hot This Week</h2>
              <p className="text-xl text-slate-600">Don't miss out on these epic campus experiences!</p>
            </div>
            <Link
              to="/client/events?filter=upcoming"
              className="group inline-flex items-center justify-center  px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>Show Me More! 🚀</span>
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
                upcomingEvents.map((event) => (
                  <EventCard key={event.event_id} event={event} />
                ))
              ) : (
                <div className="col-span-full">
                  <div className="text-center py-16 bg-gradient-to-br from-sky-50 to-purple-50 rounded-2xl border border-sky-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-calendar-alt text-2xl text-slate-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Nothing Happening Right Now? 🤔</h3>
                    <p className="text-slate-500 mb-6">But hey, something awesome is always just around the corner!</p>
                    <Link
                      to="/client/events"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors transform hover:scale-105 shadow-lg"
                    >
                      🔍 Explore All Events
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
              Ready to Level Up Your Campus Life? 🎯
            </h2>
            <p className="text-xl text-gray-100 mb-10 max-w-3xl mx-auto drop-shadow-lg">
              Join over 10,000+ students who've already transformed their college experience with CampusConnect! 🌟
            </p>

            {!isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/client/register"
                  className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-lg font-semibold rounded-xl hover:from-teal-600 hover:to-emerald-700 transition-all duration-200 hover:scale-105 shadow-2xl backdrop-blur-sm"
                >
                  <i className="fas fa-rocket mr-3 group-hover:scale-110 transition-transform"></i>
                  Start My Journey! 🚀
                </Link>
                <Link
                  to="/auth/login"
                  className="group inline-flex items-center px-8 py-4 bg-white/20 text-white text-lg font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30 backdrop-blur-sm hover:scale-105 shadow-xl"
                >
                  <i className="fas fa-sign-in-alt mr-3 group-hover:scale-110 transition-transform"></i>
                  I'm Already Cool 😎
                </Link>
              </div>
            ) : (
              <Link
                to="/client/dashboard"
                className="group inline-flex items-center px-8 py-4 bg-white/20 text-white text-lg font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 hover:scale-105 shadow-2xl backdrop-blur-sm border border-white/30"
              >
                <i className="fas fa-tachometer-alt mr-3 group-hover:scale-110 transition-transform"></i>
                My Awesome Dashboard 📊
              </Link>
            )}
          </div>            {/* College Event Highlights */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                <i className="fas fa-music text-2xl text-white"></i>
              </div>
              <div className="text-sm font-semibold text-white drop-shadow-lg">Epic Fests 🎪</div>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                <i className="fas fa-laptop-code text-2xl text-white"></i>
              </div>
              <div className="text-sm font-semibold text-white drop-shadow-lg">Code & Create 💻</div>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                <i className="fas fa-running text-2xl text-white"></i>
              </div>
              <div className="text-sm font-semibold text-white drop-shadow-lg">Sports Madness ⚡</div>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
                <i className="fas fa-graduation-cap text-2xl text-white"></i>
              </div>
              <div className="text-sm font-semibold text-white drop-shadow-lg">Smart Seminars 🧠</div>
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
                🚀 Your one-stop platform for unforgettable campus experiences, skill-building events, and building lifelong connections with your college crew!
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
      </footer>

      {/* Full Width Floor Typography */}
      <div className="w-screen bg-gradient-to-r from-teal-50 to-sky-50 m-0 p-0 overflow-hidden pb-20 md:pb-0">
        <div className="w-full text-center m-0 p-0 py-4 sm:py-6 md:py-8 lg:py-12">
          <h2 className="font-pacifico-brand text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] leading-tight sm:leading-tight md:leading-none m-0 p-0 w-full font-black px-2">
            <span className="text-slate-800 font-black block sm:inline" style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
            }}>CAMPUS</span>
            <span className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[15rem] bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent font-black block sm:inline" style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
            }}>CONNECT</span>
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl mt-2 sm:mt-3 md:mt-4 lg:mt-6 px-4 mb-4 sm:mb-6 md:mb-8">
            Made with ❤️ by <span className="font-semibold text-slate-800">Shivansh Ghelani</span> & Team
          </p>
        </div>
      </div>
    </div>
  );
}

export default Homepage;
