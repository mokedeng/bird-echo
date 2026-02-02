import React from 'react';
import { Icons } from '../components/Icons';

interface HomeScreenProps {
  onRecordStart: () => void;
}

const RecentDiscovery: React.FC<{ name: string; image: string }> = ({ name, image }) => (
  <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer hover:opacity-80 transition-opacity">
    <div 
      className="w-16 h-16 rounded-full border-2 border-white shadow-md bg-cover bg-center"
      style={{ backgroundImage: `url(${image})` }}
    />
    <p className="text-dark text-[13px] font-medium">{name}</p>
  </div>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({ onRecordStart }) => {
  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-blue-50 to-[#f1f8e9]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <button className="p-3 bg-white/40 backdrop-blur-md rounded-full hover:bg-white/60 transition">
          <Icons.Menu className="text-dark" size={24} />
        </button>
        <h1 className="text-lg font-bold text-dark">BirdEcho</h1>
        <button className="p-3 bg-white/40 backdrop-blur-md rounded-full hover:bg-white/60 transition">
          <Icons.User className="text-dark" size={24} />
        </button>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-10 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-dark leading-tight max-w-[280px]">
          Listen to the birds around you
        </h2>
        <p className="text-dark/60 mt-3 text-base">Identify songs in seconds</p>

        {/* Record Button Area */}
        <div className="relative mt-12 mb-8 group">
          {/* Pulse Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-primary/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-primary/30 rounded-full" />
          
          {/* Glow */}
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
          
          <button 
            onClick={onRecordStart}
            className="relative flex flex-col items-center justify-center w-48 h-48 bg-primary rounded-full shadow-2xl shadow-primary/40 active:scale-95 transition-all duration-300 z-10 hover:bg-primary-dark"
          >
            <Icons.Mic size={48} className="text-dark mb-2" strokeWidth={1.5} />
            <span className="text-lg font-bold text-dark">Record</span>
          </button>
        </div>
        
        <p className="text-sm font-semibold tracking-widest text-dark/40 uppercase">Tap to start</p>
      </div>

      {/* Recent Discoveries Sheet */}
      <div className="bg-white/60 backdrop-blur-xl rounded-t-[2.5rem] pt-6 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="px-6 flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-dark">Recent Discoveries</h3>
          <button className="text-primary-dark text-sm font-semibold hover:underline">See all</button>
        </div>
        
        <div className="flex overflow-x-auto no-scrollbar gap-6 px-6 pb-4">
          <RecentDiscovery 
            name="Robin" 
            image="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Erithacus_rubecula_with_cocked_head.jpg/440px-Erithacus_rubecula_with_cocked_head.jpg" 
          />
          <RecentDiscovery 
            name="Blue Jay" 
            image="https://upload.wikimedia.org/wikipedia/commons/4/40/Blue_Jay-27527.jpg" 
          />
          <RecentDiscovery 
            name="Sparrow" 
            image="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/House_Sparrow_mar08.jpg/440px-House_Sparrow_mar08.jpg" 
          />
          <RecentDiscovery 
            name="Cardinal" 
            image="https://upload.wikimedia.org/wikipedia/commons/b/b5/Cardinalis_cardinalis_NBII.jpg" 
          />
        </div>
      </div>
    </div>
  );
};