
import React from 'react';
import { cn } from '../lib/utils';
import { ArrowRight } from 'lucide-react';
import PixelButton from '../atoms/PixelButton';

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  return (
    <footer className={cn("w-full py-8 flex flex-col", className)}>
      {/* CTA section above footer */}
      <div className="max-w-3xl w-full mx-auto mb-12 bg-black/70 p-8 pixel-corners relative">
        <p className="text-sm font-vcr mb-4 text-white/80 text-center">Dont you have to make good finance decisions?</p>
        
        <h2 className="text-2xl sm:text-3xl font-vcr mb-6 text-center">Just Start Playing already!</h2>
        
        <p className="text-sm font-vcr mb-8 text-white/80 text-center">No lectures. Just quests, coins, maps, and clarity.</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <PixelButton className="bg-dhani-gold hover:bg-amber-500">Play now</PixelButton>
          <PixelButton variant="outline">Sign in</PixelButton>
        </div>
      </div>

      {/* Actual footer with background */}
      <div className="w-full bg-[#37352D]/70 relative py-10 px-6 overflow-hidden">
        {/* Background rectangles */}
        <div className="absolute top-0 left-0 w-[29px] h-[29px] bg-black"></div>
        <div className="absolute top-[14px] left-[16px] w-[29px] h-[29px] bg-black"></div>
        <div className="absolute top-[10px] left-[-76px] w-[107px] h-[33px] bg-black"></div>
        <div className="absolute top-[29px] left-[-76px] w-[102px] h-[29px] bg-black"></div>
        
        <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row justify-between items-center text-white/50 text-xs mb-12">
          <div className="mb-4 md:mb-0">
            <p className="font-vcr">© Dhaniverse</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="font-vcr hover:text-dhani-gold transition-colors">Overview</a>
            <a href="#" className="font-vcr hover:text-dhani-gold transition-colors">Gameplay</a>
            <a href="#" className="font-vcr hover:text-dhani-gold transition-colors">Roadmap</a>
            <a href="#" className="font-vcr hover:text-dhani-gold transition-colors">Advisors</a>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto w-full flex flex-col items-center">
          <div className="tracking-[1rem] text-dhani-gold text-sm mb-4 font-vcr">
            PRESENTS
          </div>
          <div className="filter drop-shadow-[5px_1px_0_rgba(205,171,31,1)] text-6xl font-vcr text-gray-400 pb-2">
            DHANIVERSE
          </div>
        </div>
      </div>

      {/* Pixelated logo banner at the bottom */}
      <div className="h-8 w-full bg-dhani-gold flex items-center justify-center">
        <h3 className="font-vcr text-black text-xl">DHANIVERSE</h3>
      </div>
    </footer>
  );
};

export default Footer;
