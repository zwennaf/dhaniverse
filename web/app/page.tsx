"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

import Header from './atoms/Header';
import Footer from './atoms/Footer';
import PixelButton from './atoms/PixelButton';
import FeatureCard from './atoms/FeatureCard';
import ScrollVelocityTestimonials from './atoms/ScrollVelocityTestimonials';
import RevealOnScroll from './atoms/RevealOnScroll';
import VideoPlayer from './atoms/VideoPlayer';
import GlobalIntro from './atoms/GlobalIntro';
import SEO from './SEO';

import { ArrowRight, ChevronRight } from 'lucide-react';
import LeafIcon from './icons/LeafIcon';
import EarthIcon from './icons/EarthIcon';
import { CoinIcon2 } from './icons/CoinIcon2';

import analytics from './utils/analytics';
import { useSimpleAuth } from './hooks/useSimpleAuth';
import { 
  navigateToGame, 
  navigateToSignIn, 
  navigateToSignUp, 
  navigateToProfile,
  navigationUrls 
} from './utils/navigation';

const TIMING = {
  overlay: 0.15,
  hero: 0.8,
  subtext: 0.6,
  ctas: 0.7,
  video: 0.7,
};

const HEADER_HOLD_MS = 500;
const HEADER_MOVE_MS = 600;
const HEADER_TOTAL_S = (HEADER_HOLD_MS + HEADER_MOVE_MS) / 1000;

const LandingPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoaded, isSignedIn, signOut, refreshSession } = useSimpleAuth();

  const [showOverlay, setShowOverlay] = useState(true);
  const [headerAnimationDone, setHeaderAnimationDone] = useState(false);
  const [showHero, setShowHero] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showCTAs, setShowCTAs] = useState(false);

  useEffect(() => {
    const hide = () => setShowOverlay(false);
    window.addEventListener('introAnimationComplete', hide, { once: true });
    const timeout = setTimeout(hide, 4500);
    return () => {
      window.removeEventListener('introAnimationComplete', hide);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handler = () => setHeaderAnimationDone(true);
    window.addEventListener('introAnimationComplete', handler, { once: true });
    return () => window.removeEventListener('introAnimationComplete', handler);
  }, []);

  useEffect(() => {
    if (!headerAnimationDone) return;
    const t1 = setTimeout(() => setShowHero(true), 120);
    const t2 = setTimeout(() => setShowSubtext(true), 360);
    const t3 = setTimeout(() => setShowVideo(true), 640);
    const t4 = setTimeout(() => setShowCTAs(true), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [headerAnimationDone]);

  useEffect(() => {
    analytics.trackLandingPageView?.();
  }, []);

  const handlePlayGame = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      analytics.trackSignInIntent?.();
      navigateToSignIn();
      return;
    }
    analytics.trackGameStart?.();
    navigateToGame();
  };

  const handleSignUp = () => {
    analytics.trackSignUpIntent?.();
    navigateToSignUp();
  };

  const handleProfile = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      navigateToSignIn();
      return;
    }
    navigateToProfile();
  };

  const handleSignOut = async () => {
    try {
      await signOut?.();
      // refresh session state after sign out (in case cookie was cleared server-side)
      await refreshSession?.();
      analytics.trackSignOut?.('user_clicked_signout');
    } catch (e) {
      console.warn('Sign out failed', e);
    }
  };

  const mapUrl = '/UI/thumbnail.png';

  const testimonials1 = [
    { quote: 'Coming to the platform was the best way to learn financial literacy.', author: 'Emma, 35' },
    { quote: "It's like Duolingo for personal finance. But actually fun!", author: 'Steve, 23' },
    { quote: "Dhaniverse gave me a free education in money management that's better than any course I found.", author: 'Raj, 19' },
  ];

  const testimonials2 = [
    { quote: 'Why is this game better than my finance class???', author: 'Priya, 19' },
    { quote: 'I lost all my coins in the stock market... just not to do with real money', author: 'Sammy, 24' },
    { quote: "It's like Duolingo for personal finance, but cooler!", author: 'Maeve, 14' },
  ];

  const heroVariants: Record<string, any> = {
    hidden: { opacity: 0, filter: 'blur(14px)', y: 60 },
    show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: TIMING.hero, easing: [0.16, 1, 0.3, 1], delay: headerAnimationDone ? 0.3 : HEADER_TOTAL_S + 0.2 } },
  };

  const subtextVariants: Record<string, any> = {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 40 },
    show: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: TIMING.subtext, easing: [0.16, 1, 0.3, 1], delay: headerAnimationDone ? 0.6 : HEADER_TOTAL_S + 0.5 } },
  };

  const ctaVariants: Record<string, any> = {
    hidden: { opacity: 0, scale: 0.85, filter: 'blur(6px)' },
    show: { opacity: 1, scale: [0.85, 1.03, 1], filter: 'blur(0px)', transition: { duration: TIMING.ctas, easing: [0.16, 1, 0.3, 1], delay: headerAnimationDone ? 0.9 : HEADER_TOTAL_S + 0.8 } },
  };

  const videoVariants: Record<string, any> = {
    hidden: { opacity: 0, scale: 0.85, filter: 'blur(14px)' },
    show: { opacity: 1, scale: [0.85, 1.02, 1], filter: 'blur(0px)', transition: { duration: TIMING.video, easing: [0.16, 1, 0.3, 1], delay: headerAnimationDone ? 1.0 : HEADER_TOTAL_S + 0.9 } },
  };

  return (
    <div className="min-h-screen relative flex flex-col text-white bg-black">
      <SEO 
        title="Dhaniverse - Learn Finance Through Gaming | Financial Literacy Game"
        description="Master money management through India's first financial literacy RPG game. Learn investing, budgeting & personal finance skills. Free to play, built for Gen Z & millennials."
        keywords="dhaniverse, financial literacy game, money management game, investing game, budgeting game, personal finance education, financial RPG, stock market simulator, Gen Z finance, millennial finance, gamified learning, financial education India, learn finance through gaming, money skills game, investment simulator, budget simulator, financial planning game, wealth building game, banking simulation, financial wisdom, money management skills, personal finance app, financial learning platform, interactive finance education"
        url="https://dhaniverse.in/"
        type="website"
      />

      <GlobalIntro />

      <div className="sticky top-6 w-full z-40 header-wrapper">
        <Header className="w-[90%] m-auto" />
      </div>

      {/* Black overlay with blur in */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className="fixed inset-0 bg-black z-50"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
      
      {/* Hero section */}
      <section className="w-full pt-16 pb-12 flex flex-col items-center justify-center relative">
        <div className="max-w-6xl mx-auto w-full text-center mb-8 px-4">
          <motion.div
            variants={heroVariants}
            initial="hidden"
            animate={showHero ? 'show' : 'hidden'}
            className="inline-block px-3 border-[2px] mt-20 mb-20 border-white/50 "
          >
            <p className="text-lg tracking-widest font-robert px-1 py-2 text-white/80">Learn Personal Finance with Fun</p>
          </motion.div>
          
          <motion.h1
            variants={heroVariants}
            initial="hidden"
            animate={showHero ? 'show' : 'hidden'}
            className="text-3xl lg:text-6xl font-vcr mb-4 tracking-wider"
          >
            Welcome to <span className="text-dhani-gold pixel-glow">Dhaniverse</span>
          </motion.h1>
          
          <motion.p
            variants={subtextVariants}
            initial="hidden"
            animate={showSubtext ? 'show' : 'hidden'}
            className="text-lg font-robert mb-6 tracking-widest text-white/80"
          >
            No lectures. Just quests, coins, maps, and clarity.
          </motion.p>
          
          <motion.div
            variants={videoVariants}
            initial="hidden"
            animate={showVideo ? 'show' : 'hidden'}
            className="mb-6"
          >
            <VideoPlayer
              thumbnailSrc={mapUrl} 
              videoSrc="https://www.youtube.com/embed/6wBJPf9ul8E" 
            />
          </motion.div>
          
          <motion.div
            variants={heroVariants}
            initial="hidden"
            animate={showHero ? 'show' : 'hidden'}
            className="flex flex-col items-center justify-center mt-6 gap-8"
          >
            <motion.p className="sm:text-2xl text-xl font-vcr flex items-center" variants={subtextVariants}>
              Your financial glow-up starts here <ChevronRight className="w-4 h-4 ml-1" /><ChevronRight className="w-4 h-4 -ml-2" />
            </motion.p>
          
            <motion.div
              className='flex flex-col sm:flex-row gap-3 sm:gap-5'
              variants={ctaVariants}
              initial="hidden"
              animate={showCTAs ? 'show' : 'hidden'}
            >
              {isSignedIn ? (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => {
                    analytics.trackGameStart();
                    navigateToGame();
                  }}>
                    Play Game
                  </PixelButton>
                  <PixelButton variant='outline' size='lg' className="bg-dhani-green/80 hover:bg-dhani-green/50 text-dhani-text" onClick={handleProfile}>
                    My Profile
                  </PixelButton>
                </>
              ) : (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => {
                    analytics.trackSignInIntent();
                    navigateToSignIn();
                  }}>
                    Play Now
                  </PixelButton>
                  <PixelButton variant='cta' onClick={() => {
                    analytics.trackSignUpIntent();
                    navigateToSignUp();
                  }}>
                    Create Free Account
                  </PixelButton>
                </>
              )}
            </motion.div>
            
            {/* Internal Navigation Links */}
            <motion.div
              className="mt-8 flex flex-wrap justify-center gap-4 text-sm"
              variants={subtextVariants}
              initial="hidden"
              animate="show"
            >
              <a href="/game" className="text-dhani-gold hover:text-dhani-gold/80 underline">Financial RPG Game</a>
              <span className="text-white/40">•</span>
              <a href="/sign-up" className="text-white/70 hover:text-white underline">Create Account</a>
              <span className="text-white/40">•</span>
              <a href="/sign-in" className="text-white/70 hover:text-white underline">Sign In</a>
              <span className="text-white/40">•</span>
              <a href="#features" className="text-white/70 hover:text-white underline">Features</a>
              <span className="text-white/40">•</span>
              <a href="#testimonials" className="text-white/70 hover:text-white underline">Reviews</a>
            </motion.div>
          </motion.div>
        </div>
      </section>
        {/* Features section */} 
      <section id="features" className="w-full px-4 py-8 md:py-16 flex flex-col items-center">
        <RevealOnScroll className="max-w-6xl mx-auto w-full text-center mb-8 md:mb-12">
          <div className="inline-block px-3 border-[2px] mt-10 md:mt-20 mb-10 md:mb-20 border-white/50">
            <p className="text-sm md:text-lg tracking-widest font-robert px-1 py-2 text-white/80">Learn Personal Finance with Fun</p>
          </div>
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-vcr mb-6 md:mb-10 tracking-wide px-2">
            What Makes <span className="text-dhani-gold pixel-glow">Dhaniverse</span> Different?
          </h2>
        </RevealOnScroll>
        <div className="max-w-6xl mx-auto w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-start">
          <RevealOnScroll className="overflow-hidden order-2 lg:order-1" delay={0.1}>
            <img src="/UI/whatMakesDifference.png" alt="Dhaniverse Map" className="w-full h-auto" />
          </RevealOnScroll>
          <div className="space-y-1 sm:space-y-2 md:space-y-3 lg:space-y-4 order-1 lg:order-2 flex flex-col justify-center lg:justify-start">
            <RevealOnScroll delay={0.05}>
              <FeatureCard 
                icon={<LeafIcon />}
                title="No mental stress — just clarity."
                description="Learn through gameplay, not lectures. No trauma. No pressure. Just understanding."
              />
            </RevealOnScroll>
            <RevealOnScroll delay={0.15}>
              <FeatureCard 
                icon={<CoinIcon2 />}
                title="Dummy currency, real skills."
                description="Earn in-game coins & level up while learning real-world money skills."
              />
            </RevealOnScroll>
            <RevealOnScroll delay={0.25}>
              <FeatureCard 
                icon={<EarthIcon />}
                title="Ethical, real-world adventure"
                description="No ads. Just fun quests that teach real financial wisdom."
              />
            </RevealOnScroll>
          </div>
        </div>
      </section>
      
      {/* Game world section */}
      <section className="w-full px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll className="section-title-border mb-1">
            <p className="text-md md:text-xl lg:text-2xl text-center font-vcr text-white/80">Buildings that teaches you the real use of money</p>
          </RevealOnScroll>
          <RevealOnScroll className="relative bg-black/30 p-6" delay={0.15}>
            <img src="/UI/buildingsThatTeach.svg" alt="Buildings that teach" />
            <div className="mt-8 absolute bottom-16 left-16 w-full flex items-center justify-between">
              <p className="text-sm md:text-xl lg:text-2xl font-vcr">
                Explore a full-on financial world.<br/>
                Where every quest = a life skill.
              </p>
              <div className="p-2 absolute right-32 bottom-0 rounded-full text-dhani-green ml-auto">
                <ArrowRight className="w-6 h-6 md:w-9 md:h-9 lg:w-12 lg:h-12" />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>
      
      {/* Testimonials section with marquee */}
      <section id="testimonials" className="w-full relative m-auto py-16 ">
        <div className="w-[150px] h-[150px] lg:w-[350px] lg:h-[350px] -translate-y-1/2 absolute top-0 left-0 bg-dhani-gold/60 blur-[400px]" />
        <RevealOnScroll className=" mx-auto px-4 mb-8">
          <h2 className="text-3xl md:text-5xl font-vcr mb-8 text-center">What Players Say?</h2>
        </RevealOnScroll>
        <RevealOnScroll className="mb-4" delay={0.1}>
          <ScrollVelocityTestimonials 
            testimonials={testimonials1} 
            baseVelocity={-50}
            damping={50}
            stiffness={400}
            numCopies={4}
            velocityMapping={{ input: [0, 1000], output: [0, 3] }}
          />
        </RevealOnScroll>
        <RevealOnScroll className="mb-16" delay={0.2}>
          <ScrollVelocityTestimonials 
            testimonials={testimonials2} 
            baseVelocity={50}
            damping={60}
            stiffness={350}
            numCopies={4}
            velocityMapping={{ input: [0, 1000], output: [0, 4] }}
          />
        </RevealOnScroll>
      </section>
      <section className='w-full relative md:mb-32 mb-16'>
        <div className="w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] -translate-y-1/2 absolute top-0 left-0 bg-dhani-gold/60 blur-[400px]" />
        <div className="w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] translate-y-1/2 absolute bottom-0 right-0 bg-dhani-gold/60 blur-[400px]" />
  <RevealOnScroll className="max-w-6xl mx-auto px-2 sm:px-5 py-8 sm:py-12 relative" offsetY={60}>
          <div 
            className="mx-auto text-center relative p-4 sm:p-8 md:p-12 lg:p-16"
            style={{
              backgroundImage: `url("data:image/svg+xml;base64,${btoa(`<svg width="100%" height="100%" viewBox="0 0 1201 602" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M1187 15L1170 15V0H35V15L18 15L18 45L0 45V553H18V583H35V602H1170V583H1187V553H1201V45H1187V15Z" fill="white" fill-opacity="0.1"/>
                <path d="M1170 15H1169V16H1170V15ZM1187 15H1188V14H1187V15ZM1170 0H1171V-1H1170V0ZM35 0V-1H34V0H35ZM35 15V16H36V15H35ZM18 15V14H17V15H18ZM18 45V46H19V45H18ZM0 45L-2.11928e-07 44H-1V45H0ZM0 553H-1V554H0V553ZM18 553H19V552H18V553ZM18 583H17V584H18V583ZM35 583H36V582H35V583ZM35 602H34V603H35V602ZM1170 602V603H1171V602H1170ZM1170 583V582H1169V583H1170ZM1187 583V584H1188V583H1187ZM1187 553V552H1186V553H1187ZM1201 553V554H1202V553H1201ZM1201 45H1202V44H1201V45ZM1187 45H1186V46H1187V45Z" fill="white" fill-opacity="0.2"/>
              </svg>`)}")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: '100% 100%',
              minHeight: '300px',
            }}
          >
            <div className="inline-block px-2 sm:px-3 border-[2px] mb-8 sm:mb-12 md:mb-20 border-white/50 ">
              <p className="text-xs sm:text-sm md:text-lg tracking-widest font-robert px-1 py-2 text-white/80">Dont you have to make good finance decisions?</p>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-vcr mb-4 sm:mb-6 px-2">Just Start Playing already!</h2>
            <p className="text-sm sm:text-lg font-robert mb-6 sm:mb-8 tracking-widest text-white/80 px-2">No lectures. Just quests, coins, maps, and clarity.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
              {isSignedIn ? (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => navigateToGame()}>Play Now</PixelButton>
                  <PixelButton variant='outline' size='lg' className="bg-dhani-green/80 hover:bg-dhani-green/50 text-dhani-text" onClick={handleProfile}>Profile</PixelButton>
                </>
              ) : (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => navigateToSignIn()}>Play Now</PixelButton>
                  <PixelButton variant='cta' onClick={() => navigateToSignUp()}>Sign Up</PixelButton>
                </>
              )}
            </div>
          </div>
        </RevealOnScroll>
      </section>
      <Footer />
    </div>
  );
};

export default LandingPage;
