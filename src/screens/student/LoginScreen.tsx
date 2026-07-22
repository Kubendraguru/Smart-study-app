import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Role } from '@/types';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('student');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'teacher') {
      navigate('/teacher/dashboard');
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-16 pb-12 rounded-b-[2.5rem]">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-3">
            <GraduationCap size={36} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-white">Anna University</h1>
          <p className="text-blue-100 text-sm">Study Hub</p>
        </motion.div>
      </div>

      <div className="flex-1 px-6 -mt-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg shadow-gray-200/60 border border-gray-100 p-6"
        >
          <div className="flex bg-gray-50 rounded-xl p-1 mb-6">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <BookOpen size={16} />
              Student
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              <User size={16} />
              Teacher
            </button>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {isLogin ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            {isLogin ? 'Sign in to continue your learning' : 'Sign up to start your journey'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Full Name"
                placeholder="Enter your name"
                icon={<User size={18} />}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@annauniv.edu.in"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </button>
              </div>
            )}
            <Button fullWidth size="lg" type="submit">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
