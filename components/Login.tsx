import React, { useEffect, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { motion } from 'framer-motion';
import gsap from 'gsap';

const Login: React.FC = () => {
    const cardRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            alert("Failed to sign in. Please try again.");
        }
    };

    useEffect(() => {
        // Create an elegant, elastic GSAP entrance timeline
        const tl = gsap.timeline({ defaults: { ease: 'elastic.out(1, 0.75)' } });

        tl.fromTo(cardRef.current, 
            { scale: 0.8, opacity: 0, y: 40 },
            { scale: 1, opacity: 1, y: 0, duration: 1.2 }
        );

        tl.fromTo(logoRef.current,
            { scale: 0, rotation: -45 },
            { scale: 1, rotation: 0, duration: 0.8 },
            '-=0.8'
        );

        tl.fromTo(titleRef.current,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.6'
        );

        tl.fromTo(subtitleRef.current,
            { y: 15, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.5'
        );

        tl.fromTo(buttonRef.current,
            { y: 15, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
            '-=0.4'
        );
    }, []);

    return (
        <div className="relative flex h-screen w-screen bg-stone-50 dark:bg-stone-950 items-center justify-center font-sans overflow-hidden transition-colors duration-300">
            {/* Soft, beautiful ambient glowing background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-300/30 dark:bg-rose-900/10 blur-[100px] animate-ambient pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/30 dark:bg-indigo-900/10 blur-[100px] animate-ambient pointer-events-none [animation-delay:4s]" />
            <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-emerald-200/20 dark:bg-emerald-900/5 blur-[80px] animate-ambient pointer-events-none [animation-delay:2s]" />

            <div 
                ref={cardRef} 
                className="clay-card p-12 max-w-md w-full text-center border-none transition-colors duration-300 relative z-10 mx-4"
            >
                {/* 3D claymorphic logo container */}
                <div 
                    ref={logoRef}
                    className="w-28 h-28 mx-auto mb-8 rounded-[2rem] clay-inset flex items-center justify-center overflow-hidden border border-white/20 shadow-md p-1 bg-white/20 dark:bg-stone-800/20"
                >
                    <img 
                        src="/logo.png" 
                        alt="Aetheria Logo" 
                        className="w-full h-full object-cover rounded-[1.8rem]" 
                    />
                </div>

                <h1 
                    ref={titleRef}
                    className="text-4xl font-serif font-extrabold text-stone-800 dark:text-stone-100 mb-3 tracking-tight leading-none"
                >
                    Welcome to Atheria
                </h1>
                
                <p 
                    ref={subtitleRef}
                    className="text-stone-500 dark:text-stone-400 font-medium mb-10 text-base"
                >
                    Your personal space for reflection and clarity.
                </p>

                {/* Google Sign-in button with responsive motion hover */}
                <motion.button
                    ref={buttonRef}
                    onClick={handleLogin}
                    whileHover={{ 
                        scale: 1.03, 
                        y: -2,
                        boxShadow: '0 12px 20px -8px rgba(0,0,0,0.15)'
                    }}
                    whileTap={{ 
                        scale: 0.98,
                        y: 1
                    }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 15 
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold py-4 px-6 rounded-2xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm hover:shadow-md transition-all duration-300 clay-button-secondary"
                >
                    <img 
                        src="https://www.google.com/favicon.ico" 
                        alt="Google" 
                        className="w-5 h-5 filter dark:brightness-95" 
                    />
                    <span>Sign in with Google</span>
                </motion.button>
            </div>
        </div>
    );
};

export default Login;
