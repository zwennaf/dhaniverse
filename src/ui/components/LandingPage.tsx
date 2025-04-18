import React from 'react';
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

const LandingPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [roomCode, setRoomCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [showJoinForm, setShowJoinForm] = React.useState(false);
  
  // Generate pixelated map image for the video thumbnail
  const mapUrl = '/UI/thumbnail.png'; // Path to your existing map image
  
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

  const handleJoin = () => {
    if (username.trim().length >= 3) {
      setError('');
      localStorage.setItem('dhaniverse_username', username.trim());
      
      if (roomCode.trim()) {
        localStorage.setItem('dhaniverse_room_code', roomCode.trim());
      }
      
      navigate('/game');
    } else {
      setError('Username must be at least 3 characters long');
    }
  };
  
  return (
    <div className="min-h-screen relative flex flex-col text-white bg-black">
      {/* <div className="gradient-overlay z-[]"></div> */}
      
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
          
          <div className="flex items-center justify-center mt-6 mb-8">
            <p className="sm:text-2xl text-xl font-vcr flex items-center">
              Your financial glow-up starts here <ChevronRight className="w-4 h-4 ml-1" /><ChevronRight className="w-4 h-4 -ml-2" />
            </p>
          </div>
          
          <div>
            <PixelButton size="lg" onClick={() => setShowJoinForm(true)}>
              Play Now
            </PixelButton>
          </div>
        </div>
      </section>
      
      {/* Join form modal */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="pixel-corners bg-black/80 p-6 max-w-md w-full">
            <h2 className="text-xl font-vcr mb-6 text-center">Enter Dhaniverse</h2>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username" 
              maxLength={15}
              autoFocus
              className="w-full bg-black/50 border border-dhani-gold text-white p-3 mb-4 font-vcr text-sm"
            />
            <input 
              type="text" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Room Code (optional)" 
              maxLength={10}
              className="w-full bg-black/50 border border-dhani-gold text-white p-3 mb-4 font-vcr text-sm"
            />
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            <div className="flex justify-between gap-4">
              <PixelButton variant="outline" onClick={() => setShowJoinForm(false)}>
                Back
              </PixelButton>
              <PixelButton onClick={handleJoin}>
                Join Game
              </PixelButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Features section */}
      <section className="w-full px-4 py-16 flex flex-col items-center">
        <div className="max-w-6xl mx-auto w-full text-center mb-12">
        <div className="inline-block px-3 border-[2px] mt-20 mb-20 border-white/50 ">
            <p className="text-lg tracking-widest font-robert px-1 py-2 text-white/80">Learn Personal Finance with Fun</p>
          </div>
          <h2 className="text-2xl sm:text-5xl font-vcr mb-10 tracking-wide">What Makes <span className="text-dhani-gold pixel-glow">Dhaniverse</span> Different?</h2>
        </div>
        
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="pixel-corners overflow-hidden border-2 border-dhani-gold">
            <img src={mapUrl} alt="Dhaniverse Map" className="w-full h-auto" />
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
        <div className="max-w-4xl mx-auto">
          <div className="section-title-border mb-8">
            <p className="text-xs font-vcr text-white/80">Buildings that teaches you the real use of money</p>
          </div>
          
          <div className="relative mt-8 pixel-corners bg-black/30 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {buildings.map((building) => (
                <div key={building.id} className="pixel-corners overflow-hidden border border-dhani-gold/50">
                  <img src={building.imageSrc} alt={building.name} className="w-full h-auto" />
                </div>
              ))}
            </div>
            
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm font-vcr">
                Explore a full-on financial world.<br/>
                Where every quest = a life skill.
              </p>
              <div className="bg-black/40 p-2 rounded-full text-dhani-gold">
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials section with marquee */}
      <section className="w-full py-16 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <h2 className="text-2xl font-vcr mb-8 text-center">What Players Say?</h2>
        </div>
        
        <div className="mb-8">
          <MarqueeTestimonials testimonials={testimonials1} direction="left" speed={40} />
        </div>
        
        <div className="mb-16">
          <MarqueeTestimonials testimonials={testimonials2} direction="right" speed={30} />
        </div>
      </section>
      
      {/* CTA section before footer */}
      <section className="w-full px-4 py-12 mb-12">
        <div className="max-w-3xl mx-auto pixel-corners bg-black/70 p-8 text-center">
          <p className="text-sm font-vcr mb-4 text-white/80">Don't you have to make good finance decisions?</p>
          <h2 className="text-2xl font-vcr mb-6">Just Start Playing already!</h2>
          <p className="text-sm font-vcr mb-8 text-white/80">No lectures. Just quests, coins, maps, and clarity.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PixelButton size="lg" onClick={() => setShowJoinForm(true)}>Play Now</PixelButton>
            <PixelButton variant="outline">Sign in</PixelButton>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default LandingPage;