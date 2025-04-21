import React from 'react';
import { cn } from '../lib/utils';
import { ArrowRight } from 'lucide-react';
import PixelButton from '../atoms/PixelButton';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  return (
    <footer className={cn("w-full pt-8 flex flex-col", className)}>

      {/* Actual footer with background */}
      <div className="w-full bg-[#37352D]/70 relative pt-10 pb-8 lg:pb-12 text-dhani-text px-6 overflow-hidden">
        {/* Background rectangles */}
        {/* <div className="absolute top-0 left-0 w-[29px] h-[29px] bg-black"></div>
        <div className="absolute top-[14px] left-[16px] w-[29px] h-[29px] bg-black"></div>
        <div className="absolute top-[10px] left-[-76px] w-[107px] h-[33px] bg-black"></div>
        <div className="absolute top-[29px] left-[-76px] w-[102px] h-[29px] bg-black"></div>
         */}
        <div className="max-w-6xl relative z-[10] mx-auto w-full flex flex-row text-lg justify-between items-center font-thin tracking-widest mb-12">
          <div className="flex justify-center items-center">
            <p className="font-vcr">© Dhaniverse</p>
          </div>
          <div className="flex gap-6">
            <Link to="https://linkedin.com/in/gursimrxnsingh" className=" hover:text-dhani-gold transition-colors">Gursimran Singh</Link>
            <a href="#" className="hover:text-dhani-gold transition-colors">Jashanjot Singh</a>
            <a href="#" className="hover:text-dhani-gold transition-colors">Aagam Jain</a>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto w-full flex flex-col items-center">
          <div className=" text-dhani-gold lg:-mb-[5rem] lg:tracking-[5rem] tracking-[4rem] text-lg font-vcr">
            PRESENTS
          </div>
          <div className="filter text-[10rem] drop-shadow-[4px_3px_0_rgba(205,171,31,1)] lg:drop-shadow-[8px_3px_0_rgba(205,171,31,1)] -mt-28 lg:-mt-16 lg:text-[16rem] translate-y-[50px] -mb-16 lg:-mb-32 text-gray-400">
            DHANIVERSE
          </div>
        </div>
      </div>
        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-b from-transparent to-black/50 pointer-events-none" />

    </footer>
  );
};

export default Footer;
