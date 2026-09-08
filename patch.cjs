const fs = require('fs');
let code = fs.readFileSync('src/components/RowanConversationalInterface.tsx', 'utf8');

const minimizedLogic = `
  // Minimized Floating Avatar Mode
  if (isMinimized) {
    return (
      <div
        {...(dragHandleProps || {})}
        onClick={onExpand}
        className="w-full h-full rounded-[36px] flex items-center justify-center cursor-pointer relative shadow-2xl transition-all hover:scale-[1.03] group touch-none overflow-hidden"
        style={{ touchAction: 'none' }}
        title="Tap to expand Rowan"
      >
        <div className={\`absolute inset-0 transition-colors duration-500 \${rtIsSpeaking ? 'bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.6)]' : rtIsListening ? 'bg-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.6)]' : isDark ? 'bg-slate-800/80' : 'bg-white'}\`} />
        
        {/* Subtle breathing background when idle */}
        {!rtIsSpeaking && !rtIsListening && (
          <motion.div 
            className="absolute inset-0 bg-blue-500/5"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* The Avatar */}
        <div className="relative z-10 scale-[0.8] mt-2 mr-0.5">
          <RowanExpressiveAvatar
            state={currentAvatarState}
            size={56}
            theme={theme}
            showStatusBadge={false}
          />
        </div>
        
        {/* Border ring */}
        <div className="absolute inset-0 rounded-[36px] ring-2 ring-blue-500/40 group-hover:ring-blue-400 transition-colors pointer-events-none z-20" />
      </div>
    )
  }
`;

code = code.replace(
  '  return (\n    <div\n      className={`relative flex flex-col h-full w-full',
  minimizedLogic + '\n  return (\n    <div\n      className={`relative flex flex-col h-full w-full'
);

fs.writeFileSync('src/components/RowanConversationalInterface.tsx', code);
