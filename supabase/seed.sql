-- MarketGo: dados iniciais (execute DEPOIS do schema.sql)

insert into public.stores
  (name, category, emoji, description, rating,
   delivery_fee, eta_min, eta_max, min_order, is_open)
values
  ('Mercado Bom Preço', 'Mercado', '🛒', 'Supermercado de bairro com entrega rápida.',
   4.7, 5.9, 30, 45, 20.0, true),
  ('Padaria Pão Quente', 'Padaria', '🥖', 'Pães e cafés saindo do forno o dia todo.',
   4.8, 3.5, 15, 25, 10.0, true),
  ('Farmácia Vida', 'Farmácia', '💊', 'Medicamentos e higiene, sem sair de casa.',
   4.6, 6.0, 25, 40, 15.0, true),
  ('Hortifrúti da Terra', 'Hortifrúti', '🥬', 'Frutas, verduras e legumes fresquinhos.',
   4.5, 4.9, 30, 50, 25.0, true),
  ('Pizzaria Forno a Lenha', 'Restaurante', '🍕', 'Pizzas artesanais de massa fina.',
   4.9, 7.9, 40, 60, 30.0, true),
  ('Sushi Sakura', 'Restaurante', '🍣', 'Culinária japonesa. Volta amanhã.',
   4.4, 9.9, 45, 65, 40.0, false);

insert into public.products (store_id, section, name, description, price, emoji)
select st.id, v.section, v.name, v.description, v.price, v.emoji
from (values
    ('Hortifrúti', 'Banana prata 1 kg', '', 6.9, '🍌'),
    ('Hortifrúti', 'Maçã gala 1 kg', '', 9.9, '🍎'),
    ('Hortifrúti', 'Tomate 1 kg', '', 7.5, '🍅'),
    ('Mercearia', 'Arroz branco 5 kg', 'Tipo 1, grãos longos.', 29.9, '🍚'),
    ('Mercearia', 'Feijão carioca 1 kg', '', 8.5, '🫘'),
    ('Mercearia', 'Macarrão espaguete 500 g', '', 4.8, '🍝'),
    ('Mercearia', 'Café torrado 500 g', 'Moagem média.', 18.9, '☕'),
    ('Laticínios', 'Leite integral 1 L', '', 5.25, '🥛'),
    ('Laticínios', 'Queijo mussarela 200 g', '', 14.9, '🧀'),
    ('Laticínios', 'Manteiga 200 g', '', 11.9, '🧈'),
    ('Limpeza', 'Detergente 500 ml', '', 2.9, '🧴'),
    ('Limpeza', 'Sabão em pó 1 kg', '', 12.5, '🧼')
  ) as v(section, name, description, price, emoji)
  cross join (select id from public.stores where name = 'Mercado Bom Preço') as st
union all
select st.id, v.section, v.name, v.description, v.price, v.emoji
from (values
    ('Pães', 'Pão francês (6 un)', 'Crocante por fora, macio por dentro.', 4.8, '🥖'),
    ('Pães', 'Pão de queijo (10 un)', '', 12.0, '🧀'),
    ('Pães', 'Pão na chapa', '', 5.5, '🍞'),
    ('Doces', 'Bolo de cenoura (fatia)', 'Com cobertura de chocolate.', 7.5, '🍰'),
    ('Bebidas', 'Café com leite', '', 6.5, '☕'),
    ('Bebidas', 'Suco de laranja 300 ml', '', 8.0, '🍊'),
    ('Salgados', 'Coxinha', '', 6.5, '🍗'),
    ('Salgados', 'Empada de frango', '', 6.0, '🥧')
  ) as v(section, name, description, price, emoji)
  cross join (select id from public.stores where name = 'Padaria Pão Quente') as st
union all
select st.id, v.section, v.name, v.description, v.price, v.emoji
from (values
    ('Analgésicos', 'Dipirona 500 mg (10 comp.)', '', 9.9, '💊'),
    ('Analgésicos', 'Paracetamol 750 mg (10 comp.)', '', 11.5, '💊'),
    ('Higiene', 'Sabonete 90 g', '', 2.5, '🧼'),
    ('Higiene', 'Creme dental 90 g', '', 5.9, '🪥'),
    ('Higiene', 'Escova de dentes', '', 7.9, '🪥'),
    ('Higiene', 'Protetor solar FPS 50', '', 39.9, '🧴'),
    ('Cuidados', 'Álcool em gel 500 ml', '', 9.9, '🧴'),
    ('Cuidados', 'Curativo (20 un)', '', 8.5, '🩹')
  ) as v(section, name, description, price, emoji)
  cross join (select id from public.stores where name = 'Farmácia Vida') as st
union all
select st.id, v.section, v.name, v.description, v.price, v.emoji
from (values
    ('Frutas', 'Laranja 1 kg', '', 5.9, '🍊'),
    ('Frutas', 'Mamão papaia', '', 6.5, '🍈'),
    ('Frutas', 'Uva sem semente 500 g', '', 14.9, '🍇'),
    ('Verduras', 'Alface crespa', '', 3.9, '🥬'),
    ('Verduras', 'Cenoura 1 kg', '', 5.5, '🥕'),
    ('Verduras', 'Brócolis', '', 6.9, '🥦'),
    ('Legumes', 'Batata 1 kg', '', 6.2, '🥔'),
    ('Legumes', 'Cebola 1 kg', '', 5.8, '🧅'),
    ('Legumes', 'Abóbora', '', 4.9, '🎃'),
    ('Ovos', 'Ovos caipiras (12 un)', '', 16.0, '🥚')
  ) as v(section, name, description, price, emoji)
  cross join (select id from public.stores where name = 'Hortifrúti da Terra') as st
union all
select st.id, v.section, v.name, v.description, v.price, v.emoji
from (values
    ('Pizzas', 'Margherita', 'Molho de tomate, mussarela e manjericão.', 42.0, '🍕'),
    ('Pizzas', 'Calabresa', 'Calabresa fatiada e cebola.', 46.0, '🍕'),
    ('Pizzas', 'Quatro queijos', 'Mussarela, parmesão, gorgonzola e catupiry.', 52.0, '🍕'),
    ('Bebidas', 'Refrigerante 2 L', '', 12.0, '🥤'),
    ('Bebidas', 'Suco natural 500 ml', '', 9.0, '🍹'),
    ('Sobremesas', 'Brownie com sorvete', '', 18.0, '🍫'),
    ('Sobremesas', 'Pudim', '', 12.0, '🍮')
  ) as v(section, name, description, price, emoji)
  cross join (select id from public.stores where name = 'Pizzaria Forno a Lenha') as st
union all
select st.id, v.section, v.name, v.description, v.price, v.emoji
from (values
    ('Combos', 'Combo 20 peças', '', 79.9, '🍣'),
    ('Combos', 'Combo 30 peças', '', 109.9, '🍣'),
    ('Individuais', 'Temaki de salmão', '', 24.9, '🍣'),
    ('Individuais', 'Hot roll (8 un)', '', 28.9, '🍤'),
    ('Bebidas', 'Chá gelado', '', 8.0, '🍵')
  ) as v(section, name, description, price, emoji)
  cross join (select id from public.stores where name = 'Sushi Sakura') as st;
