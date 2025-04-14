
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCard from './GameCard';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface GameBuildingsProps {
  buildings: { id: number; name: string; imageSrc: string; }[];
  className?: string;
}

const GameBuildings = ({ buildings, className }: GameBuildingsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show first 4 buildings when collapsed, all when expanded
  const visibleBuildings = isExpanded ? buildings : buildings.slice(0, 4);
  
  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {visibleBuildings.map((building) => (
          <GameCard 
            key={building.id} 
            imageSrc={building.imageSrc} 
            altText={`Game building ${building.name}`}
          />
        ))}
      </div>
      
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-black/30 p-4 pixel-corners group hover:bg-black/40 transition-colors"
      >
        <h3 className="text-sm sm:text-base font-vcr">
          Explore a full-on financial world.<br/>
          Where every quest = a life skill.
        </h3>
        <div className="flex flex-col items-center text-dhani-gold">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {isExpanded ? (
              <ChevronUp className="w-6 h-6" />
            ) : (
              <ChevronDown className="w-6 h-6" />
            )}
          </motion.div>
          <span className="text-xs mt-1">{isExpanded ? 'Show Less' : 'Show More'}</span>
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {buildings.slice(4).map((building) => (
                <GameCard 
                  key={building.id} 
                  imageSrc={building.imageSrc} 
                  altText={`Game building ${building.name}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameBuildings;
