import React from 'react';
import Header from './atoms/Header';
import Footer from './atoms/Footer';
import VideoPlayer from './atoms/VideoPlayer';
import PixelButton from './atoms/PixelButton';
import FeatureCard from './atoms/FeatureCard';
import GameBuildings from './atoms/GameBuildings';
import MarqueeTestimonials from './atoms/MarqueeTestimonials';
import { ArrowRight } from 'lucide-react';
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
  const buildings = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Building ${i + 1}`,
    imageSrc: mapUrl
  }));

  const handleJoin = () => {
    if (username.trim().length >= 3) {
      setError('');
      // Store username in localStorage for persistence
      localStorage.setItem('dhaniverse_username', username.trim());
      
      // Store room code in localStorage if provided
      if (roomCode.trim()) {
        localStorage.setItem('dhaniverse_room_code', roomCode.trim());
      }
      
      // Navigate to the game page without username in URL
      navigate('/game');
    } else {
      setError('Username must be at least 3 characters long');
    }
  };
  
  return (
    <div className="min-h-screen relative flex flex-col text-white">
      {/* Gradient eclipse background */}
      <div className="gradient-eclipse"></div>
      {/* <div className="gradient-overlay"></div> */}
      
      <Header className="sticky top-3 w-[90%] m-auto z-10" />
      
      {/* Hero section */}
      <section className="w-full pt-24 pb-12 flex flex-col items-center justify-center">
        <div className="max-w-4xl mx-auto w-full text-center mb-8 px-4">
          <p className="text-xs font-vcr mb-6 text-white/80">Learn Personal Finance with Fun</p>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-vcr mb-3 scanlines">
            Welcome to <span className="text-dhani-gold pixel-glow">Dhaniverse</span>
          </h1>
          
          <p className="text-lg font-vcr mb-8 text-white/80">
            No lectures. Just quests, coins, maps, and clarity.
          </p>
          
          <VideoPlayer 
            thumbnailSrc={mapUrl} 
            videoSrc="https://www.youtube.com/embed/dQw4w9WgXcQ" 
            className="mb-6"
          />
          
          <div className="flex items-center justify-center mt-4">
            <p className="text-lg font-vcr flex items-center">
              Your financial glow-up starts here Arro
            </p>
          </div>
          
          <div className="mt-8">
            <PixelButton onClick={() => setShowJoinForm(true)}>
              Play Now
            </PixelButton>
          </div>
        </div>
      </section>
      
      {/* Join form modal */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="join-container pixeloid">
            <h2>Enter Dhaniverse</h2>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username" 
              maxLength={15}
              autoFocus
              className="pixeloid"
            />
            <input 
              type="text" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Room Code (optional)" 
              maxLength={10}
              className="pixeloid mt-3"
            />
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button type="button" onClick={() => setShowJoinForm(false)} className="back-button">
                Back
              </button>
              <button type="submit" onClick={handleJoin} className="join-button">
                Join Game
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Features section */}
      <section className="w-full px-4 py-16 flex flex-col items-center">
        <div className="max-w-4xl mx-auto w-full text-center mb-12 ">
          <p className="text-md font-vcr mb-6 text-white/80 border-white border w-max m-auto p-3">Learn Personal Finance with Fun</p>
          <h2 className="text-2xl sm:text-3xl font-vcr mb-10 scanlines">What Makes Dhaniverse Different?</h2>
        </div>
        
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="pixel-corners overflow-hidden border-2 border-dhani-gold">
            <img src={mapUrl} alt="Dhaniverse Map" className="w-full h-auto" />
          </div>
          
          <div className="space-y-4">
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
          <p className="text-xs font-vcr mb-6 text-white/80">Buildings that teaches you the real use of money</p>
          
          <div className="relative">
            <GameBuildings buildings={buildings} />
          </div>
        </div>
      </section>
      
      {/* Testimonials section with marquee */}
      <section className="w-full py-16 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-vcr mb-8 text-center scanlines">What Players Say?</h2>
        </div>
        
        <div className="mb-8">
          <MarqueeTestimonials testimonials={testimonials1} direction="left" />
        </div>
        
        <div>
          <MarqueeTestimonials testimonials={testimonials2} direction="right" speed={30} />
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default LandingPage;