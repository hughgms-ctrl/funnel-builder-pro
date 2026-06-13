import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Mail, Lock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to builder home
  useEffect(() => {
    if (user && !loading) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/" });
    } else {
      toast.error(result.error || "Erro ao fazer login. Verifique suas credenciais.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-pink-600/10 blur-[120px] pointer-events-none" />

      {/* Decorative floating grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.03] pointer-events-none" />

      {/* Main glassmorphic card */}
      <div className="w-full max-w-[420px] px-6 py-8 md:px-8 bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-xl rounded-2xl shadow-2xl relative z-10 space-y-6 mx-4">
        {/* Logo/Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/20 relative group">
            <ShieldCheck className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
          </div>
          
          <h1 className="text-xl font-bold tracking-tight text-white mt-3 flex items-center gap-1.5 justify-center">
            QuizFunnel <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" /> Admin</span>
          </h1>
          <p className="text-xs text-zinc-400 max-w-[300px]">
            Faça login para acessar o construtor visual de funis e painel de controle.
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-500" /> E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@admin.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus-visible:ring-violet-500 text-sm py-5"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-zinc-500" /> Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus-visible:ring-violet-500 text-sm py-5"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-semibold shadow-lg shadow-violet-600/15 py-5 rounded-lg transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              "Entrar no Painel"
            )}
          </Button>
        </form>


      </div>
    </div>
  );
}
