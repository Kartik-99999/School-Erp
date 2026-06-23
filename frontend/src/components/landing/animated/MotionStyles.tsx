// Global keyframes + hover utilities for the Erpcore "motion" components.
// Prefixed `ec-` so they never collide with the app's existing tailwind animations.
export default function MotionStyles() {
  return (
    <style>{`
      @keyframes ec-fadeUpIn { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:translateY(0);} }
      @keyframes ec-dotPulse { 0%,100%{ box-shadow:0 0 0 0 rgba(235,203,135,0.55);} 70%{ box-shadow:0 0 0 14px rgba(235,203,135,0);} }
      @keyframes ec-ringExpand { 0%{ transform:scale(0.6); opacity:0.7;} 100%{ transform:scale(2.8); opacity:0;} }
      @keyframes ec-goldSweep { 0%{ background-position:200% 50%;} 100%{ background-position:-200% 50%;} }
      @keyframes ec-drawScaleX { from{ transform:scaleX(0);} to{ transform:scaleX(1);} }
      @keyframes ec-float1 { 0%,100%{ transform:translate(0,0) rotate(-2deg);} 50%{ transform:translate(14px,-22px) rotate(1deg);} }
      @keyframes ec-float2 { 0%,100%{ transform:translate(0,0) rotate(3deg);} 50%{ transform:translate(-18px,14px) rotate(-2deg);} }
      @keyframes ec-float3 { 0%,100%{ transform:translate(0,0) rotate(-1deg);} 50%{ transform:translate(20px,22px) rotate(2deg);} }
      @keyframes ec-float4 { 0%,100%{ transform:translate(0,0) rotate(2deg);} 50%{ transform:translate(-12px,-18px) rotate(-1deg);} }
      @keyframes ec-marqueeX { from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
      @keyframes ec-starTwinkle { 0%,100%{ opacity:0.15;} 50%{ opacity:0.85;} }
      @keyframes ec-caretBlink { 0%,50%{ opacity:1;} 51%,100%{ opacity:0;} }
      .ec-card { transition: border-color .3s, transform .3s; }
      .ec-card:hover { border-color: rgba(235,203,135,0.35) !important; transform: translateY(-2px); }
      .ec-idx { transition: background .2s; }
      .ec-idx:hover { background:#12141C !important; }
      @media (prefers-reduced-motion: reduce) {
        .ec-rmsafe, .ec-rmsafe * { animation: none !important; }
      }
    `}</style>
  );
}
