import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getSupabaseAdmin } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Mail, Lock, Store, CreditCard, Shield, Trash2, Key, Calendar } from "lucide-react";

interface NewUser {
  email: string;
  password: string;
  fullName: string;
  restaurantName: string;
  phone: string;
  plan: string;
  whatsappEnabled: boolean;
}

interface ExistingUser {
  id: string;
  email: string;
  full_name: string;
  restaurant_name: string;
  current_plan: string;
  plan_active: boolean;
  whatsapp_addon_active: boolean;
  created_at: string;
  role: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ExistingUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: "",
    password: "",
    fullName: "",
    restaurantName: "",
    phone: "",
    plan: "free",
    whatsappEnabled: true,
  });

  // Verificar se usuário atual é admin
  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!data) {
        toast.error("Acesso restrito ao administrador");
        navigate("/dashboard");
        return;
      }
    };
    
    checkAdmin();
  }, [user, navigate]);

  // Carregar usuários existentes (incluindo admin)
  const loadUsers = async () => {
    if (!user) return;
    
    try {
      // Carregar usuários normais da view
      const { data: usersData, error: usersError } = await supabase
        // @ts-ignore - View admin_users_view existe no banco mas não nos tipos
        .from("admin_users_view")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Carregar dados do admin atual usando auth.users
      const adminClient = getSupabaseAdmin();
      const { data: adminData, error: adminError } = await adminClient.auth.admin.getUserById(user.id);
      
      if (usersError || adminError) {
        toast.error("Erro ao carregar usuários");
        console.error("Load users error:", usersError || adminError);
        return;
      }
      
      let allUsers: ExistingUser[] = [];
      
      // Adicionar usuários da view se existirem
      if (usersData && Array.isArray(usersData)) {
        // Validar e mapear dados para garantir tipo correto
        const validUsers = usersData.filter((user: any) => 
          user.id && user.email && user.full_name && user.restaurant_name
        ).map((user: any): ExistingUser => ({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          restaurant_name: user.restaurant_name,
          current_plan: user.current_plan || 'free',
          plan_active: user.plan_active || false,
          whatsapp_addon_active: user.whatsapp_addon_active || false,
          created_at: user.created_at,
          role: user.role || 'user'
        }));
        allUsers = validUsers;
      }
      
      // Adicionar admin na lista se encontrado
      if (adminData?.user) {
        const adminUser: ExistingUser = {
          id: adminData.user.id,
          email: adminData.user.email || "admin@frodfast.com",
          full_name: adminData.user.user_metadata?.full_name || "Vitor Admin",
          restaurant_name: adminData.user.user_metadata?.restaurant_name || "FrodFast Admin",
          current_plan: adminData.user.user_metadata?.current_plan || "free",
          plan_active: adminData.user.user_metadata?.plan_active || false,
          whatsapp_addon_active: adminData.user.user_metadata?.whatsapp_addon_active || true,
          created_at: adminData.user.created_at,
          role: "admin"
        };
        
        // Verificar se admin já está na lista
        const adminExists = allUsers.some(u => u.id === adminData.user.id);
        if (!adminExists) {
          allUsers.unshift(adminUser); // Admin aparece primeiro
        }
      }
      
      setUsers(allUsers);
    } catch (error) {
      toast.error("Erro ao carregar usuários");
      console.error("Load users error:", error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validações
    if (!newUser.email || !newUser.password || !newUser.fullName || !newUser.restaurantName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    if (newUser.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    
    // Validação de telefone
    const phoneRegex = /^\d{10,11}$/;
    const cleanPhone = newUser.phone.replace(/\D/g, '');
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      toast.error("Telefone inválido. Digite apenas números com DDD (ex: 18997001234)");
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Criar usuário usando a função Edge admin-create-user
      const { data: createData, error: createError } = await supabase.functions.invoke("admin-create-user", {
        body: {
          phone: newUser.phone.startsWith("+") ? newUser.phone : `+55${newUser.phone}`,
          password: newUser.password,
          full_name: newUser.fullName,
          restaurant_name: newUser.restaurantName,
        },
      });
      
      if (createError || (createData as any)?.error) {
        toast.error((createData as any)?.error || "Erro ao criar usuário");
        setLoading(false);
        return;
      }
      
      const userId = (createData as any)?.user_id || (createData as any)?.id;
      if (!userId) {
        toast.error("Erro ao obter ID do usuário criado");
        setLoading(false);
        return;
      }
      
      console.log("User ID obtido:", userId);
      
      // 2. Criar perfil (já foi criado pela função, mas vamos garantir os campos adicionais)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          current_plan: newUser.plan,
          plan_active: newUser.plan !== "free",
          whatsapp_addon_active: newUser.whatsappEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      if (profileError) {
        toast.error("Erro ao atualizar perfil: " + profileError.message);
        setLoading(false);
        return;
      }
      
      // 3. Loja criada automaticamente pela Edge Function admin-create-user
      // Não é necessário criar store aqui para evitar duplicação
      
      // 4. Criar role de usuário
      const { error: roleError } = await supabase
        // @ts-ignore - Tabela user_roles existe no banco mas não nos tipos
        .from("user_roles")
        // @ts-ignore - Objeto insert com tipos não reconhecidos
        .insert({
          user_id: userId,
          role: "user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (roleError) {
        toast.error("Erro ao criar role: " + roleError.message);
        setLoading(false);
        return;
      }
      
      // 5. Criar menu inicial
      const { data: menuData, error: menuError } = await supabase
        // @ts-ignore - Tabela menus existe no banco mas não nos tipos
        .from("menus")
        // @ts-ignore - Objeto insert com tipos não reconhecidos
        .insert({
          user_id: userId,
          name: "Cardápio Principal",
          is_active: true,
          slug: `cardapio-${newUser.restaurantName.toLowerCase().replace(/\s+/g, "-")}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (menuError) {
        toast.error("Erro ao criar menu: " + menuError.message);
        setLoading(false);
        return;
      }
      
      // 6. Criar configurações do menu
      await supabase
        // @ts-ignore - Tabela menu_settings existe no banco mas não nos tipos
        .from("menu_settings")
        // @ts-ignore - Objeto insert com tipos não reconhecidos
        .insert({
          menu_id: menuData.id,
          user_id: userId,
          auto_print: false,
          print_split_by_category: false,
          display_name: "Cardápio Principal",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      toast.success(`Usuário ${newUser.email} criado com sucesso!`);
      
      // Resetar formulário
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        restaurantName: "",
        phone: "",
        plan: "free",
        whatsappEnabled: true,
      });
      setShowCreateForm(false);
      
      // Recarregar lista de usuários
      loadUsers();
      
    } catch (error: any) {
      toast.error("Erro ao criar usuário: " + error.message);
      console.error("Create user error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Não permitir excluir admin
    const currentUser = users.find(u => u.id === userId);
    if (currentUser?.role === 'admin') {
      toast.error("Não é possível excluir o usuário administrador");
      return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) {
      return;
    }
    
    try {
      // Excluir usuário (cascade deve remover dados relacionados)
      const adminClient = getSupabaseAdmin();
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      
      if (error) {
        toast.error("Erro ao excluir usuário: " + error.message);
        return;
      }
      
      toast.success("Usuário excluído com sucesso");
      loadUsers();
      
    } catch (error: any) {
      toast.error("Erro ao excluir usuário: " + error.message);
      console.error("Delete user error:", error);
    }
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    // Não permitir alterar plano do admin
    const currentUser = users.find(u => u.id === userId);
    if (currentUser?.role === 'admin') {
      toast.error("Não é possível alterar o plano do administrador");
      return;
    }
    
    try {
      const { error } = await supabase
        // @ts-ignore - Tabela profiles existe no banco mas não nos tipos
        .from("profiles")
        // @ts-ignore - Objeto update com tipos não reconhecidos
        .update({
          current_plan: plan,
          plan_active: plan !== "free",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      if (error) {
        toast.error("Erro ao atualizar plano: " + error.message);
        return;
      }
      
      toast.success(`Plano atualizado para ${plan}`);
      loadUsers();
      
    } catch (error: any) {
      toast.error("Erro ao atualizar plano: " + error.message);
    }
  };

  const handleToggleWhatsApp = async (userId: string, enabled: boolean) => {
    // Não permitir alterar WhatsApp do admin
    const currentUser = users.find(u => u.id === userId);
    if (currentUser?.role === 'admin') {
      toast.error("Não é possível alterar o WhatsApp do administrador");
      return;
    }
    
    try {
      const { error } = await supabase
        // @ts-ignore - Tabela profiles existe no banco mas não nos tipos
        .from("profiles")
        // @ts-ignore - Objeto update com tipos não reconhecidos
        .update({
          whatsapp_addon_active: enabled,
          whatsapp_addon_expires_at: enabled ? "2099-12-31" : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      if (error) {
        toast.error("Erro ao atualizar WhatsApp: " + error.message);
        return;
      }
      
      toast.success(`WhatsApp ${enabled ? "ativado" : "desativado"}`);
      loadUsers();
      
    } catch (error: any) {
      toast.error("Erro ao atualizar WhatsApp: " + error.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">
          Crie e gerencie usuários do sistema FrodFastmenu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Criação */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Criar Novo Usuário
            </CardTitle>
            <CardDescription>
              Preencha os dados para criar um novo restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showCreateForm ? (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email (Gmail)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@gmail.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Senha Inicial</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <Label htmlFor="fullName">Nome do Responsável</Label>
                  <Input
                    id="fullName"
                    placeholder="Nome completo"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                  <Input
                    id="restaurantName"
                    placeholder="Nome do restaurante"
                    value={newUser.restaurantName}
                    onChange={(e) => setNewUser({ ...newUser, restaurantName: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone (com DDD)</Label>
                  <Input
                    id="phone"
                    placeholder="18997001234"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    DDI 55 será adicionado automaticamente
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="plan">Plano</Label>
                  <Select value={newUser.plan} onValueChange={(value) => setNewUser({ ...newUser, plan: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuito</SelectItem>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="whatsapp"
                    checked={newUser.whatsappEnabled}
                    onChange={(e) => setNewUser({ ...newUser, whatsappEnabled: e.target.checked })}
                  />
                  <Label htmlFor="whatsapp">Habilitar WhatsApp</Label>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center">
                <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full"
                >
                  Criar Novo Usuário
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Usuários Existentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Usuários Cadastrados
            </CardTitle>
            <CardDescription>
              Gerencie usuários existentes, planos e permissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum usuário cadastrado ainda
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{user.restaurant_name}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <p className="font-medium">{user.email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responsável:</span>
                            <p className="font-medium">{user.full_name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Plano:</span>
                            <p className="font-medium">{user.current_plan}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Criado em:</span>
                            <p className="font-medium">
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.plan_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.plan_active ? 'Ativo' : 'Inativo'}
                          </span>
                          
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.whatsapp_addon_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            WhatsApp: {user.whatsapp_addon_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {/* Plano - não permite alterar admin */}
                        {user.role === 'admin' ? (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Plano:</span> {user.current_plan} (admin)
                          </div>
                        ) : (
                          <Select
                            value={user.current_plan}
                            onValueChange={(value) => handleUpdatePlan(user.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Gratuito</SelectItem>
                              <SelectItem value="basic">Básico</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        {/* WhatsApp - não permite alterar admin */}
                        {user.role === 'admin' ? (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">WhatsApp:</span> {user.whatsapp_addon_active ? "Ativo" : "Inativo"} (admin)
                          </div>
                        ) : (
                          <Button
                            variant={user.whatsapp_addon_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleWhatsApp(user.id, !user.whatsapp_addon_active)}
                          >
                            {user.whatsapp_addon_active ? "Desativar" : "Ativar"} WhatsApp
                          </Button>
                        )}
                        
                        {/* Excluir - não permite excluir admin */}
                        {user.role === 'admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title="Usuário administrador não pode ser excluído"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
