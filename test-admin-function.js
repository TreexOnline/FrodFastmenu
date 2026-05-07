// Teste simples para verificar a função admin-list-users
const { createClient } = require('@supabase/supabase-js');

// Configurações - substitua com suas credenciais reais
const supabaseUrl = 'https://seu-projeto.supabase.co';
const supabaseKey = 'sua-chave';

async function testAdminFunction() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Testando função admin-list-users...');
    const { data, error } = await supabase.functions.invoke('admin-list-users');
    
    if (error) {
      console.error('Erro:', error);
    } else {
      console.log('Dados recebidos:', JSON.stringify(data, null, 2));
      console.log('Total de usuários:', data?.users?.length || 0);
    }
  } catch (err) {
    console.error('Erro ao testar função:', err);
  }
}

testAdminFunction();
