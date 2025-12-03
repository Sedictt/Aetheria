import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const Login: React.FC = () => {
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            alert("Failed to sign in. Please try again.");
        }
    };

    return (
        <div className="flex h-screen w-screen bg-stone-50 items-center justify-center font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-stone-100">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-stone-50 flex items-center justify-center">
                    <span className="text-4xl">✒️</span>
                </div>
                <h1 className="text-3xl font-serif text-stone-800 mb-2">Welcome to Atheria</h1>
                <p className="text-stone-500 mb-8">Your personal space for reflection and clarity.</p>

                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export default Login;
