import React, { useEffect } from 'react';
import Header from './atoms/Header';
import Footer from './atoms/Footer';
import VideoPlayer from './atoms/VideoPlayer';
import PixelButton from './atoms/PixelButton';
import FeatureCard from './atoms/FeatureCard';
import GameBuildings from './atoms/GameBuildings';
import MarqueeTestimonials from './atoms/MarqueeTestimonials';
import { ArrowRight, ChevronRight } from 'lucide-react';
import LeafIcon from './icons/LeafIcon';
import CoinIcon from './icons/CoinIcon';
import EarthIcon from './icons/EarthIcon';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();
  
  // Check if the user is signed in but doesn't have a username set
  // If so, redirect them to the profile page to set one up
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const gameUsername = user.gameUsername;
      if (!gameUsername || (typeof gameUsername === 'string' && gameUsername.trim() === '')) {
        navigate('/profile');
      }
    }
  }, [isLoaded, isSignedIn, user, navigate]);
    const handleSignOut = async () => {
    await signOut();
    // Reload page after sign out
    window.location.reload();
  };

  const handleProfile = () => {
    if (!isLoaded) return;
    if (!isSignedIn) return navigate('/sign-in');
    navigate('/profile');
  };

  // Generate pixelated map image for the video thumbnail
  const mapUrl = '/UI/thumbnail.png';

  // Sample testimonials data
  const testimonials1 = [
    { quote: "Coming to the platform was the best way to learn financial literacy.", author: "Emma, 35" },
    { quote: "It's like Duolingo for personal finance. But actually fun!", author: "Steve, 23" },
    { quote: "Dhaniverse gave me a free education in money management that's better than any course I found.", author: "Raj, 19" },
    { quote: "Tried to tell my kids about investing. They ignored me. Got them Dhaniverse, now they explain it to ME!", author: "Jen, 41" }
  ];

  const testimonials2 = [
    { quote: "Why is this game better than my finance class???", author: "Priya, 19" },
    { quote: "I lost all my coins in the stock market... just not to do with real money", author: "Sammy, 24" },
    { quote: "It's like Duolingo for personal finance, but cooler!", author: "Maeve, 14" },
    { quote: "When I HODL my cash in the bank, I opened a fake FD. Then I understood interest. My bank gives better than Mu Sigma!", author: "Dr, 33" }
  ];

  // Sample buildings data
  const buildings = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `Building ${i + 1}`,
    imageSrc: mapUrl
  }));

  return (
    <div className="min-h-screen relative flex flex-col text-white bg-black">
      
      
      <Header className="sticky top-6 w-[90%] m-auto z-10" />
      
      {/* Hero section */}
      <section className="w-full pt-16 pb-12 flex flex-col items-center justify-center relative">
        <div className="max-w-6xl mx-auto w-full text-center mb-8 px-4">
          <div className="inline-block px-3 border-[2px] mt-20 mb-20 border-white/50 ">
            <p className="text-lg tracking-widest font-robert px-1 py-2 text-white/80">Learn Personal Finance with Fun</p>
          </div>
          
          <h1 className="text-3xl lg:text-6xl font-vcr mb-4 tracking-wider">
            Welcome to <span className="text-dhani-gold pixel-glow">Dhaniverse</span>
          </h1>
          
          <p className="text-lg font-robert mb-6 tracking-widest text-white/80">
            No lectures. Just quests, coins, maps, and clarity.
          </p>
          
          <VideoPlayer 
            thumbnailSrc={mapUrl} 
            videoSrc="https://www.youtube.com/embed/dQw4w9WgXcQ" 
            className="mb-6"
          />
          
          <div className="flex flex-col items-center justify-center mt-6 gap-8">
            <p className="sm:text-2xl text-xl font-vcr flex items-center">
              Your financial glow-up starts here <ChevronRight className="w-4 h-4 ml-1" /><ChevronRight className="w-4 h-4 -ml-2" />
            </p>
          
            <div className='flex gap-5'>
              {isSignedIn ? (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => navigate('/game')}>
                    Play Now
                  </PixelButton>
                  <PixelButton variant='outline' size='lg' onClick={handleProfile} className=" bg-dhani-green/80 hover:bg-dhani-green/50 text-dhani-text">Profile</PixelButton>                </>
              ) : (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => navigate('/sign-in')}>
                    Play Now
                  </PixelButton>
                  <PixelButton variant='cta' onClick={() => navigate('/sign-up')}>
                    Sign Up
                  </PixelButton>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Features section */} 
      <section className="w-full px-4 py-16 flex flex-col items-center">
        <div className="max-w-6xl mx-auto w-full text-center mb-12">
        <div className="inline-block px-3 border-[2px] mt-20 mb-20 border-white/50 ">
            <p className="text-lg tracking-widest font-robert px-1 py-2 text-white/80">Learn Personal Finance with Fun</p>
          </div>
          <h2 className="text-2xl sm:text-5xl font-vcr mb-10 tracking-wide">What Makes <span className="text-dhani-gold pixel-glow">Dhaniverse</span> Different?</h2>
        </div>
        
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="overflow-hidden">
            <img src="/UI/whatMakesDifference.png" alt="Dhaniverse Map" className="w-full h-auto" />
          </div>
          
          <div className="space-y-6">
            <FeatureCard 
              icon={<LeafIcon className="w-6 h-6" />}
              title="No mental stress — just fun."
              description="Learn through games, not lectures. Financial education that's actually enjoyable."
            />
            
            <FeatureCard 
              icon={<CoinIcon className="w-6 h-6" />}
              iconBg="bg-black"
              title="Gamify currency, real lessons"
              description="Earn in-game coins & level up while learning real-world money skills."
            />
            
            <FeatureCard 
              icon={<EarthIcon className="w-6 h-6" />}
              title="Ethical, real-world adventure"
              description="No ads. Just fun quests that teach real financial wisdom."
            />
          </div>
        </div>
      </section>
      
      {/* Game world section */}
      <section className="w-full px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="section-title-border mb-1">
            <p className="text-md md:text-xl lg:text-2xl text-center font-vcr text-white/80">Buildings that teaches you the real use of money</p>
          </div>
          
          <div className="relative bg-black/30 p-6">
            <img src="/UI/buildingsThatTeach.svg" alt="" />
            
            <div className="mt-8 absolute bottom-16 left-16 w-full flex items-center justify-between">
              <p className="text-sm md:text-xl lg:text-2xl font-vcr">
                Explore a full-on financial world.<br/>
                Where every quest = a life skill.
              </p>
              <div className="p-2 absolute right-32 bottom-0 rounded-full text-dhani-green ml-auto">
                <ArrowRight className="w-6 h-6 md:w-9 md:h-9 lg:w-12 lg:h-12" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials section with marquee */}
      <section className="w-full relative m-auto py-16 ">
        <div className="w-[150px] h-[150px] lg:w-[350px] lg:h-[350px] -translate-y-1/2 absolute top-0 left-0 bg-dhani-gold/60 blur-[400px]" />
        <div className=" mx-auto px-4 mb-8">
          <h2 className="text-3xl md:text-5xl font-vcr mb-8 text-center">What Players Say?</h2>
        </div>
        
        <div className="mb-4">
          <MarqueeTestimonials testimonials={testimonials1} direction="left" speed={40} />
        </div>
        
        <div className="mb-16">
          <MarqueeTestimonials testimonials={testimonials2} direction="right" speed={30} />
        </div>
      </section>
      <section className='w-full relative md:mb-32 mb-16'>
        <div className="w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] -translate-y-1/2 absolute top-0 left-0 bg-dhani-gold/60 blur-[400px]" />
        <div className="w-[350px] h-[350px] lg:w-[500px] lg:h-[500px] translate-y-1/2 absolute bottom-0 right-0 bg-dhani-gold/60 blur-[400px]" />
        <div className="mx-5 px-4 py-12 bg-[url('/UI/cta.svg')] bg-center bg-no-repeat bg-contain">
          <div className="mx-auto m-16 text-center">
            <div className="inline-block px-3 border-[2px] mb-20 border-white/50 ">
              <p className="text-sm md:text-lg tracking-widest font-robert px-1 py-2 text-white/80">Dont you have to make good finance decisions?</p>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-vcr mb-6">Just Start Playing already!</h2>
            <p className="text-lg font-robert mb-8 tracking-widest text-white/80">No lectures. Just quests, coins, maps, and clarity.</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {isSignedIn ? (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => navigate('/game')}>Play Now</PixelButton>
                  <PixelButton variant='outline' size='lg' onClick={handleProfile} className=" bg-dhani-green/80 hover:bg-dhani-green/50 text-dhani-text">Profile</PixelButton>
                </>
              ) : (
                <>
                  <PixelButton size="lg" className="hover:bg-dhani-gold/50" onClick={() => navigate('/sign-in')}>Play Now</PixelButton>
                  <PixelButton variant='cta' onClick={() => navigate('/sign-up')}>Sign Up</PixelButton>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default LandingPage;