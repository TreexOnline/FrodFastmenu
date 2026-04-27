-- Migration: Adicionar campos de preço a partir de na tabela products
-- Data: 2024-04-26
-- Descrição: Adicionar suporte para exibir "a partir de" para produtos com diferentes tamanhos/adicionais

-- Adicionar campos na tabela products
ALTER TABLE products 
ADD COLUMN price_from_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN price_from_value DECIMAL(10,2);

-- Adicionar comentários aos novos campos
COMMENT ON COLUMN products.price_from_enabled IS 'Ativa exibição de preço a partir de valor mínimo';
COMMENT ON COLUMN products.price_from_value IS 'Valor mínimo para exibição "a partir de" quando price_from_enabled=true';

-- Criar índice para performance (opcional)
CREATE INDEX idx_products_price_from_enabled ON products(price_from_enabled) WHERE price_from_enabled = true;
