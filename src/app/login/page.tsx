'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartPulse } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide (attendu JSON). Exécutez `npx prisma generate` puis redémarrez.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Identifiants invalides');
      }

      toast.success("Connexion réussie ! Redirection...");

      // Redirection stricte selon le rôle exact retourné par le JWT
      const role = data.user.role; // ex: "ADMIN", "DOCTOR", "ASSISTANT"
      if (role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else if (role === 'DOCTOR') {
        router.push('/dashboard/doctor');
      } else if (role === 'ASSISTANT') {
        router.push('/dashboard/assistant');
      } else {
        router.push('/dashboard'); // Fallback
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 relative px-4">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-1/2 bg-white border-b border-slate-100 z-0 hidden md:block"></div>
      
      <div className="z-10 w-full max-w-md animate-fade-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/30">
            <HeartPulse size={36} />
          </div>
        </div>

        <Card className="border-slate-100 shadow-xl shadow-slate-200/40">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-800">Nezha Medical</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Connectez-vous pour accéder à votre espace sécurisé.</CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6 pt-2">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-bold">Adresse Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="marie@clinique.com"
                  className="h-12 rounded-xl border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-bold">Mot de passe</Label>
                  <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                    Oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="h-12 rounded-xl border-slate-200 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm active:scale-95 transition-all"
              >
                {loading ? 'Authentification...' : 'Se connecter'}
              </Button>
              <p className="text-sm text-slate-500 text-center font-medium">
                Aucune inscription en ligne — les comptes sont créés par l&apos;administration du
                cabinet. Accès réservé au personnel habilité.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
