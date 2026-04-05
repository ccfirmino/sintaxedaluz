// src/auth/AuthManager.ts
import { TenantContextSchema, TenantContext } from './types';

export class AuthManager {
    private static supabase: any;
    private static currentTenant: TenantContext | null = null;

    public static async init(supabaseClient: any) {
        this.supabase = supabaseClient;
        if (!this.supabase) return;
        
        const { data: { session } } = await this.supabase.auth.getSession();
        this.handleSessionUpdate(session);
        
        this.supabase.auth.onAuthStateChange((event: string, session: any) => {
            this.handleSessionUpdate(session);
            if (event === 'PASSWORD_RECOVERY') {
                setTimeout(() => {
                    const win = window as any;
                    alert(win.currentLang === 'en' ? win.i18n.en.msg_recovery_prompt : win.i18n.pt.msg_recovery_prompt);
                    this.openProfile();
                }, 500);
            }
        });
    }

    /**
     * Retorna o contexto de segurança atual.
     * Invocado antes de operações de I/O na nuvem para garantir o isolamento multitenant.
     */
    public static getTenantContext(): TenantContext {
        if (!this.currentTenant) {
            throw new Error("[Security Violation] Acesso negado. Contexto de tenant ausente ou não validado.");
        }
        return this.currentTenant;
    }

    public static handleSessionUpdate(session: any) {
        if (session && session.user) {
            // LUXSINTAX: Validação Estrita de Tenant via Zod (Zero Trust Architecture)
            const validationResult = TenantContextSchema.safeParse({
                userId: session.user.id,
                email: session.user.email,
                organizationId: session.user.app_metadata?.organization_id,
                role: session.user.app_metadata?.role || 'LIGHTING_DESIGNER'
            });

            if (!validationResult.success) {
                console.error("[LuxSintax Security] Falha na fronteira de segurança. Sessão malformada:", validationResult.error.format());
                this.currentTenant = null;
                this.logout();
                return;
            }

            // Contexto criptograficamente blindado e guardado na memória da aplicação
            this.currentTenant = validationResult.data;

            const name = session.user.user_metadata.first_name || (session.user.email ? session.user.email.split('@')[0] : 'Usuário');
            document.getElementById('user-name-display')!.innerText = name.toUpperCase();
            
            const emailDisplay = document.getElementById('profile-email-display') as HTMLInputElement;
            if (emailDisplay) emailDisplay.value = session.user.email;

            this.unlockApp();
        } else { 
            this.currentTenant = null;
            this.lockApp(); 
        }
    }

    public static lockApp() { 
        document.getElementById('auth-modal')!.classList.remove('hidden'); 
        document.getElementById('app-content')!.classList.add('app-locked'); 
    }

    public static unlockApp() { 
        document.getElementById('auth-modal')!.classList.add('hidden'); 
        document.getElementById('app-content')!.classList.remove('app-locked'); 
        
        const win = window as any;
        if (win.populateCategoryFilter) win.populateCategoryFilter();
        if (win.filterNorms) win.filterNorms();
        if (win.fetchUserLeedProjects) win.fetchUserLeedProjects();
        setTimeout(() => { if (win.updateCalculations) win.updateCalculations(); }, 100); 
    }

    public static switchTab(tab: string) {
        const loginForm = document.getElementById('form-login')!; 
        const regForm = document.getElementById('form-register')!;
        const forgotForm = document.getElementById('form-forgot-password')!;
        const authTabs = document.getElementById('auth-tabs')!;
        
        const btnLogin = document.getElementById('tab-auth-login')!; 
        const btnReg = document.getElementById('tab-auth-register')!;
        
        authTabs.classList.remove('hidden');
        forgotForm.classList.add('hidden');

        if (tab === 'login') {
            loginForm.classList.remove('hidden'); regForm.classList.add('hidden');
            btnLogin.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider text-luminous-gold border-b-2 border-luminous-gold transition-all";
            btnReg.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider text-dim-gray hover:text-starlight transition-all";
        } else {
            loginForm.classList.add('hidden'); regForm.classList.remove('hidden');
            btnReg.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider text-luminous-gold border-b-2 border-luminous-gold transition-all";
            btnLogin.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider text-dim-gray hover:text-starlight transition-all";
        }
    }

    public static showForgotPassword() {
        document.getElementById('form-login')!.classList.add('hidden');
        document.getElementById('form-register')!.classList.add('hidden');
        document.getElementById('auth-tabs')!.classList.add('hidden');
        document.getElementById('form-forgot-password')!.classList.remove('hidden');
    }

    public static backToLogin() {
        this.switchTab('login');
    }

    public static async handlePasswordResetRequest() {
        const email = (document.getElementById('forgot-email') as HTMLInputElement).value;
        if (!email) {
            alert("Por favor, insira um e-mail.");
            return;
        }
        const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname,
        });
        
        if (error) {
            alert(error.message);
        } else {
            const win = window as any;
            alert(win.currentLang === 'en' ? win.i18n.en.msg_reset_sent : win.i18n.pt.msg_reset_sent);
            this.backToLogin();
        }
    }

    public static async handleRegister() {
        const email = (document.getElementById('reg-email') as HTMLInputElement).value;
        const password = (document.getElementById('reg-password') as HTMLInputElement).value;
        const firstName = (document.getElementById('reg-name') as HTMLInputElement).value;
        const lastName = (document.getElementById('reg-surname') as HTMLInputElement).value;
        const terms = (document.getElementById('reg-terms') as HTMLInputElement).checked;
        
        if (!terms) return alert("Aceite os termos.");
        
        const { data, error } = await this.supabase.auth.signUp({ 
            email, 
            password, 
            options: { data: { first_name: firstName, last_name: lastName } } 
        });
        
        if (error) alert(error.message); 
        else if (data.session) this.unlockApp();
        else alert("Cadastro feito. Verifique e-mail.");
    }

    public static async logout() { 
        await this.supabase.auth.signOut(); 
        for (let key in localStorage) {
            if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        }
        location.reload(); 
    }

    public static async login() {
        if (!this.supabase) {
            alert("O sistema de segurança está a inicializar. Aguarde 2 segundos.");
            return;
        }
        
        const email = (document.getElementById('login-email') as HTMLInputElement).value;
        const password = (document.getElementById('login-password') as HTMLInputElement).value;
        
        if (!email || !password) {
            return alert("Por favor, preencha seu e-mail e senha.");
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.session) {
                console.info("[LuxSintax Auth] Login bem-sucedido. Sincronizando sessão...");
                this.handleSessionUpdate(data.session);
            }
        } catch (err: any) {
            console.error("[LuxSintax Auth] Falha na autenticação:", err.message);
            if (err.status === 400 || err.message.toLowerCase().includes('invalid')) {
                alert("E-mail ou senha incorretos. Verifique os dados e tente novamente.");
            } else {
                alert("Erro de acesso: " + err.message);
                if (err.message.toLowerCase().includes('session')) {
                    this.logout();
                }
            }
        }
    }

    public static openProfile() {
        document.getElementById('profile-modal')!.classList.remove('hidden');
    }

    public static closeProfile() {
        document.getElementById('profile-modal')!.classList.add('hidden');
        (document.getElementById('profile-new-pass') as HTMLInputElement).value = '';
        (document.getElementById('profile-confirm-pass') as HTMLInputElement).value = '';
    }

    public static async updatePassword() {
        const newPass = (document.getElementById('profile-new-pass') as HTMLInputElement).value;
        const confirmPass = (document.getElementById('profile-confirm-pass') as HTMLInputElement).value;
        const win = window as any;
        
        if (!newPass) return alert("Por favor, digite a nova senha.");
        if (newPass !== confirmPass) return alert(win.currentLang === 'en' ? win.i18n.en.msg_pass_mismatch : win.i18n.pt.msg_pass_mismatch);
        
        const { error } = await this.supabase.auth.updateUser({ password: newPass });
        
        if (error) {
            alert("Erro ao atualizar senha: " + error.message);
        } else {
            alert(win.currentLang === 'en' ? win.i18n.en.msg_pass_success : win.i18n.pt.msg_pass_success);
            this.closeProfile();
        }
    }
}